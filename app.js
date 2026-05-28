const models = [
  {
    name: "gpt-5.4-nano",
    provider: "OpenAI",
    region: "US",
    category: "budget",
    toolUse: 7,
    input: 0.2,
    cached: 0.02,
    output: 1.25,
    batchInput: 0.1,
    batchOutput: 0.625,
    note: "Olcsó OpenAI modell egyszerű feldolgozásra, egyszerű tool hívásokhoz is használható.",
    source: "OpenAI API pricing"
  },
  {
    name: "Gemini 3.1 Flash-Lite",
    provider: "Google",
    region: "US",
    category: "budget",
    toolUse: 7,
    input: 0.25,
    cached: 0.025,
    output: 1.5,
    batchInput: 0.125,
    batchOutput: 0.75,
    note: "Nagy volumenre optimalizált Google modell, egyszerű agent feladatokra.",
    source: "Google Gemini pricing"
  },
  {
    name: "DeepSeek V4 Flash",
    provider: "DeepSeek",
    region: "CN",
    category: "budget",
    toolUse: 6,
    input: 0.14,
    cached: 0.0028,
    output: 0.28,
    note: "Nagyon agresszív árú, 1M contextes kínai modell; tool pontosságot élesben mérni kell.",
    source: "DeepSeek pricing"
  },
  {
    name: "Qwen3 VL Flash",
    provider: "Alibaba Qwen",
    region: "CN",
    category: "budget",
    toolUse: 6,
    input: 0.05,
    cached: null,
    output: 0.4,
    note: "Qwen flash szint; olcsó, de Home Assistant tool calling előtt tesztelni kell.",
    source: "Qwen Cloud pricing"
  },
  {
    name: "gpt-5.4-mini",
    provider: "OpenAI",
    region: "US",
    category: "balanced",
    toolUse: 8,
    input: 0.75,
    cached: 0.075,
    output: 4.5,
    batchInput: 0.375,
    batchOutput: 2.25,
    note: "Általános célú, erősebb olcsó modell tool callinghoz és agentekhez.",
    source: "OpenAI API pricing"
  },
  {
    name: "Claude Haiku 4.5",
    provider: "Anthropic",
    region: "US",
    category: "balanced",
    toolUse: 8,
    input: 1,
    cached: 0.1,
    output: 5,
    note: "Gyors Claude-vonal, jó kontrollált háttérfeladatokra és strukturált tool hívásra.",
    source: "Anthropic pricing"
  },
  {
    name: "Gemini 3 Flash Preview",
    provider: "Google",
    region: "US",
    category: "balanced",
    toolUse: 8,
    input: 0.5,
    cached: 0.05,
    output: 3,
    batchInput: 0.25,
    batchOutput: 1.5,
    note: "Gyors, keresésre, multimodális és egyszerű toolos feladatokra hangolt.",
    source: "Google Gemini pricing"
  },
  {
    name: "Qwen3.6 Flash",
    provider: "Qwen Cloud",
    region: "CN",
    category: "balanced",
    toolUse: 7,
    input: 0.25,
    cached: null,
    output: 1.5,
    note: "Qwen Cloud árlista szerinti gyors szövegmodell, közepes tool calling kockázattal.",
    source: "Qwen Cloud pricing"
  },
  {
    name: "Qwen3 Max",
    provider: "Alibaba Qwen",
    region: "CN",
    category: "flagship",
    toolUse: 8,
    input: 1.2,
    cached: null,
    output: 6,
    batchInput: 0.6,
    batchOutput: 3,
    note: "Alibaba erős Qwen modellje, jobb agent/tool feladatokra is alkalmasabb.",
    source: "Alibaba Model Studio pricing"
  },
  {
    name: "DeepSeek V4 Pro",
    provider: "DeepSeek",
    region: "CN",
    category: "flagship",
    toolUse: 7,
    input: 0.435,
    cached: 0.003625,
    output: 0.87,
    note: "Olcsó erős modell; tool calling és compliance miatt kritikus rendszernél mérni kell.",
    source: "DeepSeek pricing"
  },
  {
    name: "Grok 4.3",
    provider: "xAI",
    region: "US",
    category: "flagship",
    toolUse: 8,
    input: 1.25,
    cached: null,
    output: 2.5,
    note: "xAI aktuális fő szövegmodellje.",
    source: "xAI models"
  },
  {
    name: "Gemini 3.1 Pro Preview",
    provider: "Google",
    region: "US",
    category: "flagship",
    toolUse: 8,
    input: 2,
    cached: 0.2,
    output: 12,
    batchInput: 1,
    batchOutput: 6,
    note: "Erős Google modell, 200k felett magasabb árral.",
    source: "Google Gemini pricing"
  },
  {
    name: "Claude Sonnet 4.6",
    provider: "Anthropic",
    region: "US",
    category: "flagship",
    toolUse: 9,
    input: 3,
    cached: 0.3,
    output: 15,
    note: "Erős, de még nem Opus árú Claude modell.",
    source: "Anthropic pricing"
  },
  {
    name: "Claude Opus 4.7",
    provider: "Anthropic",
    region: "US",
    category: "flagship",
    toolUse: 9,
    input: 5,
    cached: 0.5,
    output: 25,
    note: "Anthropic csúcsmodell, drága outputtal.",
    source: "Anthropic pricing"
  },
  {
    name: "gpt-5.4",
    provider: "OpenAI",
    region: "US",
    category: "flagship",
    toolUse: 9,
    input: 2.5,
    cached: 0.25,
    output: 15,
    batchInput: 1.25,
    batchOutput: 7.5,
    note: "OpenAI erős, de nem pro szintű modell.",
    source: "OpenAI API pricing"
  },
  {
    name: "gpt-5.5",
    provider: "OpenAI",
    region: "US",
    category: "flagship",
    toolUse: 9,
    input: 5,
    cached: 0.5,
    output: 30,
    batchInput: 2.5,
    batchOutput: 15,
    note: "OpenAI legfrissebb zászlóshajó árazás rövid contextre.",
    source: "OpenAI API pricing"
  }
];

