import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  capabilityFor,
  benchmarkRecordHealth,
  effectiveFreshness,
  evaluateAllModels,
  evaluateModel,
  normalizeBenchmarkDataset,
  normalizeCatalog,
  providerLinkFor,
  qualityRankingFor
} from "../public/core.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const asOf = "2026-07-20T17:52:25Z";
const loadJson = async (path) => JSON.parse(await readFile(join(root, path), "utf8"));
const baseCatalog = await loadJson("public/data/catalog.json");
const baseBenchmark = await loadJson("public/data/benchmarks/livebench-2026-06-25.json");
const profileFixture = await loadJson("tests/fixtures/calculation-profiles.json");
const oracle = await loadJson("tests/fixtures/calculation-results.json");
const publicHtml = await readFile(join(root, "public/index.html"), "utf8");
const publicApp = await readFile(join(root, "public/app.js"), "utf8");
const thirdPartyNotices = await readFile(join(root, "THIRD_PARTY_NOTICES.md"), "utf8");

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
const taskEvaluations = (index, taskId, date = asOf) => {
  const task = index.tasks.get(taskId);
  return evaluateAllModels(index, {
    runsPerMonth: 600,
    inputTextTokensPerRun: task.default_input_tokens,
    outputTextTokensPerRun: task.default_output_tokens,
    requiredCapabilities: task.required_capabilities
  }, date);
};

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

test("a Gate 3 bővítés négy modellje továbbra is teljes árat és hivatalos kulcslinket ad", () => {
  const index = normalizeCatalog(baseCatalog, asOf);
  const expected = [
    ["xai:grok-4.3", "150.000000", "https://console.x.ai/team/default/api-keys"],
    ["deepseek:deepseek-v4-flash", "16.800000", "https://platform.deepseek.com/api_keys"],
    ["deepseek:deepseek-v4-pro", "52.200000", "https://platform.deepseek.com/api_keys"],
    ["alibaba-qwen:qwen3.7-max-2026-06-08", "231.020000", "https://www.alibabacloud.com/help/en/model-studio/get-api-key"]
  ];

  assert.equal(index.models.size, 15);
  assert.equal(index.providers.size, 7);
  for (const [modelId, total, apiKeyUrl] of expected) {
    const result = evaluateModel(index, modelId, defaultProfile, asOf);
    assert.equal(result.costStatus, "complete", modelId);
    assert.equal(result.totalCostUsd, total, modelId);
    assert.equal(result.apiKeyLink?.url, apiKeyUrl, modelId);
  }

  const tooLongForShortGrokPrice = evaluateModel(index, "xai:grok-4.3", { ...defaultProfile, inputTextTokensPerRun: 200001 }, asOf);
  assert.ok(reasonSet(tooLongForShortGrokPrice).has("price_context_band"));

  for (const excludedId of ["xai:grok-4.5-latest", "deepseek:deepseek-chat", "deepseek:deepseek-reasoner", "alibaba-qwen:qwen3.7-max"]) {
    assert.equal(index.models.has(excludedId), false, excludedId);
  }
});

