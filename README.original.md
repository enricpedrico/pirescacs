# Pirescacs 1.5.0

Web de pirescacs en català, castellà i anglès: bot, dues persones al mateix dispositiu, motor contra motor, anàlisi, variants, fletxes, retorns, historial local i importació/exportació. Sense comptes, rellotges ni servidor de càlcul.

## Arrencar

```bash
npm ci
npm run dev
```

Els binaris WASM compilats s’inclouen a `public/engine/`. `npm run build` produeix `dist/`; no cal compilar C++ per canviar la interfície. `npm run preview` serveix la versió compilada amb COOP/COEP. Cal HTTP sobre localhost o HTTPS per a IndexedDB/Workers i dos fils.

## Arquitectura

React + TypeScript + Vite; Chessground i SVG originals. Un Worker amb el nucli C++ és l’autoritat de legalitat, i un altre Worker executa la cerca. No hi ha implementació de regles JavaScript publicada. `tests/rules_test.py` (versions anteriors) i `tests/rules_v4_test.py` (metge/captura al pas) i `tests/rules_v5_test.py` (xef/arribada com a única victòria) són generadors independents exclusivament de verificació.

Fairy-Stockfish deriva de la revisió indicada a `UPSTREAM.txt`. `engine-pirescacs.patch` registra les modificacions, i `engine/` conté tot el codi corresponent. La variant té moviments compostos de vaixell, retorn i resurrecció, amb captura al pas, drets individuals, hash, repeticions, victòria i una valoració clàssica pròpia. Conserva aprofundiment iteratiu, alpha-beta, transposicions i ordenació de Fairy-Stockfish. No carrega NNUE. La poda per moviment nul i les aproximacions de canvi de material convencionals s’eviten en aquesta variant. No s’atribueix Elo al motor.

El mode compatible d’un fil fa la cerca dins del Worker. El mode de dos fils utilitza pthreads d’Emscripten; només s’ofereix amb aïllament del navegador i quatre nuclis lògics o més. Els quatre nivells gasten 250/750/3000/10000 ms, amb habilitat 0/5/20/20. Hash per defecte 32 MiB. Terminar i recrear el Worker cancel·la també una cerca síncrona d’un fil; identificadors i generacions impedeixen aplicar resultats antics.

## Compilar el motor

Amb GCC/Clang, Python 3 i Make:

```bash
SOURCE_DATE_EPOCH=1791417600 make -C engine/src -j4 ARCH=x86-64 nnue=no largeboards=no all=no debug=yes build
```

Instal·leu Emscripten **3.1.73** des del repositori oficial emsdk, activeu el seu entorn i executeu:

```bash
./scripts/build-engine.sh single
./scripts/build-engine.sh multi
```

No activeu `largeboards` ni `all`: aquest joc usa índexs de casella de 6 bits i el retorn està codificat al camp de moviment de 32 bits. El script multifil comprova explícitament la forma del bootstrap d’Emscripten abans d’afegir el pont de cua UCI; un canvi de toolchain requereix revalidació. La compilació fixa revisió, dependències i paràmetres; el fitxer `package-lock.json` fixa les dependències web.

## Verificar

```bash
npm test
npm run test:storage
npm run test:preferences
npm run test:evaluation
node tests/wasm-test.cjs single
node tests/wasm-test.cjs multi
python3 tests/tactics_v5.py
node tests/wasm-test.cjs single --v5-tactics
node tests/wasm-test.cjs multi --v5-tactics
python3 tests/selfplay_v5.py
python3 tests/upstream_perft.py
npm run build
```

Les proves WASM guarden còpies temporals a `../../work/`, coherent amb el paquet de lliurament; creeu aquesta carpeta si traslladeu el projecte. La prova tàctica crea el corpus i demostra les solucions amb el generador independent. Els fitxers `*-results.json` contenen les dades verificables. `./scripts/package-release.sh` genera el paquet estàtic i l’arxiu de fonts públic. Vegeu [l’informe](docs/TEST-REPORT.md) per resultats i límits de la validació.

## Ús

