# Informe de verificació · Pirescacs web 1.3.0

Data: 08-10-2026. Motor 1.2.0 i reglament v3 sense canvis. La versió anterior 1.2.1 és activa al servidor, verificada per SSH; 1.3.0 afegeix so i personalització.

## Proves automàtiques

- `npm run build`: TypeScript i Vite sense errors. Les peces i l’àudio se serveixen localment; no hi ha nous serveis ni dependències.
- `npm run test:preferences`: preferències acotades i tipades, versió desconeguda, JSON corrupte, volum no finit, valors negatius/excessius, enumeracions desconegudes, persistència i fallada d’emmagatzematge. Les paletes mantenen les icones antigues quan s’usen regles v1.
- Mateixa prova: classificació de moviments normals, captures, intercanvis i retorns; 24 combinacions de so amb mostres finites i deterministes, pic inferior a 0,85, inici/final zero i cua suau. Els conjunts i captures/moviments són diferents. Mètriques a `tests/personalization/audio-metrics.json`.
- Cicle d’àudio amb AudioContext controlat en proves: no sona abans d’activar-lo; es reutilitzen buffers; silenci immediat atura les fonts, volum zero, avisos opcionals, historial silenciós, suspensió/recuperació, desbloqueig rebutjat temporalment i segon intent, neteja i navegador sense àudio.
- `npm run test:storage`: serialització de partides i variants, anotacions i anàlisi, v1/v2/v3, posicions personalitzades, drets de mariners i IndexedDB no disponible. Sense regressions.
- Tots els SVG es poden parsejar. Hi ha 14 icones d’ivori/tinta i 14 de bronze, incloent les variants antigues.

## Verificació al navegador

Chromium IAB en escriptori i viewport 390 × 844. La instrumentació de desenvolupament només compta fonts d’àudio efectivament iniciades; no escolta micròfon ni envia dades.

- Diàleg Personalitzar accessible des de la capçalera. Els quatre botons de mostra inicien quatre sons i deixen l’últim esdeveniment en retorn. L’AudioContext informa «So a punt» després del gest.
- Tauler Mar, peces Ivori i tinta, mida compacta, animacions desactivades i accent blau es conserven després de recarregar. Mida compacta observada: 490 px. Les imatges reals del tauler apunten a la paleta triada.
- Coordenades: desactivar-les elimina els elements `coords`; tornar als valors inicials les recupera. S’ha corregit l’actualització en viu de Chessground amb reconstrucció de la seva capa de coordenades.
- Nova partida local: un so d’inici. c2–c4 amb teclat produeix exactament un so de moviment quan la posició és confirmada. Retrocedir a 0/1 manté el recompte de sons quan el so d’historial està desactivat.
- Anàlisi contínua: el motor acumula profunditat/nodes/temps sense incrementar els sons. El so continua silenciós durant els càlculs, encara que estigui activat.
- Posició editada `5r2/3P3k/8/8/8/8/8/K1R5 w - - 0 1 v:0`: d7–d8 mostra 30 retorns vàlids, pausa l’anàlisi i no sona encara. Escollir c3 confirma d7–d8@c3, produeix exactament un so de retorn, elimina els controls pendents i reprèn l’anàlisi contínua.
- Nova partida contra bot Inicial amb jugador negre: es mostra l’avís de nova partida i «El capità està pensant…». La resposta blanca produeix un so de moviment i el cursor avança a 1/1. Amb so d’historial activat, una pulsació d’anterior produeix un únic so de navegació.
- Volum zero: les quatre mostres es desactiven i el panell indica silenci. Restablir recupera 45%, Vidre suau i els valors visuals inicials.
- Mode concentració amaga la introducció i el fons; el joc i els controls continuen disponibles. La mida mòbil no té desbordament horitzontal (amplada de document i contingut: 375 px en viewport de 390 px amb barra de desplaçament).
- Teclat: Tab des de l’últim control del diàleg torna al primer; Escape tanca i retorna el focus a Personalitzar. Les pestanyes són accessibles amb fletxes. La vista mòbil conserva Fet accessible en un peu fix dins del diàleg.
- Català, castellà i anglès verificats en els nous controls, opcions i mostres. Cap error ni advertiment a la consola durant les comprovacions.

## Límits

No s’han provat Safari, Firefox ni mòbils físics. La prova amb AudioContext controlat verifica el cicle i els buffers; la prova de Chromium confirma l’inici de les fonts, però no certifica un timbre idèntic entre altaveus. Els sons són una síntesi original de l’estil demanat, amb comparació directa disponible al panell. Les regles, WASM i força es mantenen sense canvis respecte als informes `TEST-REPORT-1.2.0.md` i `TEST-REPORT-1.2.1.md`; no s’ha repetit l’autojoc del motor.

## Desplegament

Paquet web 1.3.0-20261008 amb font corresponent complet, manifest SHA-256, instal·lador i rollback. L’activació al servidor requereix sudo; les comprovacions públiques després d’activar-lo són a `DEPLOYMENT.md`.
