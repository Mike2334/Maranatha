// Canciones de muestra para iniciar el cancionero del Ministerio Maranatha
const INITIAL_SONGS = [
  {
    id: "song-1",
    title: "Vienen con Alegría",
    artist: "Cesáreo Gabaráin",
    category: "Entrada",
    usageType: "misa",
    originalKey: "D",
    tempo: 120,
    timeSignature: "4/4",
    driveAudioUrl: "",
    notes: "Ritmo alegre de marcha. Guitarra con rasgueo dinámico.",
    lyrics: `[D]Vienen con alegría Señor,
cantando [A]vienen con alegría Señor,
los que caminan por la [D]vida Señor,
sembrando tu [A]paz y [D]amor.

[D]Vienen con alegría Señor,
cantando [A]vienen con alegría Señor,
los que caminan por la [D]vida Señor,
sembrando tu [A]paz y [D]amor.

[D]Vienen trayendo la esperanza,
a un mundo [G]cargado de an[D]siedad,
a un mundo que busca y que no [A]alcanza,
caminos de a[D]mor y de a[A]mis[D]tad.

[D]Vienen con alegría Señor,
cantando [A]vienen con alegría Señor,
los que caminan por la [D]vida Señor,
sembrando tu [A]paz y [D]amor.`
  },
  {
    id: "song-2",
    title: "Señor Ten Piedad",
    artist: "Tradicional",
    category: "Piedad",
    usageType: "misa",
    originalKey: "Em",
    tempo: 75,
    timeSignature: "4/4",
    driveAudioUrl: "",
    notes: "Tono solemne y penitencial.",
    lyrics: `[Em]Señor, ten piedad de no[B7]sotros,
[Em]Señor, ten piedad de no[B7]sotros.

[Am]Cristo, ten pie[Em]dad,
[B7]ten piedad de no[Em]sotros.
[Am]Cristo, ten pie[Em]dad,
[B7]ten piedad de no[Em]sotros.

[Em]Señor, ten piedad de no[B7]sotros,
[B7]ten piedad de no[Em]sotros.`
  },
  {
    id: "song-3",
    title: "Gloria a Dios en el Cielo (Giombini)",
    artist: "Marcello Giombini",
    category: "Gloria",
    usageType: "misa",
    originalKey: "G",
    tempo: 128,
    timeSignature: "4/4",
    driveAudioUrl: "",
    notes: "Rápido, con palmas y entusiasmo.",
    lyrics: `[G]Gloria, gloria a [C]Dios en el [D]cielo,
y en la [G]tierra [C]paz a los [D]hombres que ama el Se[G]ñor.

[G]Por tu inmensa gloria te ala[C]bamos,
te bende[D]cimos, te ado[G]ramos,
te glorifi[C]camos, te damos [D]gracias.

[G]Señor Dios, Rey celestial,
[C]Dios Padre todo[D]poderoso.
[G]Señor, Hijo único, Jesu[C]cristo,
Señor [D]Dios, Cordero de Dios, [G]Hijo del Padre.

[G]Gloria, gloria a [C]Dios en el [D]cielo,
y en la [G]tierra [C]paz a los [D]hombres que ama el Se[G]ñor.`
  },
  {
    id: "song-4",
    title: "Tu Palabra me da Vida",
    artist: "Juan Antonio Espinosa",
    category: "Aleluya / Aclamación",
    usageType: "misa",
    originalKey: "C",
    tempo: 90,
    timeSignature: "4/4",
    driveAudioUrl: "",
    notes: "Respuesta suave antes del Evangelio.",
    lyrics: `[C]Tu palabra me da [G]vida,
con[F]fío en ti Se[G]ñor.
[C]Tu palabra es e[F]terna,
[C]en ella [G]espe[C]raré.

[C]Dichoso el que con vida inta[F]chable
camina en la [G]ley del Se[C]ñor.
Dichoso el que guardando sus pre[F]ceptos
lo busca de [G]todo cora[C]zón.`
  },
  {
    id: "song-5",
    title: "Entre tus Manos",
    artist: "Ray Repp",
    category: "Ofertorio",
    usageType: "misa",
    originalKey: "D",
    tempo: 78,
    timeSignature: "3/4",
    driveAudioUrl: "",
    notes: "Tiempo de vals suave. Entrada con guitarra arpegiada.",
    lyrics: `[D]Entre tus [Em]manos [A7]está mi [D]vida, Señor.
[D]Entre tus [Em]manos [A7]pongo mi e[D]xistir.
[D7]Hay que mo[G]rir [A7]para vi[D]vir.
[Bm]Entre tus [Em]manos [A7]confío mi [D]ser.

[D]Si el grano de [Em]trigo no [A7]muere,
si no cae en la [D]tierra y se ahoga,
[D7]queda él [G]solo, [A7]pero si [D]muere,
[Bm]dará mucho [Em]fruto y vi[A7]da e[D]terna.`
  },
  {
    id: "song-6",
    title: "Santo es el Señor mi Dios (Giombini)",
    artist: "Marcello Giombini",
    category: "Santo",
    usageType: "misa",
    originalKey: "C",
    tempo: 110,
    timeSignature: "4/4",
    driveAudioUrl: "",
    notes: "Aclamación solemne y festiva.",
    lyrics: `[C]Santo, Santo, [G]Santo es el Señor,
[F]Dios del uni[G]verso.
[C]Llenos están el [G]cielo y la tierra
[F]de tu [G]gloria.

[C]Hosan[Am]na en el [F]cie[G]lo,
[C]Hosan[Am]na en el [F]cie[G]lo.

[C]Bendito el que [G]viene
[F]en el nombre del Se[G]ñor.
[C]Hosan[Am]na en el [F]cie[G]lo.`
  },
  {
    id: "song-7",
    title: "Cordero de Dios",
    artist: "Litúrgico",
    category: "Paz / Cordero",
    usageType: "misa",
    originalKey: "Dm",
    tempo: 70,
    timeSignature: "4/4",
    driveAudioUrl: "",
    notes: "Fracción del Pan. Tono recogido.",
    lyrics: `[Dm]Cordero de Dios, que [Gm]quitas el pecado del [A7]mundo,
ten pie[Dm]dad de nosotros, [Gm]ten pie[A7]dad.

[Dm]Cordero de Dios, que [Gm]quitas el pecado del [A7]mundo,
ten pie[Dm]dad de nosotros, [Gm]ten pie[A7]dad.

[Dm]Cordero de Dios, que [Gm]quitas el pecado del [A7]mundo,
[Bb]danos la [A7]paz, [Bb]danos la [A7]paz,
[Gm]danos la [Dm]paz.`
  },
  {
    id: "song-8",
    title: "Pescador de Hombres",
    artist: "Cesáreo Gabaráin",
    category: "Comunión",
    usageType: "ambos",
    originalKey: "C",
    tempo: 82,
    timeSignature: "4/4",
    driveAudioUrl: "",
    notes: "Comunión meditativa o retiro.",
    lyrics: `[C]Tú has venido a la [G]orilla,
[Am]no has buscado ni a [F]sabios ni a [G]ricos;
[C]tan solo [G]quieres que [C]yo te [C7]siga.

[F]Señor, [G]me has mirado a los [C]ojos,[Am]
sonri[Dm]endo, has [G]dicho mi [C]nombre.[C7]
[F]En la arena [G]he dejado mi [C]barca,[Am]
junto a [Dm]Ti, busca[G]ré otro [C]mar.`
  },
  {
    id: "song-9",
    title: "Nadie te ama como Yo",
    artist: "Martín Valverde",
    category: "Meditación / Adoración",
    usageType: "ambos",
    originalKey: "G",
    tempo: 68,
    timeSignature: "4/4",
    driveAudioUrl: "",
    notes: "Ideal para Hora Santa, Retiro y Meditación.",
    lyrics: `[G]Cuanto he espe[D]rado este mo[Em]mento,
cuanto he espe[C]rado que estu[Am]vieras a[D]sí.
[G]Cuanto he espe[D]rado que me ha[Em]blaras,
cuanto he espe[C]rado que vi[Am]nieras a [D]mí.

[G]Yo sé bien lo [D]que has vi[Em]vido,
y sé también por [C]qué has llo[Am]rado.
[G]Yo sé bien lo [D]que has su[Em]frido,
pues de tu [C]lado no me [Am]he i[D]do.

Pues [G]nadie te ama como [Em]yo,
pues [C]nadie te ama [Am]como [D]yo;
mira la [G]cruz, esa es mi más grande [Em]prueba,
nadie te [C]ama [Am]como [D]yo.`
  },
  {
    id: "song-10",
    title: "Al Pecho Llevo una Cruz",
    artist: "Animación",
    category: "Salida",
    usageType: "ambos",
    originalKey: "A",
    tempo: 125,
    timeSignature: "4/4",
    driveAudioUrl: "",
    notes: "Salida alegre o dinámica de animación.",
    lyrics: `[A]Al pecho llevo una cruz
y en mi corazón lo que dice Je[E]sús.
Yo sé que Él me ama, yo sé que Él me [A]llama,
al pecho llevo una cruz
y en mi corazón lo que dice Je[E]sús.

[A]Caminando por la vida voy cantando,
anunciando las ver[E]dades del Señor.
Que los hombres se amen como hermanos,
y que reine en este [A]mundo siempre Dios.`
  },
  // Canciones adicionales exclusivas de EVENTOS / RETIROS / VIGILIAS
  {
    id: "song-11",
    title: "Sumérgeme",
    artist: "Jesús Adrián Romero",
    category: "Adoración",
    usageType: "evento",
    originalKey: "C",
    tempo: 72,
    timeSignature: "4/4",
    driveAudioUrl: "",
    notes: "Canto íntimo para momentos de oración profunda en retiros.",
    lyrics: `[C]Cansado del camino,
sediento de [Em]ti,
un desierto he cru[F]zado,
sin fuerzas he que[Dm]dado,
vengo a [G]ti.

[C]Luché como soldado,
y a veces su[Em]frí,
y aunque la lucha he ga[F]nado,
mi armadura he des[Dm]gastado,
vengo a [G]ti.

Sumérge[C]me en el río de tu es[Em]píritu,
necesito ba[F]ñarme en tu pre[Dm]sencia,
sumérge[G]me.
Sumérge[C]me en el río de tu es[Em]píritu,
necesito ba[F]ñarme en tu pre[Dm]sencia,
sumérge[G]me, Señor.`
  },
  {
    id: "song-12",
    title: "Hay una Unción Aquí",
    artist: "Inspiración",
    category: "Adoración",
    usageType: "evento",
    originalKey: "G",
    tempo: 68,
    timeSignature: "4/4",
    driveAudioUrl: "",
    notes: "Clamor en vigilias o efusión en retiros.",
    lyrics: `[G]Hay una unción a[C]quí,
[D]cayendo sobre [G]mí,[D/F#]
[Em]mudándome, sa[Am]nando mi ser,
[C]mi corazón sa[D]ciando está.

[G]Hay una unción a[C]quí,
[D]cayendo sobre [G]mí,[D/F#]
[Em]mudándome, sa[Am]nando mi ser,
[C]mi corazón sa[D]ciando es[G]tá.

Mi espíritu y mi [C]alma,
se están lle[D]nando,
con el poder del Es[Bm]píritu Santo,[Em]
mi vida nunca [Am]más [D]será igual.[G]`
  },
  {
    id: "song-13",
    title: "Cantaré al Señor por Siempre",
    artist: "Júbilo",
    category: "Animación",
    usageType: "evento",
    originalKey: "Dm",
    tempo: 135,
    timeSignature: "4/4",
    driveAudioUrl: "",
    notes: "Alabanza rápida y jubilosa con batería y percusión.",
    lyrics: `[Dm]Cantaré al Señor por siempre,
su diestra es todo po[C]der.
[Dm]Cantaré al Señor por siempre,
su diestra es todo po[C]der.

[C]Echó a la mar, quien los perse[Dm]guía,
[C]jinete y caballo echó a la [Dm]mar.
[C]Echó a la mar, los carros del fi[Dm]sió,
[F]Lara lara [C]la la la,
[Gm]Lara lara [A7]la la la,
[Dm]mi Padre es Dios y yo le alabo.`
  }
];

