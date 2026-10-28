# Informe de verificació · Pirescacs 1.0.0

Data: 08-10-2026. Referència: Intel Core i7-13700KF, Ubuntu 24.04.5, Node 20.20.2, navegador Chromium del Codex IAB. El servidor Celeron no executa la cerca.

## Regles i motor

- **12 grups de proves, tots passen.** Inclouen posició inicial (28 jugades), nou salts, obstacles, invulnerabilitat, quatre tipus d’intercanvi, intercanvi de capità com a evasió, retorns i escacs finals, drets de doble pas, absència de retorn, mat, ofegat, victòria abans de taules i travessar caselles atacades amb el capità.
- **560 posicions** contrastades amb un generador Python independent, incloent reproducció exacta d’historial i perft a profunditat 2 de dues posicions. No s’ha publicat aquest generador com a regles del joc.
- Repetició verificada després de dos cicles complets de retorn; amb un dret de doble pas inicial diferent, només són taules després del tercer cicle. L’historial sobreviu als reinicis del comptador de progrés.
- **Paritat natiu / WASM d’un fil / WASM de dos fils:** FEN, resultats i totes les jugades legals iguals en les quatre fixtures de paritat. Cerca real amb nodes no nuls en ambdues versions.
- **Corpus tàctic independent: 16/16 en natiu, 16/16 en WASM d’un fil i 16/16 en WASM de dos fils**, amb un màxim de 10 s. Inclou arribada immediata, mat immediat, arribada amb intercanvi de capità, victòria forçada a cinc mitges jugades, bloqueig amb capità/músic/fuster i evasió obligada amb retorn. Totes les posicions tenen equivalent amb colors invertits. Les solucions les demostra el generador de referència, no el motor avaluat. És un corpus petit i no justifica un Elo.
- **200 partides aparellades**, colors alternats i posicions inicials prefixades, sense jugades il·legals. Pressupostos de 256/1024/4096/16384 nodes i habilitats 0/5/20/20. Puntuació del nivell superior: 91,91% (Grumet/Inicial), 95,45% (Corsari/Grumet), 82,58% (Capità/Corsari). 191 arribades, 1 mat, 1 repetició i 7 taules adjudicades pel límit de 160 mitges jugades del test. Aquest límit no existeix a la web. L’autojoc mesura ordre de força amb nodes, no una calibració Elo ni pressupostos de temps de tots els dispositius.
- Benchmark natiu Fairy-Stockfish completat. Perft dels escacs tradicionals a profunditat 4: **197281**, com a regressió de la base. La configuració específica `pirescacs.ini` valida sense advertiments. La comprovació de tot `variants.ini` també s’ha executat; adverteix sobre variants grans/plantilles excloses deliberadament de la compilació 8×8.

Els resultats complets i partides són a `tests/tactics-results.json`, `tests/wasm-tactics-*-results.json` i `tests/selfplay-results.json`.

## Web

Compilació TypeScript i Vite correcta. Proves de serialització preserven moviments, variants, anàlisis i fletxes, rebutgen versions/jugades malformades i eliminen SVG/HTML del fitxer importat. L’absència d’IndexedDB produeix un error controlat.

S’ha comprovat al navegador: partida contra bot, mode local, clics, intercanvis, retorn amb selecció visual en una partida real de 53 mitges jugades, canvi de torn només després de completar-lo, importació vàlida i rebuig d’una il·legal, desfer/navegació, recuperació de 20 jugades després de recarregar, fletxes amb mode Dibuixa i persistència després de recarregar, tres idiomes, anàlisi d’un i dos fils, cancel·lació en navegar, cerca contínua aturada després de 89,5 s amb 27,8 milions de nodes i PV conservada, fallada de cerca injectada amb continuïtat del mode local, tres PV, anàlisi de 21 posicions i gràfic complet, comparació amb el mateix pressupost i vista mòbil de 390×844.

En la compilació final s’ha comprovat també un retorn complet seguit d’una recàrrega immediata (54 jugades recuperades), cancel·lació del retorn pendent en acabar per acord, i representació del mariner a la casella d’arribada mentre es tria el retorn. Una anàlisi desada de la mateixa posició mostra dues fletxes per `f2f1@g7`; jugar-ne el suggeriment crea una variant de 54 jugades, ressalta les tres caselles i conserva la línia original de 53 jugades.

**Resposta visible:** mostra de 20 jugades, des de confirmar el moviment fins a aplicar el resultat autoritatiu al tauler i el següent requestAnimationFrame; P95 **24,505 ms**, màxim **24,910 ms**, en compilació de desenvolupament. La mesura és a `tests/browser-performance.json`; la instrumentació només existeix en desenvolupament. Cap cerca es calcula al fil principal. Les animacions duren 160 ms i respecten moviment reduït.

## Límits i publicació

Firefox i Safari i dispositius mòbils físics no estan disponibles a l’entorn de verificació. S’ha verificat la disposició mòbil a Chromium, però encara no es pot afirmar una prova completa en aquests navegadors, ni 60 fps en tots els mòbils. La descàrrega Blob del navegador IAB no ha exposat un esdeveniment de descàrrega a l’eina; el format exportat i el seu retorn s’han verificat amb les proves de serialització.

S’ha verificat també el paquet compilat servit per una instància temporal de Caddy al servidor, accessible només a localhost: bot, anàlisi amb dos fils, CSP, COOP/COEP, MIME WASM, caché immutable dels recursos amb hash i descàrrega disponible de la font corresponent. La instància temporal es retira en acabar la prova.

S’ha preparat un paquet estàtic, el codi complet i scripts d’instal·lació i recuperació. La publicació definitiva i la verificació del certificat públic estan pendents d’executar l’instal·lador amb sudo al servidor. Aquesta limitació no s’ha ocultat ni s’han modificat altres webs per evitar-la.
