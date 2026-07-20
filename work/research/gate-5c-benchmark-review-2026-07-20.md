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

## Továbbra is NO-GO

- minden más feladat minőségi rangsora;
- sebességi rangsor;
- kiegyensúlyozott vagy ár–érték összpontszám;
- saját benchmarkfuttatás és fizetős adatforrás külön jóváhagyás nélkül.
