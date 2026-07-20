# Gate 5 – bizonyítékra épülő modellajánlás

**Állapot:** implementáció előtti döntési terv

**Élő ellenőrzés dátuma:** 2026-07-20

**Cél:** az alkalmazás egyszerűen mondja el, melyik modell milyen munkára használható, mikor nem érdemes választani, és mennyibe kerülhet – bizonyítatlan „legjobb” állítás nélkül.

## Rövid döntési javaslat

A Gate 5 két egymásra épülő, de külön ellenőrizhető lépcső legyen:

1. **Gate 5B – igazolt képességek:** a jelenlegi 14 modellhez hivatalos forrásból rögzítjük a feladathoz szükséges technikai képességeket, korlátokat, külön díjakat és quickstart linket. Ez már lehetővé teszi, hogy az alkalmazás megmondja: „technikailag támogatja”, „nem támogatja” vagy „nincs elég adat”. A „feladatra alkalmas” minősítéshez ez önmagában még nem elég.
2. **Gate 5C – független alkalmasság:** minőségi vagy sebességi sorrend csak annál a feladatnál jelenhet meg, ahol ugyanaz a nyílt, független mérés legalább három pontosan azonosított modellt, legalább két szolgáltatót és azonos mérési beállítást fed le.

Ez a szétválasztás egyszerű marad a felhasználónak, de megakadályozza, hogy egy szolgáltató saját marketingállítása „független ajánlásként” jelenjen meg.

## Amit a felhasználó lát

Az első eredményképernyő továbbra is legfeljebb három kártyát mutat. Egy kártya első nézetében csak ez szerepel:

- **Miért jó erre?** – legfeljebb két rövid, bizonyított állítás.
- **Mikor ne ezt válaszd?** – egy konkrét korlát vagy kompromisszum.
- **Becsült havi API-költség** – pontos scope-pal.
- **Ellenőrizve** – a legrégebbi felhasznált bizonyíték dátuma.
- **API-kulcs létrehozása** – hivatalos link.

Egyetlen egyszerű jelölés mutatja a bizonyíték erősségét:

- **Hivatalosan támogatott** – technikai képesség vagy korlát; nem minőségi ajánlás.
- **Függetlenül mért** – minőség vagy sebesség összehasonlítható benchmarkból.
- **Nincs még elég bizonyíték** – nincs automatikus alkalmassági sorrend.

A nyers benchmarkpontszám, verzió, promptbeállítás, forrás és módszertan a „Miért ezt látom?” részben marad. A felhasználónak nem kell ezeket megértenie ahhoz, hogy dönteni tudjon.

## A bizonyíték négy külön fajtája

### 1. Hivatalos szolgáltatói tény

Használható erre:

- pontos API-modellazonosító és életciklus;
- text, image, audio vagy video input/output;
- function calling, structured output, file search, web search és más eszközök támogatása;
- kontextus- és outputkorlát;
- alapár és külön díjelemek;
- API-kulcs és quickstart útvonal.

Nem használható arra, hogy a modellt más szolgáltatók modelljeinél jobbnak nevezzük.

### 2. Független mérés

Használható minőségi vagy sebességi sorrendre, ha:

- a mérés nyilvános és a módszertana ellenőrizhető;
- az adat újraközlése vagy hivatkozása jogszerű a 0 Ft-os termékben;
- a benchmark, verzió, futtatási mód és modellbeállítás azonos;
- az eredmény pontos API-modellhez vagy dokumentált snapshothoz köthető;
- legalább három modell és két szolgáltató összehasonlítható;
- az eredmény nem járt le és nem lett újabb benchmarkverzióval felülírva.

### 3. Saját magyar teszt

Későbbi külön kapu. Csak előre rögzített feladatokkal, vak értékeléssel, reprodukálható beállítással és jóváhagyott API-költséggel használható. A jelenlegi 0 Ft-os keretben nem indul automatikus modellfuttatás.

### 4. Szerkesztői következtetés

