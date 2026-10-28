# Seguridad

Revisión de publicación del 28 de octubre de 2026: importación/exportación JSON y FEN, renderizado de anotaciones, almacenamiento IndexedDB, mensajes a Workers, cabeceras de despliegue y dependencias del frontend. La importación tiene un límite de 5 MiB; se reconstruyen campos permitidos, se validan movimientos y se eliminan anotaciones SVG/HTML no confiables. El motor se ejecuta en Workers WebAssembly; no hay API de servidor, cuentas ni credenciales. npm audit devuelve cero avisos. Pasan las pruebas de almacenamiento/importación, preferencias y evaluación, y la compilación de producción. Se conserva el código correspondiente del motor y las licencias originales. No se ha realizado una nueva auditoría completa del C++ de Fairy-Stockfish ni una campaña de fuzzing del motor.

Los archivos de publicación se han examinado con Gitleaks 8.30.1 con salida redactada: no se detectaron credenciales en este proyecto. Se excluyen datos personales, archivos de usuarios, configuraciones privadas y el historial de despliegues. El código del repositorio parte de una copia limpia de fuentes y no arrastra historiales Git antiguos.

## Comunicar un problema

Usa la opción **Security → Report a vulnerability** del repositorio si está disponible. Evita incluir claves, datos de usuarios o un exploit contra la instalación doméstica en un issue público.

## Alcance

Esta es una revisión concreta para publicar el código, basada en inspección y las herramientas y pruebas indicadas. No certifica ausencia de vulnerabilidades, no sustituye mantenimiento futuro y no valida la configuración completa del sistema operativo o del router de una instalación.