- Seleccioneu mode, bàndol i nivell; premeu Nova partida per aplicar-los.
- Reglament v5: dos xefs a1/h1 i a8/h8, dos vaixells a2/g2 i b7/h7. El capità és capturable i mou com una reina, sense escac ni mat. Només guanya l’arribada d’un vaixell. La resta de la tripulació manté els moviments: dos metges b1/g1 i b8/g8; un fuster d1/e8. El músic és l’alfil c1/f1 i c8/f8. Capitans e1/d8; sis mariners per color a files 2/7. Les partides antigues conserven v1/v2/v3/v4 i la seva posició inicial.
- El Metge es mou una casella en les vuit direccions. Quan el rival captura una peça pròpia dins del seu abast de quatre caselles, pots sacrificar un metge per ressuscitar-la, només en el torn següent. Selecciona’l per veure l’abast difuminat; el botó Ressuscitar indica peça i casella. Mai ressuscita capitans.
- Els mariners poden capturar al pas. Les coordenades estan desactivades per defecte; Personalitzar permet activar-les.
- Motor contra motor permet nivell independent per a cada color, pausa/reprendre, historial i anàlisi posterior. En recarregar o recuperar una partida automàtica, els motors queden en pausa.
- Editor / Establir posició permet col·locar, moure o esborrar peces, girar, buidar, carregar FEN, triar torn i drets individuals de doble pas, i jugar o analitzar qualsevol disposició. Accepta peces addicionals, múltiples capitans o cap capità, mariners a l’última fila i escacs previs; es valida només el format. En v5 no hi ha restriccions d’escac; v1/v2/v3/v4 conserven la seguretat dels capitans.
- Cada peça té una pestanya d’exemple interactiu, també resurrecció i captura al pas.
- Nova partida és accessible al capçal i a l’anàlisi.
- Moveu amb clic o arrossegament. El retorn ofereix únicament caselles legals; es confirma amb un clic.
- Botó dret per dibuixar; Majúscules/Alt/Ctrl canvien colors. En mòbil activeu Dibuixa.
- ←/→ recorren les jugades; ↑/↓ van al principi/final. Funciona també amb el tauler enfocat o girat. Alt + fletxes conserva la navegació entre caselles i Retorn mou peces. Els camps de formulari i els diàlegs no intercepten aquestes dreceres.
- Analitzar activa per defecte la cerca contínua (`go infinite`), també després d’una partida. Cada canvi de posició cancela el Worker anterior, desa la seva última anàlisi i inicia una cerca nova. L’interruptor del motor o L permet pausar/reprendre; la pausa es manté mentre es navega. Els ajustos de memòria, fils i nombre de línies s’apliquen automàticament.
- Les jugades de les línies del motor són clicables: seleccionar-ne una obre una variant validada amb C++, sense alterar la partida original. Espai juga la millor jugada i F gira el tauler. Hi ha controls de principi, anterior, reproducció/pausa, següent i final sota el tauler. Fletxes del motor i barra de valoració es poden ocultar.
- Analitzar tota la partida fa una passada de dos segons per posició. Suspèn la cerca contínua durant la revisió i la reprèn en acabar si el motor està activat; navegar interromp la revisió i analitza la posició seleccionada.
- La comparació numèrica abans/després només apareix amb la mateixa versió i pressupost de cerca, sense resultats forçats. La barra és una estimació de valoració, no una probabilitat.
- El botó JSON exporta jugades, variants, anotacions i anàlisis. TXT identifica retorns, intercanvis i resurreccions amb ✚. La importació reprodueix totes les jugades i variants amb C++.
- IndexedDB desa al dispositiu. Si no està disponible, es pot seguir jugant i exportar. No es comparteixen partides entre dispositius.

## Desplegament i recuperació

Vegeu [DEPLOYMENT.md](docs/DEPLOYMENT.md). El paquet preparat inclou `dist`, configuració Caddy, comprovació SHA-256, instal·lació amb backup i rollback. No necessita Docker, backend ni base de dades. El servidor només serveix fitxers.

La publicació exigeix sudo al servidor. Cap contrasenya, clau SSH ni token DNS és al projecte. El codi públic es pot descarregar del mateix lloc com `source.tar.gz` per complir les llicències.

## Llicència

GPL-3.0-or-later per al conjunt, inclosos el motor i Chessground. Vegeu `LICENSE`, `THIRD-PARTY.md` i els avisos originals d’`engine/`. SVG originals inspirats en el dibuix proporcionat; totes les fonts i recursos es serveixen des del mateix domini.

Actualització 1.2.0: les 64 caselles de l’editor mantenen la mateixa mida independentment de les peces; començar una partida mostra un avís destacat i plega les opcions. En anàlisi, els retorns de mariners pausen la cerca mentre es tria una casella i la reprenen en completar la jugada. Amb el tauler enfocat, les fletxes trien el retorn, Retorn confirma i Esc cancel·la.

Actualització web 1.2.1: les fletxes del teclat, els botons de navegació i els clics a l’historial permeten revisar la partida dins de Jugar. Les posicions anteriors són només de consulta; el bot continua des de la posició real i la seva resposta retorna automàticament el tauler al present. L’anàlisi s’obre de manera explícita i conserva l’anàlisi contínua. Motor i reglament continuen a 1.2.0 / v3.

Actualització web 1.3.0: sons originals de vidre suau, fusta i toc discret, volum i silenci immediat; moviments, captures, intercanvis, retorns i avisos. Personalització del tauler (cinc paletes), peces (tres paletes), mida, animacions, coordenades, destinacions, última jugada, accent, fons i concentració. Preferències locals independents de les partides. Vegeu [PERSONALIZATION.md](docs/PERSONALIZATION.md). Motor 1.2.0 i reglament v3 sense canvis.

Actualització 1.5.0: barra blanca sempre creixent cap amunt independentment de l’orientació, amb última valoració conservada mentre recalcula. Xefs originals basats en el dibuix, amb moviment de torre i sense enroc; dos vaixells per bàndol. El capità no és reial i es pot capturar sense acabar la partida. El Metge pot ressuscitar un xef, però continua sense poder ressuscitar capitans. Els retorns ja no tenen restriccions d’escac. Les noves partides només guanyen per arribada del vaixell i poden quedar desades inacabades en començar-ne una altra; es mantenen les taules.
