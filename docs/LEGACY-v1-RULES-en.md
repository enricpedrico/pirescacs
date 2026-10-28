# Pirachess v1 rules

A familiar board. New rules. Sail your ship to the far shore or checkmate the opposing captain.

The captain may cross attacked squares; only its destination must be safe. White increases the rank and Black decreases it. a1 is dark and White moves first.

| | White | Black |
|---|---|---|
| Captain | c2 | f7 |
| Ship | g1 | b8 |
| Carpenter | c1, f1 | c8, f8 |
| Musician | b1, d1 | e8, g8 |
| Marine | a2, b2, c3, d2, e2, f2, h2 | a7, c7, d7, e7, f6, g7, h7 |

## Captain

Moves and captures like a queen. Cannot end in check or be captured. No castling.

## Ship

Moves one square towards the opponent. Swaps with a friendly piece; an enemy piece blocks it. Cannot capture or be captured.

## Carpenter

Moves any distance diagonally, like a bishop. Cannot jump over pieces.

## Musician

Leaps to the perimeter two squares away, without moving backwards. Nine possible destinations. Captures only at the destination.

## Marine

Moves like a pawn and captures diagonally. Double step only from rank 2/7 if never displaced. No en passant.

## The marine’s return

On reaching the last rank, must return to an empty square in its own half: ranks 1–4 for White, 5–8 for Black. The final position cannot give check or leave its own captain in check. Without a valid return square the move is illegal. The double-step right is never restored.

Draw by stalemate, threefold repetition or 100 plies without a capture, marine move or ship advance. Local players may agree a draw. No insufficient-material draw.

Win by legal ship arrival on rank 8/1, checkmate or resignation. Arrival cannot leave the own captain in check. A win takes precedence over draws. Repetition compares pieces, turn and double-step rights, including positions before marine returns.

From d4, a white musician may leap to b4, f4, b5, f5, b6, c6, d6, e6 and f6. Intermediate pieces are ignored. No piece may capture a ship.
