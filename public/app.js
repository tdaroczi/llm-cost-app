import {
  capabilityFor,
  effectiveFreshness,
  evaluateAllModels,
  evaluateModel,
  formatUsd,
  normalizeBenchmarkDataset,
  normalizeCatalog,
  normalizeProfile,
  qualityRankingFor,
  recommendationPolicyFor,
  recordHealth,
  taskFor
} from "./core.mjs?v=gate-5d";

const PRIORITY_OPTIONS = Object.freeze([
  { id: "balanced", label: "Nem tudom – mutasd a kiegyensúlyozottat", detail: "Jó alapbeállítás, ha nem szeretnél technikai döntést hozni." },
  { id: "quality", label: "A lehető legjobb eredmény", detail: "Csak független minőségi bizonyítékkal rangsorolható." },
  { id: "price", label: "A lehető legalacsonyabb ár", detail: "Az ellenőrzött standard szöveges tokenköltség alapján; külön díjak nélkül." },
  { id: "speed", label: "A lehető leggyorsabb válasz", detail: "Csak független sebességméréssel rangsorolható." }
]);

const USAGE_OPTIONS = Object.freeze([
  { id: "trial", label: "Kipróbálnám", detail: "Például napi 5 kérés", runs: 150 },
  { id: "regular", label: "Rendszeresen használnám", detail: "Például napi 20 kérés", runs: 600 },
  { id: "volume", label: "Nagy forgalomra kell", detail: "Például napi 1000 kérés", runs: 30000 }
]);

const CAPABILITY_LABELS = Object.freeze({
  image_input: "képbemenet",
  function_calling: "funkcióhívás",
  structured_output: "strukturált válasz",
  provider_web_search: "szolgáltatói webes keresés",
  file_or_pdf_input: "fájl- vagy PDF-bemenet"
});

const ICON_PATHS = Object.freeze({
  write: ["M4 20h4L19 9l-4-4L4 16v4Z", "m13 7 4 4"],
  code: ["m8 9-4 3 4 3", "m16 9 4 3-4 3", "m14 5-4 14"],
  reason: ["M9 18h6", "M10 22h4", "M8.2 14.5a7 7 0 1 1 7.6 0c-.7.5-1 1.2-1 2.1H9.2c0-.9-.3-1.6-1-2.1Z"],
  document: ["M6 2h8l4 4v16H6Z", "M14 2v5h5"],
  database: ["M4 6c0-2.2 3.6-4 8-4s8 1.8 8 4-3.6 4-8 4-8-1.8-8-4Z", "M4 6v6c0 2.2 3.6 4 8 4s8-1.8 8-4V6", "M4 12v6c0 2.2 3.6 4 8 4s8-1.8 8-4v-6"],
  user: ["M20 21a8 8 0 0 0-16 0", "M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"],
  globe: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "M2 12h20", "M12 2a15 15 0 0 1 0 20", "M12 2a15 15 0 0 0 0 20"],
  image: ["M3 5h18v14H3Z", "m3 16 5-5 4 4 3-3 6 6", "M16 9h.01"],
  gear: ["M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z", "M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 3.6-.1-.1a1.7 1.7 0 0 0-1.9-.3l-.8.3a1.7 1.7 0 0 0-1.1 1.6V22H10v-.1a1.7 1.7 0 0 0-1.1-1.6l-.8-.3a1.7 1.7 0 0 0-1.9.3l-.1.1L4 16.8l.1-.1a1.7 1.7 0 0 0 .3-1.9l-.3-.8A1.7 1.7 0 0 0 2.5 13H2V9h.5a1.7 1.7 0 0 0 1.6-1.1l.3-.8a1.7 1.7 0 0 0-.3-1.9L4 5.1l2.1-3.6.1.1a1.7 1.7 0 0 0 1.9.3l.8-.3A1.7 1.7 0 0 0 10 .1V0h4v.1a1.7 1.7 0 0 0 1.1 1.6l.8.3a1.7 1.7 0 0 0 1.9-.3l.1-.1L20 5.2l-.1.1a1.7 1.7 0 0 0-.3 1.9l.3.8a1.7 1.7 0 0 0 1.6 1H22v4h-.5a1.7 1.7 0 0 0-1.6 1.1l-.5.9Z"],
  search: ["m21 21-4.3-4.3", "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z"]
});

const RESULT_FIELD_ORDER = Object.freeze([
  "Modell és szolgáltató",
  "Havi becsült költség",
  "Ár állapota",
  "Kontextus",
  "API-kulcs"
]);