test("a Gate 5D Grok 4.5 rekordja rövid, hosszú és cache-es ársávban is pontos", () => {
  const index = normalizeCatalog(baseCatalog, asOf);
  const model = index.models.get("xai:grok-4.5");
  assert.equal(model.api_model_id, "grok-4.5");
  assert.equal(model.context_window_tokens, 500000);
  assert.equal(index.models.has("xai:grok-4.3"), true);
  assert.equal(providerLinkFor(index, "xai", "api_key", asOf)?.url, "https://console.x.ai/team/default/api-keys");
  assert.equal(providerLinkFor(index, "xai", "quickstart", asOf)?.url, "https://docs.x.ai/developers/quickstart");

  const defaultCost = evaluateModel(index, model.id, defaultProfile, asOf);
  assert.equal(defaultCost.costStatus, "complete");
  assert.equal(defaultCost.totalCostUsd, "280.000000");
  assert.deepEqual(defaultCost.appliedPriceIds, [
    "price:xai:grok-4.5:input:short",
    "price:xai:grok-4.5:output:short"
  ]);

  const atThreshold = evaluateModel(index, model.id, {
    ...defaultProfile,
    runsPerMonth: 1,
    inputTextTokensPerRun: 200000,
    outputTextTokensPerRun: 1000
  }, asOf);
  assert.equal(atThreshold.totalCostUsd, "0.406000");
  assert.deepEqual(atThreshold.appliedPriceIds, [
    "price:xai:grok-4.5:input:short",
    "price:xai:grok-4.5:output:short"
  ]);

  const cachedShortContext = evaluateModel(index, model.id, {
    ...defaultProfile,
    runsPerMonth: 1,
    inputTextTokensPerRun: 1000,
    cachedInputTextTokensPerRun: 1000,
    outputTextTokensPerRun: 1000
  }, asOf);
  assert.equal(cachedShortContext.totalCostUsd, "0.008300");
  assert.deepEqual(cachedShortContext.appliedPriceIds, [
    "price:xai:grok-4.5:input:short",
    "price:xai:grok-4.5:cached-input:short",
    "price:xai:grok-4.5:output:short"
  ]);

  const overThreshold = evaluateModel(index, model.id, {
    ...defaultProfile,
    runsPerMonth: 1,
    inputTextTokensPerRun: 200001,
    outputTextTokensPerRun: 1000
  }, asOf);
  assert.equal(overThreshold.totalCostUsd, "0.812004");
  assert.deepEqual(overThreshold.appliedPriceIds, [
    "price:xai:grok-4.5:input:long",
    "price:xai:grok-4.5:output:long"
  ]);

  const cachedLongContext = evaluateModel(index, model.id, {
    ...defaultProfile,
    runsPerMonth: 1,
    inputTextTokensPerRun: 100000,
    cachedInputTextTokensPerRun: 100001,
    outputTextTokensPerRun: 1000
  }, asOf);
  assert.equal(cachedLongContext.totalCostUsd, "0.472001");
  assert.equal(cachedLongContext.cachedInputCostUsd, "0.060001");
  assert.deepEqual(cachedLongContext.appliedPriceIds, [
    "price:xai:grok-4.5:input:long",
    "price:xai:grok-4.5:cached-input:long",
    "price:xai:grok-4.5:output:long"
  ]);

  assert.equal(capabilityFor(index, model.id, "image_input", asOf).support, "supported");
  assert.equal(capabilityFor(index, model.id, "function_calling", asOf).support, "supported");
  assert.equal(capabilityFor(index, model.id, "structured_output", asOf).support, "supported");
  assert.equal(capabilityFor(index, model.id, "provider_web_search", asOf).support, "unknown");
  assert.equal(capabilityFor(index, model.id, "file_or_pdf_input", asOf).support, "unknown");
});

