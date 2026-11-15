import type { APIRoute } from 'astro';

export const prerender = false;

const API_BASE = 'https://api.adityoarr.com/yt-fave/v1/videos';

const ENV_CATEGORY  = '';
const ENV_CHANNEL   = '';
const ENV_SEARCH    = '';
const ENV_SORT      = 'createdAt';
const ENV_DIRECTION = 'desc';

// Mapping musicCategory dari API ke ID kategori di frontend
const CATEGORY_MAP: Record<string, string> = {
  'ost anime': 'ost',
  'non-anime': 'non',
  'remix': 'remix',
  'instrumental': 'instrumental',
  'islamic': 'islamic',
};

export const GET: APIRoute = async ({ url }) => {
  const q         = url.searchParams;
  const category  = q.get('category')    ?? ENV_CATEGORY;
  const channel   = q.get('channelName') ?? ENV_CHANNEL;
  const search    = q.get('search')      ?? ENV_SEARCH;
  const sort      = q.get('sort')        ?? ENV_SORT;
  const direction = (q.get('direction')  ?? ENV_DIRECTION) === 'asc' ? 'asc' : 'desc';

  try {
    const all: any[] = [];
    let page = 0;
    let last = false;

    while (!last && page < 10) {
      const params = new URLSearchParams({
        page: String(page),
        size: '100',
        sort,
        direction,
      });
      if (category) params.set('category', category);
      if (channel)  params.set('channelName', channel);
      if (search)   params.set('search', search);

      const res = await fetch(`${API_BASE}?${params.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Upstream status ${res.status}`);
      const json = await res.json();

      all.push(...(json?.data?.content ?? []));
      last = json?.data?.last ?? true;
      page++;
    }

    const videos = all
      .filter((v) => v && v.videoCode)
      .map((v) => {
        const musicCat = String(v.musicCategory || '').toLowerCase();
        const categoryId = CATEGORY_MAP[musicCat] || 'non'; // fallback ke non-anime
        
        return {
          id: v.videoCode,
          title: v.title || 'Tanpa judul',
          artist: v.channelName || 'YouTube',
          channelLink: v.channelLink || null,
          thumb: String(v.thumbnailLink || '').replace(/(maxres|sd)default\.jpg$/, 'hqdefault.jpg')
            || `https://i.ytimg.com/vi/${v.videoCode}/hqdefault.jpg`,
          category: categoryId,           // ID untuk filter
          categoryLabel: musicCat || 'non-anime', // label asli untuk debug
          source: v.source || 'youtube',  // 'youtube' atau 'local'
          localSrc: v.localSrc || null,   // URL file MP3 lokal (jika source = local)
          ytLink: v.originalLink || `https://www.youtube.com/watch?v=${v.videoCode}`,
        };
      });

    return new Response(JSON.stringify(videos), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err) {
    console.error('[yt-fave] upstream error:', err);
    return new Response(JSON.stringify({ error: 'upstream failed' }), { status: 502 });
  }
};