import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  capabilityFor,
  effectiveFreshness,
  evaluateAllModels,
  evaluateModel,
  normalizeCatalog,
  providerLinkFor
} from "../public/core.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const asOf = "2026-07-20T09:13:14Z";
const loadJson = async (path) => JSON.parse(await readFile(join(root, path), "utf8"));
const baseCatalog = await loadJson("public/data/catalog.json");
const profileFixture = await loadJson("tests/fixtures/calculation-profiles.json");
const oracle = await loadJson("tests/fixtures/calculation-results.json");
const publicHtml = await readFile(join(root, "public/index.html"), "utf8");
const publicApp = await readFile(join(root, "public/app.js"), "utf8");

const toProfile = (item) => ({
  runsPerMonth: item.runs_per_month,
  inputTextTokensPerRun: item.input_text_tokens_per_run,
  outputTextTokensPerRun: item.output_text_tokens_per_run,
  cachedInputTextTokensPerRun: item.cached_input_text_tokens_per_run,
  processingMode: item.required_processing_mode,
  apiChannel: item.required_api_channel,
  inputModality: item.required_input_modality,
  outputModality: item.required_output_modality,
  allowPreview: item.allow_preview,
  requireDocumentedStable: item.require_documented_stable,
  requiredCapabilities: []
});

const profileById = new Map(profileFixture.profiles.map((item) => [item.id, toProfile(item)]));
const defaultProfile = profileById.get("technical-chat-10k");
const reasonSet = (result) => new Set(result.reasonCodes);

test("a publikus production katalógus önmagában konzisztens", () => {
  const index = normalizeCatalog(baseCatalog, asOf);
  assert.equal(baseCatalog.proof_only, false);
  assert.equal(baseCatalog.production_publication_approved, true);
  assert.equal(index.isSample, false);
  assert.equal(index.models.size, baseCatalog.models.length);
  assert.equal(index.prices.size, baseCatalog.prices.length);
  assert.equal(new Set(baseCatalog.prices.map((item) => item.id)).size, baseCatalog.prices.length);
  assert.match(publicHtml, /Ellenőrzött katalógus/);
  assert.doesNotMatch(publicHtml, /mintaadat/i);
  assert.match(publicApp, /csak jóváhagyott production katalógussal indulhat/);
});

test("mindkét bizonyító profil minden költsége byte-pontosan egyezik az oracle eredménnyel", () => {
  const index = normalizeCatalog(baseCatalog, asOf);
  for (const expected of oracle.results) {
    const actual = evaluateModel(index, expected.model_id, profileById.get(expected.profile_id), asOf);
    assert.equal(actual.costStatus, expected.status, `${expected.profile_id} / ${expected.model_id}`);
    assert.equal(actual.monthlyInputTokens, expected.monthly_input_tokens);
    assert.equal(actual.monthlyOutputTokens, expected.monthly_output_tokens);
    assert.equal(actual.inputCostUsd, expected.input_cost_usd);
    assert.equal(actual.outputCostUsd, expected.output_cost_usd);
    assert.equal(actual.totalCostUsd, expected.total_cost_usd);
    assert.deepEqual(actual.appliedPriceIds, expected.price_ids);
  }
});

test("az összehasonlító és feladatútvonal ugyanazt az evaluateModel döntést használhatja", () => {
  const index = normalizeCatalog(baseCatalog, asOf);
  const direct = evaluateModel(index, "openai:gpt-5.6-terra", defaultProfile, asOf);
  const fromAll = evaluateAllModels(index, defaultProfile, asOf).find((item) => item.model.id === direct.model.id);
  assert.deepEqual(
    { status: fromAll.costStatus, total: fromAll.totalCostUsd, reasons: fromAll.reasonCodes, prices: fromAll.appliedPriceIds },
    { status: direct.costStatus, total: direct.totalCostUsd, reasons: direct.reasonCodes, prices: direct.appliedPriceIds }
  );
});