const sources = [
  ["OpenAI API pricing", "https://developers.openai.com/api/docs/pricing"],
  ["Anthropic pricing", "https://platform.claude.com/docs/en/about-claude/pricing"],
  ["Google Gemini pricing", "https://ai.google.dev/gemini-api/docs/pricing"],
  ["xAI models", "https://docs.x.ai/developers/models"],
  ["DeepSeek pricing", "https://api-docs.deepseek.com/quick_start/pricing"],
  ["Alibaba Model Studio pricing", "https://www.alibabacloud.com/help/en/model-studio/model-pricing"],
  ["Qwen Cloud pricing", "https://docs.qwencloud.com/developer-guides/getting-started/pricing"],
  ["GitHub: llm-pricing CLI", "https://github.com/tekacs/llm-pricing"],
  ["GitHub: genai-prices", "https://github.com/pydantic/genai-prices"],
  ["GitHub: Home LLM", "https://github.com/acon96/home-llm"],
  ["GitHub: Routerly", "https://github.com/Inebrio/Routerly"]
];

const providers = {
  OpenAI: {
    keyUrl: "https://platform.openai.com/api-keys",
    reliability: 9,
    trust: "Nagyon jó",
    price: "Közepes-drágább",
    note: "Erős platform, jó dokumentáció, széles ökoszisztéma. Drágább csúcskategóriában, de stabil alap üzleti integrációhoz."
  },
  Anthropic: {
    keyUrl: "https://console.anthropic.com/settings/keys",
    reliability: 9,
    trust: "Nagyon jó",
    price: "Drága",
    note: "Kiemelkedő minőség hosszú, érzékeny és kódolós munkáknál. Az Opus drága, Sonnet gyakran jobb ár-érték kompromisszum."
  },
  Google: {
    keyUrl: "https://aistudio.google.com/apikey",
    reliability: 8,
    trust: "Jó",
    price: "Jó-közepes",
    note: "Erős infrastruktúra és kedvező Flash/Lite árak. A modell- és pricing struktúra sok opció miatt figyelmet kér."
  },
  "xAI": {
    keyUrl: "https://console.x.ai/",
    reliability: 7,
    trust: "Közepes-jó",
    price: "Jó",
    note: "Egyszerű modellválasztás és versenyképes ár. Éles rendszerben érdemes külön rate limit és support tesztet futtatni."
  },
  DeepSeek: {
    keyUrl: "https://platform.deepseek.com/api_keys",
    reliability: 6,
    trust: "Változó",
    price: "Nagyon olcsó",
    note: "Tokenárban brutálisan erős, főleg cache mellett. Kritikus rendszernél számolj geopolitikai, compliance és elérhetőségi kockázattal."
  },
  "Alibaba Qwen": {
    keyUrl: "https://www.alibabacloud.com/help/en/model-studio/get-api-key",
    reliability: 7,
    trust: "Jó",
    price: "Olcsó-közepes",
    note: "Nagy cloud háttér, több régiós opció. A tényleges ár és adatútvonal deployment módtól függhet."
  },
  "Qwen Cloud": {
    keyUrl: "https://docs.qwencloud.com/api-reference/preparation/api-key",
    reliability: 7,
    trust: "Jó",
    price: "Olcsó-közepes",
    note: "Qwenhez közvetlenebb fejlesztői belépő. Kulcs és workspace modell-hozzáférés összetartozik, ezt érdemes ellenőrizni."
  }
};

