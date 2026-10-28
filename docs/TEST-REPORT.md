# Informe de verificació · Pirescacs 1.5.0

Data: 13-10-2026. Web/motor 1.5.0 i reglament v5. La 1.4.0 continua activa al servidor mentre es prepara l’actualització. Documents i proves anteriors conservats, inclòs el reglament v4.

## Requisits comprovats

- Barra d’avaluació: valor sempre des del punt de vista blanc, independent de l’orientació. El blanc creix des de baix cap amunt i el negre ocupa la part superior. L’última valoració es conserva mentre espera el càlcul nou; una partida diferent reinicia la barra. No s’aplica una PV antiga com a jugada de la posició nova.
- Única victòria en v5: arribar amb qualsevol vaixell a l’última fila. No hi ha escac ni mat; el capità és una peça normal que mou com una reina i es pot capturar sense acabar la partida. El Metge continua sense poder-lo ressuscitar. Retorns, intercanvis i arribades no tenen restriccions de seguretat del capità. Es mantenen les taules; la UI v5 no ofereix victòries manuals per rendició.
- Dos vaixells a2/g2 i b7/h7; dos xefs a1/h1 i a8/h8. Els vaixells nous substitueixen els mariners d’a2/h7. Xef: torre ordinària, capturable, bloquejada per peces, sense enroc. Pot ser ressuscitat pel Metge. Sis SVG originals, en dos colors i tres paletes, basats en el dibuix de l’usuari.
- Les partides v1/v2/v3/v4 conserven arrel, moviments i capitans reials. Les noves són v5. JSON/FEN/exportacions, editor, exemples i tres idiomes actualitzats.

## Nucli i regressions

- `rules_v5_test.py`: 12 grups i 514 instantànies, amb un generador Python independent exclusiu de proves. Inclou 160 disposicions aleatòries amb aplicació, cerca i recuperació de l’estat; capitans capturats/absents/atacats, xefs, dos vaixells, intercanvi entre vaixells, resurrecció de xef, captura al pas i retorns que abans donaven escac. També comprova falta de jugades, repetició, comptador i precedència de l’arribada.
- Posició inicial exacta: 32 peces, simetria de colors, dos vaixells/dos xefs per color, 19 moviments legals; perft profunditat 2 = 361, contrastat amb el generador independent.
- Paritat exacta natiu/WASM d’un fil/WASM de dos fils: 514 instantànies v5, 485 v4 i 24 casos de protocol en les sis variants/àlies. Cerca activa produeix jugada legal en tots dos builds.
- Versions anteriors: suites v1/v2/v3, 13 grups cadascuna; suite v4, 13 grups i 485 instantànies, sense regressions. No s’han reinterpretat partides antigues amb les regles noves.
- `stockfish bench`: 5.843.604 nodes, la mateixa signatura anterior, en 4.512 ms. Configuració `pirescacs.ini` sense diagnòstics. `check variants.ini` manté els diagnòstics de les variants grans no compilades en aquest build 8×8.
- Perft upstream: 120 casos compatibles, tots correctes, 18,63 s; 25 variants no compilades enumerades a `v5-upstream-perft-results.json`. Harness Python equivalent als casos upstream perquè no hi ha `expect`; no s’afirma cobertura de taulers grans.
- Builds reproduïbles amb Emscripten 3.1.73, revisió fixada i mateix SOURCE_DATE_EPOCH. Els quatre JS/WASM coincideixen SHA-256 entre dues compilacions. Patch complet contrastat contra l’upstream fixat.

## Cerca

- Corpus independent de 24 casos tàctics, amb solucions demostrades fins a cinc mitges jugades i colors invertits: 24/24 en natiu, 24/24 WASM d’un fil, 24/24 WASM de dos fils. Pressupost màxim 10 s per cas; es resolen abans d’esgotar-lo. Inclou arribada amb capità atacat, victòria del segon vaixell, intercanvi amb xef, defensa obligada amb cada peça, retorn que bloqueja i una resurrecció de xef necessària per obrir la ruta.
- 200 partides aparellades en 156,13 s, colors i arrels alternats, cap moviment il·legal. Totes les victòries són per arribada; cap per captura del capità/mat. Pressupostos de nodes 256/1.024/4.096/16.384, habilitat 0/5/20/20 i límit de prova 160 mitges jugades.
- Puntuació del nivell superior en les comparacions consecutives: 88,24% (68 partides), 96,97% (66) i 98,48% (66). No és Elo ni equivalència de temps en qualsevol dispositiu. Es conserva valoració clàssica, sense NNUE d’escacs convencionals.

## Web i navegador

- TypeScript/Vite sense errors. Proves d’emmagatzematge: C/c, r:C@casella, resurrecció, arrels v4/v5 i anàlisis 1.5.0. Victòries manuals v5 rebutjades; rendicions antigues conservades. Preferències i cicle d’àudio passen. Nova prova d’avaluació: signe, retenció durant càlcul, zero explícit i reinici entre partides.
- Chromium IAB: disposició inicial i quatre xefs renderitzats amb la seva pròpia identitat de Chessground; l’exemple d4–d6 captura un mariner amb el xef i conserva la icona/animació. Editor inclou les set peces. Català/castellà/anglès i les tres paletes verificats.
- Barra negativa: −8,86 amb 7,52773% de blanc abans i després de girar. Barra positiva: +9,50 amb 93,0307% abans i després de girar. Mateix color blanc. Dades reals a `v5-bar-negative.json` i `v5-bar-positive.json`.
- En cada signe, 32 lectures DOM durant una jugada i reinici del Worker. Es detecta espera real de càlcul amb la valoració anterior conservada, seguida de valoracions noves: cap lectura torna a zero/50%. La posició avança i l’anàlisi contínua es reprèn. No és una prova de FPS ni de temps absolut de càrrega.
- Partida local: c2c3 captura el capità negre; desapareix i la partida continua amb Torn de Negres. Un vaixell d’a7 arriba a a8 amb capità propi atacat per xef e8; la UI anuncia victòria blanca per arribada, sense ressaltat d’escac.
- Resurrecció de xef des del botó «Ressuscitar · f8 · Xef»: el Metge es transforma en xef, la variant avança i la cerca continua. La valoració forçada indica explícitament Arribada, amb PV de cinc mitges jugades validada.
- Mòbil 390×844: tauler editor 341×341, 64 caselles iguals, paletes de set peces de 303 px, amplada de document/contenidor 375 px; cap desbordament horitzontal. Override retirat després de la prova. Consola sense errors ni advertiments d’aplicació.

## Límits i lliurament

Firefox, Safari i mòbils físics no provats. Corpus finit i mesures d’aquesta màquina (Intel i7-13700KF, Linux). Les proves d’àudio comproven síntesi/cicle, no igualtat del timbre entre altaveus. L’informe 1.4.0 conserva les mesures antigues de latència; no s’atribueixen a aquesta versió.

Paquet immutable 1.5.0-20261013: estàtics, font complet, llicències, manifest, instal·lador, backup i rollback. Caddy específic de Pirescacs coincideix amb la plantilla actual; les capçaleres HTTPS públiques passen a través de Cloudflare. No cal canviar DNS. La comprovació pública després de l’activació s’ha de registrar separadament.
