// ==========================================
// MINISTERIO DE ALABANZA MARANATHA - APP CORE
// ==========================================

const CHORDS_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CHORDS_FLAT  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const LITURGICAL_PARTS = [
  { key: 'entrada', label: '1. Canto de Entrada', defaultCategory: 'Entrada' },
  { key: 'piedad', label: '2. Señor Ten Piedad', defaultCategory: 'Piedad' },
  { key: 'gloria', label: '3. Gloria', defaultCategory: 'Gloria' },
  { key: 'salmo', label: '4. Salmo Responsorial', defaultCategory: 'Salmo' },
  { key: 'aleluya', label: '5. Aclamación / Aleluya', defaultCategory: 'Aleluya / Aclamación' },
  { key: 'ofertorio', label: '6. Ofertorio', defaultCategory: 'Ofertorio' },
  { key: 'santo', label: '7. Santo', defaultCategory: 'Santo' },
  { key: 'cordero', label: '8. Cordero de Dios', defaultCategory: 'Paz / Cordero' },
  { key: 'comunion', label: '9. Comunión', defaultCategory: 'Comunión' },
  { key: 'meditacion', label: '10. Meditación / Adoración', defaultCategory: 'Meditación / Adoración' },
  { key: 'salida', label: '11. Canto de Salida', defaultCategory: 'Salida' }
];

// Estado global de la aplicación
// ==========================================
// CONFIGURACIÓN DE RED Y SINCRONIZACIÓN EN VIVO (MQTT WSS)
// ==========================================
const MQTT_CONFIG = {
  host: 'broker.hivemq.com',
  port: 8884,
  path: '/mqtt',
  topic: 'maranatha/live_mike2334',
  clientId: 'maranatha_' + Math.random().toString(36).substring(2, 9)
};

// Dispositivo local para identificar en la lista de conectados
function getDeviceName() {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const platform = /iPhone|iPad/i.test(navigator.userAgent) ? 'iPhone/iPad' : (/Android/i.test(navigator.userAgent) ? 'Android' : 'PC/Laptop');
  let savedName = localStorage.getItem('maranatha_device_name');
  if (!savedName) {
    savedName = `${platform} (${Math.floor(Math.random() * 900 + 100)})`;
    localStorage.setItem('maranatha_device_name', savedName);
  }
  return savedName;
}

// Estado global de la aplicación
const AppState = {
  activeTab: 'cancionero', // 'cancionero' | 'misas' | 'eventos' | 'director' | 'visor'
  cancioneroSection: 'misa', // 'misa' | 'evento' | 'todos'
  songs: [],
  massSetlists: [],
  eventSetlists: [],
  activeMassSetlist: null,
  activeEventSetlist: null,
  
  // Contexto de Navegación del Setlist activo
  currentSetlistContext: null, // { type: 'misa'|'evento', title: string, items: [...], currentIndex: number }
  
  // Visor actual
  currentSong: null,
  currentKeyOffset: 0,
  fontSize: 16,
  
  // Auto-scroll
  isAutoScrolling: false,
  autoScrollSpeed: 2, // 1 to 5
  autoScrollTimer: null,
  
  // Control de Roles: Solo 1 dispositivo debe ser el Director
  userRole: localStorage.getItem('maranatha_user_role') || 'musico', // 'musico' | 'director'
  directorPin: localStorage.getItem('maranatha_director_pin') || '1234',
  followDirector: localStorage.getItem('maranatha_follow_director') !== 'false', // Seguir automáticamente
  
  // Modo Director / En Vivo
  directorType: 'misa', // 'misa' | 'evento'
  liveCurrentSongId: null,
  liveCurrentSlotLabel: '',
  liveContextType: 'misa', // 'misa' | 'evento'
  liveNextSong: null, // { songId, title, key, label }
  liveActiveNote: '', // Nota o indicación activa del director
  
  // Clientes y Músicos conectados en tiempo real
  connectedClients: {}, // { clientId: { name, role, lastSeen } }
  mqttClient: null,
  liveChannel: null,
  
  // Audio
  audioPlayer: null,
  isPlayingAudio: false
};
// ==========================================
// INICIALIZACIÓN Y PERSISTENCIA (LOCALSTORAGE)
// ==========================================
function initApp() {
  loadData();
  setupLiveChannel();
  setupServiceWorker();
  setupAudioElement();
  checkUrlParams();
  switchTab(AppState.activeTab);
}

function loadData() {
  const storedSongs = localStorage.getItem('maranatha_songs');
  if (storedSongs) {
    try {
      AppState.songs = JSON.parse(storedSongs);
      // Asegurar que si faltan las nuevas canciones de evento, se añadan
      INITIAL_SONGS.forEach(initSong => {
        if (!AppState.songs.some(s => s.id === initSong.id)) {
          AppState.songs.push(initSong);
        }
      });
      // Asegurar usageType en todas las canciones
      AppState.songs.forEach(s => {
        if (!s.usageType) {
          const isMisaCat = ['Entrada', 'Piedad', 'Gloria', 'Salmo', 'Aleluya / Aclamación', 'Ofertorio', 'Santo', 'Paz / Cordero', 'Comunión'].includes(s.category);
          s.usageType = isMisaCat ? 'misa' : 'evento';
        }
      });
      saveSongs();
    } catch (e) {
      console.error(e);
      AppState.songs = [...INITIAL_SONGS];
    }
  } else {
    AppState.songs = [...INITIAL_SONGS];
    saveSongs();
  }

  const storedMisas = localStorage.getItem('maranatha_mass_setlists');
  if (storedMisas) {
    try {
      AppState.massSetlists = JSON.parse(storedMisas);
    } catch (e) {
      AppState.massSetlists = [INITIAL_MASS_SETLIST];
    }
  } else {
    AppState.massSetlists = [INITIAL_MASS_SETLIST];
    saveMassSetlists();
  }
  AppState.activeMassSetlist = AppState.massSetlists[0];

  const storedEventos = localStorage.getItem('maranatha_event_setlists');
  if (storedEventos) {
    try {
      AppState.eventSetlists = JSON.parse(storedEventos);
    } catch (e) {
      AppState.eventSetlists = [INITIAL_EVENT_SETLIST];
    }
  } else {
    AppState.eventSetlists = [INITIAL_EVENT_SETLIST];
    saveEventSetlists();
  }
  AppState.activeEventSetlist = AppState.eventSetlists[0];
}

function saveSongs() {
  localStorage.setItem('maranatha_songs', JSON.stringify(AppState.songs));
}

function saveMassSetlists() {
  localStorage.setItem('maranatha_mass_setlists', JSON.stringify(AppState.massSetlists));
}

function saveEventSetlists() {
  localStorage.setItem('maranatha_event_setlists', JSON.stringify(AppState.eventSetlists));
}

// ==========================================
// CANAL EN VIVO / MODO DIRECTOR (MQTT WSS & LOCAL)
// ==========================================
function setupLiveChannel() {
  // 1. BroadcastChannel para sincronizar pestañas en el mismo equipo
  if ('BroadcastChannel' in window) {
    try {
      AppState.liveChannel = new BroadcastChannel('maranatha_live_sync');
      AppState.liveChannel.onmessage = (event) => {
        handleIncomingMessage(event.data);
      };
    } catch (e) {}
  }

  // 2. Conectar a MQTT sobre WebSockets con HiveMQ para sincronizar teléfonos e iPads
  connectMqtt();

  // 3. Heartbeat cada 3.5 segundos para presencia en tiempo real
  setInterval(sendHeartbeat, 3500);
  setInterval(cleanOldClients, 4000);

  updateRoleUI();
}

function connectMqtt() {
  if (typeof Paho === 'undefined' || !Paho.MQTT) {
    console.warn('Paho MQTT no está cargado todavía, esperando...');
    setTimeout(connectMqtt, 1500);
    return;
  }

  try {
    const client = new Paho.MQTT.Client(MQTT_CONFIG.host, MQTT_CONFIG.port, MQTT_CONFIG.path, MQTT_CONFIG.clientId);

    client.onConnectionLost = (responseObject) => {
      console.log('Conexión MQTT perdida, reconectando...', responseObject.errorMessage);
      setTimeout(connectMqtt, 3000);
    };

    client.onMessageArrived = (message) => {
      try {
        const payload = JSON.parse(message.payloadString);
        handleIncomingMessage(payload);
      } catch (err) {
        console.error('Error procesando mensaje MQTT:', err);
      }
    };

    client.connect({
      useSSL: true,
      timeout: 5,
      keepAliveInterval: 30,
      onSuccess: () => {
        console.log('¡Conectado al broker MQTT de Maranatha!');
        AppState.mqttClient = client;
        client.subscribe(MQTT_CONFIG.topic);
        sendHeartbeat();
      },
      onFailure: (err) => {
        console.warn('Fallo de conexión MQTT, reintentando:', err);
        setTimeout(connectMqtt, 5000);
      }
    });
  } catch (e) {
    console.warn('Error inicializando MQTT:', e);
  }
}

function sendLiveMessage(payload) {
  if (AppState.liveChannel) {
    try { AppState.liveChannel.postMessage(payload); } catch(e){}
  }

  if (AppState.mqttClient && AppState.mqttClient.isConnected()) {
    try {
      const msg = new Paho.MQTT.Message(JSON.stringify(payload));
      msg.destinationName = MQTT_CONFIG.topic;
      AppState.mqttClient.send(msg);
    } catch(e) {
      console.warn('Error enviando mensaje MQTT:', e);
    }
  }

  if (payload.type === 'CHANGE_SONG') {
    localStorage.setItem('maranatha_live_state', JSON.stringify(payload));
  }
}

function sendHeartbeat() {
  const payload = {
    type: 'HEARTBEAT',
    clientId: MQTT_CONFIG.clientId,
    deviceName: getDeviceName(),
    role: AppState.userRole,
    timestamp: Date.now()
  };
  sendLiveMessage(payload);
}

function cleanOldClients() {
  const now = Date.now();
  let changed = false;
  for (const cid in AppState.connectedClients) {
    if (now - AppState.connectedClients[cid].lastSeen > 10000) {
      delete AppState.connectedClients[cid];
      changed = true;
    }
  }
  if (changed && AppState.activeTab === 'director') {
    updateConnectedCounterUI();
  }
}

function handleIncomingMessage(data) {
  if (!data || !data.type) return;

  if (data.type === 'HEARTBEAT') {
    AppState.connectedClients[data.clientId] = {
      name: data.deviceName || 'Músico',
      role: data.role || 'musico',
      lastSeen: Date.now()
    };
    updateConnectedCounterUI();
    return;
  }

  if (data.type === 'CHANGE_SONG') {
    onLiveSongReceived(data);
    return;
  }

  if (data.type === 'NEXT_SONG') {
    onNextSongReceived(data);
    return;
  }

  if (data.type === 'DIRECTOR_NOTE') {
    onDirectorNoteReceived(data);
    return;
  }

  if (data.type === 'CLEAR_NOTE') {
    AppState.liveActiveNote = '';
    const noteBanner = document.getElementById('live-director-note-banner');
    if (noteBanner) noteBanner.classList.add('hidden');
    return;
  }
}

// ------------------------------------------
// ACCIONES DEL DIRECTOR HACIA LOS MÚSICOS
// ------------------------------------------
function broadcastLiveSong(songId, slotLabel = '', contextType = 'misa') {
  if (AppState.userRole !== 'director') {
    showToast('Solo el Director puede transmitir canciones a los atriles', 'info');
    openRoleModal();
    return;
  }

  AppState.liveCurrentSongId = songId;
  AppState.liveCurrentSlotLabel = slotLabel;
  AppState.liveContextType = contextType;

  const payload = {
    type: 'CHANGE_SONG',
    songId: songId,
    slotLabel: slotLabel,
    contextType: contextType,
    directorName: getDeviceName(),
    keyOffset: AppState.currentKeyOffset,
    timestamp: Date.now()
  };

  sendLiveMessage(payload);
  const tag = contextType === 'misa' ? '⛪ Misa' : '🎸 Evento';
  showToast(`🔴 En Vivo (${tag}): Alabanza enviada a todos los músicos`);
  
  if (AppState.activeTab === 'director') {
    renderModoDirector(document.getElementById('main-content'));
  }
}

