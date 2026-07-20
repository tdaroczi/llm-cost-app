# LLM Observatory

Magyar nyelvű, build nélküli statikus alkalmazás LLM API-költségek átlátható összehasonlítására.

## Élő változat

- Netlify: [https://llm-kivalaszto.netlify.app](https://llm-kivalaszto.netlify.app)
- GitHub: [tdaroczi/llm-cost-app](https://github.com/tdaroczi/llm-cost-app)

## Mit tud az alkalmazás?

- két modellt ugyanazzal a tokenforgalmi profillal hasonlít össze;
- három egyszerű kérdésből induló, magyar nyelvű modellválasztót ad;
- tíz emberi feladatot, négy prioritást és három érthető használati szintet kezel;
- a használati feltételezést megmutatja, a tokenrészleteket csak opcionálisan nyitja ki;
- öt technikai képességet ellenőriz pontos modellverzióra: képbemenet, funkcióhívás, strukturált válasz, szolgáltatói webes keresés, valamint fájl- vagy PDF-bemenet;
- feladatnál csak olyan modellt tart technikai találatnak, amelynél minden szükséges képesség hivatalosan dokumentált és aktuális;
- standard szöveges feladatnál teljes, ellenőrzött USD-költség alapján hasonlít;
- keresésnél, képnél vagy eszközhasználatnál külön jelzi, hogy a keresés, fájl, kép vagy eszközhívás esetleges díja nincs benne, ezért nem nevez ki legolcsóbb modellt;
- minőségi, sebességi vagy „kiegyensúlyozott” sorrend helyett egy rövid bizonyítékhiány-jelzést és egy összecsukható tokenárlistát mutat;
- rekordszinten mutatja a forrást, az ellenőrzés idejét és a frissességi állapotot;
- csak teljes, használható input- és outputárból számol;
- ellenőrzött szolgáltatói rekordból ad kattintható API-kulcs linket;
- mind a hét szolgáltatóhoz kattintható hivatalos bekötési útmutatót ad;
- ugyanazt a `evaluateModel` motort használja mindkét felhasználói úton;
- hét szolgáltató tizennégy, teljes költséggel összehasonlítható modelljét tartalmazza, köztük OpenAI, Anthropic, Google, xAI, DeepSeek, Alibaba Cloud Qwen és Mistral modelleket.

## Fontos korlát

A production katalógus tizennégy, teljes input- és outputköltséggel összehasonlítható modellt, hetven capability-rekordot és hét hivatalos bekötési útvonalat tartalmaz. Az `unknown`, `conditional`, stale, karanténba tett vagy hiányzó capability nem teljesíthet kötelező technikai feltételt.

Az alkalmazás továbbra sem ad benchmark- vagy minőségi pontszámot, nem nevez ki minőségi vagy sebességi győztest, és nem állít bizonyítatlan feladatspecifikus alkalmasságot. A technikai támogatás nem bizonyítja, hogy egy modell a legjobb az adott munkára. Lejárt, stale, karanténba tett vagy hiányos ár nem vehet részt a számításban.

## Helyi futtatás

A projekt gyökeréből:

```bash
python3 -m http.server 4173 --bind 127.0.0.1 --directory public
```

Ezután nyisd meg: `http://127.0.0.1:4173/#task`.

Nincs npm-függőség, build lépés, backend, adatbázis vagy futásidejű LLM-hívás.

## Ellenőrzés

```bash
node --check public/app.js
node --check public/core.mjs
node --test tests/core.test.mjs
git diff --check
```

## Publikálás

A `netlify.toml` kizárólag a `public/` könyvtárat jelöli publikálható gyökérnek. A kiadás statikus fájlokat használ; nincs bekapcsolva fizetős add-on, backend, adatbázis vagy futásidejű LLM-szolgáltatás.

## Adatfrissítés

A katalógusban szereplő árak és modelladatok időérzékenyek. Új adat kiadása előtt minden érintett rekordot élő, hivatalos szolgáltatói forrásból kell újra ellenőrizni, és a rekord szintjén rögzíteni kell a forrást, az ellenőrzés idejét és a frissességi állapotot.
