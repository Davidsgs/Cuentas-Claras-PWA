<img src="public/logo.svg" width="80" align="right" alt="">

# Cuentas Claras PWA 💸

Cuentas Claras es una aplicación web progresiva (PWA) diseñada para simplificar la división de gastos en grupos, viajes o salidas con amigos. Olvídate de las hojas de cálculo complicadas; esta app te dice exactamente quién le debe a quién.

**En vivo:** https://davidsgs.github.io/Cuentas-Claras-PWA/

# ✨ Características Principales

* Gestión de Cuentas: Crea eventos separados (ej. "Viaje a la Playa", "Cena Viernes") con sus propias categorías e iconos.

* Participantes y Gastos: Añade personas y registra quién pagó qué en segundos. Toca un gasto del historial para editarlo.

* Gastos Personales: marca un gasto como personal y se le cobra 100% al beneficiario en vez de repartirse.

* Calculadora Inteligente: Algoritmo que simplifica las deudas para reducir el número de transacciones necesarias entre el grupo.

* Gestión de Deudas: Registra pagos parciales o totales ("Saldar deuda") y visualiza qué cuentas están completamente pagadas (✔ SALDADO).

* Exportación: resumen como texto (portapapeles / WhatsApp), imagen PNG o PDF A4.

* Carpetas y selección múltiple: mantén presionada una cuenta para entrar en modo selección, elige varias (o "Todas"), y bórralas de una o agrúpalas en una carpeta. Las carpetas se renombran, se abren para ver su contenido, y aceptan cuentas arrastrándolas encima o con "Mover a…". Borrar una carpeta nunca borra sus cuentas: vuelven a la lista principal.

* Temas: 5 de fábrica (Claro, Oscuro, Alto Contraste, Azul y Rojo) más los que crees. Cada tema define 7 colores (primario, secundario, fondo, tarjetas, texto, texto apagado y bordes) y todos se pueden aplicar, editar, borrar y restaurar de fábrica desde Configuración.

* Filtro por categoría: los chips de la pantalla principal filtran las cuentas. Se pueden marcar varias a la vez; "Todas" marca o desmarca todo. Las carpetas se filtran por contenido y muestran cuántas de sus cuentas pasan.

* Compartir una cuenta o una carpeta: genera un QR que el otro escanea con la cámara normal de su teléfono (no hace falta escanear desde la app). También se puede mandar como enlace o como archivo JSON. Los datos viajan dentro del `#` del enlace, así que nunca llegan al servidor. Es una copia: si después alguno edita, las copias divergen.

* Exportar e importar todo en JSON: el archivo lleva cuentas, carpetas, categorías y colores. Al importar, las cuentas del archivo entran agrupadas en una carpeta nueva y no se pisa nada de lo que ya había.

* Modo Oscuro: Interfaz moderna que respeta tu preferencia visual o la del sistema.

* Persistencia de Datos: Todo se guarda automáticamente en el navegador (Local Storage), por lo que no pierdes tus datos al cerrar la pestaña.

* Funciona sin conexión: service worker con precache; se actualiza sola cuando hay un despliegue nuevo.

# 🔢 Versionado

La versión sale de `package.json` y se usa en tres lugares: se muestra al pie de Configuración, viaja en `/version.json` (fuera del precache, siempre por red) y aparece en el aviso de actualización.

**Antes de cada deploy hay que subir el número en `package.json`.** Es la única palanca; el resto se acomoda solo.

Las actualizaciones ya no se aplican de golpe: cuando hay una versión nueva esperando, la app muestra una barra con qué versión viene y el usuario elige cuándo recargar.

# 🛠️ Tecnologías Usadas

* Astro: build estático, sin servidor. Toda la lógica sigue siendo JavaScript vanilla del lado del cliente.

* Tailwind CSS: compilado en el build (antes venía por CDN).

* Lucide Icons: sólo los 20 iconos que se usan, no el set completo.

* jsPDF + html2canvas: cargados bajo demanda, sólo al exportar.

* Local Storage: Almacenamiento de datos del lado del cliente.

# 🚀 Desarrollo

```bash
npm install
npm run dev      # http://localhost:4321/Cuentas-Claras-PWA/
npm run build    # genera dist/
npm run preview  # sirve dist/ como en producción
```

El service worker está desactivado en `dev`. Para probar el modo offline hay que usar `build` + `preview`.

# 📦 Despliegue

`.github/workflows/deploy.yml` compila y publica en GitHub Pages en cada push a `main`.

Requiere que en **Settings → Pages → Build and deployment → Source** esté seleccionado **GitHub Actions** (no "Deploy from a branch").

La ruta base `/Cuentas-Claras-PWA/` está en `astro.config.mjs`; si se renombra el repo hay que cambiarla ahí.

# 🎨 Logo

* Descarga o clona el repositorio.

* Abre el archivo index.html en cualquier navegador web moderno (Chrome, Safari, Edge).

```bash
node -e "const sharp=require('sharp');sharp('public/logo.svg',{density:600}).resize(512,512).png().toFile('out.png')"
```

# 📱 Instalación

Al ser una PWA, puedes "instalarla" en tu móvil (Android/iOS) usando la opción "Agregar a pantalla de inicio" de tu navegador para una experiencia de app nativa.
