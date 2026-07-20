const SCHEMA_VERSION = "2.1.0";
const OFFICIAL_SOURCE_STATES = new Set(["official_source_page_verified", "official_login_required"]);
const ACTIVE_STATES = new Set(["current", "current_degraded", "overdue_degraded"]);
const CAPABILITY_SUPPORT_STATES = new Set(["supported", "unsupported", "conditional", "unknown"]);
const EXTRA_COST_STATES = new Set(["included", "priced_separately", "unknown", "not_applicable"]);
const CAPABILITY_KEYS = new Set(["image_input", "function_calling", "structured_output", "provider_web_search", "file_or_pdf_input"]);
const BENCHMARK_SCHEMA_VERSION = "1.0.0";
const BENCHMARK_TASKS = new Set(["coding", "reasoning"]);
const BENCHMARK_ACTIVE_STATES = new Set(["current", "current_degraded", "overdue_degraded"]);
const BENCHMARK_PARAMETER_STATES = new Set(["set", "not_set_by_benchmark", "not_applicable", "provider_managed"]);
const BENCHMARK_API_KWARGS_STATES = new Set(["exact_transcription", "source_has_no_api_kwargs"]);
const DAY_MS = 24 * 60 * 60 * 1000;

export const REASON_LABELS = Object.freeze({
  invalid_profile: "A forgalmi profil hiányos vagy érvénytelen.",
  model_not_found: "A modell nem található a katalógusban.",
  model_record_unusable: "A modellrekord jelenleg nem használható.",
  lifecycle_excluded: "A modell lifecycle állapota kizárja ezt a profilt.",
  stable_not_documented: "A stabil lifecycle nincs hivatalosan dokumentálva.",
  context_limit: "A profil nem fér bele a dokumentált kontextusablakba.",
  output_limit: "A kért output meghaladja a dokumentált maximumot.",
  missing_capability: "A kötelező képességhez nincs használható hivatalos bizonyíték.",
  unsupported_cache: "A cache-es számítás feltételei nincsenek teljesen igazolva.",
  price_missing: "Nincs pontosan egy használható input- és outputár.",
  price_scope: "Az ár feltételei nem egyeznek a V1 direct, standard, text scope-pal.",
  price_context_band: "A profil túllépi az igazolt ársáv inputhatárát.",
  price_time_window: "Az időben korlátozott ár már nem használható.",
  price_record_unusable: "Egy szükséges árrekord stale, expired, quarantined vagy nem ellenőrzött.",
  ambiguous_price: "Több alkalmazható árrekord található; a számítás karanténba került."
});

const assertArray = (value, name) => {
  if (!Array.isArray(value)) throw new Error(`Hiányzó vagy hibás katalógustömb: ${name}`);
};

const buildUniqueMap = (items, label) => {
  const map = new Map();
  for (const item of items) {
    if (!item?.id || map.has(item.id)) throw new Error(`${label}: hiányzó vagy ismétlődő id: ${item?.id ?? "?"}`);
    map.set(item.id, item);
  }
  return map;
};

const parseTime = (value) => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function effectiveFreshness(record, asOf = new Date()) {
  const freshness = record?.freshness;
  if (!freshness) return "unverified";
  if (
    record.record_status === "quarantined" ||
    freshness.freshness_state === "quarantined" ||
    ["change_pending_review", "hard_failure"].includes(freshness.refresh_result)
  ) return "quarantined";
  if (freshness.refresh_result === "never_attempted") return "unverified";
  if (!["success_no_change", "transient_failure"].includes(freshness.refresh_result)) return "quarantined";
  if (["unverified", "stale", "expired"].includes(freshness.freshness_state)) return freshness.freshness_state;

  const now = asOf instanceof Date ? asOf.getTime() : parseTime(asOf);
  const verified = parseTime(freshness.verified_at);
  const checkDue = parseTime(freshness.check_due_at);
  const stale = parseTime(freshness.stale_at);
  const expires = parseTime(freshness.expires_at);
  if (now === null || verified === null || checkDue === null || stale === null || expires === null || !(verified <= checkDue && checkDue < stale && stale < expires)) {
    return "quarantined";
  }
  if (now < verified) return "unverified";
  if (now >= expires) return "expired";
  if (now >= stale) return "stale";
  if (freshness.refresh_result === "transient_failure") return "current_degraded";
  if (now >= checkDue) return "overdue_degraded";
  return "current";
}

