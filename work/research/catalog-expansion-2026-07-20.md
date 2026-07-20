# Katalógusbővítés – hivatalos ellenőrzés

Ellenőrzés ideje: 2026-07-20 05:47 UTC

## Bekerülő modellek

| Szolgáltató | Modell | Input / 1M token | Output / 1M token | Pontos árkörnyezet |
|---|---|---:|---:|---|
| xAI | `grok-4.3` | 1,25 USD | 2,50 USD | közvetlen API, standard, legfeljebb 200 000 input token |
| DeepSeek | `deepseek-v4-flash` | 0,14 USD | 0,28 USD | közvetlen API, cache-miss inputár, 1M kontextus |
| DeepSeek | `deepseek-v4-pro` | 0,435 USD | 0,87 USD | közvetlen API, cache-miss inputár, 1M kontextus |
| Alibaba Cloud Qwen | `qwen3.7-max-2026-06-08` | 1,65 USD | 4,951 USD | Frankfurt szolgáltatási régió, Global deployment, legfeljebb 1M input token |

Mind a négy rekordot a fő ellenőrzés és a külön reviewer is PASS minősítéssel fogadta el.

## Tudatosan kihagyott jelöltek

- `grok-4.5`: az xAI hivatalos oldala szerint az EU-felhasználók API Console felületén még nem elérhető. Magyarországról ezért nem jelenhet meg úgy, mintha azonnal használható lenne.
- `deepseek-chat` és `deepseek-reasoner`: a hivatalos dokumentáció szerint 2026. július 24-én megszűnnek; jelenleg is csak kompatibilitási nevek a V4 Flash módjaihoz.
- `qwen3.7-max` alias: változó modellverzióra mutat, és időszakos promóciós ár kapcsolódik hozzá. A verziózott rekord egyértelműbb.
- többsávos Qwen modellek: a jelenlegi motor még nem választ több egymás utáni input ársáv közül; ezek félrevezető részárral nem kerülhetnek be.

## Fontos megjelenítési szabályok

- A Grok 4.3 rekord 200 000 input token felett fail-closed, mert a hosszú kontextus külön, magasabb ársávját most nem vettük fel.
- A Qwen `Global` deployment nem EU-adatrezidencia. A helyes szöveg: „Szolgáltatási régió: Frankfurt; feldolgozási hatókör: Global.”
- A DeepSeek inputnál a cache-miss, vagyis cache nélküli árat használjuk.

## Hivatalos források

- xAI modellek: https://docs.x.ai/developers/models/grok-4.3
- xAI árak: https://docs.x.ai/developers/pricing
- xAI API-kulcs: https://console.x.ai/team/default/api-keys
- DeepSeek árak és modellek: https://api-docs.deepseek.com/quick_start/pricing/
- DeepSeek API-kulcs: https://platform.deepseek.com/api_keys
- Alibaba Cloud Model Studio árak: https://www.alibabacloud.com/help/en/model-studio/model-pricing
- Alibaba Cloud API-kulcs útmutató: https://www.alibabacloud.com/help/en/model-studio/get-api-key
