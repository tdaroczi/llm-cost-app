# Az egyszerű modellajánló alapja

**Állapot:** jóváhagyás előtti termékterv
**Ellenőrzés dátuma:** 2026-07-19
**Cél:** a felhasználó néhány egyszerű válaszból kapjon érthető és ellenőrizhető modellajánlást.

## Egy mondatban

A felhasználó elmondja, mit szeretne csinálni, kiválasztja, mi fontos neki, és az alkalmazás három modellt ajánl rövid indoklással és várható költséggel.

> **Fontos:** az alkalmazás az API-n keresztüli, saját alkalmazásba épített használat költségét számolja. Nem a ChatGPT-, Claude-, Gemini- vagy más lakossági előfizetéseket hasonlítja össze.

## A felhasználó csak három dolgot válaszol

### 1. Mit szeretnél csinálni?

1. **Szöveget írok vagy átírok**
   Például cikk, levél, termékleírás vagy összefoglaló.
2. **Programozok**
   Kódírás, hibakeresés, kódmagyarázat vagy nagyobb fejlesztési feladat.
3. **Nehéz problémát oldok meg**
   Több lépéses gondolkodás, tervezés, elemzés és érvelés.
4. **Hosszú dokumentumot dolgozok fel**
   Szerződés, tanulmány, jelentés vagy több fájl elemzése.
5. **Adatot szeretnék kinyerni**
   Szövegből mezők, táblázat vagy szabályos JSON készítése.
6. **Ügyfélszolgálati vagy belső asszisztenst készítek**
   Sok ismétlődő kérdés, gyors és következetes válaszok.
7. **Fordítok vagy több nyelven dolgozom**
   Fordítás, átfogalmazás és többnyelvű tartalom.
8. **Képet vagy dokumentumoldalt is meg kell érteni**
   Kép, diagram, képernyőkép vagy beszkennelt oldal értelmezése.
9. **Eszközöket használó automatizmust építek**
   API-k, keresés, adatbázis vagy más program meghívása.
10. **Internetes kutatást végzek**
    Aktuális információk keresése, források összegyűjtése és összefoglalása.

### 2. Mi a legfontosabb?

- **Nem tudom – mutasd a kiegyensúlyozott választást** *(alapértelmezett)*
- **A lehető legjobb eredmény**
- **A lehető legalacsonyabb ár**
- **A lehető leggyorsabb válasz**

Ha nincs elég független adat a minőségről vagy a sebességről, az alkalmazás ezt mondja ki. Nem talál ki helyette pontszámot.

### 3. Körülbelül mennyit használnád?

- **Kipróbálnám** – például napi 5 rövid kérés
- **Rendszeresen használnám** – például napi 20 átlagos kérés
- **Nagy forgalomra kell** – például napi 1000 automatikus kérés

A konkrét példa feladatonként változhat, és a becslés előtt látható lesz. Aki akarja, a „Pontosítom” résznél módosíthatja a kérések számát és hosszát. A tokenmezők nem jelennek meg elsőként.

## Mit kap a felhasználó?

Legfeljebb három találatot:

1. **Ezt ajánljuk** – a választott feladathoz és prioritáshoz legjobb igazolt kompromisszum.
2. **Olcsóbb lehetőség** – ha van érdemi megtakarítás elfogadható kompromisszummal.
3. **Erősebb vagy gyorsabb lehetőség** – ha a felhasználó többet fizetne egy másik előnyért.

Minden modellkártyán csak ez látszik elsőként:

- miért ajánljuk;
- mikor ne ezt válaszd;
- becsült havi költség;
- az adat ellenőrzési dátuma;
- **API-kulcsot kérek** link.

Az API-kulcs link lehetőleg közvetlenül a szolgáltató hivatalos kulcskezelő vagy onboarding oldalára vezet. Mellette röviden jelezzük, hogy regisztráció és fizetési mód megadása szükséges lehet.

## Az ajánlás egyszerű szabálya

