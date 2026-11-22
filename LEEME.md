# Cuaderno de Gimnasio

App web instalable (PWA) para apuntar entrenos de gimnasio, calle y casa.

## Archivos
- `index.html`: pantallas y estilos
- `app.js`: lógica (entreno, rutinas, progreso, copias de seguridad)
- `exercises.js`: base de datos de ejercicios. Para añadir uno: `['Nombre', 'Grupo', 'Material', 'modo']`
- `sw.js` + `manifest.webmanifest` + iconos: instalación en el móvil y funcionamiento sin conexión

## Dónde se guardan los datos
En el propio móvil (almacenamiento del navegador, clave `cuadernoGym.v1`).
Si se borran los datos del navegador o se desinstala la app, se pierden. Por eso hay copias:
- **Exportar copia**: archivo `.json` que se puede mandar a Drive, WhatsApp, correo…
- **Google Drive** (opcional): guarda `cuaderno-gym-copia.json` en tu Drive, a mano o al terminar cada entreno.

## Probar en el PC
```
python -m http.server 8097
```
y abrir http://localhost:8097

## Instalar en el móvil
Tiene que estar servida por HTTPS (por ejemplo GitHub Pages). Abrir la dirección en Chrome →
menú ⋮ → «Instalar aplicación» / «Añadir a pantalla de inicio».

## Google Drive
Pasos en Ajustes → Google Drive → «Configurar conexión con Google».
El origen autorizado del ID de cliente OAuth debe ser exactamente la dirección donde está publicada la app
(por ejemplo `https://usuario.github.io`).