test("az időből számolt stale állapot felülírja a bent maradt current címkét", () => {
  const raw = structuredClone(baseCatalog);
  const price = raw.prices.find((item) => item.model_id === "openai:gpt-5.6-terra" && item.charge_type === "input_text_tokens");
  price.freshness.check_due_at = "2026-07-20T05:25:00Z";
  price.freshness.stale_at = "2026-07-20T05:26:00Z";
  price.freshness.expires_at = "2026-08-17T08:24:44Z";
  assert.equal(effectiveFreshness(price, asOf), "stale");
  const result = evaluateModel(normalizeCatalog(raw, asOf), price.model_id, defaultProfile, asOf);
  assert.ok(reasonSet(result).has("price_record_unusable"));
  assert.equal(result.costStatus, "unavailable");
});

test("a 429 transient hiba nem tolja ki a TTL-t és degraded állapotban marad", () => {
  const raw = structuredClone(baseCatalog);
  const price = raw.prices.find((item) => item.model_id === "openai:gpt-5.6-terra" && item.charge_type === "input_text_tokens");
  const originalCheckDue = price.freshness.check_due_at;
  price.freshness.last_refresh_attempt_at = "2026-07-18T08:27:00Z";
  price.freshness.refresh_result = "transient_failure";
  price.freshness.error_class = "http_429";

  assert.equal(effectiveFreshness(price, asOf), "current_degraded");
  assert.equal(price.freshness.check_due_at, originalCheckDue);
  const result = evaluateModel(normalizeCatalog(raw, asOf), price.model_id, defaultProfile, asOf);
  assert.equal(result.costStatus, "complete");
  assert.equal(result.totalCostUsd, "500.000000");
});

test("a jövőbeli verified_at és a hard failure fail-closed", () => {
  const futureRaw = structuredClone(baseCatalog);
  futureRaw.models[0].freshness.verified_at = "2026-07-21T08:24:44Z";
  futureRaw.models[0].freshness.check_due_at = "2026-07-25T08:24:44Z";
  assert.equal(effectiveFreshness(futureRaw.models[0], asOf), "unverified");
  assert.ok(reasonSet(evaluateModel(normalizeCatalog(futureRaw, asOf), futureRaw.models[0].id, defaultProfile, asOf)).has("model_record_unusable"));

  const failedRaw = structuredClone(baseCatalog);
  const failedPrice = failedRaw.prices[0];
  failedPrice.freshness.refresh_result = "hard_failure";
  assert.equal(effectiveFreshness(failedPrice, asOf), "quarantined");
  assert.ok(reasonSet(evaluateModel(normalizeCatalog(failedRaw, asOf), failedPrice.model_id, defaultProfile, asOf)).has("price_record_unusable"));
});

test("a hiányzó vagy kétértelmű ár nem termel becslést", () => {
  const missingRaw = structuredClone(baseCatalog);
  missingRaw.prices = missingRaw.prices.filter((item) => !(item.model_id === "openai:gpt-5.6-terra" && item.charge_type === "output_text_tokens"));
  const missing = evaluateModel(normalizeCatalog(missingRaw, asOf), "openai:gpt-5.6-terra", defaultProfile, asOf);
  assert.ok(reasonSet(missing).has("price_missing"));
  assert.equal(missing.totalCostUsd, undefined);

  const duplicateRaw = structuredClone(baseCatalog);
  const original = duplicateRaw.prices.find((item) => item.model_id === "openai:gpt-5.6-terra" && item.charge_type === "input_text_tokens");
  duplicateRaw.prices.push({ ...structuredClone(original), id: `${original.id}:duplicate` });
  const duplicate = evaluateModel(normalizeCatalog(duplicateRaw, asOf), original.model_id, defaultProfile, asOf);
  assert.ok(reasonSet(duplicate).has("ambiguous_price"));
  assert.equal(duplicate.totalCostUsd, undefined);
});

