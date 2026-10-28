# Informe de verificació · Pirescacs 1.1.0

Data: 08-10-2026. Referència: Intel Core i7-13700KF, Ubuntu 24.04.5, Node 20.20.2 i Chromium del Codex IAB. Reglament actual: **v2**. El servidor Celeron només serveix els fitxers.

## Regles i motor

- El músic ocupa c1/f1 i c8/f8 i mou com un alfil. El fuster ocupa b1/d1 i e8/g8 i salta a les 16 caselles del perímetre de dues caselles, incloent retrocessos. El nucli manté la variant antiga `pirescacs-v1` per reproduir partides desades sense canviar-ne la legalitat.
- **13 grups de proves passen per a v2 i també per a v1.** Inclouen drets individuals, intercanvis, retorns, escacs finals, invulnerabilitat, finals de partida, repeticions i validació d’arrels editades. S’han contrastat **560 posicions per variant** amb el generador Python independent, amb reproducció exacta d’historial i perft a profunditat 2.
- La validació de posicions rebutja taulers malformats, capitans absents, vaixells duplicats, mariners a l’última fila i escac al capità del bàndol que no mou. Després del rebuig, el nucli torna a carregar una posició vàlida sense trencar-se.
- **Paritat natiu / WASM d’un fil / WASM de dos fils** en v2 i v1: vuit fixtures per build, més rebuig d’una arrel invàlida i recuperació. Coincideixen FEN, jugades legals i resultats. Les dues builds cerquen realment.
- **Corpus tàctic v2: 16/16 en natiu, 16/16 en WASM d’un fil i 16/16 en WASM de dos fils**, amb pressupost màxim de 10 s per posició. Conté arribada, mat, intercanvi de capità, victòria forçada fins a cinc mitges jugades, bloquejos amb cada peça i retorns defensius, amb colors invertits. Les solucions es demostren amb el generador independent. Aquest corpus petit no determina un Elo.
- **200 partides v2 aparellades**, amb colors alternats i obertures fixades: cap jugada il·legal. Puntuació del nivell superior: **97,06%** (Grumet/Inicial), **93,18%** (Corsari/Grumet), **89,39%** (Capità/Corsari). Pressupostos de 256/1024/4096/16384 nodes i habilitats 0/5/20/20. Finals: 177 arribades, 18 mats, 2 repeticions i 3 taules adjudicades pel límit de 160 mitges jugades de la prova; aquest límit no existeix a la web. Aquesta prova compara força amb nodes, sense atribuir Elo ni garantir pressupostos de temps equivalents a tots els dispositius.
- Benchmark natiu Fairy-Stockfish completat. Regresió d’escacs a profunditat 4: **197281** nodes. `pirescacs.ini` valida. La comprovació de tot `variants.ini` avisa sobre variants amb taulers grans excloses de la compilació 8×8, com ja passava a v1.

Les dades v2 són a `tests/tactics-results.json`, `tests/wasm-tactics-*-results.json` i `tests/selfplay-results.json`. S’han conservat els resultats anteriors amb prefix `legacy-v1-`, així com el reglament i l’informe v1.

## Web i anàlisi

Compilació TypeScript/Vite correcta. Les proves de serialització conserven `startFen`, torn, comptadors, drets de doble pas, regles v1/v2, variants, anotacions i anàlisis. Rebutgen FEN, versions i moviments malformats, eliminen SVG/HTML importat i tracten l’absència d’IndexedDB com un error controlat.

S’ha verificat a Chromium:

- Anàlisi contínua activada automàticament tant en anàlisi directa com després d’una partida, incloses partides v1 i arrels editades. Una cerca v2 de dos fils ha continuat **40,1 s**, profunditat 16 i **23.104.382 nodes**, sense límit de 30 s.
- Cancel·lació i reinici en canviar posició o fils; L pausa/reprèn, i navegar conserva la pausa. F gira el tauler. Les fletxes del motor i la barra d’avaluació es poden ocultar.
- ←/→ recorren l’historial i ↑/↓ el principi/final, també amb el tauler enfocat o girat. Dues pulsacions ràpides recorren dues jugades. Alt+fletxes i Retorn permeten moure les peces sense perdre pulsacions. Els camps de formulari conserven les seves tecles.
- Controls de primera/anterior/reproducció/següent/última, exploració de PV i variants conservant l’original. La revisió completa pausa la cerca contínua i la reprèn en acabar. També funciona amb una arrel editada amb negres començant al número 7.
- Nova partida des de l’anàlisi passa a v2 i desa la partida anterior. Les v1 importades mostren avís i icones originals.
- Editor: col·locació amb paleta, moviment per dos tocs, esborrat, gir, posició inicial, FEN, torn i drets individuals. Rebuig de tauler buit i recuperació; anàlisi i bot des d’arrels personalitzades; numeració correcta si mouen primer les negres. Importació de partida i variant des d’una arrel editada, anotacions i recuperació després de recarregar.
- Sis pestanyes d’exemple: capità, vaixell, músic, fuster, mariner i retorn. Destinacions legals visibles immediatament; salt enrere del fuster, intercanvi i retorn complet provats. Noms i regles traduïts a català, castellà i anglès.
- Vistes de 1280×900 i 390×844; editor i anàlisi sense desbordament horitzontal. El tauler girat també es pot editar.

**Resposta visible v2:** 20 jugades consecutives amb teclat en desenvolupament, des de confirmar la jugada fins a actualitzar el tauler amb el nucli autoritatiu i el següent requestAnimationFrame. **P95 25,045 ms; màxim 26,225 ms**. Dades i jugades a `tests/browser-performance-v2.json`. La instrumentació no es publica en producció. Les animacions duren 160 ms i respecten moviment reduït; totes les cerques corren en Workers.

## Límits i desplegament

Firefox, Safari i mòbils físics no estan disponibles en aquest entorn. La validació responsive a Chromium no permet afirmar una prova completa en aquests navegadors ni 60 fps en qualsevol mòbil. El navegador IAB no ha exposat l’esdeveniment de descàrrega Blob; el format JSON i la seva importació s’han comprovat amb proves de serialització i amb una partida personalitzada importada al navegador.

La web pública existent respon HTTP 200 amb certificat vàlid i COOP/COEP; continua activa la release **1.0.0-20261008**. El paquet 1.1.0 i l’instal·lador amb verificació SHA-256, backup, validació Caddy i rollback es preparen per al servidor. L’activació de l’actualització continua pendent d’executar l’instal·lador amb sudo, que demana contrasenya. No s’ha modificat el DNS ni les altres webs.