const scenarios = {
  home: { requests: 3000, input: 1200, output: 180, cache: 40, category: "budget" },
  support: { requests: 50000, input: 1800, output: 450, cache: 35, category: "budget" },
  coding: { requests: 10000, input: 8000, output: 2500, cache: 20, category: "balanced" },
  analysis: { requests: 2500, input: 35000, output: 3500, cache: 45, category: "flagship" },
  custom: null
};

const useCases = [
  {
    id: "home",
    title: "Home Assistant voice",
    description: "Rövid, gyakori parancsok: lámpa, termosztát, média, státuszlekérdezés. Itt a gyors válasz és adatvédelem fontosabb, mint a csúcsérvelés.",
    tags: ["tool calling", "alacsony latency", "privacy"],
    recommendation: "Csak olyan modell jó, amelyik fegyelmezetten hív eszközt. Lokális Home LLM/Ollama első körnek, cloud fallbacknek tool-erős olcsó modell.",
    plain: "Okosotthonnál nem esszét kérünk. A modellnek parancsot kell megértenie, eszközt hívnia, majd röviden visszajeleznie.",
    steps: [
      "Első választás: lokális modell, ha a privacy és válaszidő fontos.",
      "Cloud fallback: csak tool callingban erős, stabil szolgáltatóval.",
      "Kerüld azt a modellt, amelyik olcsó, de gyakran hibás JSON-t vagy rossz eszközhívást ad."
    ],
    weights: { cost: 0.22, tool: 0.48, reliability: 0.2, privacy: 0.1 }
  },
  {
    id: "support",
    title: "Ügyfélszolgálat",
    description: "Sok rövid beszélgetés, ismétlődő kontextus, sablonos válaszok. A cache és a stabil költségkeret sokat számít.",
    tags: ["nagy volumen", "cache", "kontroll"],
    recommendation: "Olcsó modell alapból, erősebb modell csak panaszos vagy komplex ügyre.",
    plain: "Itt sok ügyet kell kiszolgálni kiszámítható költséggel. A cache és a fallback stratégia többet érhet, mint egyetlen drága modell.",
    steps: [
      "Olcsó modell az ismétlődő kérdésekhez.",
      "Erősebb modell csak panaszra, szerződésre vagy összetett ügyre.",
      "Mérd külön a sikertelen válaszok költségét is."
    ],
    weights: { cost: 0.42, tool: 0.22, reliability: 0.28, privacy: 0.08 }
  },
  {
    id: "coding",
    title: "Kódolós agent",
    description: "Hosszabb input, sok fájlkontekstus, változó output. A legolcsóbb modell gyakran drágább lesz, ha sokat hibázik.",
    tags: ["hosszabb input", "tool use", "minőség"],
    recommendation: "Középkategória alapnak, zászlóshajó csak kritikus refaktorra vagy debugra.",
    plain: "Kódolásnál a hibás javaslat is költség. A modellnek fájlokat kell olvasnia, parancsokat értelmeznie és javításokat következetesen végigvinnie.",
    steps: [
      "Középkategória az alap agent munkára.",
      "Zászlóshajó csak bonyolult debugra vagy architekturális döntésre.",
      "Tool calling és hosszú kontextus fontosabb, mint a minimális tokenár."
    ],
    weights: { cost: 0.22, tool: 0.34, reliability: 0.3, privacy: 0.14 }
  },
  {
    id: "analysis",
    title: "Dokumentumelemzés",
    description: "Nagy input, közepes output, sok ismételt dokumentum. Itt a context window és a cache döntheti el a valós költséget.",
    tags: ["nagy kontextus", "cache", "pontosság"],
    recommendation: "Erős modell vagy nagy contextes modell, batch móddal ha nem real-time.",
    plain: "A dokumentumelemzésnél az input ára és a cache a lényeg. Ha nem azonnali válasz kell, a batch/flex mód sokat spórolhat.",
    steps: [
      "Nagy kontextus és pontos kivonatolás legyen az első szűrő.",
      "Cache vagy batch, ha ugyanazokat az anyagokat többször elemzed.",
      "Kritikus jogi/pénzügyi anyagnál ne csak az árat nézd."
    ],
    weights: { cost: 0.3, tool: 0.16, reliability: 0.38, privacy: 0.16 }
  }
];

