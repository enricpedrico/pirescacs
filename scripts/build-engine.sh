#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../engine/src"
mode="${1:-single}"
[[ "$mode" == single || "$mode" == multi ]] || { echo "Usage: $0 single|multi" >&2; exit 1; }
export SOURCE_DATE_EPOCH="${SOURCE_DATE_EPOCH:-1791417600}"
common=(-O3 -std=c++17 -DNDEBUG -DNNUE_EMBEDDING_OFF -DIS_64BIT -s MODULARIZE=1 -s EXPORT_NAME=Stockfish -s ENVIRONMENT=web,worker,node -s ASYNCIFY=1 -s 'ASYNCIFY_IMPORTS=["emscripten_utils_getline_impl"]' -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=134217728 -s MAXIMUM_MEMORY=536870912 -s STACK_SIZE=8388608 -s EXPORTED_RUNTIME_METHODS=FS -s ALLOW_UNIMPLEMENTED_SYSCALLS=1)
sources=(benchmark.cpp bitbase.cpp bitboard.cpp endgame.cpp evaluate.cpp main.cpp material.cpp misc.cpp movegen.cpp movepick.cpp pawns.cpp position.cpp psqt.cpp search.cpp thread.cpp timeman.cpp tt.cpp uci.cpp ucioption.cpp tune.cpp syzygy/tbprobe.cpp nnue/evaluate_nnue.cpp nnue/features/half_ka_v2.cpp partner.cpp parser.cpp piece.cpp variant.cpp xboard.cpp nnue/features/half_ka_v2_variants.cpp)
if [[ "$mode" == single ]]; then
  common+=(-DPIR_SINGLE --pre-js emscripten/pir-single.js)
else
  common+=(-pthread -s PROXY_TO_PTHREAD=1 --pre-js emscripten/preamble.js)
fi
em++ "${common[@]}" "${sources[@]}" -o "../../public/engine/pirescacs-$mode.js"
if [[ "$mode" != single ]]; then
  python3 - <<'PATCH'
from pathlib import Path
p=Path('../../public/engine/pirescacs-multi.js')
s=p.read_text()
needle='var cmd=msgData.cmd;if(cmd==="load")'
assert needle in s, 'Emscripten pthread bootstrap changed; revalidate the custom UCI queue bridge'
p.write_text(s.replace(needle, 'var cmd=msgData.cmd;if(cmd==="custom"){Module["onCustomMessage"](msgData.userData)}else if(cmd==="load")', 1))
PATCH
fi