test("az átfedő Grok 4.5 ársáv fail-closed kétértelmű marad", () => {
  const raw = structuredClone(baseCatalog);
  const original = raw.prices.find((item) => item.id === "price:xai:grok-4.5:input:short");
  raw.prices.push({ ...structuredClone(original), id: `${original.id}:overlap` });
  const result = evaluateModel(normalizeCatalog(raw, asOf), "xai:grok-4.5", defaultProfile, asOf);
  assert.ok(reasonSet(result).has("ambiguous_price"));
  assert.equal(result.costStatus, "unavailable");
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
      assert.ok(Date.parse(matches[0].freshness.verified_at) <= Date.parse(asOf));
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

test("a Gate 5C LiveBench-adat külön licencelt fájlban, pontos 9/15-ös lefedettséggel használható", () => {
  const catalog = normalizeCatalog(baseCatalog, asOf);
  const benchmark = normalizeBenchmarkDataset(baseBenchmark, catalog, asOf);
  assert.equal(benchmark.definitions.size, 2);
  assert.equal(benchmark.results.size, 18);
  assert.equal(new Set([...benchmark.results.values()].map((item) => item.model_id)).size, 9);
  assert.equal(new Set([...benchmark.results.values()].map((item) => catalog.models.get(item.model_id).provider_id)).size, 5);
  for (const definition of benchmark.definitions.values()) {
    assert.deepEqual(new Set(definition.coverage.unmeasured_model_ids), new Set([
      "alibaba-qwen:qwen3.7-max-2026-06-08",
      "anthropic:claude-fable-5",
      "google-gemini:gemini-3.1-flash-lite",
      "mistral:mistral-medium-3-5",
      "mistral:mistral-small-2603",
      "xai:grok-4.5"
    ]));
    assert.equal(benchmarkRecordHealth(benchmark, definition, asOf).usable, true);
  }
  assert.equal(baseBenchmark.license, "CC-BY-SA-4.0");
  assert.match(baseBenchmark.modification_notice_hu, /exact modellekhez kapcsolva/);
  assert.match(thirdPartyNotices, /LiveBench benchmark data/);
  assert.match(thirdPartyNotices, /CC BY-SA 4\.0/);
  assert.match(thirdPartyNotices, /Claude Fable 5 was excluded/);
});

test("a quality sorrend csak coding és reasoning feladatra érhető el, és a top 3 forráshű", () => {
  const catalog = normalizeCatalog(baseCatalog, asOf);
  const benchmark = normalizeBenchmarkDataset(baseBenchmark, catalog, asOf);
  const expected = {
    coding: ["openai:gpt-5.6-sol", "openai:gpt-5.6-luna", "anthropic:claude-sonnet-5"],
    reasoning: ["openai:gpt-5.6-sol", "openai:gpt-5.6-terra", "anthropic:claude-opus-4-8"]
  };
  for (const [taskId, top] of Object.entries(expected)) {
    const ranking = qualityRankingFor(catalog, benchmark, { taskId, priorityId: "quality", evaluations: taskEvaluations(catalog, taskId) }, asOf);
    assert.equal(ranking.available, true, taskId);
    assert.equal(ranking.measuredCount, 9);
    assert.equal(ranking.providerCount, 5);
    assert.equal(ranking.sourceMeasuredCount, 9);
    assert.equal(ranking.eligibleMeasuredCount, 9);
    assert.deepEqual(ranking.rows.slice(0, 3).map((row) => row.evaluation.model.id), top);
    assert.deepEqual(ranking.rows.slice(0, 3).map((row) => row.position), [1, 2, 3]);
  }
  for (const task of catalog.tasks.values()) {
    if (["coding", "reasoning"].includes(task.id)) continue;
    assert.equal(qualityRankingFor(catalog, benchmark, { taskId: task.id, priorityId: "quality", evaluations: taskEvaluations(catalog, task.id) }, asOf).available, false, task.id);
  }
  assert.equal(qualityRankingFor(catalog, benchmark, { taskId: "coding", priorityId: "balanced", evaluations: taskEvaluations(catalog, "coding") }, asOf).available, false);
  assert.equal(qualityRankingFor(catalog, benchmark, { taskId: "coding", priorityId: "speed", evaluations: taskEvaluations(catalog, "coding") }, asOf).available, false);
});

test("a benchmarkfrissesség böngészőidőből fail-closed, a check_due pedig láthatóan degraded", () => {
  const catalog = normalizeCatalog(baseCatalog, asOf);
  const benchmark = normalizeBenchmarkDataset(baseBenchmark, catalog, asOf);
  const overdue = "2026-07-28T09:13:14Z";
  const overdueRanking = qualityRankingFor(catalog, benchmark, { taskId: "coding", priorityId: "quality", evaluations: taskEvaluations(catalog, "coding", overdue) }, overdue);
  assert.equal(overdueRanking.available, true);
  assert.equal(overdueRanking.freshnessState, "overdue_degraded");
  const stale = "2026-08-04T09:13:14Z";
  assert.equal(qualityRankingFor(catalog, benchmark, { taskId: "coding", priorityId: "quality", evaluations: taskEvaluations(catalog, "coding", stale) }, stale).available, false);
  const expired = "2026-08-20T09:13:14Z";
  assert.equal(qualityRankingFor(catalog, benchmark, { taskId: "reasoning", priorityId: "quality", evaluations: taskEvaluations(catalog, "reasoning", expired) }, expired).available, false);

  const oneStaleRaw = structuredClone(baseBenchmark);
  const oneStale = oneStaleRaw.benchmark_results.find((item) => item.task_id === "coding" && item.model_id === "openai:gpt-5.6-sol");
  oneStale.freshness.verified_at = "2026-07-01T00:00:00Z";
  oneStale.freshness.check_due_at = "2026-07-08T00:00:00Z";
  oneStale.freshness.stale_at = "2026-07-15T00:00:00Z";
  oneStale.freshness.expires_at = "2026-07-31T00:00:00Z";
  const oneStaleIndex = normalizeBenchmarkDataset(oneStaleRaw, catalog, asOf);
  const withoutStaleModel = qualityRankingFor(catalog, oneStaleIndex, { taskId: "coding", priorityId: "quality", evaluations: taskEvaluations(catalog, "coding") }, asOf);
  assert.equal(withoutStaleModel.available, true);
  assert.equal(withoutStaleModel.measuredCount, 8);
  assert.equal(withoutStaleModel.rows[0].evaluation.model.id, "openai:gpt-5.6-luna");
});

test("exact modell-, konfiguráció- és fallback-eltérés nem normalizálható", () => {
  const catalog = normalizeCatalog(baseCatalog, asOf);
  const apiMismatch = structuredClone(baseBenchmark);
  apiMismatch.benchmark_results[0].api_model_id = "gpt-5.6-sol-not-exact";
  assert.throws(() => normalizeBenchmarkDataset(apiMismatch, catalog, asOf), /exact modellkapcsolat/);

  const incomplete = structuredClone(baseBenchmark);
  incomplete.benchmark_results[0].model_configuration.temperature = { status: "unknown", value: null };
  assert.throws(() => normalizeBenchmarkDataset(incomplete, catalog, asOf), /Hiányos benchmarkkonfiguráció/);

  const fallback = structuredClone(baseBenchmark);
  const candidate = fallback.benchmark_results[0];
  candidate.model_id = "anthropic:claude-fable-5";
  candidate.api_model_id = "claude-fable-5";
  candidate.source_row_id = "claude-fable-5-max-effort";
  candidate.model_configuration.source_model_id = "claude-fable-5-max-effort";
  candidate.model_configuration.api_model_id = "claude-fable-5";
  candidate.model_configuration.fallback_model_ids = ["claude-opus-4-8"];
  assert.throws(() => normalizeBenchmarkDataset(fallback, catalog, asOf), /Hiányos benchmarkkonfiguráció/);

  const geminiWithoutTopP = structuredClone(baseBenchmark);
  const geminiResult = geminiWithoutTopP.benchmark_results.find((item) => item.model_id === "google-gemini:gemini-3.5-flash");
  delete geminiResult.model_configuration.api_kwargs.top_p;
  assert.throws(() => normalizeBenchmarkDataset(geminiWithoutTopP, catalog, asOf), /Hiányos benchmarkkonfiguráció/);

  const anthropicWithoutAdaptiveThinking = structuredClone(baseBenchmark);
  const anthropicResult = anthropicWithoutAdaptiveThinking.benchmark_results.find((item) => item.model_id === "anthropic:claude-opus-4-8");
  delete anthropicResult.model_configuration.api_kwargs.thinking.type;
  assert.throws(() => normalizeBenchmarkDataset(anthropicWithoutAdaptiveThinking, catalog, asOf), /Hiányos benchmarkkonfiguráció/);

  const duplicate = structuredClone(baseBenchmark);
  duplicate.benchmark_results.push({ ...structuredClone(duplicate.benchmark_results[0]), id: `${duplicate.benchmark_results[0].id}:duplicate` });
  duplicate.benchmark_definitions.find((item) => item.id === duplicate.benchmark_results[0].definition_id).coverage.measured_model_count += 1;
  assert.throws(() => normalizeBenchmarkDataset(duplicate, catalog, asOf), /benchmark-lefedettség/);
});

test("a forrás szerinti mérési lefedettség nem csökken a felhasználó technikai szűrésétől", () => {
  const catalog = normalizeCatalog(baseCatalog, asOf);
  const benchmark = normalizeBenchmarkDataset(baseBenchmark, catalog, asOf);
  const evaluations = evaluateAllModels(catalog, {
    runsPerMonth: 1,
    inputTextTokensPerRun: 1020000,
    outputTextTokensPerRun: 1000,
    requiredCapabilities: []
  }, asOf);
  const ranking = qualityRankingFor(catalog, benchmark, { taskId: "coding", priorityId: "quality", evaluations }, asOf);
  assert.equal(ranking.available, true);
  assert.equal(ranking.sourceMeasuredCount, 9);
  assert.equal(ranking.sourceProviderCount, 5);
  assert.equal(ranking.eligibleMeasuredCount, 4);
  assert.equal(ranking.eligibleProviderCount, 2);
  assert.equal(ranking.rows.length, 4);
  const terra = ranking.rows.find((row) => row.evaluation.model.id === "openai:gpt-5.6-terra");
  assert.equal(terra.sourcePosition, 5);
  assert.equal(terra.position, 3);
});

test("hiányzó, stale vagy expired ár nem tünteti el és nem rendezi át a quality első helyét", () => {
  const cases = ["missing", "stale", "expired"];
  for (const priceCase of cases) {
    const raw = structuredClone(baseCatalog);
    const solPrices = raw.prices.filter((item) => item.model_id === "openai:gpt-5.6-sol");
    if (priceCase === "missing") {
      raw.prices = raw.prices.filter((item) => !(item.model_id === "openai:gpt-5.6-sol" && item.charge_type === "output_text_tokens"));
    } else {
      for (const price of solPrices) {
        price.freshness.verified_at = "2026-07-01T00:00:00Z";
        price.freshness.check_due_at = "2026-07-05T00:00:00Z";
        price.freshness.stale_at = priceCase === "stale" ? "2026-07-20T08:00:00Z" : "2026-07-10T00:00:00Z";
        price.freshness.expires_at = priceCase === "stale" ? "2026-08-01T00:00:00Z" : "2026-07-20T08:00:00Z";
      }
    }
    const catalog = normalizeCatalog(raw, asOf);
    const benchmark = normalizeBenchmarkDataset(baseBenchmark, catalog, asOf);
    const ranking = qualityRankingFor(catalog, benchmark, { taskId: "coding", priorityId: "quality", evaluations: taskEvaluations(catalog, "coding") }, asOf);
    assert.equal(ranking.available, true, priceCase);
    assert.equal(ranking.rows[0].evaluation.model.id, "openai:gpt-5.6-sol", priceCase);
    assert.equal(ranking.rows[0].position, 1, priceCase);
    assert.equal(ranking.rows[0].evaluation.costStatus, "unavailable", priceCase);
  }
});

test("hibás benchmarkfájl nem teszi használhatatlanná az alap-katalógust", () => {
  const catalog = normalizeCatalog(baseCatalog, asOf);
  const invalid = structuredClone(baseBenchmark);
  invalid.license = "unknown";
  assert.throws(() => normalizeBenchmarkDataset(invalid, catalog, asOf), /licence/);
  assert.equal(catalog.models.size, 15);
  assert.equal(evaluateModel(catalog, "openai:gpt-5.6-sol", defaultProfile, asOf).costStatus, "complete");
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
  assert.match(publicApp, /LiveBench-eredmény erre a feladatra/);
  assert.match(publicApp, /A havi költség jelenleg nem ellenőrizhető/);
  assert.match(publicApp, /nem a LiveBenchben mért konfiguráció futtatási költsége/);
  assert.match(publicApp, /CC BY-SA 4\.0 licenc/);
  assert.match(publicApp, /source\?\.url \?\? definition\.source_url/);
  assert.match(publicApp, /A választásaidnak megfelelően .* mért modell maradt a rangsorban/);
  assert.match(publicApp, /Helyezése a választásaidnak megfelelő mért modellek között/);
  assert.match(publicApp, /Helyezése ebben a .* mérésben: .*sourcePosition/);
  assert.match(publicApp, /normalizeBenchmarkDataset/);
  assert.match(publicApp, /qualityRankingFor/);
  assert.match(publicApp, /data\/benchmarks\/livebench-2026-06-25\.json/);
  assert.match(publicApp, /state\.benchmarks = null/);
  assert.match(publicApp, /qualityRanking\.rows\.slice\(0, policy\?\.result_limit \?\? 3\)/);
  assert.doesNotMatch(publicApp, /quality.*costNumerator|costNumerator.*quality/i);
  assert.equal(baseCatalog.tasks.find((task) => task.id === "reasoning").label_hu, "Logikai következtetést végzek");
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
