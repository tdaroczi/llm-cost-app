# Gate 5C – független minőségi mérés, szűk induló körben

**Állapot:** implementáció előtti, jóváhagyásra váró módszertan

**Élő ellenőrzés dátuma:** 2026-07-20

**Rövid döntés:** minőségi sorrend első körben csak a **Programozás** és a **Logikai következtetés** feladatnál készülhet. Sebességi, kiegyensúlyozott vagy a többi nyolc feladatra vonatkozó sorrendhez jelenleg nincs elég egységes, pontosan összekapcsolható és jogtisztán újraközölhető adat.

## Miért ennyire szűk az első kör?

A felhasználó számára egyszerű választ akarunk adni, de nem akarunk kitalált bizonyosságot mutatni. Egy modell csak akkor kerülhet minőségi sorrendbe, ha:

- ugyanabban a benchmarkkiadásban mérték;
- a mérés pontos API-modellhez vagy dokumentált snapshothoz köthető;
- a futtatási konfiguráció ismert;
- legalább három modell és két szolgáltató szerepel ugyanabban a mérésben;
- a forrás, módszertan és újraközlési feltétel ellenőrizhető;
- a hiányzó modell nem kap mesterségesen rossz pontszámot.

A LiveBench 2026-06-25 kiadásából a jelenlegi 14 modellünk közül **10 modell, 5 szolgáltatótól** kapcsolható össze kellő pontossággal. Ez elég a programozási és logikai következtetési mérés óvatos megjelenítéséhez. Nem elég arra, hogy általánosan kijelentsük, melyik a „legjobb LLM”.

## Induló GO / NO-GO döntés

| Felhasználói cél | Döntés | Indok |
|---|---|---|
| Programozás | **GO – korlátozott minőségi sorrend** | LiveBench Coding, 117 teszteset, 10 pontosan összekapcsolható modell |
| Logikai következtetés | **GO – korlátozott minőségi sorrend** | LiveBench Reasoning, 202 teszteset, 10 pontosan összekapcsolható modell |
| Szövegírás és átírás | NO-GO | A nyelvi benchmark nem azonos a kreatív, üzleti vagy magyar szöveg minőségével |
| Hosszú dokumentum feldolgozása | NO-GO | Nincs egységes, aktuális hosszúkontextus-mérés a pontos modellkörre |
| Adatkinyerés | NO-GO | Nincs megfelelő exact-model extraction benchmark |
| Általános asszisztens | NO-GO | A szükséges összetett használati minőség nincs egységesen mérve |
| Fordítás | NO-GO | Nincs aktuális, többnyelvű, exact-model lefedettség |
| Kép és dokumentumoldal | NO-GO | Nincs megfelelő aktuális vision mérés a teljes modellkörre |
| Automatizmus és tool calling | NO-GO | A BFCL aktuális táblája nem fedi le a jelenlegi pontos modelleket |
| Internetes kutatás | NO-GO | Itt az agent, a keresőeszköz és a hivatkozáskezelés együtt számít; az alapmodell-score nem elég |
| Leggyorsabb válasz | NO-GO | Nincs azonos infrastruktúrán, közvetlen API-útvonalon és jogtisztán használható egységes mérés |
| Kiegyensúlyozott választás | NO-GO | Nem áll rendelkezésre ugyanarra a modellhalmazra minőség, teljes költség és sebesség |

## A felhasználó mit látna?

A meglévő egyszerű kérdéssor és vizuális rendszer marad. Nem készül új irány vagy újabb bonyolult vezérlőfelület.

Ha a felhasználó a **Programozás** vagy **Logikai következtetés** feladathoz a **Legjobb eredmény** prioritást választja:

1. legfeljebb három eredménykártyát kap;
2. minden kártyán látszik egy tizedesre kerekítve a független pontszám, közvetlenül mellette a mért konfiguráció, továbbá a becsült havi API-költség és egy rövid magyarázat;
3. a mérés neve és dátuma egyértelműen megjelenik;
4. külön mondat jelzi, hogy a 14 nyilvántartott modellből 10-hez van pontosan összekapcsolható eredmény;
5. a kimaradó négy modellről ezt írjuk: **„Ezek nem feltétlenül rosszabbak; ehhez a kiadáshoz nincs pontosan összehasonlítható mérésük.”**

Javasolt főcím:

> LiveBench-eredmény erre a feladatra

Javasolt bizonyítéksor:

> LiveBench 2026-06-25 · Coding · 117 teszteset

vagy

> LiveBench 2026-06-25 · Reasoning · 202 teszteset

Javasolt lefedettségi figyelmeztetés:

> A 14 nyilvántartott modellből 10 rendelkezik pontosan összekapcsolható méréssel, 5 szolgáltatótól. A kimaradó modellek nem kaptak rosszabb helyezést: egyszerűen nem szerepelnek ebben a sorrendben.

