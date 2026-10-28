#!/usr/bin/env bash
set -euo pipefail
[[ $EUID == 0 ]] || { echo 'Cal sudo.'; exit 1; }
backup="${1:?Indiqueu el directori de còpia de seguretat}"
app=/srv/apps/pirescacs
case "$backup" in "$app"/backups/*) ;; *) echo 'Directori de rollback invàlid'; exit 1;; esac
config=/etc/caddy/Caddyfile.d/pirescacs.caddy
if [[ -f "$backup/no-config" ]]; then rm -f "$config"; else install -m 644 "$backup/pirescacs.caddy" "$config"; fi
if [[ -s "$backup/previous-current" ]]; then
    previous="$(cat "$backup/previous-current")"
    [[ "$previous" == "$app"/releases/* && -d "$previous" ]] || { echo 'Versió anterior invàlida'; exit 1; }
    ln -s "$previous" "$app/current.rollback"
    mv -Tf "$app/current.rollback" "$app/current"
else
    rm -f "$app/current"
fi
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
systemctl reload caddy
echo "Recuperada la configuració de $backup. Es conserven les versions instal·lades."
