# Informe de verificació · Pirescacs 1.2.0

Data: 08-10-2026. Reglament actual: **v3**. Dispositiu de referència: Intel Core i7-13700KF, Ubuntu, Chromium IAB. El servidor només serveix els fitxers.

## Canvis i compatibilitat

- Posició inicial v3: vaixells g2/b7, capitans e1/d8, set mariners a files 2/7; músics c1/f1/c8/f8 i fusters b1/d1/e8/g8. FEN: `2bknbn1/prpppppp/8/8/8/8/PPPPPPRP/1NBNKB2 w - - 0 1`.
- La variant per defecte del C++, els Workers, l’editor i el reglament en tres idiomes coincideixen. Els JSON v1/v2 sense `startFen` conserven la posició inicial antiga; no se’ls aplica la nova implícitament.
- L’editor té vuit files i columnes iguals; les imatges de peces no determinen la mida de les caselles.
- Nova partida mostra un avís visible amb mode/bàndol/nivell i plega les opcions. Porta l’avís a la vista, també si l’usuari era més avall a la pàgina. Aquestes es poden tornar a obrir amb un botó accessible.
- En un retorn manual durant l’anàlisi es cancel·la la cerca sense esborrar la tria pendent. La jugada es completa de manera atòmica, preserva l’original i reprèn l’anàlisi contínua. S’hi afegeix confirmació/cancel·lació amb teclat.

## Proves automàtiques

- **13 grups passen per a v3, v2 i v1**, amb **560 posicions per variant** contrastades amb el generador independent. Inclouen salts, intercanvis, retorns, drets, repeticions, validació d’arrels, aplicar/reproduir i perft a profunditat 2. La nova posició es comprova peça per peça, amb simetria i drets individuals exactes.
- Build nativa amb assertions; `stockfish bench` completat: 6.414.892 nodes. Regresió d’escacs a profunditat 4: **197281** nodes. `stockfish check pirescacs.ini` correcte. `variants.ini` completa amb els avisos esperats de variants de tauler gran excloses de la build 8×8.
- **Paritat natiu/WASM single/WASM multi (dos fils)**: 12 fixtures per build, cobrint els tres reglaments. Coincideixen FEN, jugades i resultats; també es comproven rebuig/recuperació d’arrel invàlida i cerca real. P95 de resposta del nucli: 0,089 ms single i 0,172 ms multi (100 mostres per build, sense incloure càrrega).
- Proves de serialització: regles v1/v2/v3, FEN editat, comptadors, drets, variants, anàlisis i anotacions; compatibilitat de posicions inicials antigues, sanejament i emmagatzematge no disponible. Compilació TypeScript/Vite correcta.

Els canvis de motor d’aquesta versió afecten només la posició inicial i la selecció de variant antiga. La valoració, cerca i legalitat v2 continuen igual. Les dades tàctiques i d’autojoc v2 es conserven als seus fitxers originals; l’informe anterior és `LEGACY-v2-TEST-REPORT.md`. **No són mesures d’autojoc des de la nova posició v3**, ni una estimació d’Elo.

## Verificació al navegador

En Chromium de producció: posició inicial exacta, avís de nova partida i opcions plegades; editor amb 64 caselles de 76,75 × 76,75 px a l’amplada d’escriptori provada, tant ple com buit o amb una peça i girat. Retorn d7-d8-b2 en anàlisi contínua: 30 destinacions disponibles, torn conservat durant la tria, variant completada i cerca represa. També s’han provat cancel·lació amb Esc, confirmació amb fletxes/Retorn i retorn negre e2-e1-e7 amb el tauler girat. A 390 × 844, les caselles de l’editor mesuren 40,625 × 40,625 px sense desbordament horitzontal. S’ha importat una partida v2 amb quatre jugades i arrel implícita: manté capità c2 i vaixell g1 en tornar al principi. Nova partida des d’aquesta anàlisi passa a v3; el bot jugant amb blanques inicia la partida i cedeix el torn al jugador amb negres. L’inici és visible i les opcions queden plegades.

## Desplegament i límits

Firefox, Safari i dispositius mòbils físics no estan disponibles en aquest entorn. La prova responsive a Chromium no representa una prova en aquests navegadors. Al servidor, la release activa comprovada per SSH és **1.1.0-20261008**. S’ha preparat el paquet 1.2.0 amb instal·lador, checksums, backup i rollback. L’activació requereix executar l’instal·lador a la terminal del servidor perquè sudo demana contrasenya.