A helyezés formája:

> 1. a 10 pontosan összekapcsolható konfiguráció közül

Ha a felhasználó választásai vagy valamely kötelező technikai feltétel tovább szűkíti a mezőnyt, a felirat automatikusan erre változik:

> 1. a választásaidnak megfelelő, mért modellek között

Más feladat vagy más prioritás esetén marad az őszinte állapot:

> Ehhez még nincs elég azonos, független mérés. Az ellenőrzött képességeket és API-költségeket ettől még össze tudod hasonlítani.

## Mit állíthatunk, és mit nem?

**Nem írhatjuk:**

> A GPT-5.6 Sol a legjobb programozási modell.

**Írhatjuk:**

> A LiveBench 2026-06-25 Coding mérésében, a közzétett Max Effort konfigurációval ez érte el a legmagasabb pontszámot a 10 pontosan összekapcsolható modell között.

A „Logikai következtetés” elnevezést használjuk, nem az általános „nehéz problémamegoldás” ígéretét. A benchmark nem bizonyít mindenféle problémamegoldási fölényt.

A benchmarkpont és az alkalmazás havi költségbecslése vizuálisan és szövegben is külön blokk. A költség mellett kötelezően ez áll:

> Ez a saját használati profilodra számított standard tokenár-becslés, nem a LiveBenchben mért konfiguráció futtatási költsége.

A benchmark során felhasznált reasoning/thinking tokenek teljes költsége nincs minden modellnél azonos módon bizonyítva. Emiatt a pontszámot és a havi költséget nem kombináljuk, nem készítünk belőlük ár–érték pontot, és ezekből nem születhet „kiegyensúlyozott” eredmény.

## Pontosan mely modelleket fedi le?

### Összekapcsolható, használható mérés

| Saját modell | LiveBench-konfiguráció |
|---|---|
| GPT-5.6 Sol | `gpt-5.6-sol-max` |
| GPT-5.6 Terra | `gpt-5.6-terra-max` |
| GPT-5.6 Luna | `gpt-5.6-luna-max` |
| Claude Opus 4.8 | `claude-opus-4-8-xhigh-effort` |
| Claude Sonnet 5 | `claude-sonnet-5-xhigh-effort` |
| Claude Fable 5 | `claude-fable-5-max-effort` |
| Gemini 3.5 Flash | `gemini-3.5-flash-high` |
| Grok 4.3 | `grok-4.3` |
| DeepSeek V4 Flash | `deepseek-v4-flash` |
| DeepSeek V4 Pro | `deepseek-v4-pro` |

### Nem kerülhet a sorrendbe

- Gemini 3.1 Flash-Lite – nem szerepel a kiadásban;
- Mistral Medium 3.5 – nem szerepel a kiadásban;
- Mistral Small 4 / 2603 – nem szerepel a kiadásban;
- Qwen3.7 Max `qwen3.7-max-2026-06-08` – a LiveBench az alias modellt mérte, az Alibaba aktuális dokumentációja szerint az alias másik snapshotra mutat; az eredmény ezért nem örökölhető át.

Ez különösen fontos: a hiányzó négy modell **mérési státusza „nincs adat”**, nem pedig „rosszabb”.

## Induló eredmények

### Programozás – LiveBench Coding

| Hely | Modellkonfiguráció | Pontszám |
|---:|---|---:|
| 1. | Claude Fable 5 Max Effort | 85.9920 |
| 2. | GPT-5.6 Sol Max Effort | 83.9410 |
| 3. | GPT-5.6 Luna Max Effort | 82.9150 |
| 4. | Claude Sonnet 5 xHigh Effort | 80.6800 |
| 5. | Claude Opus 4.8 xHigh Effort | 79.2715 |
| 6. | GPT-5.6 Terra Max Effort | 78.2455 |
| 7. | Gemini 3.5 Flash High | 78.1845 |
| 8. | DeepSeek V4 Pro | 69.9940 |
| 9. | Grok 4.3 | 69.9325 |
| 10. | DeepSeek V4 Flash | 69.2280 |

### Logikai következtetés – LiveBench Reasoning

| Hely | Modellkonfiguráció | Pontszám |
|---:|---|---:|
| 1. | GPT-5.6 Sol Max Effort | 91.6538 |
| 2. | GPT-5.6 Terra Max Effort | 90.6345 |
| 3. | Claude Opus 4.8 xHigh Effort | 89.7115 |
| 4. | Claude Fable 5 Max Effort | 89.6538 |
| 5. | Claude Sonnet 5 xHigh Effort | 88.6923 |
| 6. | GPT-5.6 Luna Max Effort | 85.6443 |
| 7. | DeepSeek V4 Pro | 82.6923 |
| 8. | Gemini 3.5 Flash High | 82.0048 |
| 9. | Grok 4.3 | 70.8220 |
| 10. | DeepSeek V4 Flash | 70.5818 |