test("hiányos context- vagy region-pricing feltételből nem készül becslés", () => {
  for (const missingField of ["context_pricing", "region_pricing"]) {
    const raw = structuredClone(baseCatalog);
    const prices = raw.prices.filter((item) => item.model_id === "openai:gpt-5.6-terra");
    prices.forEach((price) => { delete price.conditions[missingField]; });
    const result = evaluateModel(normalizeCatalog(raw, asOf), "openai:gpt-5.6-terra", defaultProfile, asOf);
    assert.ok(reasonSet(result).has("price_scope"), missingField);
    assert.equal(result.totalCostUsd, undefined, missingField);
  }
});

test("reviewre váró változás azonnal karanténba kerül", () => {
  const raw = structuredClone(baseCatalog);
  const price = raw.prices.find((item) => item.model_id === "openai:gpt-5.6-terra" && item.charge_type === "input_text_tokens");
  price.freshness.refresh_result = "change_pending_review";
  price.freshness.freshness_state = "current";
  assert.equal(effectiveFreshness(price, asOf), "quarantined");
  const result = evaluateModel(normalizeCatalog(raw, asOf), price.model_id, defaultProfile, asOf);
  assert.ok(reasonSet(result).has("price_record_unusable"));
  assert.equal(result.totalCostUsd, undefined);
});

test("kontextusársáv, preview, stabilitás, cache és tool igény külön kizárási okot ad", () => {
  const index = normalizeCatalog(baseCatalog, asOf);
  const band = evaluateModel(index, "openai:gpt-5.6-terra", { ...defaultProfile, inputTextTokensPerRun: 272001 }, asOf);
  assert.ok(reasonSet(band).has("price_context_band"));

  const previewRaw = structuredClone(baseCatalog);
  previewRaw.models[0].lifecycle = "preview";
  assert.ok(reasonSet(evaluateModel(normalizeCatalog(previewRaw, asOf), previewRaw.models[0].id, defaultProfile, asOf)).has("lifecycle_excluded"));

  const stable = evaluateModel(index, "openai:gpt-5.6-terra", { ...defaultProfile, requireDocumentedStable: true }, asOf);
  assert.ok(reasonSet(stable).has("stable_not_documented"));

  const cached = evaluateModel(index, "openai:gpt-5.6-terra", { ...defaultProfile, cachedInputTextTokensPerRun: 1 }, asOf);
  assert.ok(reasonSet(cached).has("unsupported_cache"));

  const imageScope = evaluateModel(index, "openai:gpt-5.6-terra", { ...defaultProfile, inputModality: "image" }, asOf);
  assert.ok(reasonSet(imageScope).has("price_scope"));

  const tool = evaluateModel(index, "openai:gpt-5.6-terra", { ...defaultProfile, requiredCapabilities: ["function_calling"] }, asOf);
  assert.equal(tool.technicalEligibility, "eligible");
  assert.equal(tool.requirements[0].support, "supported");
  assert.match(tool.requirements[0].evidenceId, /^capability:/);
});

test("API-kulcs CTA csak egyetlen current, ellenőrzött HTTPS provider-linkből készül", () => {
  const index = normalizeCatalog(baseCatalog, asOf);
  assert.equal(providerLinkFor(index, "openai", "api_key", asOf)?.url, "https://platform.openai.com/api-keys");

  const staleRaw = structuredClone(baseCatalog);
  const link = staleRaw.provider_links.find((item) => item.provider_id === "openai");
  link.freshness.stale_at = "2026-07-18T08:26:00Z";
  assert.equal(providerLinkFor(normalizeCatalog(staleRaw, asOf), "openai", "api_key", asOf), null);

  const duplicateRaw = structuredClone(baseCatalog);
  duplicateRaw.provider_links.push({ ...structuredClone(link), id: `${link.id}:duplicate`, freshness: structuredClone(baseCatalog.provider_links[0].freshness) });
  assert.equal(providerLinkFor(normalizeCatalog(duplicateRaw, asOf), "openai", "api_key", asOf), null);

  for (const missingField of ["source_locator", "reviewed_at", "review_ref"]) {
    const incompleteRaw = structuredClone(baseCatalog);
    const incompleteLink = incompleteRaw.provider_links.find((item) => item.provider_id === "openai");
    delete incompleteLink[missingField];
    assert.equal(providerLinkFor(normalizeCatalog(incompleteRaw, asOf), "openai", "api_key", asOf), null, missingField);
  }
});

