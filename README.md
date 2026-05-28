# LLM Cost App

Interaktív, statikus webalkalmazás LLM API-költségek, tool calling alkalmasság,
szolgáltatói megbízhatóság és felhasználási esetek összevetésére.

## Mire jó?

- Home Assistant voice / okosotthon AI döntéstámogatás
- ügyfélszolgálati chatbot költségbecslés
- kódolós agent modellválasztás
- dokumentumelemzési költségprofilok

Az app nem csak tokenárat mutat, hanem külön kezeli:

- input / cached input / output árakat
- tool calling alkalmasságot
- szolgáltatói megbízhatóságot
- privacy / régiós kockázatot
- egyszerű és haladó nézetet
- API-kulcs létrehozási linkeket

## Használat

Nyisd meg az `index.html` fájlt böngészőben. Nincs build lépés és nincs backend.

## Megjegyzés

Az árak és kvalitatív pontszámok publikus szolgáltatói oldalakból és gyakorlati
döntési szempontokból indulnak ki. Éles integráció előtt mindig érdemes saját
tool-calling és latency tesztet futtatni.
