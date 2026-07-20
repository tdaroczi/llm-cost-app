# Gate 2 – prototípus QA

Ellenőrzés dátuma: 2026-07-20

## Eredmény

A háromlépéses magyar modellválasztó asztali és mobil nézetben működik. A felület a feladatból indul, három hétköznapi kérdésre bontja a döntést, és csak olyan költséget rangsorol, amelyhez teljes, aktuális, ellenőrzött API-ár áll rendelkezésre.

Külön reviewer végső ítélete: **PASS**. A reviewer által korábban jelzett két blokk – a nem ár alapú utak burkolt rangsora és a lejárt árfrissesség – megszűnt.

## Vizuális összevetés

1. **Fő üzenet:** a prototípus és a terv egyaránt egyetlen, közérthető kérdéssel indul; nincs technikai beállítás a nyitóképernyőn.
2. **Feladatválasztás:** asztalon két oszlop, mobilon egy oszlop; a kijelölt sor mentazöld keretet és egyértelmű pipát kap.
3. **Iránytű-motívum és színek:** a mélykék háttér, a menta főszín, a visszafogott lila kiegészítő szín és a vékony geometrikus vonalak követik a jóváhagyott vizuális irányt.
4. **Lépések:** asztalon mindhárom lépés neve látszik, mobilon egyszerű folyamatjelző és `1 / 3` számláló segít.
5. **Találati hierarchia:** az első teljes költség nagy kártyát, a további két számítható ár egyszerű sorokat kap. A képernyő külön kimondja, hogy az ár szerinti sorrend nem minőségi rangsor.
6. **Mobil használat:** a fő művelet és a bizalmi üzenet alul rögzített, ezért nem kell keresni a következő lépést.
7. **Biztonságos hiány:** kép-, kutatás- és automatizálási feladatnál a rendszer nem gyárt félkész rangsort, ha a kapcsolódó extra díjak nem teljesek.

## Szándékos eltérések a képi tervtől

- A tervben szereplő általános „ezt választanánk” üzenet helyett a kész felület csak ellenőrizhető, ár alapú állítást tesz.
- A szolgáltatói logók kimaradtak, mert nem segítik a döntést, és a márkajelzések kezelése plusz karbantartást okozna.
- A fejlécben csak az alternatív útvonal linkje látszik; az aktuális oldal neve nem ismétlődik.
- A nem teljes költségű feladatoknál üres ajánlás helyett rövid magyarázat jelenik meg.

## Működési ellenőrzés

- Asztali nézet: 1536 × 1024.
- Mobil nézet: 390 × 844.
- Ellenőrzött útvonal: feladat → szempont → használat → találatok → API-kulcs link.
- Külön ellenőrzött biztonsági útvonal: kép vagy dokumentumoldal → nincs félkész rangsor.
- Konzol: 0 hiba, 0 figyelmeztetés.
- A találati főcím kezdetben beleért a rögzített fejlécbe; a görgetési ráhagyás javítása után a főcím teteje 111 px, a fejléc alja 70 px, tehát nincs átfedés.
- Automata egységteszt: 12/12 sikeres.

## Ellenőrzési eszközök

Az alkalmazáson belüli böngészővel ellenőriztük a teljes kattintási folyamatot és a DOM-geometriát. A pontos képernyőképekhez Playwright CLI-t használtunk, mert az alkalmazáson belüli böngésző képernyőképe ennél a munkamenetnél a képpontsűrűség miatt levágott képet adott.

## Adatfrissességi megjegyzés

A dátumváltáskor a korábbi árrekordok szabályosan lejártak és a rangsor eltűnt. Ez bizonyítja a fail-closed működést. Mind a hat standard árat 2026-07-20-án hivatalos szolgáltatói oldalról újraellenőriztük, majd külön reviewer is ellenőrizte. Az összegek nem változtak; csak a frissességi és review-adatok kaptak új értéket.