Rövid magyar magyarázat, amely kizárólag az előző három réteg tényeiből készül. Saját pontszámot vagy új tényállítást nem hozhat létre.

## Minimális adatszerződés

Öt új, verziózott rekordtípus szükséges. Külön kézzel beírt „alkalmassági pontszám” nem készülhet. Minden származtatott címke megőrzi a `derived_from` bizonyítékazonosítókat.

### `tasks`

- `id`, `version`, magyar címke és hétköznapi példák
- szükséges modalitások és kötelező capability-k
- minimális kontextus- és outputigény
- szükséges költségelemek
- elfogadott minőségi és sebességi mérőszámok
- alap használati profil

### `capability_evidence`

Minden technikai képesség külön rekord:

- `id`
- `model_id`
- `capability` – például `image_input`, `function_calling`, `structured_output`, `provider_web_search`, `file_input`
- `support` – `supported`, `unsupported`, `conditional`, `unknown`
- `conditions_hu` – rövid korlát, pontos API-route vagy szükséges API-felület
- `extra_cost_status` – `included`, `priced_separately`, `unknown`, `not_applicable`
- `source_url`
- `source_locator`
- `verified_at`, `check_due_at`, `stale_at`, `expires_at`
- `record_status`, `review_ref`

### `benchmark_definitions`

- benchmark neve és verziója
- független kiadó és módszertan
- licenc és újraközlési állapot
- mért feladatok, metric, mértékegység és irány
- kiadási dátum

### `benchmark_results`

Minden független eredmény külön rekord:

- `id`
- `model_id`
- `task_id`
- `benchmark_name`, `benchmark_version`
- `metric_name`, `metric_value`, `higher_is_better`
- `model_configuration` – pontos API-route, reasoning effort, tool/harness és egyéb beállítás
- `sample_size`
- `evaluation_date`
- `source_url`, `methodology_url`
- `license_status` – újraközölhető, csak hivatkozható vagy nem használható
- `freshness` és `review_ref`

### `recommendation_policies`

A tíz emberi feladat mögött verziózott, review-zott szabályok vannak:

- task és prioritás;
- kemény kizárási szabályok és minimumküszöbök;
- rendezési szabály és tie-breaker;
- szükséges bizonyítékszintek;
- policy-verzió és reviewer-jóváhagyás.

### Források bizonyítékszintje

A meglévő `sources` kezelés külön jelöli:

- `official_provider`
- `independent_benchmark`
- `documented_own_evaluation`
- `editorial_inference`

## Ajánlási szabály – rejtett varázspontszám nélkül

### 1. Kizárás

A modell kiesik az ajánlható halmazból, ha bármely kötelező képessége `unsupported`, `conditional` feltételét a profil nem teljesíti, vagy `unknown`; nincs teljes feladatspecifikus költsége; lejárt a szükséges bizonyítéka; vagy a használat nem fér bele a dokumentált korlátokba.

### 2. Prioritás

- **Legalacsonyabb ár:** alkalmassági ajánlásként csak a technikailag támogatott, releváns minimumminőséget elérő és teljes költségű modellek között rendezünk. Ha nincs minimumminőség-mérés, csak korlátozott tokenár-összehasonlítás jelenhet meg.
- **Legjobb eredmény:** csak azonos független benchmarkverzió azonos beállítású eredménye rendezhet.
- **Leggyorsabb válasz:** csak azonos szolgáltatási útvonalon és azonos tesztprofillal mért független adat rendezhet.
- **Kiegyensúlyozott:** csak akkor készül, ha ugyanahhoz a modellhalmazhoz minőség, teljes költség és sebesség is rendelkezésre áll. Nem súlyozott összpontszámot használunk, hanem a Pareto-halmazból mutatunk legfeljebb három eltérő kompromisszumot.

Ha a feltétel nem teljesül, nincs álgyőztes. A felület ezt írja:

> Ezek a modellek dokumentáltan támogatják a szükséges technikai képességeket, és ár szerint összehasonlíthatók. Független minőségi vagy sebességi sorrendhez még nincs elég azonos mérés.

Ha még ehhez sincs teljes bizonyíték, nem mutatunk hosszú kártyafalat. Egyetlen továbblépés marad:

> Ehhez még nincs hiteles modellajánlás. Az ellenőrzött tokenárakat külön meg tudod nézni.

Gomb: **Tokenárak megnyitása (14)**.

## A tíz feladat reális induló bizonyíthatósága

| Feladat | Hivatalos tényből szűrhető | Független minőségi sorrend jelenleg |
|---|---|---|
| Szövegírás és átírás | szöveges API, kontextus, strukturált output | külön kreatív/üzleti írásmérés kell; LiveBench `language` nem azonos ezzel |
| Programozás | szöveg, tool use, kontextus | LiveBench coding vagy SWE-bench használható, csak pontos modell- és harness-egyezéssel |
| Nehéz problémamegoldás | reasoning mód, kontextus | LiveBench reasoning/math/data analysis alkalmas jelölt |
| Hosszú dokumentum | kontextus, fájl/PDF/kép input | hosszúkontextus-minőséghez külön, aktuális független mérés kell |
| Adatkinyerés | structured output, kép/PDF, kontextus | saját vagy nyílt extraction benchmark szükséges |
| Asszisztens | function calling, structured output, stabil API | ügyfélszolgálati minőséghez külön mérés kell |
| Fordítás | nyelvi input/output és kontextus | aktuális, többnyelvű, pontos modellverziós mérés kell |
| Kép és dokumentumoldal | image/PDF input, képdíj | aktuális vision benchmark kell |
| Automatizmus | function calling és structured output | BFCL használható, ha a jelenlegi modellverzió szerepel; a mostani lefedettség nem elég a teljes 14-es körre |
| Internetes kutatás | web search, idézetek, keresési díj | agent+harness szintű kutatási benchmark kell; puszta alapmodell-score nem elég |

## Élő forrásellenőrzés eredménye

### Hivatalos képességforrások

A jelenlegi hét szolgáltató mindegyikéhez találtunk élő, elsődleges dokumentációt:

- OpenAI modellek és eszközök: https://developers.openai.com/api/docs/models
- OpenAI GPT-5.6 Terra részletes képességek és külön eszközdíj-jelzés: https://developers.openai.com/api/docs/models/gpt-5.6-terra
- Anthropic aktuális modellek, modalitás, kontextus és szolgáltatói pozicionálás: https://platform.claude.com/docs/en/about-claude/models/overview
- Anthropic tool use: https://platform.claude.com/docs/claude/docs/tool-use
- Gemini aktuális modellek: https://ai.google.dev/gemini-api/docs/models
- Gemini 3.1 Flash-Lite részletes capability lista: https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite
- xAI Grok 4.3 modalitás és function calling: https://docs.x.ai/developers/models/grok-4.3
- DeepSeek V4 modellek, JSON output és tool calls: https://api-docs.deepseek.com/quick_start/pricing/
- Qwen Function Calling támogatási lista: https://www.alibabacloud.com/help/en/model-studio/qwen-function-calling
- Qwen multimodális API-megjegyzés az exact `qwen3.7-max-2026-06-08` modellhez: https://www.alibabacloud.com/help/en/model-studio/text-generation
- Mistral Medium 3.5 model card: https://docs.mistral.ai/models/model-cards/mistral-medium-3-5-26-04
- Mistral Small 4 model card: https://docs.mistral.ai/models/model-cards/mistral-small-4-0-26-03

### Független források