test("a Gate 3 bővítés négy új modellje teljes árat és hivatalos kulcslinket ad", () => {
  const index = normalizeCatalog(baseCatalog, asOf);
  const expected = [
    ["xai:grok-4.3", "150.000000", "https://console.x.ai/team/default/api-keys"],
    ["deepseek:deepseek-v4-flash", "16.800000", "https://platform.deepseek.com/api_keys"],
    ["deepseek:deepseek-v4-pro", "52.200000", "https://platform.deepseek.com/api_keys"],
    ["alibaba-qwen:qwen3.7-max-2026-06-08", "231.020000", "https://www.alibabacloud.com/help/en/model-studio/get-api-key"]
  ];

  assert.equal(index.models.size, 14);
  assert.equal(index.providers.size, 7);
  for (const [modelId, total, apiKeyUrl] of expected) {
    const result = evaluateModel(index, modelId, defaultProfile, asOf);
    assert.equal(result.costStatus, "complete", modelId);
    assert.equal(result.totalCostUsd, total, modelId);
    assert.equal(result.apiKeyLink?.url, apiKeyUrl, modelId);
  }

  const tooLongForShortGrokPrice = evaluateModel(index, "xai:grok-4.3", { ...defaultProfile, inputTextTokensPerRun: 200001 }, asOf);
  assert.ok(reasonSet(tooLongForShortGrokPrice).has("price_context_band"));

  for (const excludedId of ["xai:grok-4.5", "deepseek:deepseek-chat", "deepseek:deepseek-reasoner", "alibaba-qwen:qwen3.7-max"]) {
    assert.equal(index.models.has(excludedId), false, excludedId);
  }
});

test("a Gate 4 production katalógus négy új modellje teljes, útvonalhoz kötött árat és hivatalos kulcslinket ad", () => {
  const index = normalizeCatalog(baseCatalog, asOf);
  const expected = [
    ["openai:gpt-5.6-sol", "1000.000000", "https://platform.openai.com/api-keys"],
    ["anthropic:claude-fable-5", "1800.000000", "https://platform.claude.com/settings/keys"],
    ["mistral:mistral-medium-3-5", "270.000000", "https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key"],
    ["mistral:mistral-small-2603", "24.000000", "https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key"]
  ];

  for (const [modelId, total, apiKeyUrl] of expected) {
    const result = evaluateModel(index, modelId, defaultProfile, asOf);
    assert.equal(result.costStatus, "complete", modelId);
    assert.equal(result.totalCostUsd, total, modelId);
    assert.equal(result.apiKeyLink?.url, apiKeyUrl, modelId);
  }

  const tooLongForSolShortPrice = evaluateModel(index, "openai:gpt-5.6-sol", { ...defaultProfile, inputTextTokensPerRun: 272001 }, asOf);
  assert.ok(reasonSet(tooLongForSolShortPrice).has("price_context_band"));

  const overMistralCombinedContext = evaluateModel(index, "mistral:mistral-medium-3-5", {
    ...defaultProfile,
    inputTextTokensPerRun: 255000,
    outputTextTokensPerRun: 2000
  }, asOf);
  assert.ok(reasonSet(overMistralCombinedContext).has("context_limit"));

  const mistralInputPrice = baseCatalog.prices.find((item) => item.id === "price:mistral:mistral-medium-3-5:input");
  assert.equal(mistralInputPrice.conditions.region_pricing.route, "api.mistral.ai-global-endpoint");
  assert.ok(mistralInputPrice.conditions.excluded_components.includes("eu_regional_inference_1.1x"));

  const fableInputPrice = baseCatalog.prices.find((item) => item.id === "price:anthropic:claude-fable-5:input");
  assert.equal(fableInputPrice.conditions.region_pricing.value, "global");
  assert.ok(fableInputPrice.conditions.excluded_components.includes("inference_geo_us"));
});

