# Gate 5 független review

**Dátum:** 2026-07-20

**Reviewer:** Banach

**Ellenőrzött terv:** `gate-5-evidence-design-2026-07-20.md`

## Verdikt

- **A jelenlegi ár-összehasonlító állapot:** PASS.
- **A Gate 5 tervezési szerződés:** PASS a reviewer javításainak beépítése után.
- **Hiteles feladatalapú minőségi ajánlás publikálása:** FAIL, amíg nincs feltöltött capability- és benchmarkbizonyíték.

## Tényállapot

A production katalógusban 14 modell és ellenőrzött árrekordok vannak, de a review időpontjában:

- capability rekord: 0;
- független benchmarkeredmény: 0;
- feladat–benchmark megfeleltetés: 0;
- verziózott ajánlási policy: 0.

## Kötelező reviewer-javítások

1. A „technikailag támogatja” nem azonos azzal, hogy „alkalmas” vagy „különösen jó”.
2. A task, capability, benchmark definition, benchmark result és recommendation policy külön verziózott rekord legyen.
3. Minden ajánlási kimenet őrizze meg a `derived_from` bizonyítékazonosítókat.
4. Capability pontos modellhez és API-route-hoz; benchmark exact modellhez, konfigurációhoz, verzióhoz és mintanagysághoz kötődjön.
5. Modellverzió-váltás után régi benchmark nem öröklődhet automatikusan.
6. A felület mondja meg, hány modellből és milyen lefedettségből készült a sorrend.
7. Ha nincs hiteles ajánlás, ne jelenjen meg 14 egyforma modellkártya. Egy „Tokenárak megnyitása (14)” továbblépés elég.
8. A README hotfix utáni dokumentációs eltérését javítani kell.

## Tiltott állítások bizonyíték nélkül

- Ezt ajánljuk.
- Különösen jó erre.
- Legjobb eredmény.
- Leggyorsabb.
- Kiegyensúlyozott választás.
- Megbízható tool calling.
- Jobb magyarul.
- Teljes havi költség.
- Ne ezt válaszd erre.

Ilyenkor csak hivatalos capability-tény, ellenőrzött ár vagy egyértelműen korlátozott tokenköltség jelenhet meg.

## Implementációs kapu

Gate 5B megkezdhető a javított terv szerint. Gate 5C kvalitatív rangsor csak feltöltött, exact, nyílt, összehasonlítható és friss független bizonyíték után kerülhet újabb publikálási kapuba.
