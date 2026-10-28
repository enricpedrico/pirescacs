# Reproduir les proves de navegació

1. Importa `playback-local.json` des de Jugar. Prem ← dues vegades: la vista ha de continuar a Jugar amb 2/4, mentre el registre manté quatre jugades. Intenta moure c2-c4: la partida ha de quedar igual. Prem ↓ per tornar a 4/4; llavors c2-c4 ha de ser jugable.
2. Importa `playback-bot.json`: el bot Capità mou amb blanques durant un màxim de 10 s. Retrocedeix amb fletxes o botons mentre pensa. En respondre, la vista ha de passar automàticament a 5/5; les quatre jugades importades han de conservar-se.
3. Importa de nou la fixture del bot i comença una partida local abans que respongui. Una vegada passat el pressupost anterior, la nova partida ha de continuar sense moviments.
4. Importa `playback-bot-fast.json`, espera la resposta i retrocedeix a 4/5. Prem Desfer: s’han de desfer dues mitges jugades reals, retornant a 3/3 amb torn negre.
5. Obre anàlisi amb el control explícit: la cerca contínua ha d’estar activada. Les fletxes hi han de continuar funcionant. Tornar a Jugar recupera la posició real.

Les fixtures són partides de prova v3 sense posició arrel personalitzada. No depenen de dades del servidor. El seu import crea partides locals noves i no esborra les existents.