const rates = { USD: 1, EUR: 0.92, HUF: 360 };
const symbols = { USD: "$", EUR: "€", HUF: "Ft" };
const categoryLabels = {
  budget: "Olcsó",
  balanced: "Közép",
  flagship: "Zászlóshajó",
  all: "Minden"
};

function currentUseCase() {
  return useCases.find((useCase) => useCase.id === els.scenario.value) || useCases[0];
}

const els = {
  category: document.querySelector("#category"),
  viewMode: document.querySelector("#viewMode"),
  scenario: document.querySelector("#scenario"),
  requests: document.querySelector("#requests"),
  currency: document.querySelector("#currency"),
  inputTokens: document.querySelector("#inputTokens"),
  outputTokens: document.querySelector("#outputTokens"),
  cacheRate: document.querySelector("#cacheRate"),
  includeChinese: document.querySelector("#includeChinese"),
  useBatch: document.querySelector("#useBatch"),
  toolReadyOnly: document.querySelector("#toolReadyOnly"),
  sortBy: document.querySelector("#sortBy"),
  inputValue: document.querySelector("#inputValue"),
  outputValue: document.querySelector("#outputValue"),
  cacheValue: document.querySelector("#cacheValue"),
  heroCost: document.querySelector("#heroCost"),
  heroModel: document.querySelector("#heroModel"),
  useCaseGrid: document.querySelector("#useCaseGrid"),
  decisionCopy: document.querySelector("#decisionCopy"),
  decisionPicks: document.querySelector("#decisionPicks"),
  summaryCards: document.querySelector("#summaryCards"),
  modelRows: document.querySelector("#modelRows"),
  providerGrid: document.querySelector("#providerGrid"),
  sourceList: document.querySelector("#sourceList"),
  chartMode: document.querySelector("#chartMode"),
  chart: document.querySelector("#costChart")
};

function formatNumber(value) {
  return new Intl.NumberFormat("hu-HU").format(Math.round(value));
}

function money(value, currency = els.currency.value) {
  const converted = value * rates[currency];
  if (currency === "HUF") return `${formatNumber(converted)} ${symbols[currency]}`;
  return `${symbols[currency]}${converted.toLocaleString("en-US", { maximumFractionDigits: converted >= 100 ? 0 : 2 })}`;
}

function activeProfile() {
  return {
    category: els.category.value,
    requests: Number(els.requests.value || 0),
    inputTokens: Number(els.inputTokens.value),
    outputTokens: Number(els.outputTokens.value),
    cacheRate: Number(els.cacheRate.value) / 100,
    includeChinese: els.includeChinese.checked,
    useBatch: els.useBatch.checked,
    toolReadyOnly: els.toolReadyOnly.checked
  };
}

