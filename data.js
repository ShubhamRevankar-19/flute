/* ===== Flute demo data — replace freely ===== */
// Set to true after you add MP3s to /music (file name = song title, lowercase, dashes; see SONGS.src).
// While false, Flute plays a short synthesized tune per song so the player works out of the box.
const USE_LOCAL_FILES = false;

const ARTISTS = ['Aria Vale','Neon Harbor','Kabir Rao','Luna Sethi','The Midnight Owls','Zara Quinn','Dev Malhotra','Ivy Monroe','Rhea Kapoor','Echo Drift']
  .map((name, id) => ({ id, name, h: id * 36 + 10, followers: (120 + id * 87) * 1000 }));

const ALBUMS = ['Midnight Dreams','Neon Tides','Monsoon Letters','Golden Hour','Afterglow','Velvet Sky','City Lights','Paper Hearts','Static Bloom','Horizon']
  .map((title, id) => ({ id, title, ar: id, h: id * 36, year: 2016 + id }));

const TITLES = ['Dreams','Neon Rain','Barsaat Wali Raat','Golden Hour','Afterglow','Velvet Sky','City Lights','Paper Hearts','Static Bloom','Horizon',
  'Midnight Drive','Tidal Love','Tere Khayal','Sunlit Streets','Slow Burn','Blue Horizon','Night Owl','Dil Ki Baat','Wildfire','Echoes'];

// cover: add e.g. "assets/album/dreams.jpg" later; currently gradient covers are generated from `h`
const SONGS = TITLES.map((title, id) => {
  const al = id % 10;
  return { id, title, ar: al, al, h: al * 36, dur: 150 + (id * 37) % 110,
    src: 'music/' + title.toLowerCase().replace(/\W+/g, '-') + '.mp3' };
});

const PLAYLISTS = [
  { id: 'p1', name: 'My Playlist',  desc: 'Your personal mix',          songs: [0, 3, 6, 9, 12] },
  { id: 'p2', name: 'Chill Vibes',  desc: 'Slow down and unwind',       songs: [1, 4, 7, 10, 13, 16] },
  { id: 'p3', name: 'Workout',      desc: 'High energy to keep you moving', songs: [2, 5, 8, 11, 14, 17] },
  { id: 'p4', name: 'Romantic',     desc: 'Songs for the heart',        songs: [15, 18, 19, 3] },
  { id: 'p5', name: 'Hindi Hits',   desc: 'Today\'s top Hindi tracks',  songs: [2, 11, 17, 6, 9] }
];

// Static demo lyrics. Each line carries data-t so timestamps can be added for synced lyrics later.
const LYRICS = ['When the night begins to shine','And the music feels alive','Every heartbeat finds its rhythm','Under this electric sky','','Hold on to the moment','Let the melody take flight','Feel the music, live the moment','We are dancing through the night'];