### Első lépés: kizárás

A modell nem ajánlható, ha:

- nincs aktív, közvetlen API-hozzáférése;
- nincs aktuális hivatalos ára;
- nincs használható API-kulcs- vagy indulási linkje;
- nem tudja a feladathoz szükséges bemenetet vagy kimenetet;
- túl kicsi a feldolgozható anyag mérete;
- lejárt, visszavont vagy csak korlátozott hozzáférésű;
- nincs elegendő bizonyíték arra, hogy a kiválasztott feladatra alkalmas.

### Második lépés: sorrend

- **Legjobb eredmény:** a feladathoz kapcsolódó független mérés dönt; az ár csak ezután.
- **Legalacsonyabb ár:** a felhasználó várható teljes költsége dönt; csak megfelelő alkalmasságú modell maradhat bent.
- **Leggyorsabb válasz:** független sebesség- és késleltetésmérés dönt; az ár csak ezután.
- **Kiegyensúlyozott:** csak olyan modellek közül választunk, amelyeknél a minőség, az ár és a sebesség is összehasonlítható; ha ez nem igazolható, nincs automatikus győztes.

Nem használunk egyetlen, elrejtett „mindent eldöntő” pontszámot.

### Harmadik lépés: emberi magyarázat

Az ajánlás mondata:

> Ezt ajánljuk, mert **[két rövid, bizonyított előny]**. Körülbelül **[havi költség]** lenne. Ne ezt válaszd, ha **[egy fontos hátrány vagy korlát]**.

## Milyen bizonyíték fogadható el?

1. **Hivatalos adat:** ár, API-elérhetőség, kontextus, modalitás, tool calling és életciklus.
2. **Független mérés:** feladatspecifikus minőség, sebesség és késleltetés.
3. **Saját mérés:** későbbi, dokumentált magyar tesztfeladat.
4. **Szerkesztői magyarázat:** következtetés az előző adatokból, egyértelműen megjelölve.

A szolgáltató saját „legjobb”, „frontier” vagy „csúcskategóriás” állítása hivatalos pozicionálás, nem független minőségi bizonyíték.

## Költségszámítási korlát

Az egyszerű input- és output-tokenár önmagában csak a standard szöveges használatot fedi le. Keresésnél, képnél, fájlnál, eszközhasználatnál, cache-nél, hosszú kontextusnál vagy egyes régióknál további díj lehet.

V1-ben minden modellrekord külön tárolja az alkalmazható plusz költségeket. Ha a kiválasztott feladathoz szükséges összes költségelem nem számítható ki ellenőrzött adatokból, a modell nem kerülhet az ajánlható találatok közé. Külön, nem rangsorolt információs találatként megjelenhet „A teljes költség még nem ellenőrzött” jelöléssel. Ilyenkor a felület ezt írja:

> Az alapár összehasonlítható, de ennél a feladatnál további díjak lehetnek. A teljes költség még nem számítható megbízhatóan.

## A 17 induló modelljelölt

Az alábbi árak közvetlen szolgáltatói, standard szöveges API-árak 1 millió tokenre, cache, batch, priority és egyéb eszközdíj nélkül. Ezek még **jelöltek**: automatikus ajánlásba csak a feladatspecifikus bizonyítékok ellenőrzése után kerülhetnek.