function broadcastNextSong(songId, slotLabel = '') {
  if (AppState.userRole !== 'director') {
    openRoleModal();
    return;
  }

  const song = AppState.songs.find(s => s.id === songId);
  if (!song) return;

  AppState.liveNextSong = {
    songId: song.id,
    title: song.title,
    key: song.originalKey,
    label: slotLabel
  };

  const payload = {
    type: 'NEXT_SONG',
    songId: song.id,
    title: song.title,
    key: song.originalKey,
    label: slotLabel,
    timestamp: Date.now()
  };

  sendLiveMessage(payload);
  showToast(`🔔 Indicaste a todos la siguiente alabanza: ${song.title}`, 'info');
  
  if (AppState.activeTab === 'director') {
    renderModoDirector(document.getElementById('main-content'));
  }
}

function broadcastDirectorNote(text) {
  if (AppState.userRole !== 'director') {
    openRoleModal();
    return;
  }

  if (!text || !text.trim()) return;
  text = text.trim();
  AppState.liveActiveNote = text;

  const payload = {
    type: 'DIRECTOR_NOTE',
    text: text,
    timestamp: Date.now()
  };

  sendLiveMessage(payload);
  showToast('📣 Nota enviada a la pantalla de todos los músicos', 'success');

  const customInput = document.getElementById('director-custom-note-input');
  if (customInput) customInput.value = '';

  if (AppState.activeTab === 'director') {
    renderModoDirector(document.getElementById('main-content'));
  }
}

function clearDirectorNote() {
  AppState.liveActiveNote = '';
  sendLiveMessage({ type: 'CLEAR_NOTE', timestamp: Date.now() });
  showToast('Nota de director retirada de las pantallas');
  if (AppState.activeTab === 'director') {
    renderModoDirector(document.getElementById('main-content'));
  }
}

// ------------------------------------------
// RECEPCIÓN EN LOS TELÉFONOS DE LOS MÚSICOS
// ------------------------------------------
function onLiveSongReceived(data) {
  const song = AppState.songs.find(s => s.id === data.songId);
  if (song) {
    AppState.liveCurrentSongId = data.songId;
    AppState.liveCurrentSlotLabel = data.slotLabel || '';
    AppState.liveContextType = data.contextType || 'misa';

    const liveBanner = document.getElementById('live-incoming-banner');
    if (liveBanner) {
      liveBanner.classList.remove('hidden');
      const prefix = data.contextType === 'misa' ? '⛪ EN MISA:' : '🎸 EN EVENTO:';
      const typeBadge = document.getElementById('live-banner-type');
      if (typeBadge) typeBadge.textContent = prefix;
      document.getElementById('live-banner-song-title').textContent = song.title;
      document.getElementById('live-banner-slot').textContent = data.slotLabel ? `(${data.slotLabel})` : '';
    }

    // Si el músico tiene activado "Seguir al Director" o ya está en el visor
    if (AppState.activeTab === 'visor' || AppState.followDirector) {
      openSongViewer(song.id, data.keyOffset || 0, data.slotLabel);
    } else if (AppState.activeTab === 'director') {
      renderModoDirector(document.getElementById('main-content'));
    }
  }
}

function onNextSongReceived(data) {
  AppState.liveNextSong = data;
  const nextBanner = document.getElementById('live-next-song-banner');
  if (nextBanner) {
    nextBanner.classList.remove('hidden');
    document.getElementById('live-next-title').textContent = data.title;
    document.getElementById('live-next-key').textContent = `Tono: ${data.key}`;
  }
  showToast(`🔔 Director indica preparar siguiente: ${data.title} (${data.key})`, 'info');
  
  if (AppState.activeTab === 'director') {
    renderModoDirector(document.getElementById('main-content'));
  }
}

function onDirectorNoteReceived(data) {
  AppState.liveActiveNote = data.text;
  const noteBanner = document.getElementById('live-director-note-banner');
  if (noteBanner) {
    noteBanner.classList.remove('hidden');
    document.getElementById('live-note-content').textContent = data.text;
  }
  showToast(`📣 NOTA DEL DIRECTOR: ${data.text}`, 'warning');
}

// ------------------------------------------
// GESTIÓN DE ROLES (DIRECTOR VS MÚSICO)
// ------------------------------------------
function updateRoleUI() {
  const isDir = AppState.userRole === 'director';
  const roleText = document.getElementById('role-text');
  const roleIcon = document.getElementById('role-icon');
  const roleBtn = document.getElementById('role-badge-btn');

  if (roleText && roleIcon && roleBtn) {
    if (isDir) {
      roleText.textContent = 'Director';
      roleIcon.innerHTML = '<i class="fa-solid fa-crown text-amber-400"></i>';
      roleBtn.className = 'bg-amber-950/80 hover:bg-amber-900 border border-amber-600/60 text-xs px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-amber-300 font-bold shadow-md';
    } else {
      roleText.textContent = 'Músico';
      roleIcon.innerHTML = '<i class="fa-solid fa-guitar text-gray-400"></i>';
      roleBtn.className = 'bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-gray-300';
    }
  }

  const checkMusico = document.getElementById('role-check-musico');
  if (checkMusico) {
    checkMusico.style.display = isDir ? 'none' : 'block';
  }
}

function openRoleModal() {
  document.getElementById('role-modal')?.classList.remove('hidden');
  updateRoleUI();
}

function closeRoleModal() {
  document.getElementById('role-modal')?.classList.add('hidden');
}

function unlockDirectorRole() {
  const pinInput = document.getElementById('director-pin-input');
  const pin = (pinInput?.value || '').trim();

  if (pin === AppState.directorPin || pin === '1234') {
    AppState.userRole = 'director';
    localStorage.setItem('maranatha_user_role', 'director');
    updateRoleUI();
    closeRoleModal();
    showToast('👑 ¡Modo Director activado en este dispositivo!', 'success');
    if (AppState.activeTab === 'director') {
      renderModoDirector(document.getElementById('main-content'));
    }
  } else {
    alert('PIN incorrecto. El PIN por defecto es 1234.');
  }
}

function setAppRole(role) {
  AppState.userRole = role;
  localStorage.setItem('maranatha_user_role', role);
  updateRoleUI();
  closeRoleModal();
  showToast(role === 'director' ? 'Rol cambiado a Director' : 'Rol cambiado a Músico / Receptor', 'info');
  if (AppState.activeTab === 'director') {
    renderModoDirector(document.getElementById('main-content'));
  }
}

function updateConnectedCounterUI() {
  const counterEl = document.getElementById('live-connected-counter');
  if (counterEl) {
    const count = Object.keys(AppState.connectedClients).length;
    counterEl.textContent = `${count} ${count === 1 ? 'dispositivo conectado' : 'dispositivos conectados'}`;
  }
}
// ==========================================
// PARSER Y STREAMING DE GOOGLE DRIVE AUDIO
// ==========================================
function convertGoogleDriveUrl(url) {
  if (!url) return '';
  url = url.trim();

  const matchFileD = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) {
    const fileId = matchFileD[1];
    return `https://docs.google.com/uc?export=download&id=${fileId}`;
  }

  const matchIdParam = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchIdParam && matchIdParam[1]) {
    const fileId = matchIdParam[1];
    return `https://docs.google.com/uc?export=download&id=${fileId}`;
  }

  return url;
}

function setupAudioElement() {
  AppState.audioPlayer = new Audio();
  AppState.audioPlayer.addEventListener('ended', () => {
    AppState.isPlayingAudio = false;
    updateAudioControlsUI();
  });
  AppState.audioPlayer.addEventListener('error', (e) => {
    console.warn('Nota de reproducción de audio:', e);
  });
}

function playSongAudio(url) {
  if (!url) {
    showToast('Esta alabanza no tiene enlace de audio de Google Drive aún.', 'info');
    return;
  }

  const streamUrl = convertGoogleDriveUrl(url);

  if (AppState.audioPlayer.src !== streamUrl) {
    AppState.audioPlayer.src = streamUrl;
  }

  if (AppState.isPlayingAudio) {
    AppState.audioPlayer.pause();
    AppState.isPlayingAudio = false;
  } else {
    AppState.audioPlayer.play().then(() => {
      AppState.isPlayingAudio = true;
      showToast('▶ Reproduciendo audio de ensayo', 'success');
    }).catch(err => {
      console.warn('Autoplay bloqueado o URL requiere permiso público en Drive:', err);
      const openInDrive = confirm('¿Deseas abrir el audio en Google Drive para escucharlo? (Asegúrate de que el archivo en Drive tenga permiso "Cualquiera con el enlace puede ver")');
      if (openInDrive) {
        window.open(url, '_blank');
      }
    });
  }
  updateAudioControlsUI();
}

function updateAudioControlsUI() {
  const btn = document.getElementById('viewer-audio-btn');
  if (btn) {
    if (AppState.isPlayingAudio) {
      btn.innerHTML = `<i class="fa-solid fa-pause text-amber-400"></i> <span>Pausar Audio</span>`;
      btn.classList.add('bg-amber-950', 'border-amber-500');
    } else {
      btn.innerHTML = `<i class="fa-brands fa-google-drive text-emerald-400"></i> <span>Escuchar Audio</span>`;
      btn.classList.remove('bg-amber-950', 'border-amber-500');
    }
  }
}