const isOfficialSource = (source) => Boolean(source && OFFICIAL_SOURCE_STATES.has(source.source_status));

export function recordHealth(index, record, asOf = index.asOf) {
  const state = effectiveFreshness(record, asOf);
  const source = index.sources.get(record?.source_id);
  const now = asOf instanceof Date ? asOf.getTime() : parseTime(asOf);
  const reviewedAt = parseTime(record?.reviewed_at);
  const reviewProvenanceComplete =
    typeof record?.source_locator === "string" && record.source_locator.trim().length > 0 &&
    typeof record?.review_ref === "string" && record.review_ref.trim().length > 0 &&
    reviewedAt !== null && now !== null && reviewedAt <= now;
  const usable = record?.record_status === "record_verified" &&
    reviewProvenanceComplete &&
    isOfficialSource(source) &&
    ACTIVE_STATES.has(state);
  return { usable, state, source, reviewProvenanceComplete };
}

const benchmarkScheduleValid = (freshness) => {
  const verified = parseTime(freshness?.verified_at);
  const checkDue = parseTime(freshness?.check_due_at);
  const stale = parseTime(freshness?.stale_at);
  const expires = parseTime(freshness?.expires_at);
  return verified !== null && checkDue - verified === 7 * DAY_MS && stale - verified === 14 * DAY_MS && expires - verified === 30 * DAY_MS;
};

const apiKwargsLeafPaths = (value, prefix = "") => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return prefix ? [prefix] : [];
  return Object.entries(value).flatMap(([key, child]) => apiKwargsLeafPaths(child, prefix ? `${prefix}.${key}` : key));
};

const benchmarkConfigurationStatus = (record) => {
  const configuration = record?.model_configuration;
  if (!configuration || configuration.api_model_id !== record.api_model_id || configuration.source_model_id !== record.source_row_id) return "configuration_incomplete";
  if (configuration.exact_model_mapping !== true || !Array.isArray(configuration.fallback_model_ids) || configuration.fallback_model_ids.length > 0) return "configuration_incomplete";
  if (typeof configuration.provider_route !== "string" || configuration.provider_route.trim().length === 0) return "configuration_incomplete";
  for (const key of ["reasoning_effort", "temperature", "max_output_tokens"]) {
    const parameter = configuration[key];
    if (!parameter || !BENCHMARK_PARAMETER_STATES.has(parameter.status)) return "configuration_incomplete";
    if (parameter.status === "set" && (parameter.value === null || parameter.value === undefined || parameter.value === "")) return "configuration_incomplete";
    if (parameter.status !== "set" && parameter.value !== null) return "configuration_incomplete";
  }
  if (!BENCHMARK_API_KWARGS_STATES.has(configuration.api_kwargs_status) || !configuration.api_kwargs || typeof configuration.api_kwargs !== "object" || Array.isArray(configuration.api_kwargs)) return "configuration_incomplete";
  if (!Array.isArray(configuration.api_kwargs_known_paths) || configuration.api_kwargs_known_paths.some((path) => typeof path !== "string" || path.trim().length === 0)) return "configuration_incomplete";
  const actualKwargPaths = apiKwargsLeafPaths(configuration.api_kwargs).sort();
  const declaredKwargPaths = [...configuration.api_kwargs_known_paths].sort();
  if (JSON.stringify(actualKwargPaths) !== JSON.stringify(declaredKwargPaths)) return "configuration_incomplete";
  if (configuration.api_kwargs_status === "exact_transcription" && actualKwargPaths.length === 0) return "configuration_incomplete";
  if (configuration.api_kwargs_status === "source_has_no_api_kwargs" && actualKwargPaths.length > 0) return "configuration_incomplete";
  if (typeof record.configuration_source_url !== "string" || !record.configuration_source_url.startsWith("https://")) return "configuration_incomplete";
  if (typeof record.configuration_source_locator !== "string" || record.configuration_source_locator.trim().length === 0) return "configuration_incomplete";
  return "complete";
};

