# Gate 5C – független ellenőri review

**Dátum:** 2026-07-20

**Ellenőrzött dokumentum:** `work/research/gate-5c-benchmark-method-2026-07-20.md`

**Végső döntés:** **GO**, kizárólag a `quality + coding` és `quality + reasoning` implementációjára. Maradó P0 vagy P1 probléma nincs.

## Az ellenőri körben javított kötelező pontok

1. A benchmark frissessége végrehajtható dátumokat és böngészőoldali fail-closed viselkedést kapott.
2. A LiveBench-pontszám és a standard havi tokenár-becslés külön információ; nem képezhető belőlük közös pontszám.
3. Hiányos vagy bizonyítatlan benchmarkkonfiguráció nem rangsorolható.
4. A LiveBench-adatok külön CC BY-SA 4.0 adatfájlt, látható attribúciót, licenclinket, módosítási nyilatkozatot és third-party notice-t igényelnek.
5. A felület nem általános „legjobb modellként”, hanem az adott LiveBench-kategória adott konfigurációinak eredményeként fogalmaz.
6. Hiányzó vagy lejárt ár nem változtathatja meg a minőségi sorrendet; ilyenkor a modell marad, az ár helyén ellenőrizhetetlenségi jelzés jelenik meg.
7. A Qwen alias és az alkalmazásban szereplő exact snapshot nem kapcsolható össze, ezért a Qwen ebben a kiadásban `unmeasured`.
8. Az implementációs újraellenőrzés során kiderült, hogy a Claude Fable 5 benchmarkkonfigurációja Opus 4.8 fallbacket enged. Az ellenőr GO döntést adott a Fable kizárására; a végleges kör 9/14 modell és 5 szolgáltató.

## Továbbra is NO-GO

- minden más feladat minőségi rangsora;
- sebességi rangsor;
- kiegyensúlyozott vagy ár–érték összpontszám;
- saját benchmarkfuttatás és fizetős adatforrás külön jóváhagyás nélkül.

## Implementációs review

Az első implementációs ellenőrzés két P1 és egy P2 problémát talált:

1. a teljes LiveBench `api_kwargs` konfiguráció még nem volt minden ismert paraméterrel rögzítve;
2. a forrás szerinti mérési lefedettség és a felhasználó feltételei után maradó mezőny ugyanazt a számlálót használta;
3. a látható forráslink a változó főoldalra mutatott a rögzített CSV helyett.

A javítások után egy további helyezésszöveg-ellentmondás is kiderült: a technikai szűrés utáni helyet a felület teljes benchmarkhelynek nevezte. A végleges modell külön `sourcePosition` és szűrés utáni `position` értéket tárol és jelenít meg.

Végső implementációs döntés: **GO**. Maradó P0, P1 vagy P2 probléma nincs. Az ellenőr saját futtatásában 25/25 teszt, mindkét JavaScript szintaktikai ellenőrzés és a diff-ellenőrzés sikeres volt; a rögzített elsődleges konfigurációk újralekérése is egyezést mutatott.