// ==========================================
// MOTOR DE TRANSPOSICIÓN MUSICAL (+1 / -1 TONO)
// ==========================================
function transposeChord(chord, semitones) {
  if (semitones === 0) return chord;

  const regex = /^([A-G][#b]?)(.*)$/;
  const match = chord.match(regex);
  if (!match) return chord;

  let root = match[1];
  let suffix = match[2];

  if (suffix.includes('/')) {
    const parts = suffix.split('/');
    const mainSuffix = parts[0];
    const bassNote = parts[1];
    return transposeChord(root + mainSuffix, semitones) + '/' + transposeChord(bassNote, semitones);
  }

  let index = CHORDS_SHARP.indexOf(root);
  if (index === -1) {
    index = CHORDS_FLAT.indexOf(root);
  }
  if (index === -1) return chord;

  let newIndex = (index + semitones) % 12;
  if (newIndex < 0) newIndex += 12;

  const preferFlats = ['F', 'Bb', 'Eb', 'Ab', 'Db'].includes(root) && semitones < 0;
  const newRoot = preferFlats ? CHORDS_FLAT[newIndex] : CHORDS_SHARP[newIndex];

  return newRoot + suffix;
}

function renderLyricsWithChords(rawText, semitones = 0) {
  if (!rawText) return '<p class="text-gray-400 italic">No hay letra ni acordes registrados.</p>';

  const lines = rawText.split('\n');
  let html = '';

  lines.forEach(line => {
    if (!line.trim()) {
      html += '<br/>';
      return;
    }

    let processedLine = line.replace(/\[([A-G][a-zA-Z0-9#\/\+]*?)\]/g, (match, chord) => {
      const transposed = transposeChord(chord, semitones);
      return `<span class="chord-badge">${transposed}</span>`;
    });

    html += `<div class="leading-loose mb-1">${processedLine}</div>`;
  });

  return html;
}

function getTransposedKey(originalKey, semitones) {
  if (!originalKey) return 'N/A';
  return transposeChord(originalKey, semitones);
}

// ==========================================
// AUTO-SCROLL DE ESCENARIO
// ==========================================
function toggleAutoScroll() {
  AppState.isAutoScrolling = !AppState.isAutoScrolling;
  const btn = document.getElementById('autoscroll-toggle-btn');
  const bar = document.getElementById('autoscroll-floating-controls');

  if (AppState.isAutoScrolling) {
    if (btn) btn.innerHTML = `<i class="fa-solid fa-stop text-red-400"></i> <span>Detener Scroll</span>`;
    if (bar) bar.classList.remove('hidden');
    startAutoScroll();
  } else {
    if (btn) btn.innerHTML = `<i class="fa-solid fa-arrows-up-down text-amber-400"></i> <span>Auto-Scroll</span>`;
    stopAutoScroll();
  }
}

function startAutoScroll() {
  stopAutoScroll();
  const speedDelays = { 1: 50, 2: 35, 3: 20, 4: 12, 5: 7 };
  const delay = speedDelays[AppState.autoScrollSpeed] || 30;

  AppState.autoScrollTimer = setInterval(() => {
    window.scrollBy({ top: 1, behavior: 'auto' });
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 5) {
      toggleAutoScroll();
    }
  }, delay);
}

function stopAutoScroll() {
  if (AppState.autoScrollTimer) {
    clearInterval(AppState.autoScrollTimer);
    AppState.autoScrollTimer = null;
  }
}

function setAutoScrollSpeed(speed) {
  AppState.autoScrollSpeed = speed;
  if (AppState.isAutoScrolling) {
    startAutoScroll();
  }
  document.querySelectorAll('.speed-btn').forEach(btn => {
    if (parseInt(btn.dataset.speed) === speed) {
      btn.classList.add('bg-amber-600', 'text-white');
      btn.classList.remove('bg-gray-800', 'text-gray-300');
    } else {
      btn.classList.remove('bg-amber-600', 'text-white');
      btn.classList.add('bg-gray-800', 'text-gray-300');
    }
  });
}

// ==========================================
// RENDERIZADO DE VISTAS PRINCIPALES
// ==========================================
function switchTab(tabName) {
  AppState.activeTab = tabName;
  stopAutoScroll();
  AppState.isAutoScrolling = false;
  
  if (tabName !== 'visor' && AppState.isPlayingAudio) {
    AppState.audioPlayer.pause();
    AppState.isPlayingAudio = false;
  }

  document.querySelectorAll('.nav-btn').forEach(b => {
    if (b.dataset.tab === tabName) {
      b.classList.add('text-amber-400', 'border-amber-400', 'font-bold');
      b.classList.remove('text-gray-400', 'border-transparent');
    } else {
      b.classList.remove('text-amber-400', 'border-amber-400', 'font-bold');
      b.classList.add('text-gray-400', 'border-transparent');
    }
  });

  const contentArea = document.getElementById('main-content');
  if (!contentArea) return;

  switch (tabName) {
    case 'cancionero':
      renderCancionero(contentArea);
      break;
    case 'misas':
      renderMisas(contentArea);
      break;
    case 'eventos':
      renderEventos(contentArea);
      break;
    case 'director':
      renderModoDirector(contentArea);
      break;
    case 'visor':
      renderVisor(contentArea);
      break;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ------------------------------------------
// VISTA: CANCIONERO (DIVIDIDO MISA vs EVENTO)
// ------------------------------------------
function setCancioneroSection(section) {
  AppState.cancioneroSection = section;
  activeCategoryFilter = 'Todas';
  renderCancionero(document.getElementById('main-content'));
}

function renderCancionero(container) {
  const isMisa = AppState.cancioneroSection === 'misa';
  const isEvento = AppState.cancioneroSection === 'evento';
  const isTodos = AppState.cancioneroSection === 'todos';

  const misaCategories = ['Todas', 'Entrada', 'Piedad', 'Gloria', 'Salmo', 'Aleluya / Aclamación', 'Ofertorio', 'Santo', 'Paz / Cordero', 'Comunión', 'Meditación / Adoración', 'Salida'];
  const eventoCategories = ['Todas', 'Adoración', 'Animación', 'Alabanza Rápida', 'Clamor / Efusión', 'Meditación / Adoración', 'Salida'];
  const currentCategories = isMisa ? misaCategories : (isEvento ? eventoCategories : [...new Set([...misaCategories, ...eventoCategories])]);

  container.innerHTML = `
    <div class="space-y-5">

      <!-- SELECTOR PRINCIPAL: DIVISIÓN CANCIONERO MISA vs EVENTOS -->
      <div class="p-1.5 bg-gray-900 border border-gray-800 rounded-2xl shadow-xl flex flex-col sm:flex-row gap-1.5">
        <button onclick="setCancioneroSection('misa')" class="flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${isMisa ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' : 'text-gray-400 hover:text-white hover:bg-gray-800'}">
          <i class="fa-solid fa-church"></i>
          <span>Cancionero para Misas</span>
        </button>

        <button onclick="setCancioneroSection('evento')" class="flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${isEvento ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'text-gray-400 hover:text-white hover:bg-gray-800'}">
          <i class="fa-solid fa-guitar"></i>
          <span>Cancionero para Eventos / Retiro</span>
        </button>

        <button onclick="setCancioneroSection('todos')" class="py-3 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${isTodos ? 'bg-gray-800 text-amber-400 border border-amber-500/30' : 'text-gray-500 hover:text-gray-300'}">
          <i class="fa-solid fa-layer-group"></i>
          <span>Todas</span>
        </button>
      </div>

      <!-- Buscador y Acciones -->
      <div class="bg-gray-900/80 backdrop-blur p-4 rounded-2xl border border-gray-800 shadow-xl">
        <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-4">
          <div class="relative flex-1">
            <i class="fa-solid fa-search absolute left-3 top-3.5 text-gray-400"></i>
            <input type="text" id="search-input" placeholder="${isMisa ? 'Buscar en cancionero de misas...' : (isEvento ? 'Buscar en cancionero de eventos...' : 'Buscar alabanzas...')}"
              oninput="filterSongs()"
              class="w-full bg-gray-950 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-all text-sm">
          </div>
          <div class="flex gap-2">
            <button onclick="openAddSongModal()" class="flex-1 sm:flex-none ${isMisa ? 'bg-amber-600 hover:bg-amber-500' : 'bg-purple-600 hover:bg-purple-500'} text-white font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all text-sm">
              <i class="fa-solid fa-plus"></i> Nueva Alabanza
            </button>
            <button onclick="openBackupModal()" class="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2.5 rounded-xl border border-gray-700 text-sm" title="Respaldar canciones / Google Drive">
              <i class="fa-solid fa-cloud-arrow-up"></i>
            </button>
          </div>
        </div>

        <!-- Filtros rápidos de categoría -->
        <div class="flex gap-2 overflow-x-auto no-scrollbar pb-1 text-xs" id="category-pills">
          ${currentCategories.map((cat, idx) => `
            <button onclick="filterByCategory('${cat}', this)" class="category-pill whitespace-nowrap px-3 py-1.5 rounded-lg border transition-all ${idx === 0 ? (isMisa ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold' : 'bg-purple-500/20 border-purple-500 text-purple-300 font-bold') : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-white'}">
              ${cat}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Lista de Canciones Filtradas -->
      <div id="songs-list-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <!-- Renderizado dinámico -->
      </div>
    </div>
  `;

  filterSongs();
}

let activeCategoryFilter = 'Todas';

function filterByCategory(cat, btnElement) {
  activeCategoryFilter = cat;
  const isMisa = AppState.cancioneroSection === 'misa';
  document.querySelectorAll('.category-pill').forEach(b => {
    b.className = 'category-pill whitespace-nowrap px-3 py-1.5 rounded-lg border transition-all bg-gray-950 border-gray-800 text-gray-400 hover:text-white';
  });
  if (btnElement) {
    btnElement.className = `category-pill whitespace-nowrap px-3 py-1.5 rounded-lg border transition-all font-bold ${isMisa ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-purple-500/20 border-purple-500 text-purple-300'}`;
  }
  filterSongs();
}

function filterSongs() {
  const query = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
  const listContainer = document.getElementById('songs-list-container');
  if (!listContainer) return;

  const currentSection = AppState.cancioneroSection;

  const filtered = AppState.songs.filter(song => {
    // 1. Filtro por Sección (Misa vs Eventos vs Todos)
    let matchesSection = true;
    if (currentSection === 'misa') {
      matchesSection = song.usageType === 'misa' || song.usageType === 'ambos' || !song.usageType;
    } else if (currentSection === 'evento') {
      matchesSection = song.usageType === 'evento' || song.usageType === 'ambos';
    }

    // 2. Filtro por Categoría
    const matchesCategory = activeCategoryFilter === 'Todas' || song.category === activeCategoryFilter;

    // 3. Filtro por Texto
    const matchesQuery = !query || 
      song.title.toLowerCase().includes(query) || 
      (song.artist && song.artist.toLowerCase().includes(query)) ||
      (song.originalKey && song.originalKey.toLowerCase() === query) ||
      (song.lyrics && song.lyrics.toLowerCase().includes(query));

    return matchesSection && matchesCategory && matchesQuery;
  });

  if (filtered.length === 0) {
    listContainer.innerHTML = `
      <div class="col-span-full py-16 text-center text-gray-500">
        <i class="fa-solid fa-music text-4xl mb-3 text-gray-600 block"></i>
        <p class="text-lg font-medium text-gray-400">No se encontraron alabanzas en esta sección</p>
        <p class="text-sm">Prueba buscando otra palabra o agrega una nueva alabanza con el botón arriba.</p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = filtered.map(song => `
    <div onclick="openSongViewer('${song.id}')" class="group bg-gray-900/60 hover:bg-gray-800/80 border border-gray-800/90 hover:border-amber-500/50 p-4 rounded-xl cursor-pointer transition-all duration-200 flex flex-col justify-between shadow-md hover:shadow-amber-500/5">
      <div>
        <div class="flex items-start justify-between gap-2 mb-2">
          <h3 class="font-bold text-white text-base group-hover:text-amber-400 transition-colors line-clamp-1">
            ${song.title}
          </h3>
          <span class="bg-amber-500/10 text-amber-400 font-mono text-xs px-2 py-0.5 rounded border border-amber-500/30 font-bold shrink-0">
            ${song.originalKey || 'C'}
          </span>
        </div>
        
        <p class="text-xs text-gray-400 line-clamp-1 mb-3">
          ${song.artist ? `<i class="fa-solid fa-user-pen mr-1 text-gray-500"></i> ${song.artist}` : 'Tradicional'}
        </p>
      </div>

      <div class="flex items-center justify-between text-xs pt-3 border-t border-gray-800/80">
        <span class="inline-block bg-gray-950 text-gray-300 px-2 py-0.5 rounded text-[11px] border border-gray-800">
          ${song.category || 'General'}
        </span>

        <div class="flex items-center gap-2">
          ${song.driveAudioUrl ? `
            <span class="text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1" title="Tiene audio de Google Drive">
              <i class="fa-brands fa-google-drive"></i> Audio
            </span>
          ` : ''}
          <span class="text-gray-500 group-hover:text-amber-400 transition-colors">
            Ver acordes <i class="fa-solid fa-chevron-right ml-0.5"></i>
          </span>
        </div>
      </div>
    </div>
  `).join('');
}

// ------------------------------------------
// VISTA: SETLIST PARA MISAS (INTERACTIVO PARA TODOS)
// ------------------------------------------
function renderMisas(container) {
  const currentMass = AppState.activeMassSetlist || AppState.massSetlists[0];

  container.innerHTML = `
    <div class="space-y-6">
      <!-- Encabezado del Setlist de Misa -->
      <div class="bg-gray-900/80 backdrop-blur p-4 sm:p-5 rounded-2xl border border-gray-800 shadow-xl">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
          <div>
            <div class="flex items-center gap-2">
              <span class="bg-amber-500/20 text-amber-400 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-amber-500/30">
                Setlist de Misa Litúrgica
              </span>
              <span class="text-xs text-gray-400">${currentMass.date || 'Próximo Domingo'}</span>
            </div>
            <h2 class="text-xl sm:text-2xl font-bold text-white mt-1">${currentMass.title}</h2>
            ${currentMass.notes ? `<p class="text-xs text-gray-400 mt-1 italic"><i class="fa-solid fa-circle-info mr-1"></i>${currentMass.notes}</p>` : ''}
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <!-- Compartir Setlist con el ministerio -->
            <button onclick="shareSetlistUrl('misa')" class="bg-gray-800 hover:bg-gray-700 text-amber-400 font-bold px-3.5 py-2.5 rounded-xl border border-gray-700 text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-md">
              <i class="fa-solid fa-share-nodes"></i> Compartir Setlist
            </button>

            <!-- Iniciar en Modo Director -->
            <button onclick="launchMassLive()" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 text-xs sm:text-sm flex items-center gap-2 transition-all">
              <i class="fa-solid fa-tower-broadcast live-indicator"></i> Director En Vivo
            </button>

            <button onclick="openNewMassModal()" class="bg-gray-950 hover:bg-gray-800 text-gray-300 px-3 py-2.5 rounded-xl border border-gray-800 text-xs" title="Crear otra Misa">
              <i class="fa-solid fa-plus"></i> Nueva Misa
            </button>
          </div>
        </div>

        <!-- Selector de misas si hay varias -->
        ${AppState.massSetlists.length > 1 ? `
          <div class="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
            <span class="text-gray-500 font-semibold shrink-0">Misas armadas:</span>
            ${AppState.massSetlists.map(m => `
              <button onclick="selectMass('${m.id}')" class="px-3 py-1.5 rounded-lg border whitespace-nowrap transition-all ${m.id === currentMass.id ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold' : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-white'}">
                ${m.title}
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <!-- Lista Interactiva del Setlist de Misa -->
      <div class="bg-gray-900/60 rounded-2xl border border-gray-800 overflow-hidden divide-y divide-gray-800/80">
        ${LITURGICAL_PARTS.map((part, index) => {
          const assignedSongId = currentMass.slots ? currentMass.slots[part.key] : null;
          const assignedSong = assignedSongId ? AppState.songs.find(s => s.id === assignedSongId) : null;

          return `
            <div class="p-3.5 sm:p-4 hover:bg-gray-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="flex items-start sm:items-center gap-3">
                <span class="w-8 h-8 rounded-lg bg-gray-950 border border-gray-800 text-amber-400 flex items-center justify-center text-xs font-mono font-bold shrink-0">
                  ${index + 1}
                </span>
                <div>
                  <h4 class="text-xs sm:text-sm font-semibold text-gray-300">${part.label}</h4>
                  ${assignedSong ? `
                    <div class="flex items-center gap-2 mt-0.5">
                      <span class="text-white font-bold text-sm hover:text-amber-400 cursor-pointer" onclick="openSongFromMassSetlist(${index})">
                        ${assignedSong.title}
                      </span>
                      <span class="bg-amber-500/10 text-amber-400 text-[10px] font-mono px-1.5 py-0.2 rounded border border-amber-500/30">
                        ${assignedSong.originalKey}
                      </span>
                      ${assignedSong.driveAudioUrl ? `
                        <button onclick="playSongAudio('${assignedSong.driveAudioUrl}')" class="text-emerald-400 hover:text-emerald-300 text-xs ml-1" title="Escuchar audio de Google Drive">
                          <i class="fa-solid fa-circle-play"></i>
                        </button>
                      ` : ''}
                    </div>
                  ` : `
                    <p class="text-xs text-gray-500 italic">Sin alabanza asignada para este momento</p>
                  `}
                </div>
              </div>

              <!-- Acciones: Abrir en Setlist continuo o cambiar canto -->
              <div class="flex items-center gap-2 self-end sm:self-center">
                ${assignedSong ? `
                  <button onclick="openSongFromMassSetlist(${index})" class="bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-600/20">
                    <i class="fa-solid fa-book-open"></i> Tocar en Setlist
                  </button>
                ` : ''}
                <button onclick="openAssignSongModal('${part.key}', '${part.label}')" class="bg-gray-950 hover:bg-gray-800 text-gray-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs border border-gray-800 flex items-center gap-1 transition-all">
                  <i class="fa-solid fa-arrows-rotate"></i> ${assignedSong ? 'Cambiar' : 'Elegir Canto'}
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function selectMass(massId) {
  const mass = AppState.massSetlists.find(m => m.id === massId);
  if (mass) {
    AppState.activeMassSetlist = mass;
    switchTab('misas');
  }
}

// ------------------------------------------
// VISTA: SETLIST PARA EVENTOS (INTERACTIVO PARA TODOS)
// ------------------------------------------
function renderEventos(container) {
  const currentEvent = AppState.activeEventSetlist || AppState.eventSetlists[0];

  container.innerHTML = `
    <div class="space-y-6">
      <!-- Encabezado del Setlist de Evento -->
      <div class="bg-gray-900/80 backdrop-blur p-4 sm:p-5 rounded-2xl border border-gray-800 shadow-xl">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
          <div>
            <div class="flex items-center gap-2">
              <span class="bg-purple-500/20 text-purple-400 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-purple-500/30">
                Setlist de Evento / Concierto
              </span>
              <span class="text-xs text-gray-400">${currentEvent.date || 'Próximo Evento'}</span>
            </div>
            <h2 class="text-xl sm:text-2xl font-bold text-white mt-1">${currentEvent.title}</h2>
            <div class="flex items-center gap-3 text-xs text-gray-400 mt-1">
              ${currentEvent.location ? `<span><i class="fa-solid fa-location-dot mr-1 text-purple-400"></i>${currentEvent.location}</span>` : ''}
              ${currentEvent.notes ? `<span><i class="fa-solid fa-note-sticky mr-1 text-amber-400"></i>${currentEvent.notes}</span>` : ''}
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <!-- Compartir Setlist con el ministerio -->
            <button onclick="shareSetlistUrl('evento')" class="bg-gray-800 hover:bg-gray-700 text-purple-300 font-bold px-3.5 py-2.5 rounded-xl border border-gray-700 text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-md">
              <i class="fa-solid fa-share-nodes"></i> Compartir Setlist
            </button>

            <!-- Iniciar en Modo Director -->
            <button onclick="launchEventLive()" class="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-purple-600/30 text-xs sm:text-sm flex items-center gap-2 transition-all">
              <i class="fa-solid fa-tower-broadcast live-indicator"></i> Director En Vivo
            </button>

            <button onclick="openAddEventSongModal()" class="bg-amber-600 hover:bg-amber-500 text-white font-semibold px-3 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow-md">
              <i class="fa-solid fa-plus"></i> Añadir Canto
            </button>
          </div>
        </div>

        <!-- Selector de otros eventos -->
        ${AppState.eventSetlists.length > 1 ? `
          <div class="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
            <span class="text-gray-500 font-semibold shrink-0">Eventos armados:</span>
            ${AppState.eventSetlists.map(ev => `
              <button onclick="selectEvent('${ev.id}')" class="px-3 py-1.5 rounded-lg border whitespace-nowrap transition-all ${ev.id === currentEvent.id ? 'bg-purple-500/20 border-purple-500 text-purple-300 font-bold' : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-white'}">
                ${ev.title}
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <!-- Lista Interactiva del Setlist de Evento -->
      <div class="bg-gray-900/60 rounded-2xl border border-gray-800 divide-y divide-gray-800/80">
        ${(!currentEvent.songs || currentEvent.songs.length === 0) ? `
          <div class="p-12 text-center text-gray-500">
            <p>Este evento aún no tiene alabanzas agregadas.</p>
            <button onclick="openAddEventSongModal()" class="mt-3 bg-purple-600 text-white text-xs px-4 py-2 rounded-lg font-bold">
              Agregar la primera alabanza
            </button>
          </div>
        ` : currentEvent.songs.map((item, index) => {
          const song = AppState.songs.find(s => s.id === item.songId);
          if (!song) return '';

          return `
            <div class="p-3.5 sm:p-4 hover:bg-gray-800/40 transition-colors flex items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <span class="w-8 h-8 rounded-lg bg-gray-950 border border-gray-800 text-purple-400 flex items-center justify-center text-xs font-mono font-bold shrink-0">
                  ${index + 1}
                </span>
                <div>
                  <div class="flex items-center gap-2">
                    <h4 class="text-sm font-bold text-white hover:text-purple-400 cursor-pointer" onclick="openSongFromEventSetlist(${index})">
                      ${song.title}
                    </h4>
                    <span class="bg-purple-500/10 text-purple-300 text-[10px] font-mono px-1.5 py-0.2 rounded border border-purple-500/30">
                      ${item.key || song.originalKey}
                    </span>
                    ${song.driveAudioUrl ? `
                      <button onclick="playSongAudio('${song.driveAudioUrl}')" class="text-emerald-400 hover:text-emerald-300 text-xs ml-1" title="Escuchar audio">
                        <i class="fa-solid fa-circle-play"></i>
                      </button>
                    ` : ''}
                  </div>
                  ${item.note ? `<p class="text-xs text-amber-400/90 mt-0.5"><i class="fa-solid fa-comment-dots mr-1 text-gray-500"></i>${item.note}</p>` : ''}
                </div>
              </div>

              <div class="flex items-center gap-1.5">
                <!-- Reordenar arriba/abajo -->
                <button onclick="moveEventSong(${index}, -1)" class="w-7 h-7 rounded bg-gray-950 text-gray-400 hover:text-white flex items-center justify-center text-xs ${index === 0 ? 'opacity-30 pointer-events-none' : ''}">
                  <i class="fa-solid fa-chevron-up"></i>
                </button>
                <button onclick="moveEventSong(${index}, 1)" class="w-7 h-7 rounded bg-gray-950 text-gray-400 hover:text-white flex items-center justify-center text-xs ${index === currentEvent.songs.length - 1 ? 'opacity-30 pointer-events-none' : ''}">
                  <i class="fa-solid fa-chevron-down"></i>
                </button>
                
                <button onclick="openSongFromEventSetlist(${index})" class="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md flex items-center gap-1">
                  <i class="fa-solid fa-book-open"></i> Tocar
                </button>

                <button onclick="removeEventSong(${index})" class="text-red-400 hover:text-red-300 px-2 py-1.5 rounded-lg text-xs" title="Quitar de este evento">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function selectEvent(eventId) {
  const ev = AppState.eventSetlists.find(e => e.id === eventId);
  if (ev) {
    AppState.activeEventSetlist = ev;
    switchTab('eventos');
  }
}

function moveEventSong(index, delta) {
  const ev = AppState.activeEventSetlist;
  if (!ev || !ev.songs) return;
  const newIndex = index + delta;
  if (newIndex < 0 || newIndex >= ev.songs.length) return;

  const temp = ev.songs[index];
  ev.songs[index] = ev.songs[newIndex];
  ev.songs[newIndex] = temp;

  saveEventSetlists();
  renderEventos(document.getElementById('main-content'));
}

function removeEventSong(index) {
  const ev = AppState.activeEventSetlist;
  if (!ev || !ev.songs) return;
  ev.songs.splice(index, 1);
  saveEventSetlists();
  renderEventos(document.getElementById('main-content'));
}

// ------------------------------------------
// APERTURA DE CANCIONES DESDE EL SETLIST
// CON NAVEGACIÓN FLUIDA (ANTERIOR / SIGUIENTE)
// ------------------------------------------
function openSongFromMassSetlist(slotIndex) {
  const currentMass = AppState.activeMassSetlist;
  if (!currentMass || !currentMass.slots) return;

  // Construir la lista lineal de cantos asignados en la Misa
  const sequence = [];
  LITURGICAL_PARTS.forEach((part, idx) => {
    const songId = currentMass.slots[part.key];
    if (songId) {
      sequence.push({
        slotIndex: idx,
        partKey: part.key,
        label: part.label,
        songId: songId
      });
    }
  });

  if (sequence.length === 0) {
    showToast('Esta misa aún no tiene cantos asignados', 'info');
    return;
  }

  // Encontrar la posición dentro de la secuencia asignada
  const targetPartKey = LITURGICAL_PARTS[slotIndex].key;
  let targetSeqIndex = sequence.findIndex(item => item.partKey === targetPartKey);
  if (targetSeqIndex === -1) targetSeqIndex = 0;

  AppState.currentSetlistContext = {
    type: 'misa',
    title: currentMass.title,
    sequence: sequence,
    currentIndex: targetSeqIndex
  };

  const currentItem = sequence[targetSeqIndex];
  openSongViewer(currentItem.songId, 0, currentItem.label);
}

function openSongFromEventSetlist(songIndex) {
  const currentEvent = AppState.activeEventSetlist;
  if (!currentEvent || !currentEvent.songs || currentEvent.songs.length === 0) return;

  const sequence = currentEvent.songs.map((item, idx) => ({
    slotIndex: idx,
    label: `Pista #${idx + 1}`,
    songId: item.songId,
    note: item.note
  }));

  AppState.currentSetlistContext = {
    type: 'evento',
    title: currentEvent.title,
    sequence: sequence,
    currentIndex: songIndex
  };

  const currentItem = sequence[songIndex];
  openSongViewer(currentItem.songId, 0, currentItem.label);
}

function navSetlistSong(delta) {
  const ctx = AppState.currentSetlistContext;
  if (!ctx || !ctx.sequence || ctx.sequence.length === 0) return;

  const newIndex = ctx.currentIndex + delta;
  if (newIndex >= 0 && newIndex < ctx.sequence.length) {
    ctx.currentIndex = newIndex;
    const item = ctx.sequence[newIndex];
    openSongViewer(item.songId, 0, item.label);
  }
}

// ------------------------------------------
// VISTA: VISOR DE CANCIÓN Y ACORDES (+1 / -1)
// ------------------------------------------
function openSongViewer(songId, keyOffset = 0, slotLabel = '') {
  const song = AppState.songs.find(s => s.id === songId);
  if (!song) return;

  AppState.currentSong = song;
  AppState.currentKeyOffset = keyOffset;
  AppState.currentSlotLabel = slotLabel;
  AppState.activeTab = 'visor';
  switchTab('visor');
}

function renderVisor(container) {
  const song = AppState.currentSong;
  if (!song) {
    container.innerHTML = `<div class="p-8 text-center text-gray-400">Selecciona una alabanza del cancionero</div>`;
    return;
  }

  const currentKey = getTransposedKey(song.originalKey || 'C', AppState.currentKeyOffset);
  const offsetLabel = AppState.currentKeyOffset === 0 ? 'Original' : (AppState.currentKeyOffset > 0 ? `+${AppState.currentKeyOffset}` : `${AppState.currentKeyOffset}`);
  const ctx = AppState.currentSetlistContext;

  container.innerHTML = `
    <div class="space-y-4 max-w-4xl mx-auto">
      
      <!-- BARRA DE NAVEGACIÓN DEL SETLIST (SI SE ABRIÓ DESDE UN SETLIST) -->
      ${ctx ? `
        <div class="p-3 bg-gray-900 border ${ctx.type === 'misa' ? 'border-amber-600/40 bg-amber-950/20' : 'border-purple-600/40 bg-purple-950/20'} rounded-2xl flex items-center justify-between text-xs shadow-xl">
          <button onclick="navSetlistSong(-1)" class="px-3 py-2 rounded-xl bg-gray-950 hover:bg-gray-800 ${ctx.type === 'misa' ? 'text-amber-400' : 'text-purple-300'} font-bold flex items-center gap-1.5 transition-all ${ctx.currentIndex <= 0 ? 'opacity-30 pointer-events-none' : ''}">
            <i class="fa-solid fa-chevron-left"></i> Anterior
          </button>

          <div class="text-center px-2">
            <div class="text-[11px] text-gray-400 flex items-center justify-center gap-1">
              <span>${ctx.type === 'misa' ? '⛪ Setlist Misa:' : '🎸 Setlist Evento:'}</span>
              <b class="text-white">${ctx.title}</b>
            </div>
            <div class="text-xs font-bold ${ctx.type === 'misa' ? 'text-amber-400' : 'text-purple-300'}">
              Canto ${ctx.currentIndex + 1} de ${ctx.sequence.length}: ${ctx.sequence[ctx.currentIndex].label}
            </div>
          </div>

          <button onclick="navSetlistSong(1)" class="px-3 py-2 rounded-xl bg-gray-950 hover:bg-gray-800 ${ctx.type === 'misa' ? 'text-amber-400' : 'text-purple-300'} font-bold flex items-center gap-1.5 transition-all ${ctx.currentIndex >= ctx.sequence.length - 1 ? 'opacity-30 pointer-events-none' : ''}">
            Siguiente <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      ` : ''}

      <!-- Barra superior de control del Visor -->
      <div class="bg-gray-900/95 backdrop-blur sticky top-16 z-30 p-3 sm:p-4 rounded-2xl border border-gray-800 shadow-2xl flex flex-wrap items-center justify-between gap-3">
        
        <!-- Info de la canción -->
        <div class="flex items-center gap-3">
          <button onclick="${ctx ? (ctx.type === 'misa' ? "switchTab('misas')" : "switchTab('eventos')") : "switchTab('cancionero')"}" class="bg-gray-800 hover:bg-gray-700 text-gray-300 w-9 h-9 rounded-xl flex items-center justify-center border border-gray-700 transition-colors" title="Regresar">
            <i class="fa-solid fa-arrow-left"></i>
          </button>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-base sm:text-lg font-bold text-white line-clamp-1">${song.title}</h2>
              ${AppState.currentSlotLabel ? `<span class="bg-amber-500/20 text-amber-400 text-[10px] px-2 py-0.5 rounded font-semibold border border-amber-500/30">${AppState.currentSlotLabel}</span>` : ''}
            </div>
            <p class="text-xs text-gray-400 line-clamp-1">${song.artist || 'Maranatha'}</p>
          </div>
        </div>

        <!-- Controles rápidos: Transpositor, Tamaño de letra, Google Drive Audio y En Vivo -->
        <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
          
          <!-- Transpositor (- / +) -->
          <div class="flex items-center bg-gray-950 border border-gray-800 rounded-xl p-0.5">
            <button onclick="changeKey(-1)" class="w-8 h-8 rounded-lg hover:bg-gray-800 text-amber-400 font-bold text-sm transition-colors" title="Bajar medio tono">
              -
            </button>
            <div class="px-2.5 text-center min-w-[50px]">
              <div class="text-xs font-mono font-bold text-white leading-tight">${currentKey}</div>
              <div class="text-[9px] text-gray-500">${offsetLabel}</div>
            </div>
            <button onclick="changeKey(1)" class="w-8 h-8 rounded-lg hover:bg-gray-800 text-amber-400 font-bold text-sm transition-colors" title="Subir medio tono">
              +
            </button>
          </div>

          <!-- Tamaño de Fuente -->
          <div class="hidden sm:flex items-center bg-gray-950 border border-gray-800 rounded-xl p-0.5 text-xs text-gray-400">
            <button onclick="changeFontSize(-2)" class="w-7 h-7 rounded hover:bg-gray-800 text-gray-300 font-bold">A-</button>
            <span class="px-1 text-[11px] font-mono">${AppState.fontSize}px</span>
            <button onclick="changeFontSize(2)" class="w-7 h-7 rounded hover:bg-gray-800 text-gray-300 font-bold">A+</button>
          </div>

          <!-- Botón de Audio Google Drive -->
          ${song.driveAudioUrl ? `
            <button id="viewer-audio-btn" onclick="playSongAudio('${song.driveAudioUrl}')" class="bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow transition-all">
              <i class="fa-brands fa-google-drive"></i> <span>Escuchar</span>
            </button>
          ` : `
            <button onclick="openEditAudioModal('${song.id}')" class="bg-gray-950 hover:bg-gray-800 text-gray-400 border border-gray-800 px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1" title="Vincular audio de Google Drive">
              <i class="fa-solid fa-link"></i> + Audio
            </button>
          `}

          <!-- Botón Transmitir a todos (Modo Director) -->
          <button onclick="broadcastLiveSong('${song.id}', '${AppState.currentSlotLabel || ''}', '${ctx?.type || 'misa'}')" class="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-600/30 transition-all" title="Transmitir esta alabanza a los teléfonos de todos">
            <i class="fa-solid fa-tower-broadcast"></i> <span class="hidden sm:inline">Poner en Vivo</span>
          </button>

          <!-- Auto-scroll -->
          <button id="autoscroll-toggle-btn" onclick="toggleAutoScroll()" class="bg-gray-800 hover:bg-gray-700 text-amber-400 px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-700 flex items-center gap-1.5">
            <i class="fa-solid fa-arrows-up-down"></i> <span class="hidden sm:inline">Auto-Scroll</span>
          </button>
        </div>
      </div>

      <!-- Notas o indicaciones especiales -->
      ${song.notes ? `
        <div class="bg-amber-950/30 border border-amber-600/30 rounded-xl p-3 text-xs text-amber-200 flex items-center gap-2">
          <i class="fa-solid fa-lightbulb text-amber-400"></i>
          <span><b>Nota de ejecución:</b> ${song.notes}</span>
        </div>
      ` : ''}

      <!-- Hoja de Letra y Acordes -->
      <div id="chord-sheet-container" class="bg-gray-950 p-6 sm:p-8 rounded-2xl border border-gray-800/90 shadow-2xl chord-sheet text-gray-100" style="font-size: ${AppState.fontSize}px;">
        ${renderLyricsWithChords(song.lyrics, AppState.currentKeyOffset)}
      </div>

      <!-- BARRA INFERIOR DEL SETLIST PARA SALTAR DIRECTAMENTE AL SIGUIENTE CANTO -->
      ${ctx ? `
        <div class="bg-gray-900/90 p-4 rounded-2xl border border-gray-800 flex items-center justify-between gap-3 text-sm">
          <button onclick="navSetlistSong(-1)" class="px-4 py-2.5 rounded-xl bg-gray-950 hover:bg-gray-800 text-gray-300 font-bold flex items-center gap-2 ${ctx.currentIndex <= 0 ? 'opacity-30 pointer-events-none' : ''}">
            <i class="fa-solid fa-chevron-left"></i> Canto Anterior
          </button>

          <button onclick="${ctx.type === 'misa' ? "switchTab('misas')" : "switchTab('eventos')"}" class="px-3 py-2 rounded-xl text-gray-400 hover:text-white text-xs">
            <i class="fa-solid fa-list-check mr-1"></i> Ver Setlist Completo
          </button>

          <button onclick="navSetlistSong(1)" class="px-4 py-2.5 rounded-xl ${ctx.type === 'misa' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-purple-600 hover:bg-purple-500'} text-white font-bold flex items-center gap-2 shadow-lg ${ctx.currentIndex >= ctx.sequence.length - 1 ? 'opacity-30 pointer-events-none' : ''}">
            Siguiente Canto <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      ` : ''}

      <!-- Botón inferior para editar canción -->
      <div class="flex justify-between items-center text-xs text-gray-500 pt-4 pb-12">
        <button onclick="openEditSongModal('${song.id}')" class="hover:text-amber-400 flex items-center gap-1">
          <i class="fa-solid fa-pen-to-square"></i> Editar alabanza o acordes
        </button>
        <span>Tempo: ${song.tempo || 90} BPM • Compás: ${song.timeSignature || '4/4'}</span>
      </div>
    </div>

    <!-- Barra flotante de Auto-Scroll cuando está activo -->
    <div id="autoscroll-floating-controls" class="hidden fixed bottom-20 left-1/2 -translate-x-1/2 autoscroll-bar bg-gray-900/90 border border-gray-700/80 px-4 py-2 rounded-full shadow-2xl flex items-center gap-3 z-40">
      <span class="text-xs text-gray-300 font-semibold"><i class="fa-solid fa-play text-emerald-400 mr-1"></i> Auto-Scroll</span>
      <div class="flex items-center gap-1">
        ${[1, 2, 3, 4, 5].map(speed => `
          <button data-speed="${speed}" onclick="setAutoScrollSpeed(${speed})" class="speed-btn w-6 h-6 rounded-full text-[11px] font-bold ${speed === AppState.autoScrollSpeed ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-300'}">
            ${speed}x
          </button>
        `).join('')}
      </div>
      <button onclick="toggleAutoScroll()" class="text-red-400 hover:text-red-300 text-xs font-bold ml-2">
        <i class="fa-solid fa-circle-xmark text-sm"></i>
      </button>
    </div>
  `;
}

function changeKey(delta) {
  AppState.currentKeyOffset += delta;
  renderVisor(document.getElementById('main-content'));
}

function changeFontSize(delta) {
  AppState.fontSize = Math.max(12, Math.min(28, AppState.fontSize + delta));
  const sheet = document.getElementById('chord-sheet-container');
  if (sheet) {
    sheet.style.fontSize = `${AppState.fontSize}px`;
  }
}

// ------------------------------------------
// MODO DIRECTOR / PANTALLA EN VIVO (DIVIDIDO: MISA vs EVENTO)
// ------------------------------------------
function setDirectorType(type) {
  AppState.directorType = type;
  renderModoDirector(document.getElementById('main-content'));
}

function renderModoDirector(container) {
  const isDirector = AppState.userRole === 'director';

  if (!isDirector) {
    // VISTA PARA LOS MÚSICOS Y CANTANTES (ATRIL RECEPTOR)
    renderMusicoAtrilView(container);
    return;
  }

  // VISTA PARA EL DISPOSITIVO DIRECTOR (SOLO 1 TIENE EL MANDO)
  renderDirectorControlRoom(container);
}

// ========================================================
// VISTA: ATRIL DEL MÚSICO (MODO RECEPTOR)
// ========================================================
function renderMusicoAtrilView(container) {
  const currentSong = AppState.songs.find(s => s.id === AppState.liveCurrentSongId);
  const nextSong = AppState.liveNextSong;
  const connectedCount = Object.keys(AppState.connectedClients).length;

  container.innerHTML = `
    <div class="space-y-6 max-w-3xl mx-auto">
      
      <!-- Estado de conexión con el Director -->
      <div class="bg-gray-900 border border-gray-800 p-4 sm:p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 flex items-center justify-center text-lg shadow-md shrink-0">
            <i class="fa-solid fa-satellite-dish live-indicator"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <h3 class="text-sm font-bold text-white">Atril Sincronizado en Vivo</h3>
            </div>
            <p class="text-xs text-gray-400 mt-0.5">Tu pantalla sigue las indicaciones del Director</p>
          </div>
        </div>

        <div class="flex items-center gap-2 self-start sm:self-center">
          <label class="flex items-center gap-2 text-xs text-gray-300 bg-gray-950 px-3 py-1.5 rounded-xl border border-gray-800 cursor-pointer">
            <input type="checkbox" ${AppState.followDirector ? 'checked' : ''} onchange="toggleFollowDirector(this.checked)" class="accent-amber-500 rounded">
            <span>Seguir al Director automáticamente</span>
          </label>
        </div>
      </div>

      <!-- NOTA EN VIVO DEL DIRECTOR (SI HAY ALGUNA ACTIVA) -->
      ${AppState.liveActiveNote ? `
        <div class="bg-gradient-to-r from-red-950/70 via-rose-950/60 to-gray-900 border-2 border-red-500/60 p-4 rounded-2xl shadow-xl animate-pulse">
          <div class="flex items-start gap-3">
            <i class="fa-solid fa-bullhorn text-red-400 text-lg mt-0.5"></i>
            <div>
              <span class="text-xs text-red-400 font-bold uppercase tracking-wider">Indicación del Director ahora:</span>
              <p class="text-base sm:text-lg font-black text-white mt-1">${AppState.liveActiveNote}</p>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- CANCIÓN QUE ESTÁ SONANDO AHORA EN EL ALTAR / ESCENARIO -->
      <div class="bg-gradient-to-br from-amber-950/40 via-gray-900 to-gray-950 border-2 border-amber-500/50 p-6 rounded-3xl shadow-2xl relative overflow-hidden">
        <div class="flex items-center justify-between mb-4">
          <span class="bg-amber-500/20 text-amber-300 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider border border-amber-500/40 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-red-500 live-indicator"></span>
            Tocando en este momento
          </span>
          <span class="text-xs font-semibold text-gray-400">${AppState.liveContextType === 'misa' ? '⛪ Misa' : '🎸 Evento'}</span>
        </div>

        ${currentSong ? `
          <div class="space-y-2">
            <div class="text-xs font-semibold text-amber-400">${AppState.liveCurrentSlotLabel || 'Canto Actual'}</div>
            <h2 class="text-2xl sm:text-4xl font-black text-white tracking-tight">${currentSong.title}</h2>
            <div class="flex flex-wrap items-center gap-3 pt-1">
              <span class="text-xs text-gray-400">Tono actual: <b class="text-amber-400 font-mono text-base">${currentSong.originalKey}</b></span>
              ${currentSong.artist ? `<span class="text-xs text-gray-400">• Autor: ${currentSong.artist}</span>` : ''}
              ${currentSong.notes ? `<span class="text-xs text-amber-200/90 italic bg-amber-950/50 px-2 py-0.5 rounded border border-amber-600/30">"${currentSong.notes}"</span>` : ''}
            </div>

            <div class="pt-6 flex flex-col sm:flex-row gap-3">
              <button onclick="openSongViewer('${currentSong.id}', 0, '${AppState.liveCurrentSlotLabel}')" class="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-black py-3.5 px-6 rounded-2xl text-base shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition-all">
                <i class="fa-solid fa-book-open"></i> Abrir Acordes en Pantalla Completa
              </button>
              ${currentSong.driveAudioUrl ? `
                <button onclick="playSongAudio('${currentSong.driveAudioUrl}')" class="bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 font-bold py-3.5 px-5 rounded-2xl text-sm flex items-center justify-center gap-2 transition-all">
                  <i class="fa-brands fa-google-drive"></i> Audio
                </button>
              ` : ''}
            </div>
          </div>
        ` : `
          <div class="text-center py-10 text-gray-400 space-y-2">
            <i class="fa-solid fa-hourglass-start text-3xl text-amber-400/60 block mb-2"></i>
            <h3 class="text-lg font-bold text-white">Esperando que el Director inicie el canto</h3>
            <p class="text-xs text-gray-500">En cuanto el director seleccione la primera canción, se abrirá aquí automáticamente.</p>
          </div>
        `}
      </div>

      <!-- PRÓXIMA CANCIÓN ANUNCIADA -->
      ${nextSong ? `
        <div class="bg-gray-900 border border-blue-600/40 p-4 rounded-2xl shadow-xl flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <span class="w-9 h-9 rounded-xl bg-blue-950 text-blue-400 flex items-center justify-center text-sm font-bold border border-blue-800">
              <i class="fa-solid fa-bell"></i>
            </span>
            <div>
              <span class="text-[11px] text-blue-400 font-bold uppercase tracking-wider">El Director indicó preparar siguiente:</span>
              <h4 class="text-base font-bold text-white">${nextSong.title} <span class="text-xs font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">${nextSong.key}</span></h4>
            </div>
          </div>
          <button onclick="openSongViewer('${nextSong.songId}', 0, 'Siguiente en fila')" class="bg-gray-950 hover:bg-gray-800 text-blue-300 px-3 py-2 rounded-xl text-xs font-bold border border-gray-800">
            Previsualizar
          </button>
        </div>
      ` : ''}

      <!-- Acceso a Director con PIN -->
      <div class="p-4 bg-gray-950 rounded-2xl border border-gray-900 text-center text-xs text-gray-500 space-y-2">
        <p>¿Eres el director de alabanza y quieres controlar la sesión desde este teléfono o iPad?</p>
        <button onclick="openRoleModal()" class="text-amber-400 hover:text-amber-300 font-bold flex items-center justify-center gap-1.5 mx-auto">
          <i class="fa-solid fa-key"></i> Ingresar PIN de Director para tomar el mando
        </button>
      </div>

    </div>
  `;
}

function toggleFollowDirector(checked) {
  AppState.followDirector = checked;
  localStorage.setItem('maranatha_follow_director', checked ? 'true' : 'false');
  showToast(checked ? 'Seguimiento automático activado' : 'Seguimiento manual activado', 'info');
}

// ========================================================
// VISTA: CENTRO DE CONTROL DEL DIRECTOR (1 SOLO TIENE EL MANDO)
// ========================================================
function renderDirectorControlRoom(container) {
  const isMisa = AppState.directorType === 'misa';
  const currentSong = AppState.songs.find(s => s.id === AppState.liveCurrentSongId);
  const connectedCount = Object.keys(AppState.connectedClients).length;

  container.innerHTML = `
    <div class="space-y-6">
      
      <!-- BARRA DE CABECERA DEL DIRECTOR -->
      <div class="bg-gray-900 border border-amber-600/40 p-4 sm:p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-red-500 live-indicator"></span>
            <span class="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <i class="fa-solid fa-crown"></i> Mando de Director Activo en este dispositivo
            </span>
          </div>
          <h2 class="text-xl sm:text-2xl font-black text-white mt-1">Sala de Control de Alabanza</h2>
          <p class="text-xs text-gray-400 mt-0.5">Todo lo que toques aquí se actualiza inmediatamente en las pantallas de los músicos.</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <!-- Contador en vivo de dispositivos conectados -->
          <div onclick="showConnectedDevicesModal()" class="bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer hover:bg-emerald-900 transition-all shadow-md" title="Ver lista de músicos conectados">
            <span class="w-2 h-2 rounded-full bg-emerald-400 live-indicator"></span>
            <span id="live-connected-counter">${connectedCount} ${connectedCount === 1 ? 'dispositivo conectado' : 'dispositivos conectados'}</span>
          </div>

          <button onclick="setAppRole('musico')" class="bg-gray-950 hover:bg-gray-800 text-gray-400 hover:text-white px-3 py-2 rounded-xl text-xs border border-gray-800" title="Ceder mando">
            Ceder Mando
          </button>
        </div>
      </div>

      <!-- PANEL DE NOTAS E INDICACIONES RÁPIDAS EN VIVO -->
      <div class="bg-gray-900/80 border border-gray-800 p-4 sm:p-5 rounded-2xl shadow-xl space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <i class="fa-solid fa-bullhorn"></i> Enviar Nota o Indicación en Vivo a los Músicos
          </h3>
          ${AppState.liveActiveNote ? `
            <button onclick="clearDirectorNote()" class="text-red-400 hover:text-red-300 text-xs font-semibold flex items-center gap-1">
              <i class="fa-solid fa-xmark"></i> Quitar Nota Activa
            </button>
          ` : ''}
        </div>

        <!-- Chips de 1 clic para indicaciones rápidas en vivo -->
        <div class="flex flex-wrap gap-1.5 text-xs">
          ${[
            'Solo piano y voces',
            'Repetir coro suave',
            'Subir 1 tono al final',
            'Final con batería',
            'Bajar intensidad',
            'Estrofa 2 todos al unísono'
          ].map(chip => `
            <button onclick="broadcastDirectorNote('${chip}')" class="px-2.5 py-1.5 rounded-lg bg-gray-950 hover:bg-amber-950 hover:border-amber-500/60 border border-gray-800 text-gray-300 hover:text-amber-200 transition-all font-medium">
              + ${chip}
            </button>
          `).join('')}
        </div>

        <!-- Mensaje personalizado -->
        <div class="flex gap-2 pt-1">
          <input type="text" id="director-custom-note-input" placeholder="O escribe una nota en vivo (ej. Solo voces en el puente)..." class="flex-1 bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500">
          <button onclick="broadcastDirectorNote(document.getElementById('director-custom-note-input').value)" class="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2 rounded-xl text-xs shrink-0 shadow-md transition-all">
            Enviar a Pantallas
          </button>
        </div>

        ${AppState.liveActiveNote ? `
          <div class="bg-red-950/40 border border-red-600/40 p-2.5 rounded-xl text-xs text-red-200 flex items-center justify-between">
            <span><b>Mostrando en atriles ahora:</b> "${AppState.liveActiveNote}"</span>
            <button onclick="clearDirectorNote()" class="text-red-400 font-bold ml-2">✕</button>
          </div>
        ` : ''}
      </div>

      <!-- ESTADO ACTUAL DEL ATRIL -->
      <div class="p-4 sm:p-5 rounded-2xl border shadow-xl ${isMisa ? 'bg-gradient-to-r from-amber-950/40 via-gray-900 to-gray-900 border-amber-600/40' : 'bg-gradient-to-r from-purple-950/40 via-gray-900 to-gray-900 border-purple-600/40'}">
        <div class="flex items-center justify-between pb-3 border-b border-gray-800/80 mb-3">
          <span class="text-xs font-bold uppercase tracking-wider ${isMisa ? 'text-amber-400' : 'text-purple-400'}">
            ${isMisa ? 'Transmitiendo Misa Litúrgica' : 'Transmitiendo Evento'}
          </span>
          ${AppState.liveNextSong ? `<span class="text-xs bg-blue-950 border border-blue-700/60 text-blue-300 px-2 py-0.5 rounded font-medium">Próxima indicada: ${AppState.liveNextSong.title} (${AppState.liveNextSong.key})</span>` : ''}
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div class="text-xs text-gray-400">Sonando actualmente en atriles:</div>
            <h3 class="text-xl sm:text-2xl font-black ${isMisa ? 'text-amber-400' : 'text-purple-300'} mt-0.5">
              ${currentSong ? currentSong.title : 'Ninguna seleccionada todavía'}
            </h3>
            <p class="text-xs text-gray-400 mt-1">
              ${currentSong ? `Tono: <span class="font-mono font-bold text-white">${currentSong.originalKey}</span>` : ''} 
              ${AppState.liveCurrentSlotLabel ? `• <span class="font-semibold text-gray-300">${AppState.liveCurrentSlotLabel}</span>` : ''}
            </p>
          </div>

          ${currentSong ? `
            <div class="flex items-center gap-2">
              <button onclick="openSongViewer('${currentSong.id}', 0, '${AppState.liveCurrentSlotLabel}')" class="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${isMisa ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-purple-600 hover:bg-purple-500 text-white'}">
                <i class="fa-solid fa-eye"></i> Ver Acordes
              </button>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- PESTAÑAS: SEPARACIÓN ESTRICTA DIRECTOR MISA VS EVENTO -->
      <div class="grid grid-cols-2 gap-2 p-1.5 bg-gray-900 border border-gray-800 rounded-2xl shadow-xl">
        <button onclick="setDirectorType('misa')" class="py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${isMisa ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' : 'text-gray-400 hover:text-white hover:bg-gray-800'}">
          <i class="fa-solid fa-church"></i>
          <span>Director de Misa</span>
        </button>
        <button onclick="setDirectorType('evento')" class="py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${!isMisa ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'text-gray-400 hover:text-white hover:bg-gray-800'}">
          <i class="fa-solid fa-guitar"></i>
          <span>Director de Eventos / Retiro</span>
        </button>
      </div>

      <!-- CONTENIDO ESPECÍFICO SEGÚN EL MODO ELEGIDO -->
      ${isMisa ? renderDirectorMisaSubView() : renderDirectorEventoSubView()}

    </div>
  `;
}

// SUBVISTA EXCLUSIVA: DIRECTOR DE MISA
function renderDirectorMisaSubView() {
  const currentMass = AppState.activeMassSetlist || AppState.massSetlists[0];

  return `
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-900/60 p-4 rounded-xl border border-gray-800">
        <div>
          <span class="text-xs text-amber-400 font-bold uppercase tracking-wider">Misa en curso:</span>
          <h4 class="text-base font-bold text-white">${currentMass.title}</h4>
        </div>
        ${AppState.massSetlists.length > 1 ? `
          <select onchange="selectMass(this.value); setDirectorType('misa');" class="bg-gray-950 border border-gray-700 text-gray-200 text-xs rounded-lg px-3 py-2">
            ${AppState.massSetlists.map(m => `
              <option value="${m.id}" ${m.id === currentMass.id ? 'selected' : ''}>${m.title}</option>
            `).join('')}
          </select>
        ` : ''}
      </div>

      <div class="bg-gray-900/80 rounded-2xl border border-gray-800 overflow-hidden divide-y divide-gray-800/80">
        ${LITURGICAL_PARTS.map((part) => {
          const songId = currentMass.slots ? currentMass.slots[part.key] : null;
          const song = songId ? AppState.songs.find(s => s.id === songId) : null;
          const isCurrentlyLive = song && AppState.liveCurrentSongId === song.id;

          return `
            <div class="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${isCurrentlyLive ? 'bg-amber-500/15 border-l-4 border-amber-500' : 'hover:bg-gray-800/40'}">
              <div class="flex items-center gap-3">
                <span class="w-8 h-8 rounded-lg ${isCurrentlyLive ? 'bg-amber-500 text-black font-black' : 'bg-gray-950 text-amber-400 border border-gray-800'} flex items-center justify-center text-xs font-bold shrink-0">
                  <i class="fa-solid fa-church"></i>
                </span>
                <div>
                  <div class="text-xs text-gray-400 font-medium">${part.label}</div>
                  ${song ? `
                    <div class="flex items-center gap-2 mt-0.5">
                      <span class="text-sm font-bold text-white">${song.title}</span>
                      <span class="bg-amber-500/10 text-amber-400 text-[10px] font-mono px-1.5 py-0.2 rounded border border-amber-500/30">
                        ${song.originalKey}
                      </span>
                    </div>
                  ` : `
                    <p class="text-xs text-gray-500 italic">Sin canto asignado para este momento</p>
                  `}
                </div>
              </div>

              <div class="flex items-center gap-2 self-end sm:self-center">
                ${song ? `
                  <button onclick="broadcastLiveSong('${song.id}', '${part.label}', 'misa')" class="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${isCurrentlyLive ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30' : 'bg-gray-800 hover:bg-amber-600 text-gray-200 hover:text-white border border-gray-700'}">
                    <i class="fa-solid fa-tower-broadcast"></i> ${isCurrentlyLive ? 'Transmitiendo Ahora' : 'Transmitir Ahora'}
                  </button>
                  <button onclick="broadcastNextSong('${song.id}', '${part.label}')" class="px-2.5 py-2 rounded-xl text-xs bg-gray-950 hover:bg-blue-900/60 text-blue-400 border border-gray-800 flex items-center gap-1 transition-all" title="Anunciar a los músicos como siguiente en fila">
                    <i class="fa-solid fa-bell"></i> Siguiente
                  </button>
                  <button onclick="openSongViewer('${song.id}', 0, '${part.label}')" class="p-2 rounded-xl text-gray-400 hover:text-white bg-gray-950 border border-gray-800 text-xs" title="Ver Acordes">
                    <i class="fa-solid fa-eye"></i>
                  </button>
                ` : `
                  <button onclick="openAssignSongModal('${part.key}', '${part.label}')" class="px-3 py-1.5 rounded-lg text-xs bg-gray-950 hover:bg-gray-800 text-amber-400 border border-gray-800 flex items-center gap-1">
                    <i class="fa-solid fa-plus"></i> Asignar
                  </button>
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// SUBVISTA EXCLUSIVA: DIRECTOR DE EVENTO
function renderDirectorEventoSubView() {
  const currentEvent = AppState.activeEventSetlist || AppState.eventSetlists[0];
  const songsList = currentEvent.songs || [];
  const currentActiveIndex = songsList.findIndex(item => item.songId === AppState.liveCurrentSongId);

  return `
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-900/60 p-4 rounded-xl border border-gray-800">
        <div>
          <span class="text-xs text-purple-400 font-bold uppercase tracking-wider">Evento / Retiro en curso:</span>
          <h4 class="text-base font-bold text-white">${currentEvent.title}</h4>
          ${currentEvent.location ? `<p class="text-xs text-gray-400"><i class="fa-solid fa-location-dot mr-1 text-purple-400"></i>${currentEvent.location}</p>` : ''}
        </div>
        
        <div class="flex items-center gap-2">
          <button onclick="stepEventSong(-1)" class="bg-gray-950 hover:bg-gray-800 text-purple-300 border border-gray-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${currentActiveIndex <= 0 ? 'opacity-40 pointer-events-none' : ''}">
            <i class="fa-solid fa-backward-step"></i> Anterior
          </button>
          <button onclick="stepEventSong(1)" class="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${currentActiveIndex >= songsList.length - 1 ? 'opacity-40 pointer-events-none' : ''}">
            Siguiente <i class="fa-solid fa-forward-step"></i>
          </button>
        </div>
      </div>

      <div class="bg-gray-900/80 rounded-2xl border border-gray-800 overflow-hidden divide-y divide-gray-800/80">
        ${songsList.length === 0 ? `
          <div class="p-8 text-center text-gray-500">
            <p>No hay canciones asignadas a este evento.</p>
            <button onclick="openAddEventSongModal()" class="mt-2 bg-purple-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold">
              Agregar alabanzas
            </button>
          </div>
        ` : songsList.map((item, index) => {
          const song = AppState.songs.find(s => s.id === item.songId);
          if (!song) return '';
          const isCurrentlyLive = AppState.liveCurrentSongId === song.id;

          return `
            <div class="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${isCurrentlyLive ? 'bg-purple-600/20 border-l-4 border-purple-500' : 'hover:bg-gray-800/40'}">
              <div class="flex items-center gap-3">
                <span class="w-8 h-8 rounded-lg ${isCurrentlyLive ? 'bg-purple-600 text-white font-black' : 'bg-gray-950 text-purple-400 border border-gray-800'} flex items-center justify-center text-xs font-mono font-bold shrink-0">
                  ${index + 1}
                </span>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-bold text-white">${song.title}</span>
                    <span class="bg-purple-500/10 text-purple-300 text-[10px] font-mono px-1.5 py-0.2 rounded border border-purple-500/30">
                      ${item.key || song.originalKey}
                    </span>
                  </div>
                  ${item.note ? `<p class="text-xs text-amber-300/90 mt-0.5"><i class="fa-solid fa-note-sticky mr-1"></i>${item.note}</p>` : ''}
                </div>
              </div>

              <div class="flex items-center gap-2 self-end sm:self-center">
                <button onclick="broadcastLiveSong('${song.id}', 'Pista #${index + 1}', 'evento')" class="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${isCurrentlyLive ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'bg-gray-800 hover:bg-purple-600 text-gray-200 hover:text-white border border-gray-700'}">
                  <i class="fa-solid fa-tower-broadcast"></i> ${isCurrentlyLive ? 'Transmitiendo Ahora' : 'Transmitir Ahora'}
                </button>
                <button onclick="broadcastNextSong('${song.id}', 'Pista #${index + 1}')" class="px-2.5 py-2 rounded-xl text-xs bg-gray-950 hover:bg-blue-900/60 text-blue-400 border border-gray-800 flex items-center gap-1 transition-all" title="Anunciar a los músicos como siguiente">
                  <i class="fa-solid fa-bell"></i> Siguiente
                </button>
                <button onclick="openSongViewer('${song.id}', 0, 'Canción #${index + 1}')" class="p-2 rounded-xl text-gray-400 hover:text-white bg-gray-950 border border-gray-800 text-xs" title="Ver Acordes">
                  <i class="fa-solid fa-eye"></i>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function showConnectedDevicesModal() {
  const clients = AppState.connectedClients;
  const list = Object.values(clients);
  
  let msg = `Dispositivos conectados en tiempo real (${list.length}):

`;
  if (list.length === 0) {
    msg += 'No hay otros dispositivos conectados en este momento.
Pasa el enlace a los músicos para que se unan!';
  } else {
    list.forEach((c, idx) => {
      msg += `${idx + 1}. ${c.name} (${c.role === 'director' ? '👑 Director' : '🎧 Músico'})
`;
    });
  }
  alert(msg);
}

function stepEventSong(delta) {
  const currentEvent = AppState.activeEventSetlist;
  if (!currentEvent || !currentEvent.songs || currentEvent.songs.length === 0) return;
  
  const currentIndex = currentEvent.songs.findIndex(item => item.songId === AppState.liveCurrentSongId);
  let nextIndex = currentIndex + delta;
  
  if (currentIndex === -1) {
    nextIndex = 0;
  }
  
  if (nextIndex >= 0 && nextIndex < currentEvent.songs.length) {
    const nextItem = currentEvent.songs[nextIndex];
    broadcastLiveSong(nextItem.songId, `Pista #${nextIndex + 1}`, 'evento');
  }
}

function launchMassLive() {
  const currentMass = AppState.activeMassSetlist;
  if (!currentMass) return;
  
  AppState.directorType = 'misa';
  switchTab('director');
  
  for (const part of LITURGICAL_PARTS) {
    const songId = currentMass.slots ? currentMass.slots[part.key] : null;
    if (songId) {
      broadcastLiveSong(songId, part.label, 'misa');
      break;
    }
  }
}

function launchEventLive() {
  const ev = AppState.activeEventSetlist;
  if (!ev || !ev.songs || ev.songs.length === 0) {
    showToast('Añade al menos una alabanza al evento antes de iniciar', 'info');
    return;
  }
  
  AppState.directorType = 'evento';
  switchTab('director');
  
  const first = ev.songs[0];
  broadcastLiveSong(first.songId, 'Pista #1', 'evento');
}
// ------------------------------------------
// COMPARTIR SETLIST POR ENLACE / WHATSAPP
// ------------------------------------------
function shareSetlistUrl(type) {
  let title = '';
  let payload = null;

  if (type === 'misa') {
    const mass = AppState.activeMassSetlist;
    if (!mass) return;
    title = mass.title;
    payload = { type: 'misa', data: mass };
  } else {
    const ev = AppState.activeEventSetlist;
    if (!ev) return;
    title = ev.title;
    payload = { type: 'evento', data: ev };
  }

  const jsonStr = JSON.stringify(payload);
  const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(jsonStr))));
  const shareUrl = `${window.location.origin}${window.location.pathname}?setlist_share=${encoded}`;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(shareUrl).then(() => {
      showToast('¡Enlace del Setlist copiado al portapapeles! Ya puedes pegarlo en WhatsApp.', 'success');
    }).catch(() => {
      prompt('Copia este enlace para compartir el Setlist con el ministerio:', shareUrl);
    });
  } else {
    prompt('Copia este enlace para compartir el Setlist con el ministerio:', shareUrl);
  }
}

// ==========================================
// MODALES Y GESTIÓN DE ALABANZAS
// ==========================================
function openAddSongModal() {
  const modal = document.getElementById('song-modal');
  if (!modal) return;
  document.getElementById('modal-song-id').value = '';
  document.getElementById('modal-title-text').textContent = 'Nueva Alabanza para Maranatha';
  document.getElementById('song-form').reset();
  
  // Pre-seleccionar tipo según sección activa
  const usageSelect = document.getElementById('song-usage');
  if (usageSelect) {
    usageSelect.value = AppState.cancioneroSection === 'evento' ? 'evento' : 'misa';
  }

  modal.classList.remove('hidden');
}

function openEditSongModal(songId) {
  const song = AppState.songs.find(s => s.id === songId);
  if (!song) return;

  const modal = document.getElementById('song-modal');
  if (!modal) return;

  document.getElementById('modal-song-id').value = song.id;
  document.getElementById('modal-title-text').textContent = 'Editar Alabanza';
  document.getElementById('song-title').value = song.title;
  document.getElementById('song-artist').value = song.artist || '';
  document.getElementById('song-category').value = song.category || 'Entrada';
  document.getElementById('song-key').value = song.originalKey || 'C';
  document.getElementById('song-drive').value = song.driveAudioUrl || '';
  document.getElementById('song-notes').value = song.notes || '';
  document.getElementById('song-lyrics').value = song.lyrics || '';

  const usageSelect = document.getElementById('song-usage');
  if (usageSelect) {
    usageSelect.value = song.usageType || 'misa';
  }

  modal.classList.remove('hidden');
}

function closeSongModal() {
  const modal = document.getElementById('song-modal');
  if (modal) modal.classList.add('hidden');
}

function handleSongFormSubmit(e) {
  e.preventDefault();
  const songId = document.getElementById('modal-song-id').value;
  const title = document.getElementById('song-title').value.trim();
  const artist = document.getElementById('song-artist').value.trim();
  const category = document.getElementById('song-category').value;
  const originalKey = document.getElementById('song-key').value;
  const driveAudioUrl = document.getElementById('song-drive').value.trim();
  const notes = document.getElementById('song-notes').value.trim();
  const lyrics = document.getElementById('song-lyrics').value;
  const usageType = document.getElementById('song-usage')?.value || 'misa';

  if (!title) {
    alert('Por favor escribe el título de la alabanza');
    return;
  }

  if (songId) {
    const index = AppState.songs.findIndex(s => s.id === songId);
    if (index !== -1) {
      AppState.songs[index] = {
        ...AppState.songs[index],
        title, artist, category, originalKey, driveAudioUrl, notes, lyrics, usageType
      };
      if (AppState.currentSong && AppState.currentSong.id === songId) {
        AppState.currentSong = AppState.songs[index];
      }
    }
    showToast('Alabanza actualizada con éxito', 'success');
  } else {
    const newSong = {
      id: 'song-' + Date.now(),
      title,
      artist,
      category,
      usageType,
      originalKey,
      tempo: 90,
      timeSignature: '4/4',
      driveAudioUrl,
      notes,
      lyrics
    };
    AppState.songs.unshift(newSong);
    showToast('Alabanza guardada en el cancionero', 'success');
  }

  saveSongs();
  closeSongModal();
  
  if (AppState.activeTab === 'cancionero') {
    filterSongs();
  } else if (AppState.activeTab === 'visor') {
    renderVisor(document.getElementById('main-content'));
  }
}

// Modal de Asignación a ranura de Misa
let targetSlotKey = null;

function openAssignSongModal(slotKey, slotLabel) {
  targetSlotKey = slotKey;
  const modal = document.getElementById('assign-slot-modal');
  if (!modal) return;

  document.getElementById('slot-target-title').textContent = slotLabel;
  const list = document.getElementById('slot-song-options');

  list.innerHTML = `
    <div class="mb-3">
      <input type="text" id="slot-search" placeholder="Filtrar alabanzas de Misa..." oninput="filterSlotOptions(this.value)" class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500">
    </div>
    <div id="slot-options-inner" class="max-h-72 overflow-y-auto space-y-2">
    </div>
  `;

  filterSlotOptions('');
  modal.classList.remove('hidden');
}

function filterSlotOptions(query) {
  const inner = document.getElementById('slot-options-inner');
  if (!inner) return;

  const q = query.toLowerCase();
  const currentMass = AppState.activeMassSetlist;
  const currentAssigned = currentMass.slots ? currentMass.slots[targetSlotKey] : null;

  // Filtrar prioritariamente cantos de misa
  const matches = AppState.songs.filter(s => {
    const matchesUsage = s.usageType === 'misa' || s.usageType === 'ambos' || !s.usageType;
    const matchesQuery = !q || s.title.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
    return matchesUsage && matchesQuery;
  });

  inner.innerHTML = matches.map(s => `
    <div onclick="selectSongForSlot('${s.id}')" class="p-2.5 rounded-xl border ${s.id === currentAssigned ? 'border-amber-500 bg-amber-500/10' : 'border-gray-800 bg-gray-950 hover:bg-gray-800'} cursor-pointer flex items-center justify-between text-sm transition-colors">
      <div>
        <div class="font-bold text-white">${s.title}</div>
        <div class="text-xs text-gray-400">${s.category} • Tono: ${s.originalKey}</div>
      </div>
      ${s.id === currentAssigned ? '<span class="text-amber-400 text-xs font-bold"><i class="fa-solid fa-check"></i> Asignada</span>' : '<span class="text-gray-500 text-xs">Elegir</span>'}
    </div>
  `).join('');
}

function selectSongForSlot(songId) {
  if (AppState.activeMassSetlist && targetSlotKey) {
    if (!AppState.activeMassSetlist.slots) AppState.activeMassSetlist.slots = {};
    AppState.activeMassSetlist.slots[targetSlotKey] = songId;
    saveMassSetlists();
    showToast('Alabanza asignada al momento de la misa', 'success');
  }
  document.getElementById('assign-slot-modal')?.classList.add('hidden');
  renderMisas(document.getElementById('main-content'));
}

// Modal para agregar alabanza a Evento
function openAddEventSongModal() {
  const modal = document.getElementById('assign-slot-modal');
  if (!modal) return;

  document.getElementById('slot-target-title').textContent = 'Añadir Canto al Evento';
  const list = document.getElementById('slot-song-options');

  list.innerHTML = `
    <div class="mb-3">
      <input type="text" id="slot-search" placeholder="Buscar en cantos de Eventos / Adoración..." oninput="filterEventOptions(this.value)" class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500">
    </div>
    <div id="slot-options-inner" class="max-h-72 overflow-y-auto space-y-2">
    </div>
  `;

  filterEventOptions('');
  modal.classList.remove('hidden');
}

function filterEventOptions(query) {
  const inner = document.getElementById('slot-options-inner');
  if (!inner) return;
  const q = query.toLowerCase();
  
  // Priorizar cantos de eventos
  const matches = AppState.songs.filter(s => {
    const matchesUsage = s.usageType === 'evento' || s.usageType === 'ambos' || !s.usageType;
    const matchesQuery = !q || s.title.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
    return matchesUsage && matchesQuery;
  });

  inner.innerHTML = matches.map(s => `
    <div onclick="addSongToEvent('${s.id}')" class="p-2.5 rounded-xl border border-gray-800 bg-gray-950 hover:bg-gray-800 cursor-pointer flex items-center justify-between text-sm transition-colors">
      <div>
        <div class="font-bold text-white">${s.title}</div>
        <div class="text-xs text-gray-400">${s.category} • Tono original: ${s.originalKey}</div>
      </div>
      <span class="text-purple-400 text-xs font-semibold">+ Agregar</span>
    </div>
  `).join('');
}

function addSongToEvent(songId) {
  const song = AppState.songs.find(s => s.id === songId);
  const ev = AppState.activeEventSetlist;
  if (song && ev) {
    if (!ev.songs) ev.songs = [];
    ev.songs.push({
      songId: song.id,
      key: song.originalKey,
      note: ""
    });
    saveEventSetlists();
    showToast('Canto añadido al evento', 'success');
  }
  document.getElementById('assign-slot-modal')?.classList.add('hidden');
  renderEventos(document.getElementById('main-content'));
}

// Modal de Backup / Google Drive
function openBackupModal() {
  const modal = document.getElementById('backup-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeBackupModal() {
  const modal = document.getElementById('backup-modal');
  if (modal) modal.classList.add('hidden');
}

function downloadBackupJSON() {
  const data = {
    exportedAt: new Date().toISOString(),
    ministry: "Maranatha",
    songs: AppState.songs,
    massSetlists: AppState.massSetlists,
    eventSetlists: AppState.eventSetlists
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Maranatha_Alabanzas_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Copia de seguridad descargada. Puedes guardarla en Google Drive.', 'success');
}

function importBackupJSON(inputElement) {
  const file = inputElement.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.songs && Array.isArray(data.songs)) {
        AppState.songs = data.songs;
        saveSongs();
      }
      if (data.massSetlists && Array.isArray(data.massSetlists)) {
        AppState.massSetlists = data.massSetlists;
        AppState.activeMassSetlist = data.massSetlists[0];
        saveMassSetlists();
      }
      if (data.eventSetlists && Array.isArray(data.eventSetlists)) {
        AppState.eventSetlists = data.eventSetlists;
        AppState.activeEventSetlist = data.eventSetlists[0];
        saveEventSetlists();
      }
      showToast('¡Datos del ministerio restaurados con éxito!', 'success');
      closeBackupModal();
      switchTab(AppState.activeTab);
    } catch (err) {
      alert('El archivo no tiene el formato válido de respaldo.');
    }
  };
  reader.readAsText(file);
}

// Modal Rápido de Edición de Audio Drive
function openEditAudioModal(songId) {
  const song = AppState.songs.find(s => s.id === songId);
  if (!song) return;

  const url = prompt('Pega el enlace compartido de Google Drive para esta alabanza:\n(Asegúrate de que en Google Drive el enlace esté en "Cualquier persona con el enlace")', song.driveAudioUrl || '');
  if (url !== null) {
    song.driveAudioUrl = url.trim();
    saveSongs();
    showToast('Enlace de Google Drive guardado', 'success');
    renderVisor(document.getElementById('main-content'));
  }
}

// Modal Nueva Misa
function openNewMassModal() {
  const title = prompt('Título de la nueva misa (ej. Misa de Confirmaciones, Domingo XX Ordinario):');
  if (!title) return;
  const date = prompt('Fecha (AAAA-MM-DD):', new Date().toISOString().slice(0, 10));

  const newMass = {
    id: 'misa-' + Date.now(),
    title: title.trim(),
    date: date || '',
    notes: '',
    slots: {}
  };

  AppState.massSetlists.push(newMass);
  AppState.activeMassSetlist = newMass;
  saveMassSetlists();
  switchTab('misas');
  showToast('Nueva Misa creada. Ya puedes asignar las alabanzas.', 'success');
}

// ==========================================
// TOAST NOTIFICACIONES
// ==========================================
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  const toastText = document.getElementById('toast-text');
  toastText.textContent = message;

  toast.classList.remove('hidden', 'translate-y-20', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');

  setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 3200);
}

// ==========================================
// SERVICE WORKER & URLS
// ==========================================
function setupServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then((reg) => {
        console.log('Service Worker de Maranatha activo para uso sin conexión (Offline):', reg.scope);
      }).catch((err) => {
        console.log('Service Worker no se pudo registrar:', err);
      });
    });
  }
}

function checkUrlParams() {
  const params = new URLSearchParams(window.location.search);
  
  // Parámetro para abrir una canción directamente
  const songParam = params.get('song');
  if (songParam) {
    openSongViewer(songParam);
  }

  // Parámetro para recibir un Setlist compartido vía WhatsApp o enlace
  const shareParam = params.get('setlist_share');
  if (shareParam) {
    try {
      const decodedJson = decodeURIComponent(escape(atob(decodeURIComponent(shareParam))));
      const payload = JSON.parse(decodedJson);

      if (payload.type === 'misa' && payload.data) {
        const existingIdx = AppState.massSetlists.findIndex(m => m.id === payload.data.id);
        if (existingIdx !== -1) {
          AppState.massSetlists[existingIdx] = payload.data;
        } else {
          AppState.massSetlists.unshift(payload.data);
        }
        AppState.activeMassSetlist = payload.data;
        saveMassSetlists();
        AppState.activeTab = 'misas';
        setTimeout(() => showToast(`¡Setlist de Misa "${payload.data.title}" recibido y cargado!`, 'success'), 500);
      } else if (payload.type === 'evento' && payload.data) {
        const existingIdx = AppState.eventSetlists.findIndex(e => e.id === payload.data.id);
        if (existingIdx !== -1) {
          AppState.eventSetlists[existingIdx] = payload.data;
        } else {
          AppState.eventSetlists.unshift(payload.data);
        }
        AppState.activeEventSetlist = payload.data;
        saveEventSetlists();
        AppState.activeTab = 'eventos';
        setTimeout(() => showToast(`¡Setlist de Evento "${payload.data.title}" recibido y cargado!`, 'success'), 500);
      }
    } catch (e) {
      console.warn('Error al decodificar setlist compartido:', e);
    }
  }
}

// Iniciar aplicación al cargar el DOM
document.addEventListener('DOMContentLoaded', initApp);