function modelCost(model, profile) {
  const inputPrice = profile.useBatch && model.batchInput ? model.batchInput : model.input;
  const outputPrice = profile.useBatch && model.batchOutput ? model.batchOutput : model.output;
  const cachedPrice = model.cached ?? inputPrice;
  const inputM = (profile.requests * profile.inputTokens) / 1_000_000;
  const outputM = (profile.requests * profile.outputTokens) / 1_000_000;
  const cachedInputM = inputM * profile.cacheRate;
  const freshInputM = inputM - cachedInputM;
  return freshInputM * inputPrice + cachedInputM * cachedPrice + outputM * outputPrice;
}

function privacyScore(model) {
  if (model.region === "CN") return 5;
  if (model.provider === "Google" || model.provider === "OpenAI" || model.provider === "Anthropic") return 8;
  return 7;
}

function decisionScore(model, rows, useCase) {
  const maxTotal = Math.max(...rows.map((row) => row.total), 1);
  const minTotal = Math.min(...rows.map((row) => row.total), 0);
  const costScore = maxTotal === minTotal ? 10 : 10 - ((model.total - minTotal) / (maxTotal - minTotal)) * 9;
  const provider = providers[model.provider];
  const weights = useCase.weights;
  return (
    costScore * weights.cost +
    model.toolUse * weights.tool +
    (provider?.reliability || 6) * weights.reliability +
    privacyScore(model) * weights.privacy
  );
}

function filteredModels(profile) {
  return models
    .filter((model) => profile.category === "all" || model.category === profile.category)
    .filter((model) => profile.includeChinese || model.region !== "CN")
    .filter((model) => !profile.toolReadyOnly || model.toolUse >= 7);
}

function sortedModels(rows) {
  const sortBy = els.sortBy.value;
  return [...rows].sort((a, b) => {
    if (sortBy === "provider") return `${a.provider}${a.name}`.localeCompare(`${b.provider}${b.name}`);
    if (sortBy === "output") return a.output - b.output;
    if (sortBy === "tool") return b.toolUse - a.toolUse || a.total - b.total;
    return a.total - b.total;
  });
}

function renderSummary(rows, profile) {
  if (!rows.length) {
    els.summaryCards.innerHTML = "<div class=\"summary-card\"><strong>Nincs találat</strong><p>Kapcsold vissza a kínai modelleket vagy válts kategóriát.</p></div>";
    return;
  }

  const costSorted = [...rows].sort((a, b) => a.total - b.total);
  const cheapest = costSorted[0];
  const expensive = costSorted[costSorted.length - 1];
  const median = costSorted[Math.floor(costSorted.length / 2)];
  const toolPick = [...rows].sort((a, b) => b.toolUse - a.toolUse || a.total - b.total)[0];
  const totalTokens = profile.requests * (profile.inputTokens + profile.outputTokens);
  const multiplier = expensive.total / Math.max(cheapest.total, 0.000001);

  els.heroCost.textContent = money(cheapest.total);
  els.heroModel.textContent = `${cheapest.name} a legolcsóbb ebben a nézetben`;

  els.summaryCards.innerHTML = [
    ["Legolcsóbb", money(cheapest.total), cheapest.name],
    ["Legjobb tool", `${toolPick.toolUse}/10`, `${toolPick.name} (${money(toolPick.total)})`],
    ["Középérték környéke", money(median.total), median.name],
    ["Legdrágább", money(expensive.total), `${multiplier.toFixed(1)}x a legolcsóbbhoz képest`],
    ["Havi tokenmennyiség", formatNumber(totalTokens), `${formatNumber(profile.requests)} kérés alapján`]
  ]
    .map(([label, value, text]) => `
      <article class="summary-card">
        <span>${label}</span>
        <strong>${value}</strong>
        <p>${text}</p>
      </article>
    `)
    .join("");
}

