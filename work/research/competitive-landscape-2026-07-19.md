# LLM-ár- és modellválasztó megoldások – piaci és GitHub-kutatás

**Ellenőrzés dátuma:** 2026-07-19
**Cél:** felmérni, milyen meglévő megoldásokból és nyílt adatforrásokból érdemes tanulni, mielőtt továbbépítjük az LLM Observatory alkalmazást.

**Független ellenőrzés:** 2026-07-19-én külön reviewer vizsgálta a következtetéseket, további versenytársakat és a megvalósíthatóságot. Verdiktje: **FELTÉTELES GO**. A részletes review: [reviewer-report-2026-07-19.md](reviewer-report-2026-07-19.md).

## Rövid következtetés

Az alapötlet nem új, de a jó megoldás jelenleg több külön termék között van szétszórva:

- a **Portkey Models**, a **LiteLLM** és a **Pydantic genai-prices** széles ár- és modelladatbázist ad;
- az **OpenRouter** erős keresést, összehasonlítást, kategóriákat és automatikus modellválasztást mutat;
- az **Artificial Analysis** ár, minőség, sebesség és késleltetés közötti kompromisszumokat teszi láthatóvá;
- a **HELM** és a **Lighteval** azt mutatja meg, hogyan lehet feladatonként, több mérőszámmal értékelni;
- a **GitHub Copilot Auto** a legegyszerűbb felhasználói mintát mutatja: automatikus választás, de kézi felülbírálási lehetőséggel.

A megvizsgált mezőnyben nem találtunk olyan megoldást, amely igazolhatóan és maradéktalanul egyszerre teljesítené ezt az öt követelményt:

1. széles, több szolgáltatót lefedő, friss modell- és árkatalógus;
2. közvetlen szolgáltatói árak és közvetlen API-kulcs-linkek;
3. egyszerű, magyar, feladatból kiinduló modellválasztás;
4. bizonyítékokra és átlátható szerkesztői indoklásra épülő alkalmassági ajánlás;
5. a felhasználó saját forgalmára kiszámolt, érthető költség.

Ez a kombináció lehet az alkalmazás valódi megkülönböztető értéke. Nem új ár-adatbázist kell nulláról építeni, hanem több meglévő forrás fölé egy ellenőrzött, emberközpontú döntési réteget.

## Összehasonlító térkép