export function benchmarkRecordHealth(index, record, asOf = index?.asOf ?? new Date()) {
  if (!index || !record) return { usable: false, state: "unverified", configurationStatus: "configuration_incomplete" };
  const state = effectiveFreshness(record, asOf);
  const source = index.sources.get(record.source_id);
  const now = asOf instanceof Date ? asOf.getTime() : parseTime(asOf);
  const reviewedAt = parseTime(record.reviewed_at);
  const reviewComplete = typeof record.source_locator === "string" && record.source_locator.trim().length > 0 &&
    typeof record.review_ref === "string" && record.review_ref.trim().length > 0 &&
    reviewedAt !== null && now !== null && reviewedAt <= now;
  const sourceComplete = source?.source_type === "independent_benchmark" && source?.source_status === "independent_benchmark_verified";
  const licenseComplete = record.license === "CC-BY-SA-4.0" && record.license_status === "redistributable_with_attribution_sharealike";
  const configurationStatus = record.definition_id ? benchmarkConfigurationStatus(record) : "not_applicable";
  const usable = record.record_status === "record_verified" && reviewComplete && sourceComplete && licenseComplete &&
    benchmarkScheduleValid(record.freshness) && BENCHMARK_ACTIVE_STATES.has(state) &&
    (configurationStatus === "not_applicable" || configurationStatus === "complete");
  return { usable, state, source, reviewComplete, sourceComplete, licenseComplete, configurationStatus };
}

export function normalizeBenchmarkDataset(raw, catalogIndex, asOf = new Date()) {
  if (!raw || raw.benchmark_schema_version !== BENCHMARK_SCHEMA_VERSION) throw new Error(`Nem támogatott benchmark_schema_version: ${raw?.benchmark_schema_version ?? "hiányzik"}`);
  if (raw.license !== "CC-BY-SA-4.0" || raw.license_url !== "https://creativecommons.org/licenses/by-sa/4.0/") throw new Error("A benchmarkadat licence hiányos vagy nem támogatott.");
  if (typeof raw.attribution !== "string" || !raw.attribution.includes("LiveBench")) throw new Error("Hiányzó LiveBench-attribúció.");
  if (typeof raw.modification_notice_hu !== "string" || !raw.modification_notice_hu.includes("exact modellekhez kapcsolva")) throw new Error("Hiányzó benchmark-módosítási nyilatkozat.");
  for (const key of ["sources", "benchmark_definitions", "benchmark_results"]) assertArray(raw[key], key);

  const sources = buildUniqueMap(raw.sources, "benchmark sources");
  const definitions = buildUniqueMap(raw.benchmark_definitions, "benchmark definitions");
  const results = buildUniqueMap(raw.benchmark_results, "benchmark results");
  const resultsByDefinition = new Map();

  for (const definition of definitions.values()) {
    if (!BENCHMARK_TASKS.has(definition.task_id) || !catalogIndex.tasks.has(definition.task_id)) throw new Error(`Hibás benchmark task: ${definition.id}`);
    if (!sources.has(definition.source_id)) throw new Error(`Hibás benchmarkforrás: ${definition.id}`);
    if (!Number.isSafeInteger(definition.sample_size) || definition.sample_size <= 0 || definition.higher_is_better !== true) throw new Error(`Hibás benchmark-definíció: ${definition.id}`);
    if (!Number.isSafeInteger(definition.coverage?.catalog_model_count) || definition.coverage.catalog_model_count !== catalogIndex.models.size) throw new Error(`Hibás benchmark-lefedettség: ${definition.id}`);
    if (!Array.isArray(definition.coverage?.unmeasured_model_ids)) throw new Error(`Hiányzó unmeasured lista: ${definition.id}`);
  }

  for (const result of results.values()) {
    const definition = definitions.get(result.definition_id);
    const model = catalogIndex.models.get(result.model_id);
    if (!definition || !model || !sources.has(result.source_id)) throw new Error(`Hibás benchmarkeredmény-hivatkozás: ${result.id}`);
    if (result.task_id !== definition.task_id || result.api_model_id !== model.api_model_id) throw new Error(`Hibás exact modellkapcsolat: ${result.id}`);
    if (typeof result.metric_value !== "string" || !/^\d+(\.\d{1,6})?$/.test(result.metric_value)) throw new Error(`Hibás benchmarkpontszám: ${result.id}`);
    const derivedStatus = benchmarkConfigurationStatus(result);
    if (result.configuration_status !== derivedStatus || derivedStatus !== "complete") throw new Error(`Hiányos benchmarkkonfiguráció: ${result.id}`);
    const items = resultsByDefinition.get(result.definition_id) ?? [];
    items.push(result);
    resultsByDefinition.set(result.definition_id, items);
  }

  for (const definition of definitions.values()) {
    const items = resultsByDefinition.get(definition.id) ?? [];
    const modelIds = new Set(items.map((item) => item.model_id));
    const providers = new Set(items.map((item) => catalogIndex.models.get(item.model_id)?.provider_id));
    if (items.length !== modelIds.size || items.length !== definition.coverage.measured_model_count || providers.size !== definition.coverage.provider_count) {
      throw new Error(`A benchmark-lefedettség nem egyezik az eredményrekordokkal: ${definition.id}`);
    }
    const unmeasured = [...catalogIndex.models.keys()].filter((modelId) => !modelIds.has(modelId)).sort();
    if (JSON.stringify(unmeasured) !== JSON.stringify([...definition.coverage.unmeasured_model_ids].sort())) throw new Error(`Hibás unmeasured modelllista: ${definition.id}`);
  }

  return { raw, asOf, sources, definitions, results, resultsByDefinition };
}

