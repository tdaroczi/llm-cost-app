# Production-katalógus jelölt – élő hivatalos ellenőrzés

Ellenőrzés: 2026-07-20 06:28 UTC
Független reviewer: 2026-07-20 06:31 UTC

## Bekerülő modellek

| Szolgáltató | Modellazonosító | Kontextus | Input / 1M | Output / 1M | Alkalmazott árhatókör |
|---|---|---:|---:|---:|---|
| OpenAI | `gpt-5.6-sol` | 1 050 000 | 5 USD | 30 USD | standard, legfeljebb 272 000 input token |
| Anthropic | `claude-fable-5` | 1 000 000 | 10 USD | 50 USD | first-party Claude API, globális routing, standard, cache nélkül |
| Mistral AI | `mistral-medium-3-5` | 256 000 összesen | 1,50 USD | 7,50 USD | `api.mistral.ai`, globális végpont, standard, cache nélkül |
| Mistral AI | `mistral-small-2603` | 256 000 összesen | 0,15 USD | 0,60 USD | `api.mistral.ai`, globális végpont, standard, cache nélkül |

## Biztonsági korlátok

- A GPT-5.6 Sol 272 000 input token feletti, magasabb ársávját most nem vettük fel. A kalkulátor e fölött nem becsül.
- A Claude Fable 5 amerikai inference útvonala 1,1-szeres, ezért nem része a globális alapár-rekordnak.
- A Claude Fable 5 harmincnapos adatmegőrzést igényel, ZDR-beállítású szervezetben nem használható. Az output előtti biztonsági visszautasításért az Anthropic nem számláz.
- A Mistral EU regionális végpontja 1,1-szeres. A globális árrekordból az EU regionális inference, batch, cache és külön eszközköltségek ki vannak zárva.
- A Mistral 256 ezres kontextuskorlátját az input és output összegeként ellenőrzi a kalkulátor.
- A katalógus továbbra sem állít benchmark nélküli feladatspecifikus minőségi sorrendet.

## Független ellenőrzés eredménye

Az első ellenőri kör az OpenAI rekordot elfogadta, a Claude és Mistral rekordoknál pedig túl tágnak találta az árhatókört. A jelölt adatokat ennek megfelelően leszűkítettük a globális alapútvonalakra, és rögzítettük a regionális felárak kizárását. Az alapmodell-adatok és listaárak mind a négy modellnél helyesek voltak.

## Hivatalos források

- OpenAI GPT-5.6 Sol modell: https://developers.openai.com/api/docs/models/gpt-5.6-sol
- OpenAI API-árazás: https://developers.openai.com/api/docs/pricing
- OpenAI API-kulcs: https://platform.openai.com/api-keys
- Claude Fable 5: https://platform.claude.com/docs/en/about-claude/models/introducing-claude-fable-5-and-claude-mythos-5
- Claude árak: https://platform.claude.com/docs/en/about-claude/pricing
- Claude data residency: https://platform.claude.com/docs/en/manage-claude/data-residency
- Claude API-kulcs: https://platform.claude.com/settings/keys
- Mistral Medium 3.5: https://docs.mistral.ai/models/model-cards/mistral-medium-3-5-26-04
- Mistral Small 4: https://docs.mistral.ai/models/model-cards/mistral-small-4-0-26-03
- Mistral API-árazás: https://mistral.ai/pricing/api/
- Mistral regionális inference: https://docs.mistral.ai/studio-api/regional-inference
- Mistral API-kulcs útmutató: https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key
