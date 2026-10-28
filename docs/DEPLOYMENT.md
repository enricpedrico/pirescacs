# Desplegament a pedrico.cat

El 13-10-2026 s’ha reverificat per SSH la versió activa 1.4.0 a `/srv/apps/pirescacs/releases/1.4.0-20261009`. HTTPS públic respon 200 a través de Cloudflare, amb COOP/COEP/CORP i CSP. El bloc Caddy dedicat coincideix SHA-256 amb la plantilla del projecte; no cal canviar DNS ni les capçaleres. La 1.5.0 introdueix xefs, dos vaixells, victòria només per arribada, capità capturable i barra d’avaluació estable en girar/navegar. Conserva v1/v2/v3/v4 per a l’historial. L’activació necessita sudo al servidor; el paquet es prepara completament abans de demanar-ne l’execució.

## Instal·lació

El paquet de servidor desplega una versió estàtica sota `/srv/apps/pirescacs/releases/1.5.0-20261013` i enllaça `current`. Escriu únicament el bloc `/etc/caddy/Caddyfile.d/pirescacs.caddy`; no modifica els blocs de les altres webs.

```bash
ssh -i ~/.ssh/id_ed25519_pedrico enric@192.168.1.49
cd ~/pirescacs-deploy/1.5.0-20261013
sudo bash install-server.sh
```

El script comprova SHA-256, desa el bloc anterior i l’enllaç, valida tota la configuració Caddy abans de recarregar, espera el certificat i comprova HTTPS, MIME WASM, COOP i COEP. Si falla, restaura automàticament l’estat anterior. Cap validació TLS es desactiva.

Caddy serveix tots els recursos amb CSP, COOP/COEP/CORP, gzip/zstd i nosniff. Només `/assets/` (fitxers amb hash Vite) té caché immutable; index, Workers i WASM revaliden la caché per evitar mesclar versions. L’instal·lador actualitza les dates dels fitxers de cada release perquè els ETag de Caddy es renovin encara que dues compilacions tinguin la mateixa mida i dates reproduïbles. `worker-src blob:` permet els pthreads. `wasm-unsafe-eval` permet WebAssembly, i no s’habilita `unsafe-eval` JavaScript.

## Verificació pública després d’instal·lar

Obriu https://pirescacs.pedrico.cat i proveu local, bot, retorns, fletxes, reload, importació i anàlisi d’un i dos fils. Comproveu també pedrico.cat, war.pedrico.cat, botifarra.pedrico.cat i les altres webs existents. Les proves en localhost no substitueixen aquesta comprovació pública.

```bash
curl -I https://pirescacs.pedrico.cat/
curl -I https://pirescacs.pedrico.cat/engine/pirescacs-single.wasm
```

## Rollback

El script imprimeix la comanda exacta del backup creat:

```bash
sudo bash /srv/apps/pirescacs/backups/TIMESTAMP/rollback-server.sh /srv/apps/pirescacs/backups/TIMESTAMP
```

Això restaura el bloc i `current`; en una primera instal·lació retira només el bloc nou i l’enllaç. Es conserven les versions i els backups. També es pot activar una versió anterior amb un enllaç temporal i `mv -Tf`; no esborreu versions mentre es puguin necessitar per recuperar.

## Actualitzacions

Compileu fora del Celeron, creeu un nom de versió nou i un manifest SHA-256, i torneu a executar l’instal·lador amb aquest nom com a argument. No sobreescriviu una carpeta release existent. IndexedDB i format JSON estan versionats; abans d’un futur canvi incompatible s’ha de definir una migració.

