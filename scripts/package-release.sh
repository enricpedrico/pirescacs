#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
version="${1:-1.5.0-20261013}"
[[ "$version" =~ ^[a-zA-Z0-9._-]+$ ]] || exit 1
export SOURCE_DATE_EPOCH="${SOURCE_DATE_EPOCH:-1791417600}"
task_work="$(cd ../.. && pwd)/work/package"
mkdir -p "$task_work"
stage="$(mktemp -d "$task_work/release.XXXXXX")"
trap 'rm -rf "$stage"' EXIT
# Complete corresponding source; omit dependencies, native objects and the archive itself.
tar --sort=name --mtime="@$SOURCE_DATE_EPOCH" --owner=0 --group=0 --numeric-owner \
    --exclude=.git --exclude='./node_modules' --exclude='./dist' --exclude='*.o' \
    --exclude='./engine/src/stockfish' --exclude='./engine/src/.depend' --exclude='*.tsbuildinfo' \
    --exclude='./tests/__pycache__' --exclude='./tests/.compiled' --exclude='./public/source.tar.gz' \
    -czf "$stage/source.tar.gz" .
cp "$stage/source.tar.gz" public/source.tar.gz
npm run build
cp -a dist "$stage/dist"
cp deploy/install-server.sh deploy/rollback-server.sh deploy/pirescacs.caddy "$stage/"
cp docs/DEPLOYMENT.md "$stage/DEPLOYMENT.md"
(cd "$stage" && find dist -type f -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS && sha256sum install-server.sh rollback-server.sh pirescacs.caddy >> SHA256SUMS)
(cd "$stage" && tar --sort=name --mtime="@$SOURCE_DATE_EPOCH" --owner=0 --group=0 --numeric-owner --exclude='./source.tar.gz' -czf "../../../outputs/pirescacs-release-$version.tar.gz" .)
echo "Paquet: ../pirescacs-release-$version.tar.gz"
