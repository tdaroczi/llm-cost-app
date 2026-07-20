# Független kutatási review – 2026-07-19

**Vizsgált dokumentum:** `competitive-landscape-2026-07-19.md`
**Reviewer feladata:** a következtetések megtámadása, kimaradt versenytársak keresése, valamint a frissesség, a 0 Ft-os működés és a katalógusméret realitásának ellenőrzése.
**Fájl- és kódmódosítás a review során:** nem történt.

## Verdikt

**FELTÉTELES GO**

A termékirány műszakilag és termékileg életképes, ha a kutatás és a későbbi specifikáció az alábbi korrekciókat átveszi.

## Megerősített állítások

- A modell, a készítő, az API-szolgáltató és a hozzáférési csatorna külön kezelése szükséges.
- Rekord szintű forrás, ellenőrzési dátum és fail-closed viselkedés szükséges.
- Statikus, szabályalapú ajánló megfelelő V1 a 0 Ft/hó többletköltségű működéshez.
- Grok, DeepSeek, Qwen, Kimi és MiniMax közvetlen API-elérhetőségéhez hivatalos forrás található.

## Kötelező korrekciók

1. A „nincs ilyen termék” állítást a „megvizsgált mezőnyben nem találtunk minden követelményt teljesítő terméket” formára kell enyhíteni.
2. A versenytárstérképet ki kell egészíteni: LLMCalculators, Orvirt, AI API Prices, Try That LLM, models.dev, Not Diamond, Martian, LLMRouter és RouteLLM.
3. Külön kell választani a statikus döntéstámogatást, a saját promptokon végzett értékelést és a futás közbeni routingot.
4. Kétlépcsős katalógus szükséges: 12–18 teljesen ellenőrzött és ajánlható, összesen 25–40 kereshető modell.
5. Az automatikus ellenőrzés csak változást jelezhet; megváltozott árat emberi jóváhagyás nélkül nem publikálhat.
6. A szolgáltatói és regionális változatok külön rekordok legyenek, különösen Alibaba, Kimi, MiniMax és GLM esetén.
7. A rangsorolási szabály és a bizonyítékszintek a következő UI-bővítés előtt készüljenek el.

## Költségfeltétel

A helyes cél **0 Ft/hó többletköltség** a már meglévő Netlify-előfizetéshez képest. Az oldal statikus marad; fizetős API, automatikus túlfogyasztás vagy automatikus feltöltés csak külön felhasználói jóváhagyással engedélyezhető.

## Hivatkozások

- https://llmcalculators.com/
- https://www.orvirt.com/tools/model-comparison
- https://aiapiprices.com/
- https://trythatllm.com/
- https://github.com/anomalyco/models.dev
- https://docs.notdiamond.ai/docs/key-concepts
- https://docs.withmartian.com/integrations
- https://github.com/ulab-uiuc/LLMRouter
- https://github.com/lm-sys/RouteLLM
- https://docs.x.ai/developers/pricing
- https://api-docs.deepseek.com/quick_start/pricing/
- https://www.alibabacloud.com/help/en/model-studio/model-pricing
- https://platform.kimi.ai/docs/pricing/chat
- https://platform.minimax.io/docs/guides/quickstart-preparation
- https://docs.github.com/en/actions/concepts/billing-and-usage
- https://www.netlify.com/pricing/
