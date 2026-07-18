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

const state = {
  index: null,
  asOf: new Date(),
  route: "compare",
  coverage: { compare: "", task: "" }
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const clear = (node) => { while (node.firstChild) node.removeChild(node.firstChild); };
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
  return new Intl.DateTimeFormat("hu-HU", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value));
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
  $$("[data-route]").forEach((route) => { route.hidden = route.dataset.route !== state.route; });
  $$("[data-route-link]").forEach((link) => {
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
  const same = Boolean(a && b && a.id === b.id);
  const button = $("#compareButton");
  button.disabled = !a || !b || same;
  $("#compareHelp").textContent = same ? "A két modellnek különbözőnek kell lennie." : "Direct · standard · text · cache nélkül · USD";
  $("#compareHelp").classList.toggle("error", same);
}

function updateCompareProfileSummary() {
  const profile = compareProfile();
  $("#compareRunsSummary").textContent = formatInteger(profile.runsPerMonth || 0);
  $("#compareInputSummary").textContent = `${formatInteger(profile.inputTextTokensPerRun || 0)} token`;
  $("#compareOutputSummary").textContent = `${formatInteger(profile.outputTextTokensPerRun || 0)} token`;
  const valid = normalizeProfile(profile).valid;
  $("#compareButton").disabled = $("#modelA").value === $("#modelB").value || !valid;
  if (!valid) {
    $("#compareHelp").textContent = "Minden tokenérték legyen nemnegatív egész, a futásszám pedig legalább 1.";
    $("#compareHelp").classList.add("error");
  } else if ($("#modelA").value !== $("#modelB").value) {
    $("#compareHelp").textContent = "Direct · standard · text · cache nélkül · USD";
    $("#compareHelp").classList.remove("error");
  }
}

function appendStatus(target, title, detail, tone = "warning") {
  clear(target);
  const line = node("span", { className: `status-line state-${tone}` });
  line.append(node("span", { className: "status-shape", attrs: { "aria-hidden": "true" } }), node("strong", { text: title }));
  target.append(line);
  if (detail) target.append(node("small", { text: detail }));
}

function costCell(target, result, maxNumerator) {
  clear(target);
  if (result.costStatus !== "complete") {
    appendStatus(target, "Nem számítható", result.reasons[0]?.label ?? "Nincs teljes, használható árrekord.", "danger");
    return;
  }
  target.append(node("strong", { text: formatUsd(result.totalCostUsd) }));
  target.append(node("small", { text: `${formatInteger(result.monthlyInputTokens)} input + ${formatInteger(result.monthlyOutputTokens)} output token / hó` }));
  const track = node("span", { className: "cost-track", attrs: { "aria-hidden": "true" } });
  const fill = node("span");
  const width = maxNumerator > 0n ? Number((result.costNumerator * 10000n) / maxNumerator) / 100 : 0;
  fill.style.setProperty("--bar-width", `${Math.max(1, width)}%`);
  track.append(fill);
  target.append(track);
}

function contextCell(target, result, profile) {
  const needed = profile.inputTextTokensPerRun + profile.outputTextTokensPerRun;
  const available = result.model.context_window_tokens;
  if (result.modelHealth?.usable && Number.isFinite(available)) {
    const fits = needed <= available;
    appendStatus(target, fits ? "Megfelel" : "Nem felel meg", `${formatInteger(needed)} / ${formatInteger(available)} token`, fits ? "current" : "danger");
  } else appendStatus(target, "Ismeretlen", "A modellrekord jelenleg nem használható.", "danger");
}

function toolCell(target, modelId) {
  const capability = capabilityFor(state.index, modelId, "tool_calling", state.asOf);
  if (capability.support === "supported") appendStatus(target, "Támogatott", `Rekordállapot: ${capability.state}`, "current");
  else if (capability.support === "limited") appendStatus(target, "Korlátozott", `Rekordállapot: ${capability.state}`, "warning");
  else appendStatus(target, "Ismeretlen", "Nincs igazolt tool-calling capability rekord.", "warning");
}

function lifecycleCell(target, result) {
  const lifecycle = result.model.lifecycle ?? "unknown";
  const tone = lifecycle === "stable" ? "current" : ["deprecated", "retired"].includes(lifecycle) ? "danger" : "warning";
  appendStatus(target, lifecycle, `Modellrekord: ${result.modelHealth?.state ?? "unverified"}`, tone);
}

function sourceCell(target, result) {
  if (result.costStatus !== "complete") {
    appendStatus(target, "Nincs használható ár", result.reasons[0]?.label ?? "Fail-closed", "danger");
    return;
  }
  const states = [effectiveFreshness(result.inputPrice, state.asOf), effectiveFreshness(result.outputPrice, state.asOf)];
  const degraded = states.some((value) => value.includes("degraded"));
  appendStatus(target, degraded ? "Aktuális · degraded" : "Aktuális árrekord", `Ellenőrizve: ${formatDate(result.verifiedAt[0])} UTC`, degraded ? "warning" : "current");
}

function sourceAnchor(source, label = "Hivatalos árforrás") {
  if (!source?.url?.startsWith("https://")) return null;
  return node("a", { className: "text-link", text: label, attrs: { href: source.url, target: "_blank", rel: "noopener noreferrer" } });
}

function provenanceCard(result, marker) {
  const card = node("article", { className: "provenance-card" });
  card.append(node("h3", { text: `${marker} · ${result.model.name}` }));
  const list = node("dl", { className: "provenance-list" });
  const facts = [
    ["API ID", result.model.api_model_id],
    ["Dataset", state.index.raw.dataset_version],
    ["Lifecycle", result.model.lifecycle],
    ["Modell ellenőrizve", formatDate(result.model.freshness?.verified_at)],
    ["Input árrekord", result.inputPrice?.id ?? "nem használható"],
    ["Output árrekord", result.outputPrice?.id ?? "nem használható"],
    ["Teljesség", result.costStatus],
    ["Feltétel", "direct · standard · text · standard_paid · cache=0"]
  ];
  for (const [term, value] of facts) list.append(node("dt", { text: term }), node("dd", { text: String(value ?? "nincs adat") }));
  const recordDetails = node("details", { className: "record-details" });
  recordDetails.append(node("summary", { text: "Árrekord és forrás részletei" }));
  recordDetails.append(list);
  const recordList = node("dl", { className: "provenance-list" });
  const priceSource = result.inputPrice ? state.index.sources.get(result.inputPrice.source_id) : null;
  const recordFacts = [
    ["Input ár", result.inputPrice ? `${result.inputPrice.amount} USD / 1m token` : "nem használható"],
    ["Input verified_at", result.inputPrice?.freshness?.verified_at ?? "nincs adat"],
    ["Input freshness", result.inputPrice ? effectiveFreshness(result.inputPrice, state.asOf) : "unavailable"],
    ["Input refresh", result.inputPrice?.freshness?.refresh_result ?? "nincs adat"],
    ["Output ár", result.outputPrice ? `${result.outputPrice.amount} USD / 1m token` : "nem használható"],
    ["Output verified_at", result.outputPrice?.freshness?.verified_at ?? "nincs adat"],
    ["Output freshness", result.outputPrice ? effectiveFreshness(result.outputPrice, state.asOf) : "unavailable"],
    ["Output refresh", result.outputPrice?.freshness?.refresh_result ?? "nincs adat"],
    ["Forrás", priceSource?.title ?? "nincs használható forrás"],
    ["Locator", result.inputPrice?.source_locator ?? "nincs adat"],
    ["Forrás letöltve", priceSource?.retrieved_at ?? "nincs adat"]
  ];
  for (const [term, value] of recordFacts) recordList.append(node("dt", { text: term }), node("dd", { text: String(value) }));
  recordDetails.append(recordList);
  card.append(recordDetails);
  const actions = node("div", { className: "provenance-actions" });
  const source = sourceAnchor(priceSource);
  if (source) actions.append(source);
  if (result.apiKeyLink) {
    actions.append(node("a", {
      className: "text-link",
      text: "API-kulcs létrehozása",
      attrs: { href: result.apiKeyLink.url, target: "_blank", rel: "noopener noreferrer" }
    }));
  } else actions.append(node("span", { className: "unavailable-link", text: "Nincs current, igazolt API-kulcs link" }));
  actions.append(node("span", { className: "unavailable-link", text: "Quickstart nincs a proof adatkészletben" }));
  card.append(actions);
  return card;
}

function resultCoverage(result, profile) {
  const tool = capabilityFor(state.index, result.model.id, "tool_calling", state.asOf);
  const link = providerLinkFor(state.index, result.model.provider_id, "api_key", state.asOf);
  const fields = [
    result.modelHealth?.usable,
    Number.isFinite(result.model.context_window_tokens) && profile.inputTextTokensPerRun + profile.outputTextTokensPerRun <= result.model.context_window_tokens,
    result.model.lifecycle !== "unknown",
    tool.record !== null && tool.state !== "unverified",
    Boolean(link)
  ];
  return { usable: fields.filter(Boolean).length, total: fields.length, priceUsable: result.costStatus === "complete" ? 2 : 0, priceTotal: 2 };
}

function renderCompare({ focus = true } = {}) {
  const profile = compareProfile();
  if (!normalizeProfile(profile).valid || $("#modelA").value === $("#modelB").value) return;
  const resultA = evaluateModel(state.index, $("#modelA").value, profile, state.asOf);
  const resultB = evaluateModel(state.index, $("#modelB").value, profile, state.asOf);
  $("#columnA").textContent = `A · ${resultA.model.name}`;
  $("#columnB").textContent = `B · ${resultB.model.name}`;
  const completeCosts = [resultA, resultB].filter((item) => item.costStatus === "complete").map((item) => item.costNumerator);
  const max = completeCosts.length ? completeCosts.reduce((a, b) => a > b ? a : b) : 0n;
  costCell($("#costA"), resultA, max);
  costCell($("#costB"), resultB, max);
  contextCell($("#contextA"), resultA, profile);
  contextCell($("#contextB"), resultB, profile);
  toolCell($("#toolA"), resultA.model.id);
  toolCell($("#toolB"), resultB.model.id);
  lifecycleCell($("#lifecycleA"), resultA);
  lifecycleCell($("#lifecycleB"), resultB);
  sourceCell($("#sourceA"), resultA);
  sourceCell($("#sourceB"), resultB);
  const coverageA = resultCoverage(resultA, profile);
  const coverageB = resultCoverage(resultB, profile);
  const coverageText = `${coverageA.usable + coverageB.usable}/${coverageA.total + coverageB.total} kategória • ${coverageA.priceUsable + coverageB.priceUsable}/${coverageA.priceTotal + coverageB.priceTotal} ár`;
  $("#comparisonCoverage").textContent = coverageText;
  state.coverage.compare = coverageText;
  syncHeaderCoverage();
  const provenance = $("#compareProvenance");
  clear(provenance);
  provenance.append(provenanceCard(resultA, "A"), provenanceCard(resultB, "B"));
  if (focus) {
    $("#comparisonHeading").focus({ preventScroll: true });
    announce("Az összehasonlítás frissült.");
  }
}

function applyTaskPreset() {
  const preset = TRAFFIC_PROFILES[$("#taskPreset").value];
  if (!preset) return;
  $("#taskRuns").value = preset.runsPerMonth;
  $("#taskInput").value = preset.inputTextTokensPerRun;
  $("#taskOutput").value = preset.outputTextTokensPerRun;
  $("#taskProfileName").textContent = preset.name;
}

function taskResultRow(result, position) {
  const row = node("article", { className: "task-result" });
  const identity = node("div");
  const orderLabel = position === 1 ? "Legalacsonyabb teljes, igazolt költség" : `Ársorrend ${position}.`;
  identity.append(node("h3", { text: result.model.name }), node("p", { text: `${result.model.api_model_id} · ${orderLabel}` }));
  row.append(identity, node("strong", { className: "task-cost", text: formatUsd(result.totalCostUsd) }));
  const facts = node("div", { className: "task-facts" });
  facts.append(
    node("span", { text: `Lifecycle: ${result.model.lifecycle}` }),
    node("span", { text: `Kontextus: ${formatInteger(result.model.context_window_tokens)}` }),
    node("span", { text: "Tool: ismeretlen" }),
    node("span", { text: `Ár: ${effectiveFreshness(result.inputPrice, state.asOf)}` })
  );
  row.append(facts);
  if (result.apiKeyLink) row.append(node("a", { className: "text-link", text: "API-kulcs", attrs: { href: result.apiKeyLink.url, target: "_blank", rel: "noopener noreferrer" } }));
  else row.append(node("span", { className: "unavailable-link", text: "Nincs igazolt kulcslink" }));
  return row;
}

function excludedRow(result) {
  const row = node("article", { className: "excluded-item" });
  row.append(node("strong", { text: result.model?.name ?? "Ismeretlen modell" }));
  row.append(node("p", { text: result.reasons.map((item) => item.label).join(" ") || "Nem számítható." }));
  return row;
}

function renderTask({ focus = true } = {}) {
  const profile = taskProfile();
  if (!normalizeProfile(profile).valid) {
    $("#taskHelp").textContent = "Minden tokenérték legyen nemnegatív egész, a futásszám pedig legalább 1.";
    $("#taskHelp").classList.add("error");
    return;
  }
  $("#taskHelp").textContent = "Direct · standard · text · cache nélkül · USD";
  $("#taskHelp").classList.remove("error");
  const results = evaluateAllModels(state.index, profile, state.asOf);
  const eligible = results.filter((item) => item.costStatus === "complete").sort((a, b) => a.costNumerator < b.costNumerator ? -1 : a.costNumerator > b.costNumerator ? 1 : a.model.name.localeCompare(b.model.name, "hu"));
  const excluded = results.filter((item) => item.costStatus !== "complete");
  const list = $("#taskResults");
  clear(list);
  if (eligible.length) eligible.forEach((result, index) => list.append(taskResultRow(result, index + 1)));
  else list.append(node("p", { className: "load-error", text: "Nincs olyan modell, amely minden hard feltételt current és ellenőrzött adatokkal teljesít. Ez fail-closed eredmény." }));
  const excludedList = $("#excludedResults");
  clear(excludedList);
  excluded.forEach((result) => excludedList.append(excludedRow(result)));
  $("#excludedSummary").textContent = `Kizárt vagy nem számítható modellek (${excluded.length})`;
  const coverageText = `${eligible.length}/${results.length} teljes költséggel • ${excluded.length} kizárt`;
  $("#taskCoverage").textContent = coverageText;
  state.coverage.task = coverageText;
  syncHeaderCoverage();
  if (focus) {
    $("#taskResultsHeading").focus({ preventScroll: true });
    announce("A technikai szűrés frissült.");
  }
}

function bindEvents() {
  window.addEventListener("hashchange", renderRoute);
  $$('[data-open-details]').forEach((button) => {
    button.addEventListener("click", () => {
      const details = document.getElementById(button.dataset.openDetails);
      if (!details) return;
      details.open = true;
      details.querySelector("summary")?.focus();
    });
  });
  for (const id of ["modelA", "modelB"]) $("#" + id).addEventListener("change", updateModelLabels);
  for (const id of ["compareRuns", "compareInput", "compareOutput"]) $("#" + id).addEventListener("input", updateCompareProfileSummary);
  $("#compareButton").addEventListener("click", renderCompare);
  $("#taskPreset").addEventListener("change", () => { applyTaskPreset(); renderTask(); });
  $("#taskButton").addEventListener("click", renderTask);
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
