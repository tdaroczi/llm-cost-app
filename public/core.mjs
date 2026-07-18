const SCHEMA_VERSION = "2.0.0";
const OFFICIAL_SOURCE_STATES = new Set(["official_source_page_verified", "official_login_required"]);
const ACTIVE_STATES = new Set(["current", "current_degraded", "overdue_degraded"]);

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

export function normalizeCatalog(raw, asOf = new Date()) {
  if (!raw || raw.schema_version !== SCHEMA_VERSION) throw new Error(`Nem támogatott schema_version: ${raw?.schema_version ?? "hiányzik"}`);
  for (const key of ["providers", "provider_links", "models", "prices", "capabilities", "sources"]) assertArray(raw[key], key);

  const providers = buildUniqueMap(raw.providers, "providers");
  const providerLinks = buildUniqueMap(raw.provider_links, "provider_links");
  const models = buildUniqueMap(raw.models, "models");
  const prices = buildUniqueMap(raw.prices, "prices");
  const capabilities = buildUniqueMap(raw.capabilities, "capabilities");
  const sources = buildUniqueMap(raw.sources, "sources");
  const pricesByModel = new Map();
  const capabilitiesByModel = new Map();
  const linksByProvider = new Map();

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
    const items = capabilitiesByModel.get(capability.model_id) ?? [];
    items.push(capability);
    capabilitiesByModel.set(capability.model_id, items);
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
    sources,
    pricesByModel,
    capabilitiesByModel,
    linksByProvider,
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
    return { key, met, support: capability.support, state: capability.state };
  });

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
      inputPrice,
      outputPrice,
      apiKeyLink: providerLinkFor(index, model.provider_id, "api_key", asOf)
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
    apiKeyLink: providerLinkFor(index, model.provider_id, "api_key", asOf)
  };
}

export function evaluateAllModels(index, profile, asOf = index.asOf) {
  return [...index.models.keys()].map((modelId) => evaluateModel(index, modelId, profile, asOf));
}
