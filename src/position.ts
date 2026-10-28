// Serialization only. The C++ Worker validates edited positions and all legal moves.
export type Pieces = Record<string, string>;
export function normalizeFen(value: unknown): string {
  if (typeof value !== 'string' || value.length > 512) throw new Error('Invalid FEN');
  const f = value.trim().split(/\s+/);
  if (f.length < 6 || f.length > 8 || !/^[wb]$/.test(f[1]) || f[2] !== '-' || !/^(-|[a-h][36])$/.test(f[3]) ||
      !/^\d{1,6}$/.test(f[4]) || !/^[1-9]\d{0,5}$/.test(f[5])) throw new Error('Invalid FEN');
  const extra = f.slice(6);
  if (extra.some((s) => !/^v:[0-9a-fA-F]{1,16}$/.test(s) && !/^r:[PNBMCpnbmc]@[a-h][1-8]$/.test(s)) ||
      new Set(extra.map((s) => s.slice(0, 2))).size !== extra.length ||
      extra.some((s) => s.startsWith('r:') && (s[2] === s[2].toUpperCase()) !== (f[1] === 'w'))) throw new Error('Invalid FEN');
  const rows = f[0].split('/');
  if (rows.length !== 8 || rows.some((r) => !/^[1-8PNBRKMCpnbrkmc]+$/.test(r) ||
      [...r].reduce((n, c) => n + (/[1-8]/.test(c) ? Number(c) : 1), 0) !== 8)) throw new Error('Invalid board');
  return f.join(' ');
}
export function readPosition(fen: string) {
  const f = normalizeFen(fen).split(' '), pieces: Pieces = {};
  f[0].split('/').forEach((row, r) => {
    let x = 0;
    for (const c of row) {
      if (/\d/.test(c)) x += Number(c);
      else { pieces[String.fromCharCode(97 + x++) + (8 - r)] = c; }
    }
  });
  const mask = f.slice(6).find((s) => s.startsWith('v:'));
  let virgin = mask ? BigInt('0x' + mask.slice(2)) : 0n;
  if (!mask) for (const [sq, p] of Object.entries(pieces)) {
    if (p.toLowerCase() === 'p') virgin |= squareBit(sq);
  }
  return { pieces, turn: f[1] as 'w' | 'b', virgin, clock: Number(f[4]), full: Number(f[5]), ep: f[3], revival: f.slice(6).find((s) => s.startsWith('r:')) };
}
export function squareBit(sq: string) { return 1n << BigInt((Number(sq[1]) - 1) * 8 + sq.charCodeAt(0) - 97); }
export function writePosition(pieces: Pieces, turn: 'w' | 'b', virgin = 0n, clock = 0, full = 1, ep = '-', revival?: string) {
  const rows: string[] = [];
  let mask = 0n;
  for (let y = 8; y >= 1; y--) {
    let row = '', empty = 0;
    for (let x = 0; x < 8; x++) {
      const sq = String.fromCharCode(97 + x) + y, p = pieces[sq];
      if (p) {
        if (empty) row += empty;
        row += p; empty = 0;
        if (p.toLowerCase() === 'p' && (virgin & squareBit(sq))) mask |= squareBit(sq);
      } else empty++;
    }
    if (empty) row += empty;
    rows.push(row);
  }
  return rows.join('/') + ` ${turn} - ${ep} ${clock} ${full} v:${mask.toString(16)}` + (revival ? ' ' + revival : '');
}
