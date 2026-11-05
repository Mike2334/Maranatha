# 🎵 Maranatha - Ministerio de Alabanza

Aplicación Web Progresiva (PWA) diseñada para el Ministerio de Alabanza Maranatha, ideal para ensayos, Misas dominicales, conciertos, vigilias y retiros.

---

## 🌟 Características Principales

1. **📖 Cancionero con Acordes y Letras:**
   - Visualizador de acordes interactivo sobre el texto.
   - **Transpositor en tiempo real (+ / - semitonos):** Cambia de tono con un toque sin reescribir la canción.
   - **Auto-scroll regulable (1x a 5x):** Para tocar instrumentos sin tener que tocar la pantalla.
   - Selector de tamaño de fuente (A- / A+) para atriles y celulares.

2. **⛪ Setlists Especializados para Misas:**
   - Organizado según el orden litúrgico: *Entrada, Señor Ten Piedad, Gloria, Salmo, Aleluya / Aclamación, Ofertorio, Santo, Paz / Cordero, Comunión, Meditación, Salida*.
   - Permite crear múltiples Misas y asignar canciones a cada momento litúrgico.

3. **🎸 Setlists para Eventos / Retiros / Horas Santas:**
   - Lista libre y reordenable de alabanzas.
   - Indicaciones y notas de ensayo para cada tema.

4. **🔴 Modo Director "En Vivo" (Live Sync):**
   - El director o coordinador cambia de canción y a todos los músicos se les sincroniza la pantalla automáticamente.

5. **☁️ Integración con Google Drive para Audios:**
   - Almacena tus pistas, maquetas o grabaciones de ensayo en Google Drive sin pagar almacenamiento.
   - Pega el enlace de compartir de Google Drive y la app lo reproduce directamente con su reproductor integrado.

6. **📶 Modo Offline (Sin señal):**
   - Equipado con **Service Worker** y almacenamiento local (**PWA**).
   - Si van a una capilla o campo sin cobertura de internet, el cancionero y los setlists siguen funcionando al 100%.

---

## 🚀 Cómo Probarla en tu Computadora

1. Haz doble clic en el archivo `Iniciar-App.bat`.
2. Se abrirá automáticamente tu navegador en `http://localhost:8080`.

---

## 📱 Cómo Instalarla en Teléfonos (Android / iPhone)

1. Sube la carpeta a un hosting gratuito como **GitHub Pages**, **Vercel** o **Netlify**.
2. Abre el enlace en el navegador del teléfono:
   - **En Android (Chrome):** Toca los 3 puntos arriba a la derecha y selecciona **"Instalar aplicación"** o **"Agregar a pantalla principal"**.
   - **En iPhone (Safari):** Toca el botón Compartir (cuadrado con flecha hacia arriba) y selecciona **"Agregar a pantalla de inicio"**.
3. ¡Quedará con su ícono oficial de Maranatha como cualquier app de la tienda!

---

## 🎙️ Cómo Usar Google Drive para los Audios

1. Sube el archivo de audio (MP3 o M4A) a tu Google Drive.
2. Haz clic derecho sobre el archivo > **Compartir** > Cambia el acceso general a **"Cualquier persona que tenga el vínculo"**.
3. Copia el enlace y pégalo en la alabanza dentro de la app en el campo **"Enlace de Audio en Google Drive"**.
4. ¡Listo! Cualquier integrante podrá darle *Play* para recordar los tonos y el ritmo.