export function qualityRankingFor(catalogIndex, benchmarkIndex, { taskId, priorityId, evaluations }, asOf = catalogIndex.asOf) {
  const unavailable = (reasonCode) => ({ available: false, reasonCode, rows: [], measuredCount: 0, providerCount: 0, totalModelCount: catalogIndex.models.size });
  if (priorityId !== "quality") return unavailable("priority_not_quality");
  const task = taskFor(catalogIndex, taskId);
  const policy = recommendationPolicyFor(catalogIndex, priorityId);
  if (!task || !policy?.ranking_available || !policy.ranking_task_ids?.includes(taskId)) return unavailable("task_not_supported");
  if (!benchmarkIndex) return unavailable("benchmark_unavailable");
  const acceptedIds = task.accepted_quality_benchmark_ids ?? [];
  if (acceptedIds.length !== 1) return unavailable("benchmark_definition_missing");
  const definition = benchmarkIndex.definitions.get(acceptedIds[0]);
  const definitionHealth = benchmarkRecordHealth(benchmarkIndex, definition, asOf);
  if (!definition || !definitionHealth.usable) return unavailable("benchmark_definition_unusable");

  const grouped = new Map();
  for (const result of benchmarkIndex.resultsByDefinition.get(definition.id) ?? []) {
    const items = grouped.get(result.model_id) ?? [];
    items.push(result);
    grouped.set(result.model_id, items);
  }
  const sourceUsableResults = [];
  for (const [modelId, items] of grouped.entries()) {
    if (items.length !== 1) continue;
    const health = benchmarkRecordHealth(benchmarkIndex, items[0], asOf);
    if (!health.usable) continue;
    sourceUsableResults.push({ modelId, benchmarkResult: items[0], health });
  }
  sourceUsableResults.sort((a, b) => Number(b.benchmarkResult.metric_value) - Number(a.benchmarkResult.metric_value) || catalogIndex.models.get(a.modelId).name.localeCompare(catalogIndex.models.get(b.modelId).name, "hu"));
  const evaluationByModel = new Map((evaluations ?? []).map((item) => [item.model?.id, item]));
  const usableResults = [];
  for (const [sourceIndex, item] of sourceUsableResults.entries()) {
    const { modelId, benchmarkResult, health } = item;
    const evaluation = evaluationByModel.get(modelId);
    if (!evaluation || evaluation.technicalEligibility !== "eligible") continue;
    usableResults.push({ benchmarkResult, evaluation, health, sourcePosition: sourceIndex + 1 });
  }
  usableResults.sort((a, b) => Number(b.benchmarkResult.metric_value) - Number(a.benchmarkResult.metric_value) || a.evaluation.model.name.localeCompare(b.evaluation.model.name, "hu"));
  const sourceProviderCount = new Set(sourceUsableResults.map((item) => catalogIndex.models.get(item.modelId)?.provider_id)).size;
  const eligibleProviderCount = new Set(usableResults.map((item) => item.evaluation.model.provider_id)).size;
  if (usableResults.length < 3 || eligibleProviderCount < 2) return unavailable("benchmark_coverage_insufficient");

  return {
    available: true,
    reasonCode: null,
    definition,
    freshnessState: definitionHealth.state,
    measuredCount: sourceUsableResults.length,
    providerCount: sourceProviderCount,
    sourceMeasuredCount: sourceUsableResults.length,
    sourceProviderCount,
    eligibleMeasuredCount: usableResults.length,
    eligibleProviderCount,
    totalModelCount: catalogIndex.models.size,
    unmeasuredModelIds: [...catalogIndex.models.keys()].filter((modelId) => !sourceUsableResults.some((item) => item.modelId === modelId)),
    rows: usableResults.map((item, index) => ({ ...item, position: index + 1 }))
  };
}

