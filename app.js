/* Flute – app logic: state, views/router, search, playlists, player. */
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = t => isFinite(t) && t >= 0 ? Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0') : '0:00';

/* ---------- Persistent state (localStorage) ---------- */
const store = {
  get: (k, d) => { try { const v = JSON.parse(localStorage.getItem('flute_' + k)); return v ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem('flute_' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } }
};
let liked = store.get('liked', []), pls = store.get('pls', JSON.parse(JSON.stringify(PLAYLISTS))),
  recent = store.get('recent', []), rs = store.get('rs', []), follow = store.get('follow', []), signed = store.get('signed', true);
let cfg = Object.assign({ dark: true, autoplay: true, hq: true, notif: true, vol: 80, lang: 'English' }, store.get('cfg', {}));
const save = () => { store.set('liked', liked); store.set('pls', pls); store.set('recent', recent); store.set('rs', rs); store.set('follow', follow); store.set('signed', signed); store.set('cfg', cfg); };
const toast = m => { const t = document.createElement('div'); t.className = 'toast-f'; t.textContent = m; $('#toasts').append(t); setTimeout(() => t.remove(), 2200); };

/* ---------- Small template helpers ---------- */
const cov = (h, c = '', ic = 'music-note-beamed') => `<div class="cover ${c}" style="--h:${h}"><i class="bi bi-${ic}"></i></div>`;
const A = s => ARTISTS[s.ar].name;
const alIds = id => SONGS.filter(s => s.al === id).map(s => s.id);
const pHue = p => (p.name.length * 37) % 360;
const dots = (id, rm = '') => `<button class="ib dots" data-menu="${id}" data-rm="${rm}" aria-label="More options"><i class="bi bi-three-dots"></i></button>`;
const heart = id => `<button class="ib" data-like="${id}" aria-label="Like"><i class="bi ${liked.includes(id) ? 'bi-heart-fill text-danger' : 'bi-heart'}"></i></button>`;
const sec = (t, body, cls = 'hs') => `<section class="mb-4"><h2 class="h5 fw-bold mb-3">${t}</h2><div class="${cls}">${Array.isArray(body) ? body.join('') : body}</div></section>`;
const songCard = s => `<div class="fcard" data-play="${s.id}">${cov(s.h)}<button class="pbtn" aria-label="Play"><i class="bi bi-play-fill"></i></button><div class="ct">${s.title}</div><div class="cs">${A(s)}</div><div class="cd">${dots(s.id)}</div></div>`;
const listCard = (go, h, t, sub, ids) => `<div class="fcard" data-go="${go}">${cov(h)}<button class="pbtn" data-pall="${ids}" aria-label="Play"><i class="bi bi-play-fill"></i></button><div class="ct">${t}</div><div class="cs">${sub}</div></div>`;
const plCard = p => listCard('#/playlist/' + p.id, pHue(p), p.name, p.songs.length + ' songs', p.songs);
const albCard = a => listCard('#/album/' + a.id, a.h, a.title, ARTISTS[a.ar].name, alIds(a.id));
const artCard = a => `<div class="fcard art" data-go="#/artist/${a.id}"><div class="cover round" style="--h:${a.h}"><i class="bi bi-person-fill"></i></div><div class="ct">${a.name}</div><div class="cs">Artist</div></div>`;
const row = (s, i, rm = '') => `<div class="srow ${s.id === cur ? 'on' : ''}" data-play="${s.id}"><span class="num">${i + 1}</span>${cov(s.h, 'sm')}<div class="min"><div class="t">${s.title}</div><a class="a" href="#/artist/${s.ar}">${A(s)}</a></div><span class="alb min">${ALBUMS[s.al].title}</span>${heart(s.id)}<span class="dur">${fmt(s.dur)}</span>${dots(s.id, rm)}</div>`;
const rows = arr => arr.length ? arr.map((s, i) => row(s, i)).join('') : '<div class="empty">Nothing here yet.</div>';

/* Detail view for playlists and albums */
function detail({ title, desc, h, ids, type, id, owner }) {
  const ss = ids.map(i => SONGS[i]), tot = ss.reduce((a, s) => a + s.dur, 0);
  return `<div class="ahead">${cov(h, 'xl')}<div><small>${type}</small><h1>${title}</h1><p class="text-secondary mb-1">${desc}</p><p>${ss.length} songs • ${Math.floor(tot / 60)} min</p>
  <div class="d-flex gap-2 flex-wrap"><button class="btn btn-flute" data-pall="${ids}"><i class="bi bi-play-fill"></i> Play</button>
  <button class="btn btn-outline-light rounded-pill" data-pall="${ids}" data-sh="1"><i class="bi bi-shuffle"></i> Shuffle</button>
  ${owner ? `<button class="btn btn-outline-light rounded-pill" data-rename="${id}">Rename</button><button class="btn btn-outline-danger rounded-pill" data-delpl="${id}">Delete</button>` : ''}</div></div></div>
  <div class="srow head"><span>#</span><span></span><span>Song</span><span class="alb">Album</span><span></span><span class="dur"><i class="bi bi-clock"></i></span><span></span></div>
  <div class="list">${ss.length ? ss.map((s, i) => row(s, i, owner ? id : '')).join('') : '<div class="empty">This playlist is empty. Use ⋯ on any song → Add to Playlist.</div>'}</div>`;
}

/* ---------- Views ---------- */
let lib = { tab: 'Playlists', sort: 'Recently Added' };
const views = {
  home() {
    const h = new Date().getHours(), g = h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening';
    const rp = (recent.length ? recent : [0, 1, 2, 3, 4, 5]).slice(0, 10).map(i => SONGS[i]);
    return `<div class="hero"><h1>Good ${g}, ${signed ? 'Shubham' : 'Guest'} 👋</h1><p>What do you want to listen to today?</p><em>Feel the Music. Live the Moment.</em></div>`
      + sec('Recently Played', rp.map(songCard)) + sec('Made For You', pls.map(plCard))
      + sec('Trending Songs', SONGS.slice(0, 8).map((s, i) => row(s, i)), 'list')
      + sec('Popular Artists', ARTISTS.map(artCard)) + sec('Popular Albums', ALBUMS.map(albCard))
      + sec('Recommended For You', SONGS.slice(8).map(songCard), 'grid');
  },
  search(q = '') {
    q = q.trim();
    if (!q) return `<h1 class="h3 my-4">Search</h1>` + sec('Recently searched', rs.length ? rs.map(x => `<a class="chip" href="#/search/${encodeURIComponent(x)}"><i class="bi bi-clock-history"></i> ${x}</a>`) : '<span class="text-secondary">No recent searches</span>', 'd-block')
      + sec('Popular searches', ['Aria Vale', 'Neon', 'Chill Vibes', 'Workout', 'Hindi Hits', 'Horizon', 'Midnight'].map(x => `<a class="chip" href="#/search/${encodeURIComponent(x)}">${x}</a>`), 'd-block')
      + sec('Browse all', ALBUMS.map(albCard));
    const m = t => t.toLowerCase().includes(q.toLowerCase());
    const ss = SONGS.filter(s => m(s.title) || m(A(s)) || m(ALBUMS[s.al].title)), ar = ARTISTS.filter(a => m(a.name)),
      al = ALBUMS.filter(a => m(a.title) || m(ARTISTS[a.ar].name)), pl = pls.filter(p => m(p.name) || m(p.desc));
    const out = (ss.length ? sec('Songs', ss.map((s, i) => row(s, i)), 'list') : '') + (ar.length ? sec('Artists', ar.map(artCard)) : '')
      + (al.length ? sec('Albums', al.map(albCard)) : '') + (pl.length ? sec('Playlists', pl.map(plCard)) : '');
    return `<h1 class="h4 my-4">Results for “${q.replace(/</g, '&lt;')}”</h1>` + (out || '<div class="empty">No matches found. Try another search.</div>');
  },
  library() {
    const srt = (arr, nm) => lib.sort === 'Alphabetical' ? [...arr].sort((a, b) => nm(a).localeCompare(nm(b))) : lib.sort === 'Recently Played' ? [...arr].reverse() : arr;
    const body = { Playlists: () => sec('', srt(pls, p => p.name).map(plCard), 'grid'), Songs: () => `<div class="list">${srt(SONGS, s => s.title).map((s, i) => row(s, i)).join('')}</div>`,
      Albums: () => sec('', srt(ALBUMS, a => a.title).map(albCard), 'grid'), Artists: () => sec('', srt(ARTISTS, a => a.name).map(artCard), 'grid') }[lib.tab]();
    return `<h1 class="h3 my-4">Your Library</h1><div class="d-flex justify-content-between flex-wrap gap-2 mb-4"><div class="tabs">${['Playlists', 'Songs', 'Albums', 'Artists'].map(t => `<button data-tab="${t}" class="${t === lib.tab ? 'on' : ''}">${t}</button>`).join('')}</div>
    <select class="form-select w-auto" data-sort>${['Recently Added', 'Recently Played', 'Alphabetical'].map(o => `<option ${o === lib.sort ? 'selected' : ''}>${o}</option>`).join('')}</select></div>` + body;
  },
  playlist(id) { const p = pls.find(x => x.id === id); return p ? detail({ title: p.name, desc: p.desc, h: pHue(p), ids: p.songs, type: 'Playlist', id: p.id, owner: true }) : views.nf(); },
  album(id) { const a = ALBUMS[+id]; return a ? detail({ title: a.title, desc: `${ARTISTS[a.ar].name} • ${a.year}`, h: a.h, ids: alIds(a.id), type: 'Album' }) : views.nf(); },
  artist(id) {
    const a = ARTISTS[+id]; if (!a) return views.nf();
    const ss = SONGS.filter(s => s.ar === a.id), f = follow.includes(a.id);
    return `<div class="ahead"><div class="cover round xl" style="--h:${a.h}"><i class="bi bi-person-fill"></i></div><div><small><i class="bi bi-patch-check-fill text-primary"></i> Verified Artist</small><h1>${a.name}</h1><p class="text-secondary">${a.followers.toLocaleString()} followers</p>
    <button class="btn btn-flute me-2" data-pall="${ss.map(s => s.id)}">Play</button><button class="btn btn-outline-light rounded-pill" data-follow="${a.id}">${f ? 'Following' : 'Follow'}</button></div></div>`
      + sec('Popular Songs', ss.map((s, i) => row(s, i)), 'list') + sec('Albums', ALBUMS.filter(x => x.ar === a.id).map(albCard)) + sec('Singles', ss.map(songCard))
      + sec('Related Artists', ARTISTS.filter(x => x.id !== a.id).slice(0, 7).map(artCard));
  },
  liked() { return `<h1 class="h3 my-4">Liked Songs</h1><div class="list">${liked.length ? rows(liked.map(i => SONGS[i])) : '<div class="empty">Tap the ♡ on any song to save it here.</div>'}</div>`; },
  recent() { return `<h1 class="h3 my-4">Recently Played</h1><div class="list">${recent.length ? rows(recent.map(i => SONGS[i])) : '<div class="empty">Play something and it will show up here.</div>'}</div>`; },
  queue() { return `<h1 class="h3 my-4">Queue</h1><div class="list">${queue.length ? rows(queue.map(i => SONGS[i])) : '<div class="empty">Your queue is empty.</div>'}</div>`; },
  profile() { return `<div class="ahead"><div class="cover round xl" style="--h:270"><i class="bi bi-person-fill"></i></div><div><small>Profile</small><h1>${signed ? 'Shubham' : 'Guest'}</h1><p class="text-secondary">${pls.length} playlists • ${liked.length} liked songs</p></div></div>`; },
  settings() {
    const sw = (k, l) => `<div class="form-check form-switch mb-2"><input class="form-check-input" type="checkbox" id="c${k}" data-cfg="${k}" ${cfg[k] ? 'checked' : ''}><label class="form-check-label" for="c${k}">${l}</label></div>`;
    return `<h1 class="h3 my-4">Settings</h1><div class="glass p-4 set">${sw('dark', 'Dark mode')}${sw('autoplay', 'Autoplay')}${sw('hq', 'High-quality audio')}${sw('notif', 'Notifications')}
    <label class="mt-3">Volume</label><input type="range" class="form-range" data-cfg="vol" min="0" max="100" value="${cfg.vol}">
    <label class="mt-3">Language</label><select class="form-select" data-cfg="lang">${['English', 'Hindi', 'Marathi', 'Spanish'].map(l => `<option ${cfg.lang === l ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`;
  },
  nf() { return '<div class="empty">Page not found.</div>'; }
};

/* ---------- Router ---------- */
function route() {
  const [pg = 'home', arg = ''] = location.hash.replace(/^#\//, '').split('/'), v = $('#view');
  v.classList.remove('in'); v.innerHTML = (views[pg] || views.nf)(decodeURIComponent(arg)); void v.offsetWidth; v.classList.add('in');
  $$('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === pg));
  scrollTo(0, 0);
}
function renderSide() {
  $('#plList').innerHTML = pls.map(p => `<a class="sl" href="#/playlist/${p.id}"><i class="bi bi-music-note-list"></i> ${p.name}</a>`).join('');
  $('#sug').innerHTML = [...SONGS.map(s => s.title), ...ARTISTS.map(a => a.name), ...ALBUMS.map(a => a.title)].map(x => `<option value="${x}">`).join('');
  $('#logout span').textContent = signed ? 'Logout' : 'Sign in'; $('#badge').style.display = cfg.notif ? '' : 'none';
}

/* ---------- Playlists & likes ---------- */
function like(id) {
  liked = liked.includes(id) ? liked.filter(x => x !== id) : [...liked, id]; save();
  toast(liked.includes(id) ? 'Added to Liked Songs' : 'Removed from Liked Songs');
  if (location.hash === '#/liked') route(); else syncLikes();
}
function syncLikes() {
  $$('[data-like]').forEach(b => b.innerHTML = `<i class="bi ${liked.includes(+b.dataset.like) ? 'bi-heart-fill text-danger' : 'bi-heart'}"></i>`);
  $$('[data-like-np]').forEach(b => b.innerHTML = `<i class="bi ${liked.includes(cur) ? 'bi-heart-fill text-danger' : 'bi-heart'}"></i>`);
}
function createPlaylist() {
  const name = (prompt('Playlist name:') || '').trim(); if (!name) return;
  const p = { id: 'u' + Date.now(), name, desc: 'Custom playlist', songs: [] }; pls.push(p); save(); renderSide(); location.hash = '#/playlist/' + p.id;
}

/* ---------- Three-dot context menu ---------- */
let menuId = -1;
function openMenu(id, e, rm) {
  menuId = id; const ctx = $('#ctx');
  ctx.innerHTML = `<button data-m="play"><i class="bi bi-play-fill"></i> Play</button><button data-m="like"><i class="bi ${liked.includes(id) ? 'bi-heart-fill text-danger' : 'bi-heart'}"></i> ${liked.includes(id) ? 'Unlike' : 'Like'}</button>
  <button data-m="add"><i class="bi bi-plus-lg"></i> Add to Playlist</button>${rm ? `<button data-m="rm" data-pl="${rm}"><i class="bi bi-dash-circle"></i> Remove from playlist</button>` : ''}
  <button data-m="share"><i class="bi bi-box-arrow-up-right"></i> Share</button><button data-m="view"><i class="bi bi-info-circle"></i> View Song</button>`;
  ctx.style.left = Math.max(8, Math.min(e.clientX, innerWidth - 210)) + 'px'; ctx.style.top = Math.max(8, Math.min(e.clientY, innerHeight - 260)) + 'px'; ctx.classList.add('show');
}
function menuAction(b) {
  const a = b.dataset.m, s = SONGS[menuId];
  if (a === 'play') play(menuId, [menuId]);
  else if (a === 'like') like(menuId);
  else if (a === 'add') { $('#ctx').innerHTML = pls.map(p => `<button data-addto="${p.id}"><i class="bi bi-music-note-list"></i> ${p.name}</button>`).join(''); return true; }
  else if (a === 'rm') { const p = pls.find(x => x.id === b.dataset.pl); p.songs = p.songs.filter(x => x !== menuId); save(); route(); toast('Removed from ' + p.name); }
  else if (a === 'share') { const url = location.href.split('#')[0] + '#/album/' + s.al; (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast('Link copied'), () => toast('Share: ' + url)); }
  else if (a === 'view') location.hash = '#/album/' + s.al;
}

/* ---------- Audio player ---------- */
const au = new Audio(); let cur = -1, queue = [], shuf = false, rep = 0; const urls = {};
/* No MP3s? Synthesize a short 8-bit WAV melody per song so the player works out of the box. */
function synth(id) {
  const sr = 8000, n = sr * 24, b = new Uint8Array(44 + n), d = new DataView(b.buffer), w = (o, s) => [...s].forEach((c, i) => b[o + i] = c.charCodeAt(0));
  w(0, 'RIFF'); d.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true);
  d.setUint32(24, sr, true); d.setUint32(28, sr, true); d.setUint16(32, 1, true); d.setUint16(34, 8, true); w(36, 'data'); d.setUint32(40, n, true);
  const sc = [0, 2, 4, 7, 9], base = 180 + id * 9, step = sr * 0.4;
  for (let i = 0; i < n; i++) { const k = Math.floor(i / step), f = base * 2 ** (sc[(k * 3 + id) % 5] / 12), env = 1 - (i % step) / step; b[44 + i] = 128 + Math.sin(2 * Math.PI * f * i / sr) * 55 * env; }
  return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
}
function play(id, q) {
  if (q && q.length) queue = q.slice();
  cur = id; urls[id] = urls[id] || (USE_LOCAL_FILES ? SONGS[id].src : synth(id)); au.src = urls[id]; au.play().catch(() => { });
  recent = [id, ...recent.filter(x => x !== id)].slice(0, 20); save(); ui();
}
function step(d) {
  if (!queue.length) return; const i = queue.indexOf(cur);
  play(queue[shuf ? Math.floor(Math.random() * queue.length) : (i + d + queue.length) % queue.length]);
}
function toggle() { if (cur < 0) return play(0, SONGS.map(s => s.id)); au.paused ? au.play() : au.pause(); }
function act(a) {
  ({ play: toggle, next: () => step(1), prev: () => au.currentTime > 3 ? au.currentTime = 0 : step(-1),
    shuf: () => { shuf = !shuf; ui(); toast('Shuffle ' + (shuf ? 'on' : 'off')); }, rep: () => { rep = (rep + 1) % 3; ui(); toast(['Repeat off', 'Repeat all', 'Repeat one'][rep]); },
    openfs: () => $('#fs').classList.add('open'), closefs: () => $('#fs').classList.remove('open'), lyrics: () => $('#lyr').classList.toggle('show') })[a]();
}
au.onended = () => { if (rep === 2) { au.currentTime = 0; au.play(); } else if (cfg.autoplay && (rep === 1 || shuf || queue.indexOf(cur) < queue.length - 1)) step(1); else ui(); };
au.ontimeupdate = () => { $$('.cur').forEach(e => e.textContent = fmt(au.currentTime)); if (au.duration) $$('.seek').forEach(e => e.value = au.currentTime / au.duration * 1000); };
au.onloadedmetadata = () => $$('.tot').forEach(e => e.textContent = fmt(au.duration));
au.onplay = au.onpause = () => ui();
/* Refresh every player-related element */
function ui() {
  const s = SONGS[cur], playing = !au.paused && cur >= 0;
  $$('.np-title').forEach(e => e.textContent = s ? s.title : 'Nothing playing'); $$('.np-artist').forEach(e => e.textContent = s ? A(s) : 'Pick a song');
  $$('.np-cover').forEach(e => { e.innerHTML = cov(s ? s.h : 270); e.classList.toggle('spin', playing); });
  $$('[data-act=play] i').forEach(i => i.className = 'bi bi-' + (playing ? 'pause-fill' : 'play-fill'));
  $$('[data-act=shuf]').forEach(b => b.classList.toggle('on', shuf)); $$('[data-act=rep]').forEach(b => { b.classList.toggle('on', rep > 0); b.firstChild.className = 'bi bi-repeat' + (rep === 2 ? '-1' : ''); });
  $$('.srow').forEach(r => r.classList.toggle('on', +r.dataset.play === cur)); $('#lyr').innerHTML = LYRICS.map((l, i) => `<p data-t="${i * 10}">${l || '&nbsp;'}</p>`).join('');
  syncLikes();
}

/* ---------- Global events (delegation) ---------- */
document.addEventListener('click', e => {
  const t = e.target, c = sel => t.closest(sel);
  if (c('#ctx')) { const b = c('[data-m]'), ad = c('[data-addto]'); if (ad) { const p = pls.find(x => x.id === ad.dataset.addto); if (!p.songs.includes(menuId)) { p.songs.push(menuId); save(); toast('Added to ' + p.name); } else toast('Already in ' + p.name); }
    else if (b && menuAction(b)) return; $('#ctx').classList.remove('show'); return; }
  $('#ctx').classList.remove('show');
  let x;
  if ((x = c('[data-menu]'))) { e.stopPropagation(); openMenu(+x.dataset.menu, e, x.dataset.rm); }
  else if ((x = c('[data-like]'))) like(+x.dataset.like);
  else if (c('[data-like-np]')) cur >= 0 && like(cur);
  else if ((x = c('[data-act]'))) act(x.dataset.act);
  else if ((x = c('[data-pall]'))) { e.stopPropagation(); const ids = x.dataset.pall.split(',').filter(Boolean).map(Number); if (!ids.length) return toast('Nothing to play yet'); shuf = !!x.dataset.sh; play(shuf ? ids[Math.floor(Math.random() * ids.length)] : ids[0], ids); }
  else if ((x = c('[data-follow]'))) { const id = +x.dataset.follow; follow = follow.includes(id) ? follow.filter(i => i !== id) : [...follow, id]; save(); x.textContent = follow.includes(id) ? 'Following' : 'Follow'; }
  else if ((x = c('[data-rename]'))) { const p = pls.find(i => i.id === x.dataset.rename), n = (prompt('Rename playlist:', p.name) || '').trim(); if (n) { p.name = n; save(); renderSide(); route(); } }
  else if ((x = c('[data-delpl]'))) { if (confirm('Delete this playlist?')) { pls = pls.filter(i => i.id !== x.dataset.delpl); save(); renderSide(); location.hash = '#/library'; } }
  else if ((x = c('[data-tab]'))) { lib.tab = x.dataset.tab; route(); }
  else if ((x = c('[data-play]')) && !c('a')) play(+x.dataset.play, $$('[data-play]', x.parentElement).map(r => +r.dataset.play));
  else if ((x = c('[data-go]'))) location.hash = x.dataset.go;
  else if (c('#bar .np') && innerWidth < 992 && cur >= 0) $('#fs').classList.add('open');
  else if (c('#newPl')) { e.preventDefault(); createPlaylist(); }
  else if (c('#logout')) { e.preventDefault(); signed = !signed; save(); renderSide(); route(); toast(signed ? 'Signed in (demo)' : 'Logged out (demo)'); }
});
document.addEventListener('change', e => {
  const t = e.target; if (t.matches('[data-sort]')) { lib.sort = t.value; route(); }
  if (t.matches('[data-cfg]')) { const k = t.dataset.cfg; cfg[k] = t.type === 'checkbox' ? t.checked : t.type === 'range' ? +t.value : t.value; save();
    if (k === 'dark') document.body.classList.toggle('light', !cfg.dark); if (k === 'vol') setVol(cfg.vol); if (k === 'notif') renderSide(); toast('Setting saved'); }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.matches('.seek') && au.duration) au.currentTime = t.value / 1000 * au.duration;
  if (t.matches('.vol')) { cfg.vol = +t.value; setVol(cfg.vol); save(); }
  if (t.matches('[data-cfg=vol]')) setVol(+t.value);
});
function setVol(v) { au.volume = v / 100; $$('.vol').forEach(e => e.value = v); }
/* Top search: live results; Enter stores the term in "recently searched" */
$('#q').addEventListener('input', e => {
  const u = '#/search/' + encodeURIComponent(e.target.value);
  if (location.hash.startsWith('#/search')) { history.replaceState(null, '', u); route(); } else location.hash = u;
});
$('#q').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.value.trim()) { rs = [e.target.value.trim(), ...rs.filter(x => x !== e.target.value.trim())].slice(0, 8); save(); } });
document.addEventListener('keydown', e => { if (e.code === 'Space' && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) { e.preventDefault(); toggle(); } });
addEventListener('hashchange', route);

/* ---------- Init ---------- */
document.body.classList.toggle('light', !cfg.dark); setVol(cfg.vol); renderSide(); route(); ui();
