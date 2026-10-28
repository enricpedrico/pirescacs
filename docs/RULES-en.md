# Pirachess v5 rules

A familiar board. New rules. Sail either of your two ships to the far shore: this is the only way to win.

## Starting position

| | White | Black |
|---|---|---|
| Captain | e1 | d8 |
| Ship | a2, g2 | b7, h7 |
| Chef | a1, h1 | a8, h8 |
| Musician | c1, f1 | c8, f8 |
| Carpenter | d1 | e8 |
| Doctor | b1, g1 | b8, g8 |
| Marine | b2, c2, d2, e2, f2, h2 | a7, c7, d7, e7, f7, g7 |

## Captain

Moves and captures like a queen. Can be captured and is not royal: there is no check or checkmate. Capturing it does not end the game. No castling.

## Ship

Moves one square towards the opponent. Swaps with a friendly piece; an enemy piece blocks it. Cannot capture or be captured.

## Chef

Moves and captures any distance along ranks or files, like a rook. Cannot jump over pieces or capture ships. No castling.

## Musician

Moves any distance diagonally, like a bishop. Cannot jump over pieces.

## Carpenter

Leaps to the perimeter two squares away in any direction, including backwards: up to 16 destinations. Jumps over intervening pieces and captures only where it lands. Cannot capture ships.

## Doctor

Moves one square in all eight directions, like a king, but is not royal. When the opponent captures a friendly piece within four squares of the doctor, only on the immediately following turn you may sacrifice it and revive that piece on its square. This counts as one move. Captains cannot be revived.

## Marine

Moves like a pawn and captures diagonally. Double step only from rank 2/7 if never displaced. En passant is available only on the turn after the opponent’s double step.

## The marine’s return

On reaching the last rank, must return to an empty square in its own half: ranks 1–4 for White, 5–8 for Black. Without a valid return square the move is illegal. The double-step right is never restored.

Draw by stalemate, threefold repetition or 100 plies without a capture, marine move or ship advance. Local players may agree a draw. No insufficient-material draw.

FEN: `cmbknbmc/prpppppr/8/8/8/8/RPPPPPRP/CMBNKBMC w - - 0 1`.
