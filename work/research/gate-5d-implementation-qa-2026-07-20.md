# Gate 5D — implementációs QA

Dátum: 2026-07-20

## Eredmény

GO. A Grok 4.5 helyi implementációja kiadásra kész, de GitHub-push, merge és Netlify-élesítés csak külön Gate 5D publikációs jóváhagyással történhet.

## Automata ellenőrzés

- `node --check public/core.mjs`: PASS
- `node --check public/app.js`: PASS
- Katalógus- és benchmark-JSON: PASS
- `git diff --check`: PASS
- `node --test tests/core.test.mjs`: 27/27 PASS

Külön tesztelt esetek:

- Grok 4.5 alapprofil: 280,00 USD / hó.
- 200 000 prompt token: rövid kontextusú ár.
- 200 001 prompt token: hosszú kontextusú ár.
- Rövid és hosszú cached-input ár.
- Átfedő ársáv: fail-closed, nincs becslés.
- Grok 4.3 megmarad.
- LiveBench: 9/15, Grok 4.5 `unmeasured`.

## Böngészős QA

- Desktop: Grok 4.5 és Grok 4.3 együtt választható; 280,00 és 150,00 USD / hó; 2/2 teljes költség.
- Mobil 390×844: nincs vízszintes túllógás (`scrollWidth = clientWidth = 390`).
- A két eredménykártya 356 px széles és egymás alatt jelenik meg.
- A látható katalógusszám 15.
- Böngésző warning/error: 0.
- A vizuális irány nem változott; az elfogadott sötét Observatory megjelenés megmaradt.
- Az ideiglenes QA-képek törölve lettek, nem kerültek a repóba.

## Független reviewer

Döntés: GO.

- P0: nincs.
- P1: nincs.
- P2: nincs.
- P3: nincs.

A reviewer külön ellenőrizte az exact modellazonosítót, az 500k kontextust, a hat árrekordot, a 200 000/200 001 határt, a konzervatív capability-állításokat, a Grok 4.3 megtartását, a 9/15 benchmark-lefedettséget és a minőségi/sebességi túlállítás hiányát.