| Modell | Szerepe a jelöltlistán | Input / output USD | Státusz és fontos megjegyzés |
|---|---|---:|---|
| GPT-5.6 Sol | felső kategória | 5 / 30 | árjelölt; 1,05M kontextus; a hosszú kontextus magasabb ársávját a kalkulátornak alkalmaznia kell |
| GPT-5.6 Terra | kiegyensúlyozott | 2,5 / 15 | árjelölt; 1,05M kontextus; a hosszú kontextus magasabb ársávját a kalkulátornak alkalmaznia kell |
| GPT-5.6 Luna | nagy forgalom | 1 / 6 | árjelölt; 1,05M kontextus; költségérzékeny használatra pozicionált |
| Claude Fable 5 | felső kategória | 10 / 50 | általánosan elérhető; 1M kontextus |
| Claude Opus 4.8 | összetett munka | 5 / 25 | 1M kontextus |
| Claude Sonnet 5 | kiegyensúlyozott | 2 / 10 | bevezető ár 2026-08-31-ig; utána 3 / 15 |
| Gemini 3.5 Flash | erős, gyors általános modell | 1,5 / 9 | stabil; standard fizetős ár |
| Gemini 3.1 Flash-Lite | nagy forgalom | 0,25 / 1,5 | stabil; standard fizetős ár |
| Grok 4.5 | kódolás és agent feladatok jelöltje | 2 / 6 | 500K kontextus; 200K felett magasabb ár |
| DeepSeek V4 Flash | nagyon olcsó általános jelölt | 0,14 / 0,28 | cache-miss input; modell-ID: `deepseek-v4-flash` |
| DeepSeek V4 Pro | olcsó erősebb jelölt | 0,435 / 0,87 | cache-miss input; modell-ID: `deepseek-v4-pro` |
| Qwen 3.7 Max | Qwen felső kategória | 2,5 / 7,5 | nemzetközi listaár; régió és verzióhoz kötött modell-ID nélkül nem ajánlható |
| Kimi K2.6 | hosszú és multimodális munka jelöltje | 0,95 / 4 | ellenőrzés alatt; cache-miss input; 256K kontextus |
| MiniMax M2.7 | olcsó agent és kód jelölt | 0,3 / 1,2 | 204,8K kontextus; normál sebességű változat |
| GLM-5.1 | kódolási és agent jelölt | 1,4 / 4,4 | ellenőrzés alatt; 200K kontextus; angol és kínai |
| Mistral Medium 3.5 | multimodális, kód és agent jelölt | 1,5 / 7,5 | ellenőrzés alatt; 256K kontextus; pontos API-ID még véglegesítendő |
| Mistral Small 4 | olcsó általános jelölt | 0,15 / 0,6 | ellenőrzés alatt; 256K kontextus; API-ID újraellenőrzendő |

A táblázatban szereplő „árjelölt” sem jelent automatikusan ajánlható modellt. A Kimi-, GLM- és Mistral-rekordok a felsorolt mezők teljes újraellenőrzéséig kifejezetten `unverified` állapotúak.

## Jelölt és ajánlható modell nem ugyanaz

Egy modell csak akkor kerülhet az **ajánlható** halmazba, ha minden alábbi mezője ellenőrzött:

- aktív, közvetlen API;
- pontos, lehetőleg verzióhoz kötött API-azonosító;
- hivatalos alapár, ársávok és feladathoz tartozó plusz díjak;
- kontextuskorlát és szükséges modalitás;
- életciklus és stabilitás;
- közvetlen API-kulcs- vagy onboarding útvonal;
- feladatspecifikus alkalmassági bizonyíték;
- rekord szintű `source_url` és `verified_at`.

Ha csak 5–8 modell teljesíti ezeket, csak azok ajánlhatók. A kívánt darabszám miatt nem gyengítjük a bizonyítási küszöböt. A többi modell kereshető maradhat „ellenőrzés alatt” jelöléssel.

Amíg nincs megfelelő független minőségi vagy sebességmérés, a felület nem hirdet „legjobb” vagy „leggyorsabb” győztest. Helyette ezt mondja:

> Ár alapján összehasonlítható, minőség alapján még nincs hitelesen rangsorolva.

## Mi nincs még kész?

- A fenti modellek feladatonkénti független minőségi bizonyítéka.
- Az összehasonlítható sebesség- és késleltetésadat.
- A tíz feladathoz tartozó pontos mintahasználat és havi költség.
- A Mistral Medium 3.5 végleges, közvetlen API-azonosítójának ellenőrzése.
- A Kimi K3 új modell ára és stabil katalógusrekordja; amíg ez nincs teljesen igazolva, a K2.6 marad a jelölt.
- A szélesebb, 25–40 modelles kereshető lista.
- Az olcsó és nagy volumenű kínálat bővítése, különösen az Anthropic olcsóbb, az OpenAI mini/nano, valamint az újabb MiniMax- és Kimi-modellek ellenőrzésével.