const INITIAL_MASS_SETLIST = {
  id: "misa-domingo-ordinario",
  title: "Misa Dominical - Tiempo Ordinario",
  date: "2026-11-08",
  notes: "Coro completo. Ensayo 30 min antes.",
  slots: {
    entrada: "song-1",
    piedad: "song-2",
    gloria: "song-3",
    salmo: "",
    aleluya: "song-4",
    ofertorio: "song-5",
    santo: "song-6",
    cordero: "song-7",
    comunion: "song-8",
    meditacion: "song-9",
    salida: "song-10"
  }
};

const INITIAL_EVENT_SETLIST = {
  id: "evento-vigilia-adoracion",
  title: "Vigilia y Concierto de Adoración 'Maranatha'",
  date: "2026-11-20",
  location: "Parroquia Central",
  notes: "Llevar cables de repuesto y micrófono inalámbrico para animación.",
  songs: [
    { songId: "song-13", key: "Dm", note: "Inicio alegre y dinámico con percusión" },
    { songId: "song-1", key: "D", note: "Animación con la asamblea" },
    { songId: "song-11", key: "C", note: "Inicio de adoración y arrepentimiento" },
    { songId: "song-12", key: "G", note: "Clamor al Espíritu Santo con Santísimo" },
    { songId: "song-9", key: "G", note: "Momento íntimo de adoración con Santísimo" },
    { songId: "song-10", key: "A", note: "Cierre dinámico con aplausos y bendición" }
  ]
};
