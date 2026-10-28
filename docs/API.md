# Interfície del nucli v5 · motor 1.5.0

La web envia peticions a `public/engine-worker.js`. El mateix C++ és l’autoritat per legalitat i cerca, en Workers diferents. No hi ha regles JavaScript publicades.

`Rules.load(moves, startFen?, rulesVersion?, validate?)` retorna una instantània amb `fen`, `turn`, `check`, `error`, `result`, `reason`, `legal` i, quan correspon, `revival:{piece,capturedAt,medics}`. `Search.run` accepta arrel, historial, variant explícita, temps, fils, memòria, habilitat i MultiPV; `time:0` usa cerca contínua. Cada petició té identificador i es cancel·la/reconstrueix el Worker quan cal.

## Reglament v5

La variant predeterminada és `pirescacs-v5`; `pirescacs` n’és un àlies. B = músic/alfil; N = fuster (NAD); M = metge (COMMONER/K); C = xef (CUSTOM_PIECE_2/R); K = capità no reial (CUSTOM_PIECE_3/Q). R continua sent un vaixell invulnerable. No hi ha KING reial en v5 ni enroc; el capità és capturable i el nucli informa `check:false`.

Dos vaixells a2/g2 i b7/h7, xefs a1/h1 i a8/h8. L’arribada de qualsevol dels dos vaixells a fila 8/1 és l’única victòria. Capturar el capità no acaba la partida i el Metge no el pot ressuscitar. Els retorns no tenen restriccions d’escac. Les taules per falta de jugades, repetició, 100 mitges jugades o acord es mantenen. La victòria d’arribada precedeix les taules. En un editor amb els dos colors ja arribats, el resultat és empat.

FEN inicial: `cmbknbmc/prpppppr/8/8/8/8/RPPPPPRP/CMBNKBMC w - - 0 1`.

Les variants v1/v2/v3/v4 continuen disponibles amb arrels i regles originals. Les partides antigues es seleccionen per `rulesVersion`; una arrel `startFen` explícita preval sempre. El format/geometria es validen abans de carregar; v4/v5 admeten disposicions arbitràries. V1/v2/v3 conserven la validació antiga, i v1/v2/v3/v4 protegeixen els capitans reials.

## Moviments compostos i estat

Retorn `a7a8@b2`, intercanvi `g2g3` amb tipus intern `PIR_SWAP`, resurrecció `b2b2!` amb tipus `PIR_REVIVE`. La interfície presenta només les destinacions que retorna el nucli.

El FEN conserva la casella en passant, `v:hex` per drets individuals i la finestra de resurrecció opcional, per exemple `r:C@d4` (xef capturat a d4). Màscares, torn, captures, comptadors i historial es conserven en aplicar/desfer. La captura al pas usa la casella real de la víctima per a l’abast del Metge. Qualsevol altra jugada consumeix la finestra.

## Persistència i anàlisi

JSON `format:'pirescacs'`, `formatVersion:1`, `rulesVersion:'pirescacs-v5'`. Inclou historial, arrel, variants, anotacions i anàlisis amb versió i pressupost. Importar reprodueix les línies amb C++. Les noves partides no admeten metadades manuals de victòria per rendició/acord; els empats per acord són vàlids. Les rendicions de v1/v2/v3/v4 es preserven.

Valoracions normalitzades des del punt de vista blanc. UCI representa la distància a una victòria forçada com `mate`; la web verifica la PV i mostra arribada per v5. Les anàlisis antigues mantenen la versió original. El valor retingut de la barra és només visual: no reutilitza una PV antiga com si fos legal a la posició nova. La proporció blanca no depèn de l’orientació i no torna a 50% mentre espera un resultat nou.

La partida real i el cursor d’historial continuen independents. Revisar no altera la línia jugada; la resposta del rival retorna al present. Motor contra motor té nivells per color, pausa/cancel·lació i recuperació pausada després de recarregar. La cerca es manté fora del fil principal.