export function normalizeCatalog(raw, asOf = new Date()) {
  if (!raw || raw.schema_version !== SCHEMA_VERSION) throw new Error(`Nem támogatott schema_version: ${raw?.schema_version ?? "hiányzik"}`);
  for (const key of [
    "providers",
    "provider_links",
    "models",
    "prices",
    "capabilities",
    "tasks",
    "recommendation_policies",
    "benchmark_definitions",
    "benchmark_results",
    "sources"
  ]) assertArray(raw[key], key);

  const providers = buildUniqueMap(raw.providers, "providers");
  const providerLinks = buildUniqueMap(raw.provider_links, "provider_links");
  const models = buildUniqueMap(raw.models, "models");
  const prices = buildUniqueMap(raw.prices, "prices");
  const capabilities = buildUniqueMap(raw.capabilities, "capabilities");
  const tasks = buildUniqueMap(raw.tasks, "tasks");
  const recommendationPolicies = buildUniqueMap(raw.recommendation_policies, "recommendation_policies");
  const benchmarkDefinitions = buildUniqueMap(raw.benchmark_definitions, "benchmark_definitions");
  const benchmarkResults = buildUniqueMap(raw.benchmark_results, "benchmark_results");
  const sources = buildUniqueMap(raw.sources, "sources");
  const pricesByModel = new Map();
  const capabilitiesByModel = new Map();
  const linksByProvider = new Map();
  const policiesByPriority = new Map();

  for (const model of models.values()) {
    if (!providers.has(model.provider_id) || !sources.has(model.source_id)) throw new Error(`Hibás modellhivatkozás: ${model.id}`);
  }
  for (const price of prices.values()) {
    if (!models.has(price.model_id) || !sources.has(price.source_id)) throw new Error(`Hibás árhivatkozás: ${price.id}`);
    const items = pricesByModel.get(price.model_id) ?? [];
    items.push(price);
    pricesByModel.set(price.model_id, items);
  }
  for (const capability of capabilities.values()) {
    if (!models.has(capability.model_id) || !sources.has(capability.source_id)) throw new Error(`Hibás capability hivatkozás: ${capability.id}`);
    if (!CAPABILITY_KEYS.has(capability.capability)) throw new Error(`Ismeretlen capability kulcs: ${capability.id}`);
    if (!CAPABILITY_SUPPORT_STATES.has(capability.support)) throw new Error(`Hibás capability support: ${capability.id}`);
    if (!EXTRA_COST_STATES.has(capability.extra_cost_status)) throw new Error(`Hibás capability extra_cost_status: ${capability.id}`);
    if (typeof capability.source_url !== "string" || capability.source_url !== sources.get(capability.source_id)?.url) {
      throw new Error(`Hibás capability forrás-URL: ${capability.id}`);
    }
    const items = capabilitiesByModel.get(capability.model_id) ?? [];
    items.push(capability);
    capabilitiesByModel.set(capability.model_id, items);
  }
  for (const task of tasks.values()) {
    if (!Array.isArray(task.required_capabilities)) throw new Error(`Hibás feladat capability-lista: ${task.id}`);
    if (task.required_capabilities.some((key) => !CAPABILITY_KEYS.has(key))) throw new Error(`Ismeretlen feladat capability: ${task.id}`);
    if (!Array.isArray(task.accepted_quality_benchmark_ids)) throw new Error(`Hibás feladat benchmark-lista: ${task.id}`);
    if (!["standard_text_complete", "token_baseline"].includes(task.cost_scope)) throw new Error(`Hibás feladat költségscope: ${task.id}`);
  }
  for (const policy of recommendationPolicies.values()) {
    if (policiesByPriority.has(policy.priority_id)) throw new Error(`Ismétlődő ajánlási policy: ${policy.priority_id}`);
    if (policy.priority_id === "quality" && (!Array.isArray(policy.ranking_task_ids) || policy.ranking_task_ids.some((taskId) => !tasks.has(taskId)))) {
      throw new Error(`Hibás quality policy task-scope: ${policy.id}`);
    }
    policiesByPriority.set(policy.priority_id, policy);
  }
  for (const link of providerLinks.values()) {
    if (!providers.has(link.provider_id) || !sources.has(link.source_id)) throw new Error(`Hibás provider-link hivatkozás: ${link.id}`);
    const items = linksByProvider.get(link.provider_id) ?? [];
    items.push(link);
    linksByProvider.set(link.provider_id, items);
  }

  return {
    raw,
    asOf,
    providers,
    providerLinks,
    models,
    prices,
    capabilities,
    tasks,
    recommendationPolicies,
    benchmarkDefinitions,
    benchmarkResults,
    sources,
    pricesByModel,
    capabilitiesByModel,
    linksByProvider,
    policiesByPriority,
    isSample: raw.proof_only === true || raw.production_publication_approved !== true
  };
}

