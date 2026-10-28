# Informe de verificació · Pirescacs web 1.2.1

Data: 08-10-2026. Reglament v3 i motor 1.2.0 sense canvis. Aquest informe cobreix la navegació d’historial durant una partida.

## Comportament implementat

Les fletxes del teclat, els botons primera/anterior/següent/última i els clics a l’historial recorren les posicions dins de **Jugar**. La línia real de la partida es manté completa. Les posicions anteriors són de consulta i les peces no s’hi poden moure. S’hi mostra un avís i un botó per tornar al present.

La instantània real i la instantània mostrada es consulten al mateix nucli C++ amb peticions serialitzades. El bot cerca sempre sobre la línia real amb un coordinador independent del de l’anàlisi. Canviar només la posició mostrada no atura ni reinicia la cerca del rival. Una jugada nova actualitza el cursor al final de la partida. Les respostes de cerca es descarten si canvien la partida o la línia real; també es cancel·len els Workers quan cal.

Rendició, desfer, torn i resultat segueixen la posició real. L’anàlisi s’obre amb els controls explícits i continua activa per defecte.

## Validació

- Compilació TypeScript/Vite correcta. Proves de serialització correctes, incloent formats v1/v2/v3, arrels personalitzades, variants, anotacions, anàlisi i absència d’IndexedDB.
- Partida local amb quatre jugades: dues pulsacions ràpides de ← deixen el cursor a 2/4, conserven quatre jugades i mantenen Jugar. Intentar c2-c4 amb el teclat des d’aquesta posició no modifica la partida ni crea una variant. Tornar al present permet jugar c2-c4 i avançar a 5/5.
- Clics a l’historial i botons de navegació: recorren les posicions sense obrir el panell del motor. ↑/↓ porten al principi/final. El gir del tauler no canvia el sentit de la navegació d’historial.
- Bot Capità amb pressupost de 10 s, torn blanc i jugador negre: mentre el bot pensa, tres retrocessos deixen el cursor a 1/4 i l’estat continua indicant que el rival pensa. En respondre, la vista torna a 5/5, amb les quatre jugades originals seguides de d2-d4, i cedeix el torn a les negres. No s’obre anàlisi ni es perd l’historial.
- Nova partida local mentre el bot anterior pensa: es cancel·la la cerca antiga i el tauler continua a 0/0 després de passar el seu pressupost anterior. Cap resposta obsoleta s’aplica.
- Desfer amb bot: després de la resposta, revisant 4/5, desfer treu la jugada pròpia i la resposta del bot i retorna a 3/3, amb torn negre. Usa el torn real, no el de la posició mostrada.
- Rendició local revisant 3/4 (el tauler mostra torn negre, però el torn real és blanc): la rendició declara victòria de les negres. La vista d’historial informa del resultat real.
- Anàlisi explícita: el botó Analitzar partida obre el motor amb anàlisi contínua activada. Les fletxes continuen funcionant en anàlisi. Tornar a Jugar recupera la posició real.
- Vista de 390 × 844 a Chromium: els botons de navegació i de retorn al present funcionen sense desbordament horitzontal. Mida de pàgina 375 px en una finestra de 390 px amb barra de desplaçament. La mida normal es restaura en acabar la prova.
- Cap error de consola durant les comprovacions.

Fixtures reproduïbles: `tests/playback-local.json`, `tests/playback-bot.json` i `tests/playback-bot-fast.json`. Les proves de regles, WASM i força del motor 1.2.0 són a `TEST-REPORT-1.2.0.md`; no s’han repetit perquè ni el motor ni el reglament han canviat.

## Límits i desplegament

Provat en Chromium IAB a l’escriptori i amb viewport mòbil. No s’han provat Firefox, Safari ni dispositius mòbils físics. A l’inici d’aquesta actualització, el servidor tenia activa la release 1.2.0-20261008. La release web 1.2.1 es lliura amb font complet, checksums, instal·lador i rollback.
