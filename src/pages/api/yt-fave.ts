import type { APIRoute } from 'astro';

export const prerender = false; // jalan sebagai serverless function (bebas CORS)

const API_BASE = 'https://api.adityoarr.com/yt-fave/v1/videos';

export const GET: APIRoute = async () => {
  try {
    const all: any[] = [];
    let page = 0;
    let last = false;

    // Loop paginasi sampai halaman terakhir (38 video = 2 halaman dgn size 20)
    while (!last && page < 10) {
      const url = `${API_BASE}?page=${page}&size=100&sort=createdAt&direction=asc`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Upstream status ${res.status}`);
      const json = await res.json();

      const content = json?.data?.content ?? [];
      all.push(...content);

      last = json?.data?.last ?? true;
      page++;
    }

    // Normalisasi + filter hanya yang boleh di-embed
    const videos = all
      .filter((v) => v && v.videoCode && v.isEmbeddable !== false && (v.privacyStatus ?? 'public') === 'public')
      .map((v) => ({
        id: v.videoCode,
        title: v.title || 'Tanpa judul',
        artist: v.channelName || 'YouTube',
        channelLink: v.channelLink || `https://www.youtube.com/results?search_query=${encodeURIComponent(v.channelName || '')}`,
        thumb: String(v.thumbnailLink || '').replace(/(maxres|sd)default\.jpg$/, 'hqdefault.jpg')
          || `https://i.ytimg.com/vi/${v.videoCode}/hqdefault.jpg`,
        category: v.category || 'Music',
        link: v.originalLink || `https://www.youtube.com/watch?v=${v.videoCode}`,
      }));

    return new Response(JSON.stringify(videos), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // cache 5 menit
      },
    });
  } catch (err) {
    console.error('[yt-fave] upstream error:', err);
    return new Response(JSON.stringify({ error: 'upstream failed' }), { status: 502 });
  }
};