/* ==========================================================
vibes·arr — interaksi utama
nav • reveal • flip • filter • player audio lokal
YouTube IFrame API (fetch API + auto-next + loop)
progres baca • footer tahun
========================================================== */

const $  = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const THUMB_FALLBACK = '/images/placeholder.svg';

function init() {
  document.documentElement.classList.add('js');

  /* ---------- 1. nav mobile ---------- */
  const navBtn = $('#navBtn');
  const siteNav = $('#siteNav');

  if (navBtn && siteNav) {
    navBtn.addEventListener('click', () => {
      const open = siteNav.classList.toggle('open');
      navBtn.classList.toggle('open', open);
      navBtn.setAttribute('aria-expanded', String(open));
    });
    $$('a', siteNav).forEach((a) => a.addEventListener('click', () => {
      siteNav.classList.remove('open');
      navBtn.classList.remove('open');
      navBtn.setAttribute('aria-expanded', 'false');
    }));
  }

  /* ---------- 2. reveal on scroll ---------- */
  $$('[data-stagger]').forEach((parent) => {
    $$('.rv', parent).forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i * 65, 520)}ms`;
    });
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
  $$('.rv').forEach((el) => io.observe(el));

  /* ---------- 3. kata berganti ---------- */
  const flip = $('#flipWord');
  if (flip) {
    const words = [
      ['lagu', 'var(--c-listen)'],
      ['film', 'var(--c-watch)'],
      ['manga', 'var(--c-read)'],
      ['game', 'var(--c-games)'],
    ];
    let wi = 0;
    setInterval(() => {
      flip.classList.add('swap');
      setTimeout(() => {
        wi = (wi + 1) % words.length;
        flip.textContent = words[wi][0];
        flip.style.color = words[wi][1];
        flip.classList.remove('swap');
      }, 270);
    }, 2400);
  }

  /* ---------- 4. filter kategori ---------- */
  const filterTargets = $$('.track, .book');
  const filterGroups = $$('.group');

  $$('.fbtn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Ambil ulang semua trek dan grup setiap kali filter diklik
      const filterTargets = $$('.track, .book');
      const filterGroups  = $$('.group');
      
      // Update visual tombol aktif
      $$('.fbtn').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      
      const f = btn.dataset.filter;
      
      // Filter trek
      filterTargets.forEach(item => {
        item.hidden = !(f === 'all' || item.dataset.cat === f);
      });
      
      // Sembunyikan grup yang tidak punya trek visible
      filterGroups.forEach(g => {
        g.hidden = !$$('.track', g).some(t => !t.hidden);
      });
    });
  });

  /* ==========================================================
     BAGIAN A — PLAYER AUDIO LOKAL
     ========================================================== */
  const nowbar = $('#nowbar');
  let audio = null;
  let curAudioTrack = null;

  if (nowbar) {
    audio = new Audio();
    const nbTitle = $('#nbTitle'), nbArtist = $('#nbArtist');
    const nbPlay = $('#nbPlay'), nbPrev = $('#nbPrev'), nbNext = $('#nbNext');
    const nbBar = $('#nbBar'), nbFill = $('#nbFill');
    const nbCur = $('#nbCur'), nbDur = $('#nbDur');
    const baseTitle = document.title;

    const fmt = (s) => {
      if (!isFinite(s)) return '0:00';
      return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    };
    const playableAudio = () => $$('.track').filter((t) => t.dataset.src && !t.hidden);
    const setUI = (playing) => {
      nbPlay.textContent = playing ? '❚❚' : '▶';
      nowbar.classList.toggle('playing', playing);
    };

    function selectAudio(track, autoplay = true) {
      if (!track || !track.dataset.src) return;
      stopYt();

      $$('.track.playing').forEach((t) => {
        t.classList.remove('playing');
        const b = $('.t-play', t);
        if (b && !b.disabled) b.textContent = (t.dataset.src || t.dataset.yt) ? '▶' : '✕';
      });

      curAudioTrack = track;
      track.classList.add('playing');
      const btn = $('.t-play', track);
      if (btn) btn.textContent = '❚❚';

      audio.src = track.dataset.src;
      nbTitle.textContent = $('.t-info strong', track)?.textContent ?? '—';
      nbArtist.textContent = $('.t-info span', track)?.textContent ?? '—';
      nowbar.classList.add('show');
      nbFill.style.width = '0%';
      nbCur.textContent = '0:00';
      nbDur.textContent = '0:00';
      if (autoplay) audio.play().catch(() => setUI(false));
    }

    function stepAudio(dir) {
      const list = playableAudio();
      if (!list.length) return;
      const i = list.indexOf(curAudioTrack);
      selectAudio(list[(i + dir + list.length) % list.length]);
    }

    audio.addEventListener('timeupdate', () => {
      if (audio.duration) {
        nbFill.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
        nbCur.textContent = fmt(audio.currentTime);
      }
    });
    audio.addEventListener('loadedmetadata', () => { nbDur.textContent = fmt(audio.duration); });
    audio.addEventListener('play', () => { setUI(true); document.title = `▶ ${nbTitle.textContent} — vibes·arr`; });
    audio.addEventListener('pause', () => { setUI(false); document.title = baseTitle; });
    audio.addEventListener('ended', () => {
      const list = playableAudio();
      if (list.indexOf(curAudioTrack) === list.length - 1) setUI(false);
      else stepAudio(1);
    });

    nbPlay.addEventListener('click', () => {
      if (currentYtTrack && ytPlayer) {
        isYtPlaying ? ytPlayer.pauseVideo() : ytPlayer.playVideo();
        return;
      }
      if (!curAudioTrack) {
        const first = playableAudio()[0];
        if (first) selectAudio(first);
        return;
      }
      audio.paused ? audio.play() : audio.pause();
    });
    nbPrev.addEventListener('click', () => { currentYtTrack ? stepYt(-1) : stepAudio(-1); });
    nbNext.addEventListener('click', () => { currentYtTrack ? stepYt(1) : stepAudio(1); });
    nbBar.addEventListener('click', (e) => {
      const r = nbBar.getBoundingClientRect();
      const ratio = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
      if (currentYtTrack && ytPlayer && typeof ytPlayer.seekTo === 'function') {
        const durT = ytPlayer.getDuration() || 0;
        if (durT) ytPlayer.seekTo(ratio * durT, true);
        return;
      }
      if (!audio.duration) return;
      audio.currentTime = ratio * audio.duration;
    });

    $$('.track').forEach((track) => {
      if (track.dataset.src && track.dataset.type !== 'yt') {
        track.addEventListener('click', (e) => {
          if (e.target.closest('.t-channel')) return;
          if (curAudioTrack === track) (audio.paused ? audio.play() : audio.pause());
          else selectAudio(track);
        });
      }
    });
  }

  /* ==========================================================
     BAGIAN B — YOUTUBE IFRAME API + FETCH API
     ========================================================== */
  let ytPlayer = null;
  let ytTracks = [];
  let currentYtTrack = null;
  let isYtPlaying = false;
  let ytApiReady = false;
  let ytProgressTimer = null;

  const fmtTime = (s) => {
    if (!isFinite(s) || s <= 0) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  function startYtProgress() {
    stopYtProgress();
    ytProgressTimer = setInterval(() => {
      if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;
      const curT = ytPlayer.getCurrentTime() || 0;
      const durT = ytPlayer.getDuration() || 0;
      const fill = document.getElementById('nbFill');
      const cur  = document.getElementById('nbCur');
      const dur  = document.getElementById('nbDur');
      if (!fill) return;
      fill.style.width = durT > 0 ? `${(curT / durT) * 100}%` : '0%';
      if (cur) cur.textContent = fmtTime(curT);
      if (dur && durT > 0) dur.textContent = fmtTime(durT);
    }, 500);
  }

  function stopYtProgress() {
    if (ytProgressTimer) { clearInterval(ytProgressTimer); ytProgressTimer = null; }
  }

  function loadYTAPI() {
    if (window.YT && window.YT.Player) { ytApiReady = true; return; }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => { ytApiReady = true; };
  }

  async function fetchYtTracks() {
    let payload = null;

    try {
      const r = await fetch('/api/yt-fave');
      if (r.ok) payload = await r.json();
    } catch (e) {}

    if (!payload) {
      try {
        const r = await fetch('https://api.adityoarr.com/yt-fave/v1/videos?page=0&size=100');
        payload = await r.json();
      } catch (e) {}
    }

    const list = Array.isArray(payload) ? payload : (payload?.data?.content ?? []);
    
    const videos = list
      .filter((v) => v && (v.id || v.videoCode))
      .map((v) => {
        const musicCat = String(v.musicCategory || v.category || '').toLowerCase();
        const categoryMap = {
          'ost anime': 'ost',
          'non-anime': 'non',
          'remix': 'remix',
          'instrumental': 'instrumental',
          'islamic': 'islamic',
        };
        const categoryId = categoryMap[musicCat] || v.category || 'non';
        
        return {
          id: v.id || v.videoCode,
          title: v.title || 'Tanpa judul',
          artist: v.artist || v.channelName || 'YouTube',
          channelLink: v.channelLink || null,
          thumb: String(v.thumb || v.thumbnailLink || '').replace(/(maxres|sd)default\.jpg$/, 'hqdefault.jpg')
            || `https://i.ytimg.com/vi/${v.id || v.videoCode}/hqdefault.jpg`,
          category: categoryId,
          source: v.source || 'youtube',
          localSrc: v.localSrc || null,
        };
      });

    renderTracksByCategory(videos);
  }

  function renderTracksByCategory(videos) {
    // Kosongkan semua grup dulu
    $$('.group').forEach((group) => {
      const listEl = group.querySelector('.tracks');
      if (listEl) listEl.innerHTML = '';
    });

    // Render video ke grup yang sesuai
    videos.forEach((v, i) => {
      const group = document.querySelector(`[data-group="${v.category}"]`);
      const listEl = group?.querySelector('.tracks');
      if (!listEl) return;

      const isLocal = v.source === 'local' && v.localSrc;
      const isYouTube = v.source === 'youtube' || !v.localSrc;
      
      const li = document.createElement('li');
      li.className = 'track rv in';
      li.dataset.cat = v.category;
      
      if (isLocal) {
        li.dataset.src = v.localSrc;
        li.dataset.type = 'audio';
      } else {
        li.dataset.yt = v.id;
        li.dataset.type = 'yt';
      }
      
      li.tabIndex = 0;

      const channelHtml = v.channelLink
        ? `<a class="t-channel" href="${esc(v.channelLink)}" target="_blank" rel="noopener noreferrer">${esc(v.artist)} ↗</a>`
        : `<span>${esc(v.artist)}</span>`;

      const statusText = isLocal ? '● audio lokal' : '● via YouTube';
      const statusClass = isLocal ? 'ok' : 'ok';

      li.innerHTML = `
        <span class="t-idx">${String(listEl.children.length + 1).padStart(2, '0')}</span>
        <button type="button" class="t-play" aria-label="Putar ${esc(v.title)}">▶</button>
        <img src="${esc(v.thumb)}" alt="" width="44" height="44" loading="lazy" decoding="async"
             onerror="this.onerror=null;this.src='${THUMB_FALLBACK}'">
        <div class="t-info">
          <strong>${esc(v.title)}</strong>
          ${channelHtml}
        </div>
        <span class="t-dur">${esc(v.category)}</span>
        <span class="t-status ${statusClass}">${statusText}</span>
        <span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
      `;
      listEl.appendChild(li);
    });

    // Update count
    $$('.group').forEach((group) => {
      const count = group.querySelector('.g-count');
      const listEl = group.querySelector('.tracks');
      if (count && listEl) count.textContent = `${listEl.children.length} trek`;
    });

    // Sembunyikan grup kosong
    $$('.group').forEach((group) => {
      const listEl = group.querySelector('.tracks');
      if (listEl && listEl.children.length === 0) {
        group.style.display = 'none';
      } else {
        group.style.display = '';
      }
    });

    initYtTracks();
  }

  function initYtTracks() {
    ytTracks = $$('.track[data-type="yt"]');
    ytTracks.forEach((track) => {
      track.addEventListener('click', (e) => {
        if (e.target.closest('.t-channel')) return;
        playYtTrack(track);
      });
    });
  }

  function stopYt() {
    if (ytPlayer && ytPlayer.stopVideo) ytPlayer.stopVideo();
    document.getElementById('ytPlayerWrap')?.classList.remove('show', 'video-hidden');
    document.getElementById('ytRestoreBtn')?.classList.remove('show');
    currentYtTrack = null;
    isYtPlaying = false;
    stopYtProgress();
  }

  function playYtTrack(track) {
    if (!track || track.hidden || !track.dataset.yt) return;
    currentYtTrack = track;

    if (audio && !audio.paused) audio.pause();
    $$('.track.playing').forEach((t) => {
      t.classList.remove('playing');
      const b = $('.t-play', t);
      if (b && !b.disabled) b.textContent = (t.dataset.src || t.dataset.yt) ? '▶' : '✕';
    });
    track.classList.add('playing');
    const btn = $('.t-play', track);
    if (btn) btn.textContent = '❚❚';

    document.getElementById('nbTitle').textContent = track.querySelector('.t-info strong')?.textContent ?? '—';
    document.getElementById('nbArtist').textContent = track.querySelector('.t-info span, .t-channel')?.textContent ?? '—';
    document.getElementById('nowbar').classList.add('show');
    document.getElementById('ytPlayerWrap').classList.add('show');
    document.getElementById('ytPlayerWrap').classList.add('video-hidden');
    document.getElementById('ytRestoreBtn').classList.add('show');

    document.getElementById('nbFill').style.width = '0%';
    document.getElementById('nbCur').textContent = '0:00';
    document.getElementById('nbDur').textContent = '0:00';
    startYtProgress();

    const videoId = track.dataset.yt;
    if (ytPlayer && ytPlayer.loadVideoById) {
      ytPlayer.loadVideoById(videoId);
    } else if (ytApiReady) {
      ytPlayer = new YT.Player('ytPlayerFrame', {
        videoId,
        playerVars: { playsinline: 1, controls: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: (e) => e.target.playVideo(),
          onStateChange: onYtStateChange,
        },
      });
    }
  }

  function stepYt(dir) {
    const visible = ytTracks.filter((t) => !t.hidden);
    if (!visible.length) return;
    const pos = visible.indexOf(currentYtTrack);
    playYtTrack(visible[(pos + dir + visible.length) % visible.length]);
  }

  function onYtStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
      const visible = ytTracks.filter((t) => !t.hidden);
      if (!visible.length) return;
      const pos = visible.indexOf(currentYtTrack);
      playYtTrack(visible[(pos + 1) % visible.length]);
    } else if (event.data === YT.PlayerState.PLAYING) {
      isYtPlaying = true;
      document.getElementById('nbPlay').textContent = '❚❚';
    } else if (event.data === YT.PlayerState.PAUSED) {
      isYtPlaying = false;
      document.getElementById('nbPlay').textContent = '▶';
    }
  }

  const ytMin = document.getElementById('ytMinBtn');
  const ytRestore = document.getElementById('ytRestoreBtn');

  ytMin?.addEventListener('click', () => {
    document.getElementById('ytPlayerWrap')?.classList.add('video-hidden');
    ytRestore?.classList.add('show');
  });

  ytRestore?.addEventListener('click', () => {
    document.getElementById('ytPlayerWrap')?.classList.remove('video-hidden');
    ytRestore?.classList.remove('show');
  });

  document.getElementById('ytCloseBtn')?.addEventListener('click', () => {
    stopYt();
    document.getElementById('nowbar')?.classList.remove('show');
    $$('.track.playing').forEach((t) => {
      t.classList.remove('playing');
      const b = $('.t-play', t);
      if (b && !b.disabled) b.textContent = (t.dataset.src || t.dataset.yt) ? '▶' : '✕';
    });
  });

  if (document.querySelector('.group')) {
    loadYTAPI();
    fetchYtTracks().catch((err) => console.warn('Gagal memuat API YouTube.', err));
  }

  /* ---------- progres baca ---------- */
  const books = $$('.book');
  if (books.length) {
    let store = {};
    try { store = JSON.parse(localStorage.getItem('rakkuRead') || '{}'); } catch (e) {}
    books.forEach((b) => {
      const key = b.dataset.key, unit = b.dataset.unit, max = Number(b.dataset.max);
      let cur = Math.min(Number(store[key] ?? b.dataset.cur), max);
      const bar = $('.prog i', b), cnt = $('.b-count', b), pct = $('.b-pct', b), btn = $('.b-add', b);
      const unitLabel = unit === 'ch' ? 'bab' : 'hal';
      function render() {
        bar.style.width = `${((cur / max) * 100).toFixed(1)}%`;
        cnt.textContent = `${unit} ${cur}/${max}`;
        pct.textContent = `${Math.round((cur / max) * 100)}%`;
        if (cur >= max) { btn.textContent = 'tamat ✓'; btn.disabled = true; b.classList.add('done'); }
        else { btn.textContent = `＋1 ${unitLabel}`; btn.disabled = false; b.classList.remove('done'); }
      }
      btn.addEventListener('click', () => {
        if (cur >= max) return;
        cur++; store[key] = cur;
        try { localStorage.setItem('rakkuRead', JSON.stringify(store)); } catch (e) {}
        render();
        b.classList.add('bump');
        setTimeout(() => b.classList.remove('bump'), 460);
      });
      render();
    });
  }

  const y = $('#y');
  if (y) y.textContent = new Date().getFullYear();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}