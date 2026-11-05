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
const AppState = {
  activeTab: 'cancionero', // 'cancionero' | 'misas' | 'eventos' | 'director' | 'visor'
  songs: [],
  massSetlists: [],
  eventSetlists: [],
  activeMassSetlist: null,
  activeEventSetlist: null,
  
  // Visor actual
  currentSong: null,
  currentKeyOffset: 0,
  fontSize: 16,
  
  // Auto-scroll
  isAutoScrolling: false,
  autoScrollSpeed: 2, // 1 to 5
  autoScrollTimer: null,
  
  // Modo Director / En Vivo
  isDirectorMode: false,
  directorType: 'misa', // 'misa' | 'evento'
  liveRoomId: 'maranatha-principal',
  liveCurrentSongId: null,
  liveCurrentSlotLabel: '',
  liveContextType: 'misa', // 'misa' | 'evento'
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
  switchTab(AppState.activeTab);
  checkUrlParams();
}

function loadData() {
  const storedSongs = localStorage.getItem('maranatha_songs');
  if (storedSongs) {
    try {
      AppState.songs = JSON.parse(storedSongs);
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
// CANAL EN VIVO / MODO DIRECTOR
// (Sincronización instantánea)
// ==========================================
function setupLiveChannel() {
  if ('BroadcastChannel' in window) {
    AppState.liveChannel = new BroadcastChannel('maranatha_live_sync');
    AppState.liveChannel.onmessage = (event) => {
      const data = event.data;
      if (data && data.type === 'CHANGE_SONG') {
        onLiveSongReceived(data);
      }
    };
  }
}

function broadcastLiveSong(songId, slotLabel = '', contextType = 'misa') {
  AppState.liveCurrentSongId = songId;
  AppState.liveCurrentSlotLabel = slotLabel;
  AppState.liveContextType = contextType;
  
  const payload = {
    type: 'CHANGE_SONG',
    songId: songId,
    slotLabel: slotLabel,
    contextType: contextType,
    keyOffset: AppState.currentKeyOffset,
    timestamp: Date.now()
  };

  if (AppState.liveChannel) {
    AppState.liveChannel.postMessage(payload);
  }
  
  localStorage.setItem('maranatha_live_state', JSON.stringify(payload));
  const tag = contextType === 'misa' ? '⛪ Misa' : '🎸 Evento';
  showToast(`🔴 En Vivo (${tag}): Alabanza enviada a todos`);
}

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

    if (AppState.activeTab === 'visor' || AppState.followDirector) {
      openSongViewer(song.id, data.keyOffset || 0, data.slotLabel);
    }
  }
}

// ==========================================
// PARSER Y STREAMING DE GOOGLE DRIVE AUDIO
// ==========================================
function convertGoogleDriveUrl(url) {
  if (!url) return '';
  url = url.trim();

  // Caso 1: Enlace completo de Google Drive (compartido)
  // Ej: https://drive.google.com/file/d/1A2B3C4D5E6F.../view?usp=sharing
  const matchFileD = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) {
    const fileId = matchFileD[1];
    return `https://docs.google.com/uc?export=download&id=${fileId}`;
  }

  // Caso 2: Parámetro id=
  // Ej: https://drive.google.com/open?id=1A2B3C4D5E6F
  const matchIdParam = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchIdParam && matchIdParam[1]) {
    const fileId = matchIdParam[1];
    return `https://docs.google.com/uc?export=download&id=${fileId}`;
  }

  // Caso 3: Es una URL de audio normal (mp3, wav, Dropbox, etc.)
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
      // Fallback: abrir en pestaña si Google Drive bloquea iframe/stream sin cookies
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

  // Regex para separar raíz musical del sufijo (m, 7, maj7, sus4, /B, etc.)
  const regex = /^([A-G][#b]?)(.*)$/;
  const match = chord.match(regex);
  if (!match) return chord;

  let root = match[1];
  let suffix = match[2];

  // Si tiene un bajo con diagonal ej. G/B o D/F#
  if (suffix.includes('/')) {
    const parts = suffix.split('/');
    const mainSuffix = parts[0];
    const bassNote = parts[1];
    return transposeChord(root + mainSuffix, semitones) + '/' + transposeChord(bassNote, semitones);
  }

  // Buscar índice en escala
  let index = CHORDS_SHARP.indexOf(root);
  if (index === -1) {
    index = CHORDS_FLAT.indexOf(root);
  }
  if (index === -1) return chord;

  let newIndex = (index + semitones) % 12;
  if (newIndex < 0) newIndex += 12;

  // Preferir sostenidos o bemoles según contexto
  const preferFlats = ['F', 'Bb', 'Eb', 'Ab', 'Db'].includes(root) && semitones < 0;
  const newRoot = preferFlats ? CHORDS_FLAT[newIndex] : CHORDS_SHARP[newIndex];

  return newRoot + suffix;
}

function renderLyricsWithChords(rawText, semitones = 0) {
  if (!rawText) return '<p class="text-gray-400 italic">No hay letra ni acordes registrados.</p>';

  // Reemplazar [Acorde] por el transpositor
  const lines = rawText.split('\n');
  let html = '';

  lines.forEach(line => {
    // Si la línea está vacía
    if (!line.trim()) {
      html += '<br/>';
      return;
    }

    // Detectar si la línea tiene corchetes de acordes [C], [Am], etc.
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
    // Si llegó al final de la página
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
  
  // Detener audio al cambiar de vista si no es el visor
  if (tabName !== 'visor' && AppState.isPlayingAudio) {
    AppState.audioPlayer.pause();
    AppState.isPlayingAudio = false;
  }

  // Actualizar botones de navegación inferior y superior
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
// VISTA: CANCIONERO
// ------------------------------------------
function renderCancionero(container) {
  const categories = ['Todas', 'Entrada', 'Piedad', 'Gloria', 'Salmo', 'Aleluya / Aclamación', 'Ofertorio', 'Santo', 'Paz / Cordero', 'Comunión', 'Meditación / Adoración', 'Salida'];

  container.innerHTML = `
    <div class="space-y-6">
      <!-- Encabezado con buscador y acciones -->
      <div class="bg-gray-900/80 backdrop-blur p-4 rounded-2xl border border-gray-800 shadow-xl">
        <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-4">
          <div class="relative flex-1">
            <i class="fa-solid fa-search absolute left-3 top-3.5 text-gray-400"></i>
            <input type="text" id="search-input" placeholder="Buscar por título, letra, autor o tono..."
              oninput="filterSongs()"
              class="w-full bg-gray-950 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-all text-sm">
          </div>
          <div class="flex gap-2">
            <button onclick="openAddSongModal()" class="flex-1 sm:flex-none bg-amber-600 hover:bg-amber-500 text-white font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-600/30 transition-all text-sm">
              <i class="fa-solid fa-plus"></i> Nueva Alabanza
            </button>
            <button onclick="openBackupModal()" class="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2.5 rounded-xl border border-gray-700 text-sm" title="Respaldar canciones / Google Drive">
              <i class="fa-solid fa-cloud-arrow-up"></i>
            </button>
          </div>
        </div>

        <!-- Filtros rápidos de categoría litúrgica -->
        <div class="flex gap-2 overflow-x-auto no-scrollbar pb-1 text-xs" id="category-pills">
          ${categories.map((cat, idx) => `
            <button onclick="filterByCategory('${cat}', this)" class="category-pill whitespace-nowrap px-3 py-1.5 rounded-lg border transition-all ${idx === 0 ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold' : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-white'}">
              ${cat}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Lista de Canciones -->
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
  document.querySelectorAll('.category-pill').forEach(b => {
    b.classList.remove('bg-amber-500/20', 'border-amber-500', 'text-amber-300', 'font-bold');
    b.classList.add('bg-gray-950', 'border-gray-800', 'text-gray-400');
  });
  if (btnElement) {
    btnElement.classList.add('bg-amber-500/20', 'border-amber-500', 'text-amber-300', 'font-bold');
    btnElement.classList.remove('bg-gray-950', 'border-gray-800', 'text-gray-400');
  }
  filterSongs();
}

function filterSongs() {
  const query = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
  const listContainer = document.getElementById('songs-list-container');
  if (!listContainer) return;

  const filtered = AppState.songs.filter(song => {
    const matchesCategory = activeCategoryFilter === 'Todas' || song.category === activeCategoryFilter;
    const matchesQuery = !query || 
      song.title.toLowerCase().includes(query) || 
      (song.artist && song.artist.toLowerCase().includes(query)) ||
      (song.originalKey && song.originalKey.toLowerCase() === query) ||
      (song.lyrics && song.lyrics.toLowerCase().includes(query));
    return matchesCategory && matchesQuery;
  });

  if (filtered.length === 0) {
    listContainer.innerHTML = `
      <div class="col-span-full py-16 text-center text-gray-500">
        <i class="fa-solid fa-music text-4xl mb-3 text-gray-600 block"></i>
        <p class="text-lg font-medium text-gray-400">No se encontraron alabanzas</p>
        <p class="text-sm">Prueba con otra palabra o añade una nueva alabanza con el botón arriba.</p>
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
// VISTA: SETLIST PARA MISAS
// ------------------------------------------
function renderMisas(container) {
  const currentMass = AppState.activeMassSetlist || AppState.massSetlists[0];

  container.innerHTML = `
    <div class="space-y-6">
      <!-- Selector y acciones de Misa -->
      <div class="bg-gray-900/80 backdrop-blur p-4 sm:p-5 rounded-2xl border border-gray-800 shadow-xl">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
          <div>
            <div class="flex items-center gap-2">
              <span class="bg-amber-500/20 text-amber-400 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-amber-500/30">
                Liturgia Católica
              </span>
              <span class="text-xs text-gray-400">${currentMass.date || 'Próximo Domingo'}</span>
            </div>
            <h2 class="text-xl sm:text-2xl font-bold text-white mt-1">${currentMass.title}</h2>
            ${currentMass.notes ? `<p class="text-xs text-gray-400 mt-1 italic"><i class="fa-solid fa-circle-info mr-1"></i>${currentMass.notes}</p>` : ''}
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button onclick="launchMassLive()" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 text-sm flex items-center gap-2 transition-all">
              <i class="fa-solid fa-tower-broadcast live-indicator"></i> Iniciar Misa en Vivo
            </button>
            <button onclick="openNewMassModal()" class="bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-2.5 rounded-xl border border-gray-700 text-sm flex items-center gap-1.5" title="Crear otra Misa">
              <i class="fa-solid fa-plus"></i> Nueva Misa
            </button>
          </div>
        </div>

        <!-- Selector si hay múltiples misas guardadas -->
        ${AppState.massSetlists.length > 1 ? `
          <div class="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
            <span class="text-gray-500 font-semibold shrink-0">Misas guardadas:</span>
            ${AppState.massSetlists.map(m => `
              <button onclick="selectMass('${m.id}')" class="px-3 py-1.5 rounded-lg border whitespace-nowrap transition-all ${m.id === currentMass.id ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold' : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-white'}">
                ${m.title}
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <!-- Lista de Momentos Litúrgicos -->
      <div class="bg-gray-900/60 rounded-2xl border border-gray-800 overflow-hidden divide-y divide-gray-800/80">
        ${LITURGICAL_PARTS.map((part) => {
          const assignedSongId = currentMass.slots ? currentMass.slots[part.key] : null;
          const assignedSong = assignedSongId ? AppState.songs.find(s => s.id === assignedSongId) : null;

          return `
            <div class="p-3.5 sm:p-4 hover:bg-gray-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="flex items-start sm:items-center gap-3">
                <span class="w-7 h-7 rounded-lg bg-gray-950 border border-gray-800 text-amber-400 flex items-center justify-center text-xs font-mono font-bold shrink-0">
                  <i class="fa-solid fa-church"></i>
                </span>
                <div>
                  <h4 class="text-sm font-semibold text-gray-300">${part.label}</h4>
                  ${assignedSong ? `
                    <div class="flex items-center gap-2 mt-0.5">
                      <span class="text-white font-bold text-sm hover:text-amber-400 cursor-pointer" onclick="openSongViewer('${assignedSong.id}', 0, '${part.label}')">
                        ${assignedSong.title}
                      </span>
                      <span class="bg-amber-500/10 text-amber-400 text-[10px] font-mono px-1.5 py-0.2 rounded border border-amber-500/30">
                        ${assignedSong.originalKey}
                      </span>
                      ${assignedSong.driveAudioUrl ? `
                        <button onclick="playSongAudio('${assignedSong.driveAudioUrl}')" class="text-emerald-400 hover:text-emerald-300 text-xs ml-1" title="Escuchar audio">
                          <i class="fa-solid fa-circle-play"></i>
                        </button>
                      ` : ''}
                    </div>
                  ` : `
                    <p class="text-xs text-gray-500 italic">Sin alabanza asignada</p>
                  `}
                </div>
              </div>

              <!-- Acciones de la ranura -->
              <div class="flex items-center gap-2 self-end sm:self-center">
                ${assignedSong ? `
                  <button onclick="openSongViewer('${assignedSong.id}', 0, '${part.label}')" class="bg-gray-800 hover:bg-gray-700 text-amber-400 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-700 flex items-center gap-1.5 transition-all">
                    <i class="fa-solid fa-eye"></i> Tocar
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
// VISTA: SETLIST PARA EVENTOS / RETIROS
// ------------------------------------------
function renderEventos(container) {
  const currentEvent = AppState.activeEventSetlist || AppState.eventSetlists[0];

  container.innerHTML = `
    <div class="space-y-6">
      <!-- Selector y acciones del Evento -->
      <div class="bg-gray-900/80 backdrop-blur p-4 sm:p-5 rounded-2xl border border-gray-800 shadow-xl">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
          <div>
            <div class="flex items-center gap-2">
              <span class="bg-purple-500/20 text-purple-400 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-purple-500/30">
                Evento / Concierto / Retiro
              </span>
              <span class="text-xs text-gray-400">${currentEvent.date || 'Fecha por definir'}</span>
            </div>
            <h2 class="text-xl sm:text-2xl font-bold text-white mt-1">${currentEvent.title}</h2>
            <div class="flex items-center gap-3 text-xs text-gray-400 mt-1">
              ${currentEvent.location ? `<span><i class="fa-solid fa-location-dot mr-1 text-purple-400"></i>${currentEvent.location}</span>` : ''}
              ${currentEvent.notes ? `<span><i class="fa-solid fa-note-sticky mr-1 text-amber-400"></i>${currentEvent.notes}</span>` : ''}
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button onclick="launchEventLive()" class="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-purple-600/30 text-sm flex items-center gap-2 transition-all">
              <i class="fa-solid fa-tower-broadcast live-indicator"></i> Transmitir Evento en Vivo
            </button>
            <button onclick="openAddEventSongModal()" class="bg-amber-600 hover:bg-amber-500 text-white font-semibold px-3 py-2.5 rounded-xl text-sm flex items-center gap-1.5 shadow-md">
              <i class="fa-solid fa-plus"></i> Añadir Canto
            </button>
          </div>
        </div>

        <!-- Selector de otros eventos -->
        ${AppState.eventSetlists.length > 1 ? `
          <div class="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
            <span class="text-gray-500 font-semibold shrink-0">Otros eventos:</span>
            ${AppState.eventSetlists.map(ev => `
              <button onclick="selectEvent('${ev.id}')" class="px-3 py-1.5 rounded-lg border whitespace-nowrap transition-all ${ev.id === currentEvent.id ? 'bg-purple-500/20 border-purple-500 text-purple-300 font-bold' : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-white'}">
                ${ev.title}
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <!-- Lista ordenada de canciones del evento -->
      <div class="bg-gray-900/60 rounded-2xl border border-gray-800 divide-y divide-gray-800/80">
        ${(!currentEvent.songs || currentEvent.songs.length === 0) ? `
          <div class="p-12 text-center text-gray-500">
            <p>Este evento aún no tiene alabanzas agregadas.</p>
            <button onclick="openAddEventSongModal()" class="mt-3 bg-amber-600 text-white text-xs px-4 py-2 rounded-lg font-bold">
              Agregar la primera alabanza
            </button>
          </div>
        ` : currentEvent.songs.map((item, index) => {
          const song = AppState.songs.find(s => s.id === item.songId);
          if (!song) return '';

          return `
            <div class="p-3.5 sm:p-4 hover:bg-gray-800/40 transition-colors flex items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <span class="w-7 h-7 rounded-lg bg-gray-950 border border-gray-800 text-purple-400 flex items-center justify-center text-xs font-mono font-bold shrink-0">
                  ${index + 1}
                </span>
                <div>
                  <div class="flex items-center gap-2">
                    <h4 class="text-sm font-bold text-white hover:text-purple-400 cursor-pointer" onclick="openSongViewer('${song.id}', 0, 'Canción #${index + 1}')">
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
                
                <button onclick="openSongViewer('${song.id}', 0, 'Pista #${index + 1}')" class="bg-gray-800 hover:bg-gray-700 text-purple-300 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-700 flex items-center gap-1">
                  <i class="fa-solid fa-eye"></i> Ver
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

  container.innerHTML = `
    <div class="space-y-4 max-w-4xl mx-auto">
      <!-- Barra superior de control del Visor -->
      <div class="bg-gray-900/95 backdrop-blur sticky top-16 z-30 p-3 sm:p-4 rounded-2xl border border-gray-800 shadow-2xl flex flex-wrap items-center justify-between gap-3">
        
        <!-- Info de la canción -->
        <div class="flex items-center gap-3">
          <button onclick="switchTab('cancionero')" class="bg-gray-800 hover:bg-gray-700 text-gray-300 w-9 h-9 rounded-xl flex items-center justify-center border border-gray-700 transition-colors" title="Regresar al cancionero">
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
          <button onclick="broadcastLiveSong('${song.id}', '${AppState.currentSlotLabel || ''}')" class="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-600/30 transition-all" title="Transmitir esta alabanza a los teléfonos de todos">
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
// ------------------------------------------
// MODO DIRECTOR / PANTALLA EN VIVO (DIVIDIDO: MISA vs EVENTO)
// ------------------------------------------
function setDirectorType(type) {
  AppState.directorType = type;
  renderModoDirector(document.getElementById('main-content'));
}

function renderModoDirector(container) {
  const isMisa = AppState.directorType === 'misa';
  const currentSong = AppState.songs.find(s => s.id === AppState.liveCurrentSongId);

  container.innerHTML = `
    <div class="space-y-6">
      
      <!-- PESTAÑAS PRINCIPALES: SEPARACIÓN ESTRICTA MISA VS EVENTO -->
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

      <!-- ESTADO ACTUAL DEL ATRIL -->
      <div class="p-4 sm:p-5 rounded-2xl border shadow-xl ${isMisa ? 'bg-gradient-to-r from-amber-950/40 via-gray-900 to-gray-900 border-amber-600/40' : 'bg-gradient-to-r from-purple-950/40 via-gray-900 to-gray-900 border-purple-600/40'}">
        <div class="flex items-center justify-between pb-3 border-b border-gray-800/80 mb-3">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-red-500 live-indicator"></span>
            <span class="text-xs font-bold uppercase tracking-wider ${isMisa ? 'text-amber-400' : 'text-purple-400'}">
              ${isMisa ? 'Transmisión Litúrgica Activa' : 'Transmisión de Evento Activa'}
            </span>
          </div>
          <span class="text-[11px] text-gray-400 font-mono">Modo En Vivo</span>
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

      <!-- Lista estricta de las 11 partes litúrgicas -->
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
                    <i class="fa-solid fa-tower-broadcast"></i> ${isCurrentlyLive ? 'Transmitiendo Ahora' : 'Transmitir Este Canto'}
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
        
        <!-- Botones de Paso Rápido Anterior / Siguiente -->
        <div class="flex items-center gap-2">
          <button onclick="stepEventSong(-1)" class="bg-gray-950 hover:bg-gray-800 text-purple-300 border border-gray-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${currentActiveIndex <= 0 ? 'opacity-40 pointer-events-none' : ''}">
            <i class="fa-solid fa-backward-step"></i> Anterior
          </button>
          <button onclick="stepEventSong(1)" class="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${currentActiveIndex >= songsList.length - 1 ? 'opacity-40 pointer-events-none' : ''}">
            Siguiente <i class="fa-solid fa-forward-step"></i>
          </button>
        </div>
      </div>

      <!-- Lista ordenada secuencial del evento -->
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
                  <i class="fa-solid fa-tower-broadcast"></i> ${isCurrentlyLive ? 'Transmitiendo Ahora' : 'Transmitir Este Canto'}
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
    renderModoDirector(document.getElementById('main-content'));
  }
}

function launchMassLive() {
  const currentMass = AppState.activeMassSetlist;
  if (!currentMass) return;
  
  AppState.directorType = 'misa';
  switchTab('director');
  
  // Transmitir la primera ranura asignada si existe
  for (const part of LITURGICAL_PARTS) {
    const songId = currentMass.slots ? currentMass.slots[part.key] : null;
    if (songId) {
      broadcastLiveSong(songId, part.label, 'misa');
      break;
    }
  }
  showToast('Iniciado Modo Director para Misa', 'success');
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
  showToast('Iniciado Modo Director para Evento', 'success');
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

  if (!title) {
    alert('Por favor escribe el título de la alabanza');
    return;
  }

  if (songId) {
    // Editar
    const index = AppState.songs.findIndex(s => s.id === songId);
    if (index !== -1) {
      AppState.songs[index] = {
        ...AppState.songs[index],
        title, artist, category, originalKey, driveAudioUrl, notes, lyrics
      };
      if (AppState.currentSong && AppState.currentSong.id === songId) {
        AppState.currentSong = AppState.songs[index];
      }
    }
    showToast('Alabanza actualizada con éxito', 'success');
  } else {
    // Crear nueva
    const newSong = {
      id: 'song-' + Date.now(),
      title,
      artist,
      category,
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
      <input type="text" id="slot-search" placeholder="Filtrar alabanzas..." oninput="filterSlotOptions(this.value)" class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500">
    </div>
    <div id="slot-options-inner" class="max-h-72 overflow-y-auto space-y-2">
      <!-- Opciones dinámicas -->
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

  const matches = AppState.songs.filter(s => !q || s.title.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));

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
      <input type="text" id="slot-search" placeholder="Buscar canto..." oninput="filterEventOptions(this.value)" class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500">
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
  const matches = AppState.songs.filter(s => !q || s.title.toLowerCase().includes(q));

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
  const songParam = params.get('song');
  if (songParam) {
    openSongViewer(songParam);
  }
}

// Iniciar aplicación al cargar el DOM
document.addEventListener('DOMContentLoaded', initApp);