export function normalizeProfile(value) {
  const profile = {
    runsPerMonth: Number(value.runsPerMonth),
    inputTextTokensPerRun: Number(value.inputTextTokensPerRun),
    outputTextTokensPerRun: Number(value.outputTextTokensPerRun),
    cachedInputTextTokensPerRun: Number(value.cachedInputTextTokensPerRun ?? 0),
    processingMode: value.processingMode ?? "standard",
    apiChannel: value.apiChannel ?? "direct",
    inputModality: value.inputModality ?? "text",
    outputModality: value.outputModality ?? "text",
    allowPreview: Boolean(value.allowPreview),
    requireDocumentedStable: Boolean(value.requireDocumentedStable),
    requiredCapabilities: [...new Set(value.requiredCapabilities ?? [])]
  };
  const integerFields = ["runsPerMonth", "inputTextTokensPerRun", "outputTextTokensPerRun", "cachedInputTextTokensPerRun"];
  const valid = integerFields.every((key) => Number.isSafeInteger(profile[key]) && profile[key] >= 0) && profile.runsPerMonth > 0;
  return { profile, valid };
}

export function parseUsdPerMillionToMicros(amount) {
  if (typeof amount !== "string" || !/^\d+(\.\d{1,6})?$/.test(amount)) throw new Error(`Hibás USD decimális érték: ${amount}`);
  const [whole, fraction = ""] = amount.split(".");
  return BigInt(whole) * 1_000_000n + BigInt((fraction + "000000").slice(0, 6));
}

const fixedUsd = (numerator) => {
  const microUsd = (numerator + 500_000n) / 1_000_000n;
  return `${microUsd / 1_000_000n}.${(microUsd % 1_000_000n).toString().padStart(6, "0")}`;
};

export function formatUsd(amount) {
  const numeric = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numeric);
}

const reason = (code, detail) => ({ code, label: detail ?? REASON_LABELS[code] ?? code });

const hasCompleteContextPricing = (contextPricing) =>
  contextPricing?.kind === "flat_within_limit" &&
  Number.isSafeInteger(contextPricing.max_input_tokens) &&
  contextPricing.max_input_tokens > 0;

const hasCompleteRegionPricing = (regionPricing) => {
  if (!regionPricing || typeof regionPricing.kind !== "string") return false;
  if (regionPricing.kind === "route_specific") {
    return typeof regionPricing.route === "string" && regionPricing.route.trim().length > 0;
  }
  if (regionPricing.kind === "inference_geo") {
    return typeof regionPricing.value === "string" && regionPricing.value.trim().length > 0 &&
      typeof regionPricing.multiplier === "string" && /^\d+(\.\d+)?$/.test(regionPricing.multiplier) &&
      Number(regionPricing.multiplier) > 0;
  }
  if (regionPricing.kind === "gemini_developer_api_published_scope") {
    return regionPricing.availability_requires_supported_region === true;
  }
  return false;
};