test("a Gate 5B capability-mátrix teljes, forráshű és pontos modellverzióhoz kötött", () => {
  const index = normalizeCatalog(baseCatalog, asOf);
  const capabilityKeys = ["image_input", "function_calling", "structured_output", "provider_web_search", "file_or_pdf_input"];
  assert.equal(index.capabilities.size, index.models.size * capabilityKeys.length);
  for (const model of index.models.values()) {
    for (const key of capabilityKeys) {
      const matches = (index.capabilitiesByModel.get(model.id) ?? []).filter((item) => item.capability === key);
      assert.equal(matches.length, 1, `${model.id} / ${key}`);
      assert.equal(matches[0].source_url, index.sources.get(matches[0].source_id).url);
      assert.equal(matches[0].freshness.verified_at, asOf);
      assert.ok(["included", "priced_separately", "unknown", "not_applicable"].includes(matches[0].extra_cost_status));
    }
  }
  const grokWebSearch = capabilityFor(index, "xai:grok-4.3", "provider_web_search", asOf);
  assert.equal(grokWebSearch.support, "unknown");
  assert.equal(grokWebSearch.record.source_id, "source:xai:model:grok-4.3");
  assert.match(grokWebSearch.record.source_locator, /exact-model page reviewed/i);
  assert.equal(capabilityFor(index, "alibaba-qwen:qwen3.7-max-2026-06-08", "structured_output", asOf).support, "conditional");
  assert.equal(capabilityFor(index, "deepseek:deepseek-v4-flash", "image_input", asOf).support, "unknown");

  const typoRaw = structuredClone(baseCatalog);
  typoRaw.tasks[0].required_capabilities = ["invented_capability"];
  assert.throws(() => normalizeCatalog(typoRaw, asOf), /Ismeretlen feladat capability/);

  const missingCostStatusRaw = structuredClone(baseCatalog);
  delete missingCostStatusRaw.capabilities[0].extra_cost_status;
  assert.throws(() => normalizeCatalog(missingCostStatusRaw, asOf), /Hibás capability extra_cost_status/);
});

test("az ismeretlen, feltételes, stale vagy kétértelmű capability fail-closed", () => {
  const cases = [
    ["xai:grok-4.3", "provider_web_search"],
    ["deepseek:deepseek-v4-flash", "image_input"],
    ["alibaba-qwen:qwen3.7-max-2026-06-08", "structured_output"]
  ];
  const index = normalizeCatalog(baseCatalog, asOf);
  for (const [modelId, capability] of cases) {
    const result = evaluateModel(index, modelId, { ...defaultProfile, requiredCapabilities: [capability] }, asOf);
    assert.equal(result.technicalEligibility, "excluded");
    assert.ok(reasonSet(result).has("missing_capability"));
  }

  const staleRaw = structuredClone(baseCatalog);
  const stale = staleRaw.capabilities.find((item) => item.model_id === "openai:gpt-5.6-sol" && item.capability === "image_input");
  stale.freshness.stale_at = "2026-07-20T08:00:00Z";
  stale.freshness.expires_at = "2026-08-19T09:13:14Z";
  assert.ok(reasonSet(evaluateModel(normalizeCatalog(staleRaw, asOf), stale.model_id, { ...defaultProfile, requiredCapabilities: [stale.capability] }, asOf)).has("missing_capability"));

  const duplicateRaw = structuredClone(baseCatalog);
  const original = duplicateRaw.capabilities.find((item) => item.model_id === "openai:gpt-5.6-sol" && item.capability === "image_input");
  duplicateRaw.capabilities.push({ ...structuredClone(original), id: `${original.id}:duplicate` });
  assert.equal(capabilityFor(normalizeCatalog(duplicateRaw, asOf), original.model_id, original.capability, asOf).state, "quarantined");
});