- LiveBench: nyílt, Apache 2.0-s, rendszeresen frissített benchmark, objektív válaszokkal és hat kategóriával. A 2026-06-25-ös kiadás a jelenlegi frontier modellek egy részét tartalmazza: https://livebench.ai/ és https://github.com/LiveBench/LiveBench
- SWE-bench: MIT-licences kód és nyílt leaderboard valós GitHub-problémákra, de az eredmény az agent/harness beállítást is méri: https://www.swebench.com/ és https://github.com/SWE-bench/SWE-bench
- BFCL V4: nyílt function-calling benchmark, de a jelenlegi leaderboard nem fedi le elégségesen a 14 exact modellt: https://gorilla.cs.berkeley.edu/leaderboard
- Phare: több jelenlegi modellre ad nyílt többnyelvű biztonsági mérést, de ez nem általános feladatminőség: https://phare.giskard.ai/
- Artificial Analysis: széles minőség-, ár- és sebességadatot kínál, de a dokumentált API API-kulcsot kér, az ügyféloldali újraközléshez pedig kereskedelmi licencet kínál. Fizetős licenc külön jóváhagyás nélkül nem építhető be: https://artificialanalysis.ai/data-api és https://artificialanalysis.ai/methodology

## Mi implementálható biztonságosan a következő lépésben?

### Gate 5B javasolt scope

1. A 14 modell hivatalos capability rekordjai legalább ezekre: `image_input`, `function_calling`, `structured_output`, `provider_web_search`, `file_or_pdf_input`.
2. Minden capability rekord saját forrást és ellenőrzési dátumot kap.
3. Quickstart link minden szolgáltatóhoz.
4. A tíz feladat, a követelményeik és a szabályok kikerülnek a UI-konstansokból verziózott adatrekordokba.
5. A kártya megmutatja, mely szükséges képességeket támogatja a modell, és milyen kemény korlát zárja ki. Ezt nem nevezi önmagában feladatspecifikus alkalmasságnak.
6. A jelenlegi token-alapáras fallback megmarad ott, ahol a teljes feladatspecifikus költség nem bizonyított.
7. Minden származtatott kimenet felsorolja a `derived_from` bizonyítékazonosítókat.

### Ami Gate 5B-ben még nem jelenhet meg

- „legjobb”, „leggyorsabb” vagy „kiegyensúlyozott győztes” általános állítás;
- szolgáltatói marketingből átvett független rangsor;
- Artificial Analysis-adat automatikus beépítése licenc nélkül;
- modell-API-hívással végzett saját benchmark;
- olyan „mire nem jó” állítás, amely nem dokumentált korlátból vagy összehasonlítható mérésből következik.

## Elfogadási feltételek

Gate 5B csak akkor PASS:

1. minden új capability állítás élő hivatalos forráshoz és rekorddátumhoz kötött;
2. `unknown` bizonyíték kizár, nem lesz belőle „valószínűleg tudja”;
3. a minőségi és sebességi prioritás nem rendez bizonyíték nélkül;
4. a felhasználó első nézetben legfeljebb három kártyát és kártyánként legfeljebb öt lényegi elemet lát;
5. minden ajánlás megmondja a konkrét „miért” és „mikor ne” okot;
6. a teljes költség hiánya látható, és nem nevezzük teljes API-költségnek;
7. az összes 10 × 4 × 3 útvonal vagy bizonyított találatot, vagy érthető, használható korlátozott összehasonlítást ad – zsákutca nincs;
8. a teljes logika statikus marad, nincs API-hívás, backend, adatbázis vagy új havi költség;
9. automatikus teszt igazolja a stale, hiányzó, ismétlődő és nem hivatalos bizonyíték fail-closed kezelését;
10. külön reviewer és asztali/mobil QA PASS szükséges a publikálási kapu előtt.
11. exact modellverzió-váltás karanténba teszi a régi benchmarkkapcsolatot; eredmény nem öröklődik automatikusan modellcsaládon belül.
12. a felület megmutatja, hány modellből és milyen lefedettségből született a sorrend.

## Ajánlott döntés

**GO a Gate 5B implementációs tervéhez**, a fenti szűk scope-pal.

**NO-GO még az általános minőségi és sebességi rangsorhoz**, amíg nincs elég exact, nyílt és azonos módszertanú független eredmény.