Ezek hiányában a dokumentum még nem engedélyezi a kvalitatív ajánlások publikálását.

## Hivatalos források és API-kulcs útvonalak

A felsorolt hivatalos oldalakat 2026-07-19-én ellenőriztük. Ez nem írja felül az egyes modellrekordok státuszát: az `unverified` rekord nem ajánlható akkor sem, ha a hozzá tartozó szolgáltatói oldal elérhető.

### OpenAI

- Modellek és pozicionálás: https://developers.openai.com/api/docs/models
- Árazás: https://developers.openai.com/api/docs/pricing
- API-kulcs: https://platform.openai.com/api-keys

### Anthropic

- Modellek és API-azonosítók: https://platform.claude.com/docs/en/about-claude/models/overview
- Árazás: https://platform.claude.com/docs/en/about-claude/pricing
- API-kulcs: https://platform.claude.com/settings/keys

### Google Gemini

- Modellek: https://ai.google.dev/gemini-api/docs/models
- Árazás: https://ai.google.dev/gemini-api/docs/pricing
- API-kulcs útmutató: https://ai.google.dev/gemini-api/docs/api-key

### xAI / Grok

- Modell: https://docs.x.ai/developers/models/grok-4.5
- Árazás: https://docs.x.ai/developers/pricing
- Modelloldal és API-kulcs indítása: https://docs.x.ai/developers/models/grok-4.5

### DeepSeek

- Modellek és árazás: https://api-docs.deepseek.com/quick_start/pricing
- Modelllista API: https://api-docs.deepseek.com/api/list-models
- API-platform: https://platform.deepseek.com/

### Alibaba Qwen

- Modellek és régiók: https://www.alibabacloud.com/help/en/model-studio/models
- Árazás: https://www.alibabacloud.com/help/en/model-studio/model-pricing
- API-kulcs útmutató: https://www.alibabacloud.com/help/en/model-studio/get-api-key

### Kimi / Moonshot AI

- Modellek: https://platform.kimi.ai/docs/models
- K2.6 árazás: https://platform.kimi.ai/docs/pricing/chat-k26
- API-kulcs és indulás: https://platform.kimi.ai/docs/overview

### MiniMax

- Modellek és API-kulcs: https://platform.minimax.io/docs/api-reference/api-overview
- Árazás: https://platform.minimax.io/docs/guides/pricing-paygo

### Z.AI / GLM

- Modellek: https://docs.z.ai/guides/overview/overview
- Árazás: https://docs.z.ai/guides/overview/pricing
- API-kulcs és indulás: https://docs.z.ai/guides/overview/quick-start

### Mistral

- Modellek: https://docs.mistral.ai/models/overview
- Mistral Medium 3.5: https://docs.mistral.ai/models/model-cards/mistral-medium-3-5-26-04
- Mistral Small 4: https://docs.mistral.ai/models/model-cards/mistral-small-4-0-26-03
- API-kulcs útmutató: https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key

## Elfogadási feltételek a következő lépéshez

A felület tervezése akkor kezdhető el, ha:

1. a tíz feladat elnevezése emberi és egyértelmű;
2. a három kérdésből előálló ajánlás megmagyarázható;
3. a következő prototípusban a jelölt és az ajánlható státusz láthatóan különválik; a későbbi nyilvános kiadásban csak a minden feltételt teljesítő modellek ajánlhatók, akkor is, ha kezdetben 12-nél kevesebben vannak;
4. az ellenőr nem talál olyan modellt, amelyet bizonyíték nélkül ajánlanánk;
5. a felhasználó jóváhagyja az egyszerű működést.