function renderDecision(rows) {
  if (!rows.length) {
    els.decisionCopy.innerHTML = `
      <h2>Nincs ajánlható modell ebben a szűrésben</h2>
      <p>Kapcsold ki a túl szigorú szűrést, vagy válts kategóriát. Ez nem hiba: néha pont az a hasznos válasz, hogy a feltételek túl szűkek.</p>
    `;
    els.decisionPicks.innerHTML = "";
    return;
  }

  const useCase = currentUseCase();
  const enriched = rows.map((row) => ({
    ...row,
    decisionScore: decisionScore(row, rows, useCase)
  }));
  const cheapest = [...enriched].sort((a, b) => a.total - b.total)[0];
  const toolBest = [...enriched].sort((a, b) => b.toolUse - a.toolUse || a.total - b.total)[0];
  const recommended = [...enriched].sort((a, b) => b.decisionScore - a.decisionScore)[0];

  els.decisionCopy.innerHTML = `
    <h2>${useCase.title}: így döntenék</h2>
    <p>${useCase.plain}</p>
    <div class="decision-steps">
      ${useCase.steps.map((step) => `<div>${step}</div>`).join("")}
    </div>
  `;

  els.decisionPicks.innerHTML = [
    ["Ajánlott", recommended, "A kiválasztott feladathoz az ár, tool calling, szolgáltatói stabilitás és privacy együttese alapján."],
    ["Legolcsóbb", cheapest, "Ha a költség a legerősebb korlát, innen indulnék, de élesben mérném a hibaarányt."],
    ["Legjobb tool", toolBest, "Ha eszközöket kell hívni, például Home Assistant entitásokat vezérelni."]
  ].map(([label, model, text]) => `
    <article class="decision-card">
      <span>${label}</span>
      <strong>${model.name}</strong>
      <p>${model.provider} · ${money(model.total)} / hó</p>
      <div class="score-line">Tool <div class="score-bar"><i style="--score:${model.toolUse * 10}%"></i></div></div>
      <div class="score-line">Döntés <div class="score-bar"><i style="--score:${Math.round(model.decisionScore * 10)}%"></i></div></div>
      <p>${text}</p>
    </article>
  `).join("");
}

function renderTable(rows, profile) {
  els.modelRows.innerHTML = rows
    .map((model) => {
      const input = profile.useBatch && model.batchInput ? model.batchInput : model.input;
      const output = profile.useBatch && model.batchOutput ? model.batchOutput : model.output;
      const provider = providers[model.provider];
      return `
        <tr>
          <td><span class="model-name">${model.name}</span><br><span class="muted">${model.note}</span></td>
          <td>${model.provider}</td>
          <td><span class="pill">${categoryLabels[model.category]}</span></td>
          <td><span class="rating">${model.toolUse}/10</span></td>
          <td><span class="rating">${provider?.reliability ?? "?"}/10</span></td>
          <td>$${input}/M</td>
          <td>${model.cached == null ? "n/a" : `$${model.cached}/M`}</td>
          <td>$${output}/M</td>
          <td><strong>${money(model.total)}</strong></td>
        </tr>
      `;
    })
    .join("");
}

function renderProviders(rows) {
  const providerRows = Object.entries(providers)
    .map(([name, meta]) => {
      const ownedModels = rows.filter((row) => row.provider === name);
      const cheapest = ownedModels.length ? [...ownedModels].sort((a, b) => a.total - b.total)[0] : null;
      return { name, ...meta, cheapest };
    })
    .sort((a, b) => b.reliability - a.reliability || a.name.localeCompare(b.name));

  els.providerGrid.innerHTML = providerRows
    .map((provider) => `
      <article class="provider-card">
        <div>
          <h3>${provider.name}</h3>
          <p>${provider.note}</p>
        </div>
        <div class="provider-meta">
          <div>
            <span>Megbízhatóság</span>
            <strong>${provider.trust} (${provider.reliability}/10)</strong>
          </div>
          <div>
            <span>Árszint</span>
            <strong>${provider.price}</strong>
          </div>
          <div>
            <span>Ebben a nézetben</span>
            <strong>${provider.cheapest ? money(provider.cheapest.total) : "nincs modell"}</strong>
          </div>
          <div>
            <span>Legjobb illeszkedés</span>
            <strong>${provider.cheapest ? provider.cheapest.name : "más kategória"}</strong>
          </div>
        </div>
        <a class="key-link" href="${provider.keyUrl}" target="_blank" rel="noreferrer">API-kulcs létrehozása</a>
      </article>
    `)
    .join("");
}