Ezek a LiveBench kategóriapontszámai. Nem keverjük őket saját szubjektív ponttal, árponttal vagy titkos súlyozással.

## Minimális adatszerződés

A Gate 5C nem igényel szervert, futás közbeni külső lekérést vagy fizetős szolgáltatást. A jóváhagyott adat statikus, verziózott rekordként kerül az alkalmazásba.

### Benchmark-definíció

- azonosító és kiadás: `livebench-2026-06-25`;
- kategória: `coding` vagy `reasoning`;
- mintaméret: 117 vagy 202;
- metric neve, iránya és számítási módja;
- kiadási és ellenőrzési dátum;
- adat-, módszertan- és forrás-URL;
- licenc: `CC-BY-SA-4.0`;
- forrás commit és fájl-ellenőrzőösszeg;
- rekordstátusz és review-hivatkozás;
- végrehajtható frissességi mezők: `verified_at`, `check_due_at`, `stale_at`, `expires_at`.

Az első rekordoknál a határidők a legutóbbi kézi ellenőrzéstől számítódnak:

- `check_due_at`: `verified_at + 7 nap`;
- `stale_at`: `verified_at + 14 nap`;
- `expires_at`: `verified_at + 30 nap`.

A böngésző a megnyitás pillanatában, új Netlify-build nélkül is ellenőrzi a dátumokat. `check_due_at` után látható „Újraellenőrzés esedékes” figyelmeztetés jelenik meg. `stale_at` pillanatától a minőségi sorrend eltűnik, és a felhasználó az őszinte „nincs elég friss összehasonlítható adat” fallbacket kapja. `expires_at` után a rekord csak archív bizonyítékként létezhet, rangsorolásra nem. Az ellenőrzés során észlelt új LiveBench-kiadás vagy modellkonfiguráció-változás a dátumoktól függetlenül karantént okoz. Mivel az oldal statikus és nem végez futásidejű külső lekérést, az észlelési idő felső korlátját a 7 napos `check_due_at`, a használhatóságét a 14 napos `stale_at` biztosítja.

### Benchmark-eredmény

- saját exact `model_id`;
- eredeti LiveBench-sor és modellkonfiguráció azonosítója;
- API-modellazonosító, exact snapshot-bizonyíték és szolgáltatói útvonal;
- forrással igazolt request-level reasoning effort;
- temperature, tokenlimit és más futtatási beállítás pontos értéke vagy explicit `unknown`;
- `configuration_status`: kizárólag `complete` rekord rangsorolható; `configuration_incomplete`, alias-eltérés vagy bizonyítatlan snapshot automatikusan kizárt;
- kategóriapontszám és helyezés;
- `sample_size`;
- `source_url`, `methodology_url`, `verified_at`;
- `derived_from` azonosítók;
- licenc- és frissességi státusz.

Az explicit `unknown` auditálhatóbb, mint a hiányzó mező, de önmagában nem elfogadható rangsorolásra: a rekord `configuration_incomplete`, kivéve, ha a forrás bizonyítja, hogy az adott paraméter nem alkalmazható vagy szolgáltató által kezelt. A `complete` státuszt kézzel beírni nem elég; a normalizáló kód kizárólag a kötelező bizonyítékok meglétéből vezetheti le.

### Feladatszabály

- csak a `coding` és `reasoning` task fogad el minőségi benchmarkot;
- csak a `quality` prioritás rendez benchmarkpont alapján;
- a `quality` sorrendet kizárólag a benchmark-alkalmasság, a benchmarkpont és az esetleges kötelező technikai feltétel határozza meg;
- az ár csak utólag kapcsolódó információ: hiányzó, `stale` vagy `expired` árrekord nem zárhatja ki a modellt, és nem változtathatja meg a minőségi sorrendet;
- ha a modellhez nincs egészséges árrekord, az ár helyén ez jelenik meg: **„A havi költség jelenleg nem ellenőrizhető.”**;
- más feladat vagy prioritás fail-closed állapotba kerül;
- nincs automatikus átörökítés aliasról snapshotra;
- hiányzó, duplikált, lejárt vagy konfigurációban eltérő rekord nem rangsorolható.

## Licenc és forrásmegjelölés

A LiveBench weboldal forrása a weboldal tartalmára Creative Commons Attribution-ShareAlike 4.0 International licencet jelöl. A beépítés feltétele:

- látható LiveBench-forrásmegjelölés a részletekben;
- közvetlen link a kiadáshoz és módszertanhoz;
- `THIRD_PARTY_NOTICES.md` a repositoryban;
- a benchmarkadatból származtatott rekordoknál a CC BY-SA 4.0 feltételeinek megőrzése;
- a saját termékszöveg és alkalmazáskód elkülönítése a licencelt adatkészlettől.

A benchmarkdefiníciók és eredmények külön, egyértelműen CC BY-SA 4.0 alatt jelölt JSON-adatfájlba kerülnek. Ebben és a felületi részletekben szerepel a módosítási nyilatkozat:

> LiveBench-adatokból szűrve és exact modellekhez kapcsolva.

Ha a licenc vagy a forráskötés később megváltozik vagy nem ellenőrizhető, a rangsor automatikusan nem használható tovább.

## Kötelező tesztek implementáció előtt és után

1. Pontosan 10 modell × 2 kategória = 20 elfogadott eredményrekord van.
2. Mindegyik rekordnak van pontos modellkapcsolata, forrása, konfigurációja, licence és ellenőrzési dátuma.
3. A Qwen alias/snapshot eltérését a rendszer kifejezetten kizárja.
4. A négy hiányzó modell `unmeasured`, és soha nem kap utolsó helyezést.
5. A programozási és reasoning top 3 megegyezik az ellenőrzött forrással.
6. Csak `quality + coding` és `quality + reasoning` készít sorrendet.
7. Sebesség, kiegyensúlyozott prioritás és a többi nyolc feladat fail-closed marad.
8. Hiányzó, duplikált, lejárt, átnevezett, `configuration_incomplete` vagy konfigurációban eltérő eredmény karanténba kerül.
9. A frissességi logika szimulált dátummal bizonyítja a `check_due_at` előtti, utáni, `stale_at` utáni és `expires_at` utáni állapotot; stale vagy expired állapotban nincs sorrend.
10. Az eredményképernyő legfeljebb három modellt mutat, és mindig megjeleníti a lefedettséget, a mért konfigurációt és a korlátozást.
11. A havi ár mellett mindig megjelenik, hogy az standard tokenár-becslés, és nem a benchmarkban mért konfiguráció futtatási költsége.
12. A pontszám és a költség semmilyen kódelérési úton nem alkot összpontszámot vagy kiegyensúlyozott eredményt.
13. Hiányzó, `stale` és `expired` árrekorddal külön teszt bizonyítja, hogy a minőségi helyezés változatlan, a modell nem tűnik el, és „A havi költség jelenleg nem ellenőrizhető” feliratot kap.
14. A látható LiveBench-attribúció, a közvetlen forráslink, a CC BY-SA 4.0 licenclink és a módosítási nyilatkozat automatikus tesztet kap.
15. A külön CC BY-SA 4.0 benchmarkadat-fájl és a `THIRD_PARTY_NOTICES.md` meglétét és kötelező tartalmát teszt ellenőrzi.
16. A jelenlegi 120 feladat/prioritás útvonal mindegyike továbbra is érthető, használható eredményt vagy őszinte fallbacket ad.

## Költség és üzemeltetés

- induló és folyamatos infrastruktúraköltség: **0 Ft/hó**;
- nincs saját benchmarkfuttatás;
- nincs futás közbeni API-hívás;
- nincs backend vagy adatbázis;
- nincs automatikus túlfogyasztás;
- a statikus Netlify-kiadás marad.

## Implementációs határ

E dokumentum jóváhagyásáig nem változik a rangsorolási logika, az adatmodell és a production oldal. Jóváhagyás után is csak a fenti két korlátozott minőségi út készül el; minden más prioritásnál és feladatnál az alkalmazás őszintén jelzi az összehasonlítható adat hiányát.

## Élő, elsődleges források

- LiveBench aktuális kiadás és leaderboard: https://livebench.ai/
- LiveBench benchmark repository és modellkonfigurációk: https://github.com/LiveBench/LiveBench
- LiveBench weboldal repository, a licencjelzés forrása: https://github.com/LiveBench/livebench.github.io
- LiveBench CC BY-SA 4.0 licenc: https://creativecommons.org/licenses/by-sa/4.0/
- Alibaba Model Studio hivatalos modell- és árdokumentáció, Qwen alias ellenőrzése: https://www.alibabacloud.com/help/en/model-studio/model-pricing
- Berkeley Function-Calling Leaderboard: https://gorilla.cs.berkeley.edu/leaderboard
- SWE-bench hivatalos oldal: https://www.swebench.com/

## Következő döntési pont

**Javaslat:** Gate 5C implementációs GO kizárólag a `quality + coding` és `quality + reasoning` útvonalra, a fenti adat- és felületi korlátokkal. Minden más rangsorolás NO-GO marad addig, amíg nem találunk azonos feltételekkel használható bizonyítékot.
