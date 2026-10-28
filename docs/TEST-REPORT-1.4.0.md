# Informe de verificació · Pirescacs 1.4.0

Data: 09-10-2026. Web i motor `pirescacs-fairy-1.4.0`, reglament `pirescacs-v4`. Les partides existents conserven v1/v2/v3. La versió 1.4.0 ja és activa al servidor, verificada per SSH i HTTPS després que l’usuari executés l’instal·lador amb sudo.

## Canvis verificats

Metge amb passos de rei no reial, abast de quatre caselles i resurrecció immediata; captura al pas dels mariners; dos metges i un fuster per bàndol a la nova disposició inicial. Editor lliure, coordenades desactivades per defecte, motor contra motor amb nivells independents i pausa. Es mantenen so, personalització, anàlisi contínua, variants, retorns i revisió dins de Jugar.

## Nucli i compatibilitat

- `rules_v4_test.py`: 13 grups, generador independent de proves, 100 disposicions aleatòries i 485 instantànies. Inici de 28 peces, 22 jugades legals i perft profunditat 2 = 484.
- Metge: vuit passos, vores, captures, abast Chebyshev 4 en ambdós colors, diversos metges elegibles, caducitat en qualsevol altra jugada pròpia i sacrifici del metge. Es recuperen P/N/B/M, mai capità/vaixell. La resurrecció pot donar escac rival, preserva tots els capitans propis i no recupera doble pas. Una captura fora d’abast o sense metge supervivent no crea dret.
- Captura al pas: doble avanç amb dret individual, víctima i casella real, caducitat, escacs descoberts i comptadors. La resurrecció després de captura al pas usa la casella real de la víctima.
- Editor lliure: peces addicionals, diversos capitans, cap capità, mariners a última fila i escacs previs. Es valida el format; les jugades protegeixen tots els capitans propis presents.
- Aplicar/desfer, serialització, hash, repeticions i finals. FEN amb M/m, en passant i finestra `r:B@d4`; resurrecció `b2b2!`.
- Versions anteriors: 13 grups per v1/v2/v3 i 560 posicions independents per versió, amb historials contrastats. Arrels antigues preservades.
- Paritat exacta natiu/WASM d’un fil/WASM de dos fils en 485 instantànies v4 i 16 casos antics, més cerca legal. Les peticions directes Node mesuren el pont, no latència del navegador.
- `stockfish bench`: 5.843.604 nodes en 4.434 ms. `check pirescacs.ini`: sense diagnòstics; M/m inclòs a la taula de representació.
- Perft upstream: 120 casos compatibles del build 8×8, tots correctes, 18,33 s. El harness Python reprodueix els casos originals perquè no hi ha `expect`. Les 25 variants no compilades es llisten a `v4-upstream-perft-results.json`; `check variants.ini` també informa d’aquestes opcions de taulers grans. No s’afirma que aquestes variants hagin passat.

## Cerca i força

- Corpus separat, amb solucions demostrades pel generador independent fins a cinc mitges jugades: 20/20 en natiu i 20/20 en cada WASM, màxim 10 s per cas. Inclou arribades, intercanvis, retorns, bloquejos, defenses i un mat que només resol la resurrecció del Metge; casos amb colors invertits. Dades a `v4-tactics-results.json` i `v4-wasm-tactics-*-results.json`.
- 200 partides aparellades, 479,74 s, cap jugada il·legal. Pressupostos 256/1.024/4.096/16.384 nodes, habilitat 0/5/20/20. El nivell superior obté 73,53%, 81,06% i 59,09% de puntuació en comparacions consecutives (68/66/66 partides). Límit de 160 mitges jugades comptat com a empat de prova. Resultats a `v4-selfplay-results.json`.
- No és una mesura d’Elo ni una equivalència dels temps de la interfície en qualsevol dispositiu. No s’usa NNUE d’escacs convencionals.

## Web, persistència i àudio

