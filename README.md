# Pirescacs

Ajedrez de piratas con reglas propias y motor WebAssembly.

- Variante de ajedrez de piratas con barcos, médicos, resurrecciones y cinco versiones de reglas.
- Juego contra el motor, dos personas, motor contra motor, editor y análisis.
- Motor Fairy-Stockfish adaptado a WebAssembly; partidas y preferencias en IndexedDB.

## Estado del repositorio

Repositorio **público con código y recursos necesarios para reconstruir la aplicación. La base se ha contrastado con los archivos del servidor el 28 de octubre de 2026. No incluye el historial de despliegues ni datos persistentes.

## Desarrollo

Node.js 20.20 o superior y npm; las versiones exactas se fijan en `package-lock.json`.

```bash
npm ci
npm run dev
```

## Configuración

No requiere cuentas, claves API ni credenciales para ejecutarse. El almacenamiento de las partidas, cuando existe, es local al navegador.

## Estructura

`src/`: interfaz de usuario; `public/`: recursos estáticos; `tests/`: pruebas. `engine/`: código completo del motor C++; `third_party/`: avisos de terceros; `deploy/`: plantillas de publicación. Los binarios WASM necesarios están en `public/engine/`.

## Verificación

Las pruebas de reglas nativas requieren compilar previamente el motor; los comandos completos y las pruebas WASM se conservan en [la documentación original](README.original.md).

```bash
npm run test:storage
npm run test:preferences
npm run test:evaluation
npm run build
```

## Despliegue y datos

`npm run build` genera `dist/`, que se publica como web estática por HTTPS. No publiques el servidor de desarrollo. El modo de varios hilos requiere cabeceras COOP/COEP; consulta [DEPLOYMENT.md](docs/DEPLOYMENT.md). No se han incluido `.env`, tokens, contraseñas, sesiones, bases de datos, archivos subidos, biblioteca multimedia, cachés o copias de seguridad. Las copias de datos se gestionan aparte; subir el código no sustituye un respaldo. Antes de actualizar una instalación conserva sus datos y configuración. No uses `docker compose down -v` para una actualización normal.

## Licencia

GPL-3.0-or-later. Se conserva el código correspondiente del motor y las licencias y atribuciones de Chessground y otros terceros: [LICENSE](LICENSE), [THIRD-PARTY.md](THIRD-PARTY.md) y [UPSTREAM.txt](UPSTREAM.txt).

