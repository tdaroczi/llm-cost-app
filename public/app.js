import {
  capabilityFor,
  effectiveFreshness,
  evaluateAllModels,
  evaluateModel,
  formatUsd,
  normalizeCatalog,
  normalizeProfile,
  providerLinkFor,
  recordHealth
} from "./core.mjs";

const TRAFFIC_PROFILES = Object.freeze({
  "technical-chat-10k": {
    name: "Technikai asszisztenshez hasonló forgalom",
    runsPerMonth: 10000,
    inputTextTokensPerRun: 8000,
    outputTextTokensPerRun: 2000
  },
  "document-analysis-2500": {
    name: "Dokumentumelemzéshez hasonló forgalom",
    runsPerMonth: 2500,
    inputTextTokensPerRun: 30000,
    outputTextTokensPerRun: 1500
  }
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
  asOf: new Date(),
  route: "compare",
  coverage: { compare: "", task: "" }
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
  return baseProfile({
    runsPerMonth: $("#taskRuns").value,
    inputTextTokensPerRun: $("#taskInput").value,
    outputTextTokensPerRun: $("#taskOutput").value,
    allowPreview: $("#taskPreview").checked,
    requireDocumentedStable: $("#taskStable").checked,
    requiredCapabilities: $("#taskTool").checked ? ["tool_calling"] : []
  });
}

function routeFromHash() {
  return window.location.hash === "#task" ? "task" : "compare";
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
  document.title = state.route === "task" ? "Feladathoz keresek · LLM Observatory" : "Modell-összehasonlítás · LLM Observatory";
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

function updateTaskProfileSummary() {
  const profile = taskProfile();
  $("#taskRunsSummary").textContent = formatInteger(profile.runsPerMonth || 0);
  $("#taskInputSummary").textContent = formatInteger(profile.inputTextTokensPerRun || 0);
  $("#taskOutputSummary").textContent = formatInteger(profile.outputTextTokensPerRun || 0);
}

function markDirty(route) {
  state.coverage[route] = "";
  $(`#${route}Dirty`).hidden = false;
  $(`#${route === "compare" ? "compareCanvas" : "taskCanvas"}`).hidden = true;
  syncHeaderCoverage();
  announce(route === "compare" ? "A beállítások megváltoztak. Új összehasonlítás szükséges." : "A feladatprofil megváltozott. Új számítás szükséges.");
}

function revealResults(route, focus) {
  const canvas = $(`#${route === "compare" ? "compareCanvas" : "taskCanvas"}`);
  $(`#${route}Dirty`).hidden = true;
  canvas.hidden = false;
  if (!focus) return;
  const heading = route === "compare" ? $("#comparisonHeading") : $("#taskResultsHeading");
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
  const tool = capabilityFor(state.index, result.model.id, "tool_calling", state.asOf);
  const list = node("dl", { className: "provenance-list" });
  const facts = [
    ["API ID", result.model.api_model_id],
    ["Dataset", state.index.raw.dataset_version],
    ["Lifecycle", result.model.lifecycle],
    ["Tool calling", tool.support === "unknown" ? "nincs igazolt rekord" : tool.support],
    ["Modell ellenőrizve", formatDate(result.model.freshness?.verified_at)],
    ["Input ár", result.inputPrice ? `${result.inputPrice.amount} USD / 1M token` : "nem használható"],
    ["Output ár", result.outputPrice ? `${result.outputPrice.amount} USD / 1M token` : "nem használható"],
    ["Input árrekord", result.inputPrice?.id ?? "nem használható"],
    ["Output árrekord", result.outputPrice?.id ?? "nem használható"],
    ["Feltétel", "direct · standard · text · cache=0"]
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
  revealResults("compare", focus);
  if (focus) announce("Az összehasonlítás frissült.");
}

function applyTaskPreset() {
  const preset = TRAFFIC_PROFILES[$("#taskPreset").value];
  if (!preset) return;
  $("#taskRuns").value = preset.runsPerMonth;
  $("#taskInput").value = preset.inputTextTokensPerRun;
  $("#taskOutput").value = preset.outputTextTokensPerRun;
  $("#taskProfileName").textContent = preset.name;
  updateTaskProfileSummary();
}

function excludedRow(result) {
  const row = node("article", { className: "excluded-item" });
  row.append(node("strong", { text: result.model?.name ?? "Ismeretlen modell" }));
  row.append(node("p", { text: result.reasons.map((item) => item.label).join(" ") || "Ehhez a profilhoz nem készíthető ellenőrzött költség." }));
  return row;
}

function renderTask({ focus = true } = {}) {
  const profile = taskProfile();
  if (!normalizeProfile(profile).valid) {
    $("#taskHelp").textContent = "A futásszám legalább 1 legyen, a tokenértékek pedig nemnegatív egész számok.";
    $("#taskHelp").classList.add("error");
    return;
  }
  $("#taskHelp").textContent = "A sorrend kizárólag a teljes, ellenőrzött havi költséget követi.";
  $("#taskHelp").classList.remove("error");
  const results = evaluateAllModels(state.index, profile, state.asOf);
  const eligible = results
    .filter((item) => item.costStatus === "complete")
    .sort((a, b) => a.costNumerator < b.costNumerator ? -1 : a.costNumerator > b.costNumerator ? 1 : a.model.name.localeCompare(b.model.name, "hu"));
  const excluded = results.filter((item) => item.costStatus !== "complete");
  const visible = eligible.slice(0, 3);
  const additional = eligible.slice(3);

  const list = $("#taskResults");
  clear(list);
  if (visible.length) visible.forEach((result, index) => list.append(modelResultCard(result, profile, `${index + 1}.`, "neutral")));
  else list.append(node("p", { className: "empty-state", text: "Ehhez a profilhoz most nincs olyan modell, amelynek minden szükséges adata aktuális és ellenőrzött." }));

  const additionalList = $("#additionalTaskResults");
  clear(additionalList);
  additional.forEach((result, index) => additionalList.append(modelResultCard(result, profile, `${index + 4}.`, "neutral")));
  const excludedList = $("#excludedResults");
  clear(excludedList);
  excluded.forEach((result) => excludedList.append(excludedRow(result)));
  $("#taskMoreSummary").textContent = `További modellek (${additional.length}) és kizárási okok (${excluded.length})`;

  const coverageText = `${eligible.length}/${results.length} modell teljes, használható költséggel`;
  $("#taskCoverage").textContent = coverageText;
  state.coverage.task = coverageText;
  syncHeaderCoverage();
  revealResults("task", focus);
  if (focus) announce("A feladathoz illesztett költséglista frissült.");
}

function bindEvents() {
  window.addEventListener("hashchange", renderRoute);
  for (const id of ["modelA", "modelB"]) {
    $("#" + id).addEventListener("change", () => {
      updateModelLabels();
      markDirty("compare");
    });
  }
  for (const id of ["compareRuns", "compareInput", "compareOutput"]) {
    $("#" + id).addEventListener("input", () => {
      updateCompareProfileSummary();
      markDirty("compare");
    });
  }
  $("#compareButton").addEventListener("click", () => renderCompare());
  $("#taskPreset").addEventListener("change", () => {
    applyTaskPreset();
    markDirty("task");
  });
  for (const id of ["taskRuns", "taskInput", "taskOutput"]) {
    $("#" + id).addEventListener("input", () => {
      updateTaskProfileSummary();
      markDirty("task");
    });
  }
  for (const id of ["taskPreview", "taskStable", "taskTool"]) $("#" + id).addEventListener("change", () => markDirty("task"));
  $("#taskButton").addEventListener("click", () => renderTask());
}

async function init() {
  try {
    const response = await fetch("./data/catalog.sample.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.index = normalizeCatalog(await response.json(), state.asOf);
    if (!state.index.isSample) throw new Error("Ez a build kizárólag proof_only mintaadattal indulhat.");
    populateModels();
    bindEvents();
    renderRoute();
    syncHeaderCoverage();
    updateCompareProfileSummary();
    applyTaskPreset();
    renderCompare({ focus: false });
    renderTask({ focus: false });
  } catch (error) {
    $$(".route").forEach((route) => { route.hidden = true; });
    $("#loadError").hidden = false;
    $("#loadErrorMessage").textContent = `A katalógus nem használható: ${error.message}`;
  }
}

init();