| Megoldás | Mit old meg? | Hogyan működik? | Amit érdemes átvenni | Amit nem érdemes másolni |
|---|---|---|---|---|
| [Portkey Models](https://portkey.ai/models) | Nagy modell- és árkatalógus | Szolgáltatónkénti JSON-adatok, keresés, feature-szűrés, API | Árséma, speciális díjegységek, forráslink, frissítési idő | A több ezer soros technikai táblázat kezdőknek túl nehéz |
| [Pydantic genai-prices](https://github.com/pydantic/genai-prices) | Géppel olvasható, történeti és összetett árak | YAML/JSON adatok, verziózott árszakaszok, eltérésvizsgálat | Időbeli árváltozás, sávos és napszakos árak kezelése | Önmagában nem felhasználói termék és nem ígér 100%-os pontosságot |
| [LiteLLM](https://github.com/BerriAI/litellm) | Egységes API és nagy modellkatalógus | Egy közösségi JSON-ban árak, kontextus és képességjelzők | Széles lefedettség, modellazonosítók és képességmezők | Nem tekinthető automatikusan hivatalos, aktuális igazságforrásnak |
| [OpenRouter Models](https://openrouter.ai/models) | Keresés, szűrés, felfedezés és routing | Saját piactér-adatok, kategóriák, benchmark-szűrők, forgalmi adatok | Emberi kategóriák, erős szűrők, összehasonlítási presetek | A közvetítői ár és elérhetőség nem azonos a közvetlen szolgáltatói API-val |
| [OpenRouter Compare](https://openrouter.ai/compare) | Két modell gyors összevetése | Előre összeállított csoportok, majd két modell kiválasztása | „Legjobb kódolásra”, „legolcsóbb”, „csúcsmodellek” belépési pontok | A puszta kétoszlopos specifikáció még nem magyarázza el, melyik modell miért jobb |
| [OpenRouter Auto Router](https://openrouter.ai/docs/guides/routing/routers/auto-router) | Automatikus modellválasztás prompt alapján | Feladat- és komplexitásbecslés, költség–minőség csúszka, engedélyezett modelllista | Automatikus alapértelmezés, költség–minőség preferencia, kézi korlátok | Első kiadásban nem kell fizetős, futás közbeni LLM-routert építeni |
| [Artificial Analysis](https://artificialanalysis.ai/models) | Minőség, ár, sebesség és késleltetés elemzése | Saját benchmarkok, összetett indexek, részletes módszertan | Többdimenziós döntés és látható módszertan | Túl sűrű szakmai felület; egy összetett pontszámot nem szabad vakon átvenni |
| [Stanford HELM](https://github.com/stanford-crfm/helm) | Reprodukálható modellértékelés | Szcenáriók, több mérőszám, dokumentált futtatás | „Nincs univerzális győztes”; feladatonkénti értékelés | Teljes benchmark-infrastruktúra túl nehéz egy első publikus kiadáshoz |
| [Hugging Face Lighteval](https://github.com/huggingface/lighteval) | Saját értékelési feladatok futtatása | Bővíthető task- és metric-keretrendszer | Későbbi magyar, valós feladatokra épülő mini tesztkészlet | Nem helyettesíti az egyszerű felhasználói magyarázatot |
| [GitHub Copilot Auto](https://docs.github.com/en/copilot/concepts/auto-model-selection) | A modellválasztás terhének levétele | Feladatkomplexitás és aktuális rendszerállapot alapján választ, az eredményt megmutatja | „Válassz helyettem” mint elsődleges út, kézi felülbírálással | A belső routinglogika és teljesítményadatok nem nyíltak |
| [ai-llm-comparison](https://github.com/Ahmet-Dedeler/ai-llm-comparison) | Nyílt forrású összehasonlító felület | A LiteLLM JSON letöltése, átalakítása, statikus megjelenítése | Gyors prototípus és egyszerű adatformázás | Nincs önálló hitelesítés, feladatlogika vagy tartós forrás-nyomonkövetés |
| [LLMCalculators](https://llmcalculators.com/) | Havi költségbecslés és modellajánlás | Modell- és szolgáltatóválasztás, cache/batch opciók, recommender és ártörténet | Érthető költségkalkuláció és történeti szemlélet | A saját frissességi és bizonyítékszint-szabályainkat külön kell fenntartani |
| [Orvirt Model Comparison](https://www.orvirt.com/tools/model-comparison) | Gyors „Pick For Me” ajánlás | Feladat, prioritás és volumen alapján szűkít | Rövid, hétköznapi kérdéssor | A kevés kérdés miatt az indoklás és a kizárási logika könnyen rejtve marad |
| [AI API Prices](https://aiapiprices.com/) | Ár-összehasonlítás és feladatalapú útmutató | Több szolgáltató, kalkulátor, Grok és kínai modellek, forráslinkek | Szélesebb szolgáltatói lefedettség és hivatalos hivatkozások | Ellenőrizni kell, hogy rekord szinten mennyire következetes a frissesség |
| [Try That LLM](https://trythatllm.com/) | Modellek összevetése saját promptokon | Ugyanazt a promptot több modellen futtatja, költséget és minőséget hasonlít | Valós felhasználói feladatból induló próba | Futási költséget, API-kezelést és új adatvédelmi kockázatot hoz |
| [models.dev](https://github.com/anomalyco/models.dev) | Nyílt modell-, ár- és képességadatbázis | MIT-licences adatbázis és ingyenes API | Új felderítési forrás és nyílt integrációs lehetőség | Publikált, ellenőrzött árhoz továbbra is hivatalos forrás szükséges |
| [Not Diamond](https://docs.notdiamond.ai/docs/key-concepts) / [Martian](https://docs.withmartian.com/integrations) | Futás közbeni intelligens routing | A kéréshez választ modellt szolgáltatásként | Későbbi routing minták és mérési szempontok | Nem része a 0 Ft többletköltségű statikus V1-nek |
| [LLMRouter](https://github.com/ulab-uiuc/LLMRouter) / [RouteLLM](https://github.com/lm-sys/RouteLLM) | Nyílt routingkutatás és implementáció | Minőség–költség célok alapján dinamikus modellválasztás | Későbbi kísérleti referencia | Nem keverendő össze a statikus döntéstámogató ajánlóval |

## Mit mutatnak a működő minták?

### 1. Előbb szándékot kérdeznek, csak utána modellt

Az OpenRouter a teljes katalógus mellett előre megnevezett csoportokat ad, például olcsó, kódolásra alkalmas vagy reasoning modelleket. A Copilot Auto ennél is tovább megy: a felhasználónak nem kell minden esetben modellt választania.

**Következmény:** a mi első kérdésünk ne az legyen, hogy „A vagy B modell?”, hanem például:

- Mit szeretnél csinálni?
- Mi fontosabb: a minőség, az ár, a sebesség vagy az adatkezelés?
- Mekkora anyaggal dolgozol?
- Kell kép, hang, tool calling vagy strukturált JSON?

A felhasználó kaphasson egy **„Ajánlj nekem”** és egy **„Én választok”** útvonalat ugyanabban a felületben.

### 2. A „modell” és a „beszerzési csatorna” két külön dolog

Ugyanaz a modell elérhető lehet közvetlenül a fejlesztőjénél, OpenRouteren, Azure-on, AWS Bedrockon vagy más hostnál, eltérő áron és feltételekkel. A LiteLLM és a Portkey adataiban ez külön szolgáltatói rekordként jelenik meg.

**Következmény:** az adatsémában külön kell kezelni:

- modellcsalád és modellverzió;
- modell készítője;
- API-t biztosító szolgáltató vagy csatorna;
- régió és elszámolási mód;
- közvetlen vagy közvetített hozzáférés;
- API-kulcs- és dokumentációs link.

Enélkül félrevezető lehet az „ennek a modellnek ennyi az ára” állítás.

### 3. A frissesség nem lehet egyetlen láblécdátum

A vizsgálat közben látható volt, hogy egy projekt README-je és élő oldala eltérhet, egy korábban megadott domain más termékre irányíthat, és egy nagy katalógus egyes rekordjai hónapokkal korábbi frissítést mutathatnak. A Pydantic projekt maga is jelzi, hogy az árak csak best-effort pontosságúak, mert nincs minden szolgáltatónál hivatalos gépi árlista.

**Következmény:** minden árrekordhoz kötelező:

- `source_url`;
- `verified_at`;
- `verification_status`;
- a szolgáltató és a csatorna;
- az ár érvényességi kezdete, ha ismert;
- külön figyelmeztetés, ha az adat régi vagy nem ellenőrizhető.

Közösségi katalógust használhatunk **felderítésre és változásjelzésre**, de publikus „ellenőrzött” árhoz hivatalos szolgáltatói forrás kell.

### 4. A jó ajánlás többdimenziós

Az Artificial Analysis és a HELM alapján a „legjobb modell” kérdés önmagában hibás. Más modell nyerhet minőségben, árban, sebességben, késleltetésben, hosszú kontextusban vagy egy konkrét feladaton.

**Következmény:** ne egyetlen varázspontszámot mutassunk. A felhasználó kapjon érthető minősítéseket:

- különösen jó erre;
- megfelelő erre;
- csak kompromisszummal;
- nem ajánlott erre;
- nincs elég friss bizonyíték.

Minden minősítésnél legyen rövid „miért?”, és különüljön el:

1. hivatalos képességadat;
2. független benchmark;
3. saját mérés;
4. szerkesztői következtetés.

### 5. A hatalmas katalógus nem egyenlő jó termékkel

A Portkey élő katalógusa több ezer modellt és végpontot jelenít meg. Ez adatforrásként értékes, de első képernyőként túlterhelő. Az OpenRouter a kategóriákkal jobb belépést ad, de még így is szakmai felület.

**Következmény:** első kiadásban ne akarjunk minden modellt egyformán előtérbe tenni. A független review alapján két ellenőrzési szint szükséges:

- **12–18 ajánlható modell:** teljes ár-, képesség-, életciklus-, forrás- és API-link-ellenőrzéssel;
- **25–40 kereshető modell:** szélesebb választék, de az ajánlási feltételeket még nem teljesítő rekordok egyértelmű megjelölésével;
- az ajánlható szintben legyen OpenAI, Anthropic, Google, xAI/Grok, Mistral, valamint DeepSeek, Qwen, Kimi/Moonshot, MiniMax és GLM/Zhipu, ha hivatalosan és aktuálisan ellenőrizhetők;
- a kereshető, de nem teljesen ellenőrzött rekord nem kerülhet automatikus ajánlásba;
- elavult, előzetes vagy nem ellenőrzött modell ne keveredjen a biztos ajánlások közé.

### 6. Három eltérő terméket nem szabad összekeverni

A kutatás három közeli, de eltérő működést talált:

1. **statikus döntéstámogatás:** feladat- és preferenciaválaszokból, dokumentált szabályokkal ajánl modellt;
2. **saját prompton végzett értékelés:** ugyanazt a valós feladatot több modellen lefuttatja és összeveti;
3. **futás közbeni routing:** minden API-kérésnél automatikusan kiválasztja a szolgáltatandó modellt.

Az első kiadás kizárólag az első kategória. A második és harmadik valódi API-forgalmat, költséget, kulcskezelést és adatvédelmi felelősséget hozna, ezért csak későbbi, külön jóváhagyási kapuban vizsgálható.

## Javasolt hibrid felépítés

### 1. Felderítési réteg

Használható változások és új modellek észlelésére:

- Portkey Models;
- Pydantic genai-prices;
- LiteLLM;
- OpenRouter Models API;
- models.dev.

Ezek nem automatikus publikációs igazságforrások, hanem jelzik, hogy mit kell újraellenőrizni.

### 2. Hivatalos ellenőrzési réteg

Minden, a fő ajánlóban megjelenő modellnél emberi ellenőrzés nyitja meg és veti össze a hivatalos:

- árlistát;
- modell-dokumentációt;
- API-elérhetőséget;
- API-kulcs létrehozási oldalt;
- deprecációs és életciklus-információt.

Csak ezután kaphat a rekord „ellenőrzött” státuszt.

Az automatika kizárólag változást észlelhet, és a rekordot felülvizsgálatra jelölheti. Módosult árat, modellazonosítót, életciklust vagy más időérzékeny adatot emberi jóváhagyás nélkül nem publikálhat, és nem jelölhet ellenőrzöttként.

### 3. Alkalmassági réteg

Az ajánlás egy átlátható szabályrendszerből induljon, ne egy újabb LLM-hívásból. Ez 0 Ft/hó többletköltségű induló keret mellett is működik.

A pontos pénzügyi cél **0 Ft/hó többletköltség** a már meglévő Netlify-előfizetés fölött. Ez nem azonos a teljes infrastruktúra nulla listaárával. Fizetős szolgáltatás, automatikus túlfogyasztás vagy API-hívás továbbra is csak külön jóváhagyással kapcsolható be.

Például a feladatprofil alapján pontozható:

- szükséges modalitás és képesség;
- kontextusigény;
- minőségi bizonyíték;
- válaszsebesség;
- becsült havi költség;
- stabilitás és életciklus;
- közvetlen API-elérhetőség;
- adatkezelési vagy régiós követelmény.

A pontszám részei és a kizárási okok legyenek láthatók. Később opcionálisan hozzáadható egy intelligens router, külön költségjóváhagyással.

### 4. Felhasználói felület

Egyetlen egységes megjelenési forma két belépéssel:

1. **Ajánlj nekem** – feladat és prioritások alapján 3–5 jelölt;
2. **Én választok** – kereshető katalógus és 2–4 modell összehasonlítása.

Mindkét út ugyanarra a modellkártyára vezessen, amely mutatja:

- mire különösen jó és mire nem;
- becsült költség a felhasználó használatára;
- input/output és egyéb díjak érthetően;
- minőség–ár–sebesség kompromisszum;
- forrás és rekord szintű ellenőrzési dátum;
- közvetlen „API-kulcsot kérek” link;
- alternatív hozzáférési csatornák külön, nem összekeverve.

## Konkrét termékirány a következő kapuhoz

Nem egy nagyobb legördülő lista a megoldás. A következő tervezési körben ezt érdemes elkészíteni:

1. 8–12 magas szintű feladatcsalád, például kódolás, kutatás, hosszú dokumentum, ügyfélszolgálat, strukturált adatkinyerés, kreatív szöveg, fordítás, kép, hang és agent/tool use;
2. minden család alatt 3–6 hétköznapi példafeladat vagy rövid szabad szöveges célmegadás;
3. 12–18 teljesen ellenőrzött és ajánlható modell, valamint összesen 25–40 kereshető modell; az ajánlható körben Grokkal és a jelentős kínai szolgáltatók hivatalosan elérhető modelljeivel;
4. egyszerű, dokumentált rangsorolási szabályok;
5. ugyanazon modellkártya az ajánlóban és a kézi összehasonlításban;
6. rekord szintű forrás és frissesség kijelzése.

Mielőtt ezt implementáljuk, egy drótvázon érdemes jóváhagyni a közös modellkártyát és az „Ajánlj nekem / Én választok” váltást.

## Forrásjegyzék

Minden alábbi forrást 2026-07-19-én ellenőriztem.

- Portkey Models élő katalógus: https://portkey.ai/models
- Portkey Models GitHub és API-leírás: https://github.com/Portkey-AI/models
- Pydantic genai-prices: https://github.com/pydantic/genai-prices
- LiteLLM: https://github.com/BerriAI/litellm
- OpenRouter modellkatalógus: https://openrouter.ai/models
- OpenRouter modelldokumentáció: https://openrouter.ai/docs/guides/overview/models
- OpenRouter Models API: https://openrouter.ai/docs/api/api-reference/models/get-models
- OpenRouter összehasonlító: https://openrouter.ai/compare
- OpenRouter Auto Router: https://openrouter.ai/docs/guides/routing/routers/auto-router
- Artificial Analysis modellek és módszertan: https://artificialanalysis.ai/models
- Stanford HELM: https://github.com/stanford-crfm/helm
- HELM példaszcenáriók: https://nlp.stanford.edu/helm/instruction-pilot_six_scenarios/
- Hugging Face Lighteval: https://github.com/huggingface/lighteval
- GitHub Copilot automatikus modellválasztás: https://docs.github.com/en/copilot/concepts/auto-model-selection
- Nyílt forrású ai-llm-comparison: https://github.com/Ahmet-Dedeler/ai-llm-comparison
- LLMCalculators: https://llmcalculators.com/
- Orvirt Model Comparison: https://www.orvirt.com/tools/model-comparison
- AI API Prices: https://aiapiprices.com/
- Try That LLM: https://trythatllm.com/
- models.dev: https://github.com/anomalyco/models.dev
- Not Diamond: https://docs.notdiamond.ai/docs/key-concepts
- Martian: https://docs.withmartian.com/integrations
- LLMRouter: https://github.com/ulab-uiuc/LLMRouter
- RouteLLM: https://github.com/lm-sys/RouteLLM
- xAI hivatalos árazás: https://docs.x.ai/developers/pricing
- DeepSeek hivatalos árazás: https://api-docs.deepseek.com/quick_start/pricing/
- Alibaba Model Studio hivatalos árazás: https://www.alibabacloud.com/help/en/model-studio/model-pricing
- Kimi hivatalos árazás: https://platform.kimi.ai/docs/pricing/chat
- MiniMax hivatalos API-előkészítés: https://platform.minimax.io/docs/guides/quickstart-preparation
- GitHub Actions díjazás és használat: https://docs.github.com/en/actions/concepts/billing-and-usage
- Netlify díjcsomagok: https://www.netlify.com/pricing/

## Kutatási korlátok

- A szolgáltatók és közösségi adatbázisok adatai folyamatosan változnak; ez a dokumentum dátumozott pillanatkép.
- Egy élő felület működésének megfigyelése nem jogosít fel a mögöttes zárt adatok vagy rangsorolási módszer átvételére.
- A benchmark-eredmények licencét és újrafelhasználhatóságát külön ellenőrizni kell, mielőtt adatot emelnénk be az alkalmazásba.
- A további implementáció előtt minden induló modell árát, API-azonosítóját, életciklusát és kulcsigénylő linkjét a hivatalos szolgáltatói oldalon újra kell ellenőrizni.