const priceScopeMatches = (price, profile) => {
  const conditions = price.conditions;
  return profile.inputModality === "text" &&
    profile.outputModality === "text" &&
    price.processing_mode === profile.processingMode &&
    price.unit === "1m_tokens" &&
    price.currency === "USD" &&
    conditions?.api_channel === profile.apiChannel &&
    conditions?.modality === "text" &&
    conditions?.account_tier === "standard_paid" &&
    hasCompleteContextPricing(conditions?.context_pricing) &&
    hasCompleteRegionPricing(conditions?.region_pricing) &&
    Array.isArray(conditions?.additional_price_components) &&
    conditions.additional_price_components.length === 0;
};

const selectPrice = (index, modelId, chargeType, profile, asOf, reasons) => {
  const all = (index.pricesByModel.get(modelId) ?? []).filter((item) => item.charge_type === chargeType);
  const scope = all.filter((item) => priceScopeMatches(item, profile));
  if (scope.length > 1) {
    reasons.push(reason("ambiguous_price"));
    return null;
  }
  if (scope.length === 0) {
    reasons.push(reason(all.length ? "price_scope" : "price_missing"));
    return null;
  }
  const price = scope[0];
  if (!recordHealth(index, price, asOf).usable) {
    reasons.push(reason("price_record_unusable"));
    return null;
  }
  const maxInput = price.conditions?.context_pricing?.max_input_tokens;
  if (Number.isFinite(maxInput) && profile.inputTextTokensPerRun > maxInput) {
    reasons.push(reason("price_context_band"));
    return null;
  }
  const validThrough = price.conditions?.announced_valid_through_date;
  const dateKey = (asOf instanceof Date ? asOf : new Date(asOf)).toISOString().slice(0, 10);
  if (validThrough && dateKey > validThrough) {
    reasons.push(reason("price_time_window"));
    return null;
  }
  return price;
};

export function capabilityFor(index, modelId, capability, asOf = index.asOf) {
  const records = (index.capabilitiesByModel.get(modelId) ?? []).filter((item) => item.capability === capability);
  if (records.length !== 1) return { support: "unknown", state: records.length > 1 ? "quarantined" : "unverified", record: null };
  const health = recordHealth(index, records[0], asOf);
  if (!health.usable) return { support: "unknown", state: health.state, record: records[0] };
  return { support: records[0].support, state: health.state, record: records[0] };
}

export function providerLinkFor(index, providerId, linkType = "api_key", asOf = index.asOf) {
  const matches = (index.linksByProvider.get(providerId) ?? []).filter((item) => item.link_type === linkType);
  if (matches.length !== 1) return null;
  const link = matches[0];
  if (!recordHealth(index, link, asOf).usable || !link.url?.startsWith("https://")) return null;
  return link;
}

export function taskFor(index, taskId) {
  const task = index.tasks.get(taskId);
  return task?.status === "active" ? task : null;
}

export function recommendationPolicyFor(index, priorityId) {
  const policy = index.policiesByPriority.get(priorityId);
  return policy?.status === "active" ? policy : null;
}

