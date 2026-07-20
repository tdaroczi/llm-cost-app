# Gate 2 – ajánló prototípus vizuális specifikáció

## Elfogadott irány

**Központi ötlet:** nyugodt iránytű az LLM-káoszban. Egyetlen finom körív és irányvonal ad karaktert; a felületet nem töltjük meg díszítéssel.

Az egyszer használatos referenciaképeket a megvalósítás és a vizuális ellenőrzés után eltávolítottuk; a tartós tervezési döntések ebben a rövid specifikációban maradnak meg.

## Első képernyőn engedélyezett szöveg

- LLM Observatory
- API-költségek, nem előfizetések
- Melyik LLM illik a munkádhoz?
- Három egyszerű válasz. Három érthető lehetőség.
- 1 Mit csinálsz? / 2 Mi számít? / 3 Mennyit használnád?
- Mit szeretnél csinálni?
- a tíz jóváhagyott feladat neve
- Tovább
- Inkább két modellt hasonlítok össze
- Csak ellenőrzött API-adatból számolunk.

## Design tokenek

- háttér: valódi mély éjkék `#020b1a`, nem fekete és nem törtfehér;
- felület: `#061327`;
- főszöveg: `#f7f8fb`;
- másodlagos szöveg: `#a7b2c6`;
- vonal: `#24334b`;
- menta: `#7ce9b7`;
- ibolya: `#a88cff`;
- betű: Inter/SF Pro/system sans;
- főcím: 56–64 px asztalon, 42–48 px mobilon;
- vezérlőszöveg: 16–18 px, soha nem böngésző alapméret véletlenül;
- sarkok: 8–12 px, csak a vezérlőkön és az első ajánláson;
- mozgás: 180–260 ms, csak lépésváltás és kijelölés; reduced-motion tiszteletben tartva.

## Komponensek és állapotok

- csendes fejléc: márka, két modell összehasonlítása, API-költség figyelmeztetés;
- háromlépéses folyamatjelző;
- egyetlen választófelület kétoszlopos asztali és egyoszlopos mobil elrendezéssel;
- kijelölt, hover, fókusz és billentyűzetes állapot;
- vissza és tovább gomb;
- használati feltételezés látható, szerkeszthető részletekkel;
- eredményállapot: egy hangsúlyos ár szerinti találat, legfeljebb két alacsonyabb súlyú információs találat;
- hiányos költségű vagy bizonyítékú modell nem kap rangsort;
- API-kulcs link csak ellenőrzött szolgáltatói rekordból.

## Konténermodell

Nyitott, egybefüggő oldal. Nincs bento-grid és nincs egymásba ágyazott kártyahalom. A feladatok sorok, az első eredmény egyetlen kiemelt keret, a további találatok elválasztóvonalas sorok.

## Prototípus-korlát

A meglévő `proof_only` katalógus miatt a prototípus csak ellenőrzött standard szöveges API-költséget rangsorolhat. Nem állít fel minőségi vagy sebességi győztest.
