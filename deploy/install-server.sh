#!/usr/bin/env bash
# Run on pedrico server with sudo. No credentials are stored in this bundle.
set -euo pipefail
[[ $EUID == 0 ]] || { echo 'Executeu aquest script amb sudo.' >&2; exit 1; }
stage="$(cd "$(dirname "$0")" && pwd)"
version="${1:-1.5.0-20261013}"
[[ "$version" =~ ^[a-zA-Z0-9._-]+$ ]] || exit 1
app=/srv/apps/pirescacs
config=/etc/caddy/Caddyfile.d/pirescacs.caddy
release="$app/releases/$version"
backup="$app/backups/$(date -u +%Y%m%dT%H%M%SZ)"
[[ -f "$stage/dist/index.html" && -f "$stage/dist/engine/pirescacs-single.wasm" ]] || { echo 'Falten els fitxers compilats.'; exit 1; }
(cd "$stage" && sha256sum -c SHA256SUMS)
grep -q 'import Caddyfile.d/\*.caddy' /etc/caddy/Caddyfile
[[ ! -e "$release" ]] || { echo "La versió ja existeix: $release"; exit 1; }
install -d -m 755 "$app/releases" "$backup" "$release"
if [[ -f "$config" ]]; then cp -a "$config" "$backup/pirescacs.caddy"; else touch "$backup/no-config"; fi
if [[ -L "$app/current" ]]; then readlink "$app/current" > "$backup/previous-current"; fi
cp -a "$stage/dist/." "$release/"
chown -R root:root "$release"
chmod -R a+rX "$release"
# Archives have reproducible dates; fresh release dates prevent unchanged size/date ETags across updates.
find "$release" -type f -exec touch -- {} +
cp "$stage/rollback-server.sh" "$backup/rollback-server.sh"
cp "$stage/install-server.sh" "$backup/install-server.sh"
existing_statuses() {
    for host in pedrico.cat www.pedrico.cat valorant.pedrico.cat amic.pedrico.cat viatge.pedrico.cat war.pedrico.cat 7a0.pedrico.cat botifarra.pedrico.cat lleidapeix.pedrico.cat drive.pedrico.cat; do
        status="$(curl --silent --max-time 8 --output /dev/null --write-out '%{http_code}' --resolve "$host:443:127.0.0.1" "https://$host/" || true)"
        printf '%s %s\n' "$host" "$status"
    done
}
existing_statuses > "$backup/existing-before.txt"
rollback() {
    trap - ERR
    echo "Instal·lació fallida. Recuperant $backup" >&2
    bash "$backup/rollback-server.sh" "$backup" || true
}
trap rollback ERR
install -m 644 "$stage/pirescacs.caddy" "$config"
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
ln -s "$release" "$app/current.next"
mv -Tf "$app/current.next" "$app/current"
systemctl reload caddy
# TLS issuance may take time. Verify the real certificate; never bypass TLS validation.
ready=0
echo "Esperant el certificat HTTPS de pirescacs.pedrico.cat…"
for attempt in {1..60}; do
    if curl --silent --fail --max-time 5 --resolve pirescacs.pedrico.cat:443:127.0.0.1 https://pirescacs.pedrico.cat/ -o /dev/null; then ready=1; break; fi
    sleep 2
done
[[ $ready == 1 ]]
curl --silent --fail --max-time 10 --resolve pirescacs.pedrico.cat:443:127.0.0.1 -I https://pirescacs.pedrico.cat/engine/pirescacs-single.wasm > "$backup/verification-headers.txt"
grep -qi 'content-type: application/wasm' "$backup/verification-headers.txt"
grep -qi 'cross-origin-opener-policy: same-origin' "$backup/verification-headers.txt"
grep -qi 'cross-origin-embedder-policy: require-corp' "$backup/verification-headers.txt"
existing_statuses > "$backup/existing-after.txt"
if ! diff -u "$backup/existing-before.txt" "$backup/existing-after.txt"; then echo "Reviseu els canvis de resposta de les altres webs indicats a dalt." >&2; fi
trap - ERR
echo "Publicat: https://pirescacs.pedrico.cat · $version"
echo "Rollback: sudo bash $backup/rollback-server.sh $backup"
