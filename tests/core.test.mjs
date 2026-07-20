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
const asOf = "2026-07-20T05:47:10Z";
const loadJson = async (path) => JSON.parse(await readFile(join(root, path), "utf8"));
const baseCatalog = await loadJson("public/data/catalog.sample.json");
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

test("a publikus mintakatalógus önmagában konzisztens", () => {
  const index = normalizeCatalog(baseCatalog, asOf);
  assert.equal(index.isSample, true);
  assert.equal(index.models.size, baseCatalog.models.length);
  assert.equal(index.prices.size, baseCatalog.prices.length);
  assert.equal(new Set(baseCatalog.prices.map((item) => item.id)).size, baseCatalog.prices.length);
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

  const tool = evaluateModel(index, "openai:gpt-5.6-terra", { ...defaultProfile, requiredCapabilities: ["tool_calling"] }, asOf);
  assert.ok(reasonSet(tool).has("missing_capability"));
  assert.deepEqual(capabilityFor(index, "openai:gpt-5.6-terra", "tool_calling", asOf), { support: "unknown", state: "unverified", record: null });
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

  assert.equal(index.models.size, 10);
  assert.equal(index.providers.size, 6);
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

test("az összehasonlító megőrzi a bizonyító mezőket, az ajánló pedig egyszerű és fail-closed marad", () => {
  for (const label of ["Modell és szolgáltató", "Havi becsült költség", "Ár állapota", "Kontextus", "API-kulcs"]) {
    assert.match(publicApp, new RegExp(`\\"${label}\\"`));
  }
  assert.match(publicApp, /modelResultCard\(resultA, profile, "A", "a"\)/);
  assert.match(publicApp, /const results = evaluateAllModels\(state\.index, profile, state\.asOf\)/);
  assert.match(publicApp, /filter\(\(item\) => item\.costStatus === "complete"\)/);
  assert.match(publicApp, /const priceRanked = priority\.id === "price"/);
  assert.match(publicApp, /if \(task\.scope !== "text"\)/);
  assert.match(publicApp, /scope: "additional_costs"/);
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
