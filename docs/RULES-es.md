# Reglamento Pirajedrez v5

Un tablero conocido. Unas reglas nuevas. Lleva cualquiera de tus dos barcos al otro lado: es la única forma de ganar.

## Posición inicial

| | Blancas | Negras |
|---|---|---|
| Capitán | e1 | d8 |
| Barco | a2, g2 | b7, h7 |
| Chef | a1, h1 | a8, h8 |
| Músico | c1, f1 | c8, f8 |
| Carpintero | d1 | e8 |
| Médico | b1, g1 | b8, g8 |
| Marinero | b2, c2, d2, e2, f2, h2 | a7, c7, d7, e7, f7, g7 |

## Capitán

Mueve y captura como una reina. Se puede capturar y no es real: no hay jaque ni mate. Capturarlo no termina la partida. No hay enroque.

## Barco

Avanza una casilla hacia el rival. Intercambia sitio con una pieza propia; una rival lo bloquea. No captura y es invulnerable.

## Chef

Mueve y captura en línea recta horizontal o vertical cualquier distancia, como una torre. No salta piezas ni captura barcos. No hay enroque.

## Músico

Se mueve en diagonal cualquier distancia, como un alfil. Las piezas intermedias lo bloquean.

## Carpintero

Salta al perímetro a dos casillas en cualquier dirección, también hacia atrás: hasta 16 destinos. Ignora piezas intermedias y captura solo donde aterriza. No puede capturar barcos.

## Médico

Mueve una casilla en las ocho direcciones, como un rey, pero no es real. Si el rival captura una pieza propia a un máximo de cuatro casillas del médico, solo en el turno inmediatamente siguiente puedes sacrificarlo y resucitar esa pieza en su casilla. Cuenta como una jugada. No puede resucitar al capitán.

## Marinero

Avanza como un peón y captura en diagonal. Doble paso solo desde fila 2/7 y si nunca ha sido desplazado. Puede capturar al paso solo en el turno posterior al doble paso rival.

## El retorno del marinero

Al llegar a la última fila, vuelve obligatoriamente a una casilla vacía de su mitad: filas 1–4 para blancas, 5–8 para negras. Sin retorno válido, la jugada es ilegal. Nunca recupera el doble paso.

Tablas por ahogado, tercera repetición o 100 medias jugadas sin captura, movimiento de marinero ni avance del barco. También por acuerdo en local. Sin tablas por material insuficiente.

FEN: `cmbknbmc/prpppppr/8/8/8/8/RPPPPPRP/CMBNKBMC w - - 0 1`.