const state = {
  index: null,
  benchmarks: null,
  asOf: new Date(),
  route: "task",
  coverage: { compare: "", task: "" },
  advisor: { step: 1, taskId: null, priorityId: "balanced", usageId: "regular" }
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const clear = (element) => { while (element.firstChild) element.removeChild(element.firstChild); };
const node = (tag, options = {}) => {
  const element = document.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = options.text;
  if (options.attrs) for (const [key, value] of Object.entries(options.attrs)) element.setAttribute(key, value);
  return element;
};

const formatInteger = (value) => new Intl.NumberFormat("hu-HU").format(value);
const formatDate = (value) => {
  if (!value) return "nincs adat";
  return new Intl.DateTimeFormat("hu-HU", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
};

function announce(message) {
  const live = $("#liveRegion");
  live.textContent = "";
  window.setTimeout(() => { live.textContent = message; }, 20);
}

function baseProfile(values) {
  return {
    runsPerMonth: Number(values.runsPerMonth),
    inputTextTokensPerRun: Number(values.inputTextTokensPerRun),
    outputTextTokensPerRun: Number(values.outputTextTokensPerRun),
    cachedInputTextTokensPerRun: 0,
    processingMode: "standard",
    apiChannel: "direct",
    inputModality: "text",
    outputModality: "text",
    allowPreview: Boolean(values.allowPreview),
    requireDocumentedStable: Boolean(values.requireDocumentedStable),
    requiredCapabilities: values.requiredCapabilities ?? []
  };
}

function compareProfile() {
  return baseProfile({
    runsPerMonth: $("#compareRuns").value,
    inputTextTokensPerRun: $("#compareInput").value,
    outputTextTokensPerRun: $("#compareOutput").value
  });
}

function taskProfile() {
  const task = currentTask();
  return baseProfile({
    runsPerMonth: $("#taskRuns").value,
    inputTextTokensPerRun: $("#taskInput").value,
    outputTextTokensPerRun: $("#taskOutput").value,
    requiredCapabilities: task?.requiredCapabilities ?? []
  });
}

function routeFromHash() {
  return window.location.hash === "#compare" ? "compare" : "task";
}

function syncHeaderCoverage() {
  if (!state.index) return;
  const routeCoverage = state.coverage[state.route];
  if (routeCoverage) {
    $("#headerCoverage").textContent = routeCoverage;
    return;
  }
  const models = [...state.index.models.values()];
  const current = models.filter((model) => recordHealth(state.index, model, state.asOf).usable).length;
  $("#headerCoverage").textContent = `${current}/${models.length} modellrekord használható`;
}

function renderRoute() {
  state.route = routeFromHash();
  $$('[data-route]').forEach((route) => { route.hidden = route.dataset.route !== state.route; });
  $$('[data-route-link]').forEach((link) => {
    if (link.dataset.routeLink === state.route) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document.title = state.route === "task" ? "LLM választó · LLM Observatory" : "Modell-összehasonlítás · LLM Observatory";
  syncHeaderCoverage();
}

function populateModels() {
  const models = [...state.index.models.values()].sort((a, b) => {
    const providerA = state.index.providers.get(a.provider_id)?.name ?? "";
    const providerB = state.index.providers.get(b.provider_id)?.name ?? "";
    return `${providerA}:${a.name}`.localeCompare(`${providerB}:${b.name}`, "hu");
  });
  for (const select of [$("#modelA"), $("#modelB")]) {
    clear(select);
    for (const model of models) {
      const provider = state.index.providers.get(model.provider_id);
      const option = node("option", { text: `${model.name} · ${provider?.name ?? model.provider_id}` });
      option.value = model.id;
      select.append(option);
    }
  }
  $("#modelA").value = models[0]?.id ?? "";
  $("#modelB").value = models[1]?.id ?? "";
  updateModelLabels();
}

function updateModelLabels() {
  const a = state.index?.models.get($("#modelA").value);
  const b = state.index?.models.get($("#modelB").value);
  $("#modelAId").textContent = a?.api_model_id ?? "API ID nem elérhető";
  $("#modelBId").textContent = b?.api_model_id ?? "API ID nem elérhető";
  updateCompareValidity();
}

function updateCompareValidity() {
  const same = $("#modelA").value === $("#modelB").value;
  const valid = normalizeProfile(compareProfile()).valid;
  $("#compareButton").disabled = same || !valid;
  if (!valid) {
    $("#compareHelp").textContent = "A futásszám legalább 1 legyen, a tokenértékek pedig nemnegatív egész számok.";
    $("#compareHelp").classList.add("error");
  } else if (same) {
    $("#compareHelp").textContent = "Válassz két különböző modellt.";
    $("#compareHelp").classList.add("error");
  } else {
    $("#compareHelp").textContent = "Direct · standard · szöveg · cache nélkül · USD";
    $("#compareHelp").classList.remove("error");
  }
}

function updateCompareProfileSummary() {
  const profile = compareProfile();
  $("#compareRunsSummary").textContent = formatInteger(profile.runsPerMonth || 0);
  $("#compareInputSummary").textContent = formatInteger(profile.inputTextTokensPerRun || 0);
  $("#compareOutputSummary").textContent = formatInteger(profile.outputTextTokensPerRun || 0);
  updateCompareValidity();
}

function markCompareDirty() {
  state.coverage.compare = "";
  $("#compareDirty").hidden = false;
  $("#compareCanvas").hidden = true;
  syncHeaderCoverage();
  announce("A beállítások megváltoztak. Új összehasonlítás szükséges.");
}

function revealCompareResults(focus) {
  const canvas = $("#compareCanvas");
  $("#compareDirty").hidden = true;
  canvas.hidden = false;
  if (!focus) return;
  const heading = $("#comparisonHeading");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  canvas.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  window.requestAnimationFrame(() => heading.focus({ preventScroll: true }));
}

function resultField(label, content, className = "") {
  const wrapper = node("div", { className: `result-field ${className}`.trim() });
  wrapper.append(node("dt", { text: label }));
  const value = node("dd");
  if (typeof content === "string") value.textContent = content;
  else if (content) value.append(content);
  wrapper.append(value);
  return wrapper;
}

function priceStateContent(result, tone) {
  if (result.costStatus !== "complete") {
    return node("span", { className: "status-text danger", text: "Nem használható – hiányos vagy lejárt adat" });
  }
  const states = [effectiveFreshness(result.inputPrice, state.asOf), effectiveFreshness(result.outputPrice, state.asOf)];
  const degraded = states.some((value) => value.includes("degraded"));
  const label = degraded ? "Aktuális, újraellenőrzés esedékes" : "Aktuális";
  const wrapper = node("span");
  wrapper.append(node("span", { className: `status-text ${degraded ? "warning" : ""}`.trim(), text: label }));
  wrapper.append(node("small", { text: ` · ellenőrizve: ${formatDate(result.verifiedAt[0])}` }));
  const scope = result.inputPrice?.conditions?.scope_label_hu;
  if (scope) wrapper.append(node("small", { text: ` · ${scope}` }));
  return wrapper;
}

function contextContent(result, profile) {
  const needed = profile.inputTextTokensPerRun + profile.outputTextTokensPerRun;
  const available = result.model.context_window_tokens;
  if (!result.modelHealth?.usable || !Number.isFinite(available)) return node("span", { className: "status-text danger", text: "Nem igazolható" });
  const fits = needed <= available;
  const wrapper = node("span");
  wrapper.append(node("span", { className: `status-text ${fits ? "" : "danger"}`.trim(), text: fits ? "Megfelel" : "Nem felel meg" }));
  wrapper.append(node("small", { text: ` · ${formatInteger(needed)} / ${formatInteger(available)} token` }));
  return wrapper;
}

function apiKeyContent(result) {
  if (!result.apiKeyLink) return node("span", { className: "unavailable-link", text: "Nincs aktuális, ellenőrzött kulcslink" });
  return node("a", {
    className: "api-link",
    text: "API-kulcs létrehozása",
    attrs: { href: result.apiKeyLink.url, target: "_blank", rel: "noopener noreferrer" }
  });
}

function quickstartContent(result) {
  if (!result.apiQuickstartLink) return null;
  return node("a", {
    className: "quickstart-link",
    text: "Bekötési útmutató",
    attrs: { href: result.apiQuickstartLink.url, target: "_blank", rel: "noopener noreferrer" }
  });
}

function modelResultCard(result, profile, marker, tone = "neutral") {
  const provider = state.index.providers.get(result.model.provider_id);
  const card = node("article", { className: `model-result tone-${tone}` });
  card.dataset.modelId = result.model.id;
  card.append(node("h3", { className: "model-result-head", text: `${marker} · ${result.model.name} · ${provider?.name ?? result.model.provider_id}` }));
  const facts = node("dl", { className: "result-facts" });
  const cost = result.costStatus === "complete" ? node("span") : null;
  if (cost) cost.append(document.createTextNode(formatUsd(result.totalCostUsd)), node("small", { text: " USD / hó" }));
  facts.append(
    resultField(RESULT_FIELD_ORDER[0], `${result.model.name} · ${provider?.name ?? result.model.provider_id}`),
    resultField(RESULT_FIELD_ORDER[1], cost ?? "Nem számítható", "cost"),
    resultField(RESULT_FIELD_ORDER[2], priceStateContent(result, tone)),
    resultField(RESULT_FIELD_ORDER[3], contextContent(result, profile)),
    resultField(RESULT_FIELD_ORDER[4], apiKeyContent(result))
  );
  card.append(facts);
  return card;
}

function sourceAnchor(source, label = "Hivatalos árforrás") {
  if (!source?.url?.startsWith("https://")) return null;
  return node("a", { className: "text-link", text: label, attrs: { href: source.url, target: "_blank", rel: "noopener noreferrer" } });
}

function provenanceCard(result, marker) {
  const card = node("article", { className: "provenance-card" });
  card.append(node("h3", { text: `${marker} · ${result.model.name}` }));
  const capabilities = Object.entries(CAPABILITY_LABELS).map(([key, label]) => {
    const evidence = capabilityFor(state.index, result.model.id, key, state.asOf);
    const support = {
      supported: "támogatott",
      unsupported: "nem támogatott",
      conditional: "feltételes",
      unknown: "nem igazolt"
    }[evidence.support] ?? "nem igazolt";
    const verified = evidence.record?.freshness?.verified_at;
    return [`Képesség · ${label}`, `${support}${verified ? ` · ellenőrizve: ${formatDate(verified)}` : ""}`];
  });
  const list = node("dl", { className: "provenance-list" });
  const facts = [
    ["API ID", result.model.api_model_id],
    ["Dataset", state.index.raw.dataset_version],
    ["Lifecycle", result.model.lifecycle],
    ...capabilities,
    ["Modell ellenőrizve", formatDate(result.model.freshness?.verified_at)],
    ["Input ár", result.inputPrice ? `${result.inputPrice.amount} USD / 1M token` : "nem használható"],
    ["Output ár", result.outputPrice ? `${result.outputPrice.amount} USD / 1M token` : "nem használható"],
    ["Input árrekord", result.inputPrice?.id ?? "nem használható"],
    ["Output árrekord", result.outputPrice?.id ?? "nem használható"],
    ["Feltétel", result.inputPrice?.conditions?.scope_label_hu ?? "közvetlen API · standard · szöveg · cache nélkül"]
  ];
  for (const [term, value] of facts) list.append(node("dt", { text: term }), node("dd", { text: String(value ?? "nincs adat") }));
  card.append(list);
  const actions = node("div", { className: "provenance-actions" });
  const source = result.inputPrice ? state.index.sources.get(result.inputPrice.source_id) : null;
  const sourceLink = sourceAnchor(source);
  if (sourceLink) actions.append(sourceLink);
  if (result.apiKeyLink) actions.append(apiKeyContent(result));
  card.append(actions);
  return card;
}

function renderCompare({ focus = true } = {}) {
  const profile = compareProfile();
  if (!normalizeProfile(profile).valid || $("#modelA").value === $("#modelB").value) return;
  const resultA = evaluateModel(state.index, $("#modelA").value, profile, state.asOf);
  const resultB = evaluateModel(state.index, $("#modelB").value, profile, state.asOf);
  const results = $("#compareResults");
  clear(results);
  results.append(modelResultCard(resultA, profile, "A", "a"), modelResultCard(resultB, profile, "B", "b"));
  const provenance = $("#compareProvenance");
  clear(provenance);
  provenance.append(provenanceCard(resultA, "A"), provenanceCard(resultB, "B"));
  const complete = [resultA, resultB].filter((item) => item.costStatus === "complete").length;
  const coverageText = `${complete}/2 modell teljes, használható költséggel`;
  $("#comparisonCoverage").textContent = coverageText;
  state.coverage.compare = coverageText;
  syncHeaderCoverage();
  revealCompareResults(focus);
  if (focus) announce("Az összehasonlítás frissült.");
}

function svgIcon(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  for (const value of ICON_PATHS[name] ?? []) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", value);
    svg.append(path);
  }
  return svg;
}

function choiceOption(item, group, selected, { icon = null } = {}) {
  const label = node("label", { className: "choice-option" });
  const input = node("input", { attrs: { type: "radio", name: group, value: item.id } });
  input.checked = selected;
  label.append(input);
  if (icon) label.append(svgIcon(icon));
  const copy = node("span", { className: "choice-copy" });
  copy.append(node("strong", { text: item.label }));
  if (item.detail) copy.append(node("small", { text: item.detail }));
  label.append(copy, node("span", { className: "choice-check", attrs: { "aria-hidden": "true" }, text: "✓" }));
  return label;
}

function renderAdvisorChoices() {
  const taskChoices = $("#taskChoices");
  const priorityChoices = $("#priorityChoices");
  const usageChoices = $("#usageChoices");
  clear(taskChoices);
  clear(priorityChoices);
  clear(usageChoices);
  taskOptions().forEach((item) => taskChoices.append(choiceOption(item, "advisorTask", item.id === state.advisor.taskId, { icon: item.icon })));
  PRIORITY_OPTIONS.forEach((item) => priorityChoices.append(choiceOption(item, "advisorPriority", item.id === state.advisor.priorityId)));
  USAGE_OPTIONS.forEach((item) => usageChoices.append(choiceOption(item, "advisorUsage", item.id === state.advisor.usageId)));
}

function taskOptions() {
  if (!state.index) return [];
  return [...state.index.tasks.values()]
    .filter((task) => task.status === "active")
    .sort((a, b) => a.display_order - b.display_order)
    .map((task) => ({
      id: task.id,
      label: task.label_hu,
      icon: task.icon,
      input: task.default_input_tokens,
      output: task.default_output_tokens,
      scope: task.cost_scope,
      excludedCost: task.excluded_cost_hu,
      requiredCapabilities: task.required_capabilities,
      methodologyNote: task.methodology_note_hu
    }));
}

function currentTask() {
  const record = taskFor(state.index, state.advisor.taskId);
  if (!record) return null;
  return taskOptions().find((item) => item.id === record.id) ?? null;
}

function currentPriority() {
  return PRIORITY_OPTIONS.find((item) => item.id === state.advisor.priorityId) ?? PRIORITY_OPTIONS[0];
}

function currentUsage() {
  return USAGE_OPTIONS.find((item) => item.id === state.advisor.usageId) ?? USAGE_OPTIONS[1];
}

function applyAdvisorAssumption() {
  const task = currentTask();
  if (!task) return;
  const usage = currentUsage();
  $("#taskRuns").value = usage.runs;
  $("#taskInput").value = task.input;
  $("#taskOutput").value = task.output;
  updateUsageSummary();
}

function updateUsageSummary() {
  const task = currentTask();
  if (!task) return;
  const usage = currentUsage();
  const daily = Math.round(usage.runs / 30);
  const length = task.input + task.output >= 10000 ? "hosszabb" : task.input + task.output <= 1500 ? "rövidebb" : "átlagos hosszúságú";
  $("#usageSummary").textContent = `A mintaszámítás: napi ${formatInteger(daily)}, ${length} kérés. A részleteket lent módosíthatod.`;
}

function showAdvisorStep(step) {
  state.advisor.step = Math.max(1, Math.min(3, step));
  $(".flow-progress").style.setProperty("--advisor-progress", state.advisor.step);
  $$('[data-advisor-step]').forEach((section) => { section.hidden = Number(section.dataset.advisorStep) !== state.advisor.step; });
  $$('[data-progress-step]').forEach((item) => {
    const value = Number(item.dataset.progressStep);
    item.classList.toggle("is-current", value === state.advisor.step);
    item.classList.toggle("is-complete", value < state.advisor.step);
  });
  $("#mobileStep").textContent = `${state.advisor.step} / 3`;
  $("#advisorBack").hidden = state.advisor.step === 1;
  const next = $("#advisorNext");
  next.disabled = state.advisor.step === 1 && !state.advisor.taskId;
  clear(next);
  next.append(document.createTextNode(state.advisor.step === 3 ? "Találatok megmutatása " : "Tovább "), node("span", { text: "→", attrs: { "aria-hidden": "true" } }));
  const heading = $(`[data-advisor-step="${state.advisor.step}"] legend`);
  window.requestAnimationFrame(() => heading?.focus?.({ preventScroll: true }));
}

const formatAdvisorCost = (value) => `${new Intl.NumberFormat("hu-HU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))} USD / hó`;

function advisorPrimaryResult(result, profile) {
  const provider = state.index.providers.get(result.model.provider_id);
  const article = node("article", { className: "advisor-primary-result" });
  const identity = node("div", { className: "advisor-result-identity" });
  identity.append(
    node("p", { className: "result-label", text: "Ellenőrzött tokenár alapján első" }),
    node("h2", { text: result.model.name }),
    node("p", { className: "provider-name", text: provider?.name ?? result.model.provider_id })
  );
  const capabilityLabels = result.requirements.filter((item) => item.met).map((item) => CAPABILITY_LABELS[item.key] ?? item.key);
  const explanation = node("div", { className: "advisor-result-explanation" });
  explanation.append(
    node("p", { className: "positive-reason", text: capabilityLabels.length
      ? `A gyártó dokumentációja szerint támogatja ezt: ${capabilityLabels.join(", ")}.`
      : "Ehhez a feladathoz nincs a standard szöveges API-n felüli technikai követelmény." }),
    node("p", { className: "caution-reason", text: "Ez költségsorrend. A minőséget és a sebességet még nem rangsoroljuk bizonyíték nélkül." })
  );
  const cost = node("div", { className: "advisor-result-cost" });
  cost.append(
    node("small", { text: "Becsült havi API-költség" }),
    node("strong", { text: formatAdvisorCost(result.totalCostUsd) }),
    node("span", { text: `Ellenőrizve: ${formatDate(result.verifiedAt[0])}` })
  );
  if (result.apiKeyLink) cost.append(apiKeyContent(result));
  const quickstart = quickstartContent(result);
  if (quickstart) cost.append(quickstart);
  const details = node("details", { className: "result-why" });
  details.append(node("summary", { text: "Miért ezt látom?" }));
  details.append(node("p", { text: `${formatInteger(profile.runsPerMonth)} kérés / hó, kérésenként ${formatInteger(profile.inputTextTokensPerRun)} input és ${formatInteger(profile.outputTextTokensPerRun)} output token mintafeltételezéssel.` }));
  if (result.requirements.length) {
    details.append(node("p", { text: `Technikai bizonyíték: ${result.requirements.map((item) => `${CAPABILITY_LABELS[item.key] ?? item.key} · ${formatDate(item.verifiedAt)}`).join("; ")}.` }));
  }
  if (result.inputPrice?.conditions?.scope_label_hu) details.append(node("p", { text: `Az ár feltétele: ${result.inputPrice.conditions.scope_label_hu}.` }));
  article.append(identity, explanation, cost, details);
  return article;
}

function advisorSecondaryResult(result, index) {
  const provider = state.index.providers.get(result.model.provider_id);
  const article = node("article", { className: "advisor-secondary-result" });
  const identity = node("div");
  identity.append(node("p", { className: "result-label", text: index === 0 ? "Második ellenőrzött tokenár" : "Harmadik ellenőrzött tokenár" }));
  identity.append(node("h3", { text: result.model.name }), node("span", { text: provider?.name ?? result.model.provider_id }));
  const summary = node("p", { text: formatAdvisorCost(result.totalCostUsd) });
  article.append(identity, summary);
  if (result.apiKeyLink) article.append(apiKeyContent(result));
  return article;
}

function benchmarkParameterLabel(parameter) {
  if (parameter?.status === "set") return String(parameter.value);
  if (parameter?.status === "provider_managed") return "szolgáltató kezeli";
  if (parameter?.status === "not_applicable") return "nem alkalmazható";
  return "a benchmark nem állította be";
}

function advisorBenchmarkNotice(ranking) {
  const definition = ranking.definition;
  const source = state.benchmarks.sources.get(definition.source_id);
  const notice = node("article", { className: "benchmark-notice" });
  notice.append(
    node("h2", { text: "LiveBench-eredmény erre a feladatra" }),
    node("p", { className: "benchmark-edition", text: `${definition.benchmark_name} ${definition.benchmark_version} · ${definition.category} · ${formatInteger(definition.sample_size)} ${definition.sample_unit_hu}` }),
    node("p", { text: `A ${ranking.totalModelCount} nyilvántartott modellből ${ranking.sourceMeasuredCount} rendelkezik pontosan összekapcsolható méréssel, ${ranking.sourceProviderCount} szolgáltatótól.` }),
    node("p", { className: "benchmark-caveat", text: "A kimaradó modellek nem kaptak rosszabb helyezést: egyszerűen nem szerepelnek ebben a sorrendben." })
  );
  if (ranking.eligibleMeasuredCount < ranking.sourceMeasuredCount) notice.append(node("p", { className: "benchmark-filter-note", text: `A választásaidnak megfelelően ${ranking.eligibleMeasuredCount} mért modell maradt a rangsorban.` }));
  if (ranking.freshnessState.includes("degraded")) notice.append(node("p", { className: "benchmark-warning", text: "A mérés újraellenőrzése esedékes. Lejárat után a rangsor automatikusan eltűnik." }));
  const links = node("div", { className: "benchmark-links" });
  links.append(
    node("a", { className: "text-link", text: "LiveBench-forrás", attrs: { href: source?.url ?? definition.source_url, target: "_blank", rel: "noopener noreferrer" } }),
    node("a", { className: "text-link", text: "Módszertan", attrs: { href: definition.methodology_url, target: "_blank", rel: "noopener noreferrer" } }),
    node("a", { className: "text-link", text: "CC BY-SA 4.0 licenc", attrs: { href: state.benchmarks.raw.license_url, target: "_blank", rel: "noopener noreferrer" } })
  );
  notice.append(links, node("small", { text: `${state.benchmarks.raw.modification_notice_hu} Ellenőrizve: ${formatDate(definition.freshness.verified_at)}` }));
  return notice;
}

function advisorQualityResult(row, ranking, profile, { primary = false } = {}) {
  const result = row.evaluation;
  const benchmark = row.benchmarkResult;
  const provider = state.index.providers.get(result.model.provider_id);
  const article = node("article", { className: `advisor-quality-result ${primary ? "is-primary" : ""}`.trim() });
  const identity = node("div", { className: "quality-result-identity" });
  const isFilteredRanking = ranking.eligibleMeasuredCount < ranking.sourceMeasuredCount;
  const placementLabel = isFilteredRanking
    ? `${row.position}. a választásaidnak megfelelő ${ranking.eligibleMeasuredCount} mért modell között`
    : `${row.position}. a ${ranking.sourceMeasuredCount} pontosan összekapcsolható konfiguráció közül`;
  identity.append(
    node("p", { className: "result-label", text: placementLabel }),
    node(primary ? "h2" : "h3", { text: result.model.name }),
    node("p", { className: "provider-name", text: provider?.name ?? result.model.provider_id })
  );
  const score = node("div", { className: "quality-score" });
  score.append(
    node("strong", { text: `${Number(benchmark.metric_value).toFixed(1)} pont` }),
    node("span", { text: benchmark.source_row_id })
  );
  const explanation = node("div", { className: "quality-explanation" });
  explanation.append(
    node("p", { className: "positive-reason", text: isFilteredRanking
      ? `Helyezése a választásaidnak megfelelő mért modellek között: ${row.position}.`
      : `Helyezése ebben a ${ranking.definition.category} mérésben: ${row.sourcePosition}.` }),
    node("p", { className: "caution-reason", text: "Ez feladatspecifikus benchmarkeredmény, nem általános „legjobb LLM” minősítés." })
  );
  const cost = node("div", { className: "quality-cost" });
  cost.append(node("small", { text: "Becsült havi standard tokenár" }));
  if (result.costStatus === "complete") {
    cost.append(node("strong", { text: formatAdvisorCost(result.totalCostUsd) }), node("span", { text: `Ár ellenőrizve: ${formatDate(result.verifiedAt[0])}` }));
  } else {
    cost.append(node("strong", { className: "unavailable-cost", text: "A havi költség jelenleg nem ellenőrizhető." }));
  }
  cost.append(node("p", { className: "benchmark-cost-disclaimer", text: "Ez a saját használati profilodra számított standard tokenár-becslés, nem a LiveBenchben mért konfiguráció futtatási költsége." }));
  if (result.apiKeyLink) cost.append(apiKeyContent(result));
  const quickstart = quickstartContent(result);
  if (quickstart) cost.append(quickstart);
  article.append(identity, score, explanation, cost);
  if (primary) {
    const details = node("details", { className: "result-why benchmark-details" });
    const configuration = benchmark.model_configuration;
    details.append(
      node("summary", { text: "Miért ezt látom?" }),
      node("p", { text: `${formatInteger(profile.runsPerMonth)} kérés / hó, kérésenként ${formatInteger(profile.inputTextTokensPerRun)} input és ${formatInteger(profile.outputTextTokensPerRun)} output token költségfeltételezéssel.` }),
      node("p", { text: `Mért konfiguráció: ${benchmark.source_row_id}; reasoning effort: ${benchmarkParameterLabel(configuration.reasoning_effort)}; temperature: ${benchmarkParameterLabel(configuration.temperature)}; max output: ${benchmarkParameterLabel(configuration.max_output_tokens)}.` }),
      node("a", { className: "text-link", text: "Pontos konfiguráció forrása", attrs: { href: benchmark.configuration_source_url, target: "_blank", rel: "noopener noreferrer" } })
    );
    article.append(details);
  }
  return article;
}

function advisorCompactPrices(results) {
  const details = node("details", { className: "compact-price-list" });
  details.append(node("summary", { text: `Tokenárak megnyitása (${results.length})` }));
  const rows = node("div", { className: "compact-price-rows" });
  results.forEach((result) => {
    const provider = state.index.providers.get(result.model.provider_id);
    const row = node("article", { className: "compact-price-row" });
    const identity = node("div");
    identity.append(node("strong", { text: result.model.name }), node("small", { text: provider?.name ?? result.model.provider_id }));
    const actions = node("div", { className: "compact-price-actions" });
    if (result.apiKeyLink) actions.append(apiKeyContent(result));
    const quickstart = quickstartContent(result);
    if (quickstart) actions.append(quickstart);
    row.append(identity, node("span", { text: formatAdvisorCost(result.totalCostUsd) }), actions);
    rows.append(row);
  });
  details.append(rows);
  return details;
}

function advisorEvidenceNotice(task, priority, policy, technicalCount, pricedCount) {
  const notice = node("article", { className: "evidence-notice" });
  const required = task.requiredCapabilities.map((key) => CAPABILITY_LABELS[key] ?? key);
  notice.append(
    node("h2", { text: "Ehhez még nincs hiteles sorrend." }),
    node("p", { text: required.length
      ? `${technicalCount} modellnél találtunk hivatalosan dokumentált ${required.join(" és ")} támogatást.`
      : `${technicalCount} modell fér bele a megadott használati mintába; közülük ${pricedCount} rendelkezik ellenőrzött tokenárral.` }),
    node("p", { text: priority.id === "price" && task.scope === "token_baseline"
      ? "A külön keresési, kép-, fájl- vagy eszközdíjak hiányozhatnak, ezért itt nem nevezünk ki legolcsóbb modellt."
      : policy?.disclosure_hu ?? "A választott sorrendhez még nincs elég független bizonyíték." }),
    node("strong", { text: "A technikai támogatás nem ugyanaz, mint hogy ez a legjobb modell a feladatra." })
  );
  return notice;
}

function advisorCostNotice(task) {
  if (task.scope !== "token_baseline") return null;
  const notice = node("article", { className: "baseline-notice" });
  notice.append(
    node("strong", { text: "Mit mutat ez a becslés?" }),
    node("p", { text: `A standard szöveges tokenek becsült havi díját. ${task.excludedCost}` }),
    node("p", { text: "Ez ár-összehasonlítás, nem minőségi vagy alkalmassági rangsor." })
  );
  return notice;
}

function renderAdvisorResults() {
  const task = currentTask();
  const priority = currentPriority();
  const usage = currentUsage();
  const summary = $("#answerSummary");
  clear(summary);
  [task.label, priority.label, usage.label].forEach((value) => summary.append(node("span", { text: value })));
  $("#advisorFlow").hidden = true;
  $("#advisorResults").hidden = false;

  const profile = taskProfile();
  if (!normalizeProfile(profile).valid) {
    $("#taskHelp").textContent = "A használati feltételezés hibás. Kérlek módosítsd a megadott mennyiségeket.";
    return;
  }
  const results = evaluateAllModels(state.index, profile, state.asOf);
  const technical = results.filter((item) => item.technicalEligibility === "eligible");
  const priced = technical
    .filter((item) => item.costStatus === "complete")
    .sort((a, b) => a.costNumerator < b.costNumerator ? -1 : a.costNumerator > b.costNumerator ? 1 : a.model.name.localeCompare(b.model.name, "hu"));
  const policy = recommendationPolicyFor(state.index, priority.id);
  const qualityRanking = qualityRankingFor(state.index, state.benchmarks, {
    taskId: task.id,
    priorityId: priority.id,
    evaluations: results
  }, state.asOf);
  const baselineOnly = task.scope === "token_baseline";
  const priceRanked = priority.id === "price" && policy?.ranking_available === true && !baselineOnly;
  const qualityRanked = qualityRanking.available;
  const visible = priced.slice(0, policy?.result_limit ?? 3);
  $("#taskHelp").textContent = qualityRanked
    ? "A minőségi sorrend kizárólag az azonos LiveBench-kategória pontosan összekapcsolható konfigurációit követi."
    : priceRanked
      ? "A sorrend kizárólag a teljes, ellenőrzött standard szöveges tokenköltséget követi."
      : "Először a hivatalosan dokumentált technikai feltételeket ellenőrizzük. Bizonyíték nélkül nem állítunk fel minőségi vagy sebességi sorrendet.";
  $("#taskResultsHeading").textContent = qualityRanked
    ? "A feladathoz mért modellek."
    : priceRanked
      ? "Három ellenőrzött költségjelölt."
      : "Amit most biztosan tudunk.";
  const list = $("#taskResults");
  clear(list);
  const costNotice = advisorCostNotice(task);
  if (costNotice) list.append(costNotice);
  if (qualityRanked) {
    list.append(advisorBenchmarkNotice(qualityRanking));
    qualityRanking.rows.slice(0, policy?.result_limit ?? 3).forEach((row, index) => list.append(advisorQualityResult(row, qualityRanking, profile, { primary: index === 0 })));
  } else if (priceRanked && visible.length) {
    list.append(advisorPrimaryResult(visible[0], profile));
    const alternatives = node("div", { className: "advisor-alternatives" });
    visible.slice(1).forEach((result, index) => alternatives.append(advisorSecondaryResult(result, index)));
    if (alternatives.childElementCount) list.append(alternatives);
  } else {
    list.append(advisorEvidenceNotice(task, priority, policy, technical.length, priced.length));
    if (priced.length) list.append(advisorCompactPrices(priced));
    else list.append(node("p", { className: "unsupported-result", text: "Ehhez a feladathoz most nincs olyan modell, amelynél a szükséges technikai támogatás és az aktuális tokenár is igazolt." }));
  }
  state.coverage.task = qualityRanked
    ? `${qualityRanking.measuredCount}/${qualityRanking.totalModelCount} modell pontos LiveBench-méréssel`
    : `${technical.length}/${results.length} modell dokumentált technikai találat`;
  syncHeaderCoverage();
  const heading = $("#taskResultsHeading");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  $("#advisorResults").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  window.requestAnimationFrame(() => heading.focus({ preventScroll: true }));
  announce("A modelllehetőségek elkészültek.");
}

function modifyAdvisorAnswers() {
  $("#advisorResults").hidden = true;
  $("#advisorFlow").hidden = false;
  showAdvisorStep(1);
  $("#taskTitle").focus({ preventScroll: true });
}

function bindEvents() {
  window.addEventListener("hashchange", renderRoute);
  for (const id of ["modelA", "modelB"]) {
    $("#" + id).addEventListener("change", () => {
      updateModelLabels();
      markCompareDirty();
    });
  }
  for (const id of ["compareRuns", "compareInput", "compareOutput"]) {
    $("#" + id).addEventListener("input", () => {
      updateCompareProfileSummary();
      markCompareDirty();
    });
  }
  $("#compareButton").addEventListener("click", () => renderCompare());
  $("#taskChoices").addEventListener("change", (event) => {
    if (event.target.name !== "advisorTask") return;
    state.advisor.taskId = event.target.value;
    applyAdvisorAssumption();
    $("#advisorNext").disabled = false;
  });
  $("#priorityChoices").addEventListener("change", (event) => {
    if (event.target.name === "advisorPriority") state.advisor.priorityId = event.target.value;
  });
  $("#usageChoices").addEventListener("change", (event) => {
    if (event.target.name !== "advisorUsage") return;
    state.advisor.usageId = event.target.value;
    applyAdvisorAssumption();
  });
  $("#advisorBack").addEventListener("click", () => showAdvisorStep(state.advisor.step - 1));
  $("#advisorNext").addEventListener("click", () => {
    if (state.advisor.step < 3) showAdvisorStep(state.advisor.step + 1);
    else renderAdvisorResults();
  });
  $("#modifyAnswers").addEventListener("click", modifyAdvisorAnswers);
}

async function init() {
  try {
    const response = await fetch("./data/catalog.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.index = normalizeCatalog(await response.json(), state.asOf);
    if (state.index.isSample) throw new Error("Ez a kiadás csak jóváhagyott production katalógussal indulhat.");
    try {
      const benchmarkResponse = await fetch("./data/benchmarks/livebench-2026-06-25.json", { cache: "no-store" });
      if (!benchmarkResponse.ok) throw new Error(`HTTP ${benchmarkResponse.status}`);
      state.benchmarks = normalizeBenchmarkDataset(await benchmarkResponse.json(), state.index, state.asOf);
    } catch (benchmarkError) {
      state.benchmarks = null;
      console.warn("A benchmarkadat nem használható; a minőségi rangsor fail-closed állapotban marad.", benchmarkError);
    }
    populateModels();
    renderAdvisorChoices();
    applyAdvisorAssumption();
    bindEvents();
    renderRoute();
    syncHeaderCoverage();
    updateCompareProfileSummary();
    renderCompare({ focus: false });
    showAdvisorStep(1);
  } catch (error) {
    $$(".route").forEach((route) => { route.hidden = true; });
    $("#loadError").hidden = false;
    $("#loadErrorMessage").textContent = `A katalógus nem használható: ${error.message}`;
  }
}

init();
