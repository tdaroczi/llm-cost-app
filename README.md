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
- standard szöveges feladatnál teljes, ellenőrzött USD-költség alapján hasonlít;
- keresésnél, képnél vagy eszközhasználatnál letiltja a rangsort, amíg a plusz költség nem teljes;
- rekordszinten mutatja a forrást, az ellenőrzés idejét és a frissességi állapotot;
- csak teljes, használható input- és outputárból számol;
- ellenőrzött szolgáltatói rekordból ad kattintható API-kulcs linket;
- ugyanazt a `evaluateModel` motort használja mindkét felhasználói úton;
- hét szolgáltató tizennégy, teljes költséggel összehasonlítható modelljét tartalmazza, köztük OpenAI, Anthropic, Google, xAI, DeepSeek, Alibaba Cloud Qwen és Mistral modelleket.

## Fontos korlát

A production katalógus tizennégy, teljes input- és outputköltséggel összehasonlítható modellt tartalmaz. Capability- és quickstart-rekordot még nem tartalmaz; emiatt a tool calling állapota ismeretlen, quickstart link pedig nem jelenik meg.

Az alkalmazás nem ad benchmark- vagy minőségi pontszámot, nem nevez ki győztest, és nem állít bizonyítatlan feladatspecifikus alkalmasságot. Lejárt, stale, karanténba tett vagy hiányos ár nem vehet részt a számításban.

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