test("mind a 120 feladat-prioritás-használat útvonal ad őszinte és használható eredményt", () => {
  const index = normalizeCatalog(baseCatalog, asOf);
  const usageRuns = [150, 600, 30000];
  let pathCount = 0;
  for (const task of index.tasks.values()) {
    for (const policy of index.recommendationPolicies.values()) {
      for (const runsPerMonth of usageRuns) {
        pathCount += 1;
        const results = evaluateAllModels(index, {
          runsPerMonth,
          inputTextTokensPerRun: task.default_input_tokens,
          outputTextTokensPerRun: task.default_output_tokens,
          requiredCapabilities: task.required_capabilities
        }, asOf);
        const technical = results.filter((item) => item.technicalEligibility === "eligible");
        const priced = technical.filter((item) => item.costStatus === "complete");
        assert.ok(technical.length > 0, `${task.id} / ${policy.priority_id} / ${runsPerMonth}: technikai találat`);
        assert.ok(priced.length > 0, `${task.id} / ${policy.priority_id} / ${runsPerMonth}: tokenár`);
        if (policy.ranking_available && task.cost_scope === "standard_text_complete") assert.ok(priced.length >= 3);
      }
    }
  }
  assert.equal(pathCount, 120);
});

test("minden szolgáltatóhoz van ellenőrzött API-kulcs- és bekötési útvonal", () => {
  const index = normalizeCatalog(baseCatalog, asOf);
  for (const provider of index.providers.values()) {
    assert.ok(providerLinkFor(index, provider.id, "api_key", asOf)?.url.startsWith("https://"), provider.id);
    assert.ok(providerLinkFor(index, provider.id, "quickstart", asOf)?.url.startsWith("https://"), provider.id);
  }
});

test("az összehasonlító megőrzi a bizonyító mezőket, az ajánló pedig egyszerű és bizonyítékalapú marad", () => {
  for (const label of ["Modell és szolgáltató", "Havi becsült költség", "Ár állapota", "Kontextus", "API-kulcs"]) {
    assert.match(publicApp, new RegExp(`\\"${label}\\"`));
  }
  assert.match(publicApp, /modelResultCard\(resultA, profile, "A", "a"\)/);
  assert.match(publicApp, /const results = evaluateAllModels\(state\.index, profile, state\.asOf\)/);
  assert.match(publicApp, /technicalEligibility === "eligible"/);
  assert.match(publicApp, /recommendationPolicyFor\(state\.index, priority\.id\)/);
  assert.match(publicApp, /Tokenárak megnyitása/);
  assert.match(publicApp, /A technikai támogatás nem ugyanaz/);
  assert.match(publicApp, /Bekötési útmutató/);
  assert.doesNotMatch(publicApp, /advisor-unranked-grid/);
  assert.doesNotMatch(publicApp, /TASK_OPTIONS/);
  assert.doesNotMatch(publicApp, /renderUnsupportedTask/);
  assert.equal(baseCatalog.tasks.filter((task) => task.cost_scope === "token_baseline").length, 3);
  assert.match(publicApp, /function advisorCostNotice\(task\)/);
  assert.match(publicApp, /Ez ár-összehasonlítás, nem minőségi vagy alkalmassági rangsor/);
  assert.doesNotMatch(publicHtml, /Három érthető lehetőség/);
  assert.match(publicApp, /scope_label_hu/);
  assert.match(publicApp, /function markCompareDirty\(\)/);
  assert.match(publicHtml, /id="compareDirty" role="status" hidden/);
  assert.match(publicHtml, /id="comparisonHeading" tabindex="-1"/);
  assert.match(publicHtml, /id="taskResultsHeading" tabindex="-1"/);
  assert.match(publicHtml, /id="taskChoices"/);
  assert.match(publicHtml, /id="priorityChoices"/);
  assert.match(publicHtml, /id="usageChoices"/);
  assert.match(publicHtml, /id="advisorResults"[^>]*hidden/);
});