export function evaluateModel(index, modelId, profileInput, asOf = index.asOf) {
  const { profile, valid } = normalizeProfile(profileInput);
  const reasons = [];
  const model = index.models.get(modelId);
  if (!valid) reasons.push(reason("invalid_profile"));
  if (!model) reasons.push(reason("model_not_found"));
  if (!valid || !model) return { model: model ?? null, eligibility: "unavailable", costStatus: "unavailable", reasons, reasonCodes: reasons.map((item) => item.code) };

  const modelHealth = recordHealth(index, model, asOf);
  if (!modelHealth.usable) reasons.push(reason("model_record_unusable"));
  if (["deprecated", "retired"].includes(model.lifecycle) || (model.lifecycle === "preview" && !profile.allowPreview)) {
    reasons.push(reason("lifecycle_excluded"));
  }
  if (profile.requireDocumentedStable && model.lifecycle !== "stable") reasons.push(reason("stable_not_documented"));
  if (profile.inputTextTokensPerRun + profile.cachedInputTextTokensPerRun + profile.outputTextTokensPerRun > model.context_window_tokens) {
    reasons.push(reason("context_limit"));
  }
  if (model.max_output_tokens !== null && profile.outputTextTokensPerRun > model.max_output_tokens) reasons.push(reason("output_limit"));

  const requirements = profile.requiredCapabilities.map((key) => {
    const capability = capabilityFor(index, modelId, key, asOf);
    const met = capability.support === "supported";
    if (!met) reasons.push(reason("missing_capability", `${key}: nincs használható hivatalos támogatási rekord.`));
    return {
      key,
      met,
      support: capability.support,
      state: capability.state,
      evidenceId: capability.record?.id ?? null,
      apiRoute: capability.record?.api_route ?? null,
      conditionsHu: capability.record?.conditions_hu ?? null,
      extraCostStatus: capability.record?.extra_cost_status ?? "unknown",
      verifiedAt: capability.record?.freshness?.verified_at ?? null
    };
  });

  const technicalReasonCodes = new Set([
    "invalid_profile",
    "model_not_found",
    "model_record_unusable",
    "lifecycle_excluded",
    "stable_not_documented",
    "context_limit",
    "output_limit",
    "missing_capability"
  ]);
  const technicalEligibility = reasons.some((item) => technicalReasonCodes.has(item.code)) ? "excluded" : "eligible";
  const capabilityEvidenceIds = requirements.map((item) => item.evidenceId).filter(Boolean);

  if (profile.cachedInputTextTokensPerRun > 0) reasons.push(reason("unsupported_cache"));
  const inputPrice = selectPrice(index, modelId, "input_text_tokens", profile, asOf, reasons);
  const outputPrice = selectPrice(index, modelId, "output_text_tokens", profile, asOf, reasons);
  const blocking = reasons.length > 0;
  if (blocking || !inputPrice || !outputPrice) {
    return {
      model,
      modelHealth,
      eligibility: "excluded",
      costStatus: reasons.some((item) => item.code === "unsupported_cache" || item.code === "price_context_band") ? "unsupported" : "unavailable",
      reasons,
      reasonCodes: reasons.map((item) => item.code),
      requirements,
      technicalEligibility,
      capabilityEvidenceIds,
      inputPrice,
      outputPrice,
      apiKeyLink: providerLinkFor(index, model.provider_id, "api_key", asOf),
      apiQuickstartLink: providerLinkFor(index, model.provider_id, "quickstart", asOf),
      derivedFrom: [model.id, ...capabilityEvidenceIds, inputPrice?.id, outputPrice?.id].filter(Boolean)
    };
  }

  const monthlyInput = BigInt(profile.runsPerMonth) * BigInt(profile.inputTextTokensPerRun);
  const monthlyOutput = BigInt(profile.runsPerMonth) * BigInt(profile.outputTextTokensPerRun);
  const inputNumerator = monthlyInput * parseUsdPerMillionToMicros(inputPrice.amount);
  const outputNumerator = monthlyOutput * parseUsdPerMillionToMicros(outputPrice.amount);
  const totalNumerator = inputNumerator + outputNumerator;

  return {
    model,
    modelHealth,
    eligibility: "eligible",
    costStatus: "complete",
    reasons,
    reasonCodes: [],
    requirements,
    technicalEligibility,
    capabilityEvidenceIds,
    monthlyInputTokens: monthlyInput.toString(),
    monthlyOutputTokens: monthlyOutput.toString(),
    inputCostUsd: fixedUsd(inputNumerator),
    outputCostUsd: fixedUsd(outputNumerator),
    totalCostUsd: fixedUsd(totalNumerator),
    costNumerator: totalNumerator,
    appliedPriceIds: [inputPrice.id, outputPrice.id],
    verifiedAt: [inputPrice.freshness.verified_at, outputPrice.freshness.verified_at],
    inputPrice,
    outputPrice,
    apiKeyLink: providerLinkFor(index, model.provider_id, "api_key", asOf),
    apiQuickstartLink: providerLinkFor(index, model.provider_id, "quickstart", asOf),
    derivedFrom: [model.id, ...capabilityEvidenceIds, inputPrice.id, outputPrice.id]
  };
}

export function evaluateAllModels(index, profile, asOf = index.asOf) {
  return [...index.models.keys()].map((modelId) => evaluateModel(index, modelId, profile, asOf));
}