function renderUseCases() {
  els.useCaseGrid.innerHTML = useCases
    .map((useCase) => `
      <article class="usecase-card">
        <div>
          <h3>${useCase.title}</h3>
          <p>${useCase.description}</p>
        </div>
        <div class="usecase-tags">
          ${useCase.tags.map((tag) => `<span>${tag}</span>`).join("")}
        </div>
        <p><strong>Javaslat:</strong> ${useCase.recommendation}</p>
        <button class="usecase-button" type="button" data-scenario="${useCase.id}">Ezt számoljuk</button>
      </article>
    `)
    .join("");

  els.useCaseGrid.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      els.scenario.value = button.dataset.scenario;
      applyScenario(button.dataset.scenario);
      render();
    });
  });
}

function renderChart(rows) {
  const canvas = els.chart;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth;
  const cssHeight = 320;
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const left = 170;
  const right = 28;
  const top = 18;
  const rowHeight = Math.min(34, (cssHeight - top - 20) / Math.max(rows.length, 1));
  const useDecisionChart = els.chartMode.value === "decision";
  const useCase = currentUseCase();
  const scoredRows = rows.map((row) => ({ ...row, decisionScore: decisionScore(row, rows, useCase) }));
  const max = Math.max(...scoredRows.map((row) => useDecisionChart ? row.decisionScore : row.total), 1);
  const colors = { budget: "#0d766e", balanced: "#34699a", flagship: "#b98222" };

  ctx.font = "12px Inter, system-ui, sans-serif";
  ctx.textBaseline = "middle";

  scoredRows.forEach((row, index) => {
    const y = top + index * rowHeight + rowHeight / 2;
    const chartValue = useDecisionChart ? row.decisionScore : row.total;
    const barWidth = ((cssWidth - left - right) * chartValue) / max;

    ctx.fillStyle = "#40504a";
    ctx.fillText(row.name.slice(0, 22), 4, y);

    ctx.fillStyle = "#edf1ed";
    ctx.fillRect(left, y - 8, cssWidth - left - right, 16);

    ctx.fillStyle = colors[row.category] || "#0d766e";
    ctx.fillRect(left, y - 8, Math.max(2, barWidth), 16);

    ctx.fillStyle = "#17201c";
    ctx.fillText(useDecisionChart ? `${row.decisionScore.toFixed(1)}/10` : money(row.total), left + Math.min(barWidth + 8, cssWidth - left - right - 76), y);
  });
}

function renderSources() {
  els.sourceList.innerHTML = sources
    .map(([name, url]) => `<a href="${url}" target="_blank" rel="noreferrer">${name}</a>`)
    .join("");
}

function updateLabels() {
  els.inputValue.textContent = formatNumber(Number(els.inputTokens.value));
  els.outputValue.textContent = formatNumber(Number(els.outputTokens.value));
  els.cacheValue.textContent = `${els.cacheRate.value}%`;
}

function render() {
  updateLabels();
  document.body.classList.toggle("simple-mode", els.viewMode.value === "simple");
  const profile = activeProfile();
  const rows = sortedModels(
    filteredModels(profile).map((model) => ({
      ...model,
      total: modelCost(model, profile)
    }))
  );

  renderDecision(rows);
  renderSummary(rows, profile);
  renderTable(rows, profile);
  renderProviders(rows);
  renderChart(rows);
}

function applyScenario(name) {
  const scenario = scenarios[name];
  if (!scenario) return;
  els.requests.value = scenario.requests;
  els.inputTokens.value = scenario.input;
  els.outputTokens.value = scenario.output;
  els.cacheRate.value = scenario.cache;
  els.category.value = scenario.category;
}

["category", "viewMode", "requests", "currency", "inputTokens", "outputTokens", "cacheRate", "includeChinese", "useBatch", "toolReadyOnly", "chartMode", "sortBy"].forEach((id) => {
  els[id].addEventListener("input", () => {
    els.scenario.value = "custom";
    render();
  });
});

els.scenario.addEventListener("change", (event) => {
  applyScenario(event.target.value);
  render();
});

window.addEventListener("resize", render);

renderSources();
renderUseCases();
render();
