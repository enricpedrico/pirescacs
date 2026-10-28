# Pirachess v4 rules

A familiar board. New rules. Sail your ship to the far shore or checkmate the opposing captain.

The captain may cross attacked squares: only its destination must be safe. White increases the rank, Black decreases it; a1 is dark and White moves first.

| | White | Black |
|---|---|---|
| Captain | e1 | d8 |
| Ship | g2 | b7 |
| Musician | c1, f1 | c8, f8 |
| Carpenter | d1 | e8 |
| Doctor | b1, g1 | b8, g8 |
| Marine | a2, b2, c2, d2, e2, f2, h2 | a7, c7, d7, e7, f7, g7, h7 |

## Captain

Moves and captures like a queen. Cannot end in check or be captured. No castling.

## Ship

Moves one square towards the opponent. Swaps with a friendly piece; an enemy piece blocks it. Cannot capture or be captured.

## Musician

Moves any distance diagonally, like a bishop. Cannot jump over pieces.

## Carpenter

Leaps to the perimeter two squares away in any direction, including backwards: up to 16 destinations. Jumps over intervening pieces and captures only where it lands. Cannot capture ships.

## Marine

Moves like a pawn and captures diagonally. Double step only from rank 2/7 if never displaced. En passant is available only on the turn after the opponent’s double step.

## Doctor

Moves one square in all eight directions, like a king, but is not royal. When the opponent captures a friendly piece within four squares of the doctor, only on the immediately following turn you may sacrifice it and revive that piece on its square. This counts as one move. Captains cannot be revived; your own captain must remain safe.

The doctor’s range is a 9×9 square centred on it, clipped by board edges. It can revive any capturable piece except the captain, including another doctor. The doctor must survive the capture; if several doctors are in range, choose one. Ships are invulnerable. Revival may give check; marine return may not. For en passant, range is measured from the captured marine’s square. A revived marine never regains its double step.

## The marine’s return

On reaching the last rank, must return to an empty square in its own half: ranks 1–4 for White, 5–8 for Black. The final position cannot give check or leave its own captain in check. Without a valid return square the move is illegal. The double-step right is never restored.

Draw by stalemate, threefold repetition or 100 plies without a capture, marine move or ship advance. Local players may agree a draw. No insufficient-material draw.

Win by legally arriving with the ship on rank 8/1, checkmate or resignation. Victory takes precedence over draws. Repetition compares pieces, turn, double-step rights, en passant and revival opportunity, including after marine returns.