- `npm run build`: TypeScript/Vite correctes. Regles i cerca en Workers separats, sense cerca al fil de la interfície.
- `test:storage`: versions, arrels lliures, M/m, captura al pas, finestra de resurrecció, jugades `!`, variants, anotacions, anàlisi i nivells del mode automàtic; rebuig de format invàlid/SVG no fiable i IndexedDB no disponible.
- `test:preferences`: sanejament, persistència i fallades d’emmagatzematge. Migració v1→v2 desactiva coordenades preservant la resta; activació explícita en v2 persistida.
- Àudio: 24 combinacions PCM originals finites/deterministes, pics acotats, fades i diferències entre conjunts; autoplay bloquejat, reutilització, silenci immediat, volum zero, avisos, historial, recuperació i neteja. Resurrecció amb so de retorn, en passant amb so de captura. Mètriques a `tests/personalization/audio-metrics.json`.
- 48 SVG parsejables, inclosos sis Metges per a dos colors i tres paletes.
- Upstream fixat i Emscripten 3.1.73: dos builds consecutius de cada modalitat produeixen els mateixos quatre SHA-256. Manifest `tests/v4-verification/engine-SHA256SUMS`; font i patch complets inclosos.

## Navegador

Màquina de referència: Intel Core i7-13700KF, 24 nuclis lògics, Linux. Chromium IAB, escriptori i viewport 390×844; interaccions reals, sense injectar estat React ni partides a IndexedDB.

- Nova disposició V.4 i coordenades absents. Seleccionar Metge b1 mostra abast difuminat retallat al tauler en ambdues orientacions, vinculat a Mostrar destinacions legals.
- Editor amb 16 mariners blancs, dos negres i cap capità: carregat i jugat c3–c4 sense rebuig. En mòbil, 64 caselles de 40,625×40,625 px, tauler 341×341 px i cap desbordament horitzontal.
- Resurrecció b2b2! en anàlisi: botó amb peça/casella, substitució correcta del Metge, variant sense alterar l’original i cerca contínua represa. El motor també proposa resurreccions.
- Nou exemples interactius del reglament. En passant e5–d6 elimina d5. La posició d’exemple evita escac descobert mutu dels capitans.
- Retorn d7–d8 en anàlisi: 30 destinacions, cerca pausada; b2 confirma d7d8@b2 com una jugada i reprèn la cerca.
- Motor contra motor: Inicial blanc/Grumet negre, pausa a 37 jugades, reload conserva pausa; ← mostra 36/37 dins de Jugar. Reprendre retorna al present i acaba a 72 jugades amb arribada del vaixell negre.
- 50 moviments reals de teclat amb so: p95 32,865 ms de la intenció al primer frame amb posició confirmada; 51 sons (inici + 50 jugades). Mesura en desenvolupament, `v4-browser-performance.json`; no és FPS sostingut ni rendiment de mòbil físic.
- Català, castellà i anglès comprovats. Personalitzar conserva Vidre suau a 45%, mostres, cinc taulers, tres paletes, mida, animacions, accents i ajudes. Consola sense errors ni advertiments.

## Límits i publicació

Safari, Firefox i mòbils físics no provats. La síntesi és original; comptar fonts iniciades no certifica timbre igual entre altaveus. El corpus tàctic és finit. Anàlisis identificades per versió, sense barrejar càlculs antics.

Paquet 1.4.0-20261009 amb estàtics, font, llicències, manifest, backup i rollback. L’activació s’ha completat amb sudo de l’usuari. HTTPS, fitxers i les deu webs existents s’han comprovat després de publicar. `DEPLOYMENT.md` registra el backup i la recuperació. El paquet immutable conserva l’informe anterior a la publicació.

## Comprovació pública al navegador

Chromium IAB: bot amb resposta d1f3, revisió de la partida amb ← sense sortir de Jugar, anàlisi contínua amb un i dos fils, motor contra motor pausat a 59 mitges jugades, partida local amb c2c3 jugat per teclat, panell de so a punt i Metge amb abast difuminat. Coordenades ocultes i consola sense errors ni advertiments. S’han restaurat un fil, bàndol blanc i nivell Corsari, amb una nova partida preparada.
