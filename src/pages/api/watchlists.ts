import type { APIRoute } from 'astro';

export const prerender = false;

const API_BASE = 'https://api.adityoarr.com/yt-fave/v1/watchlists';

// Mapping category (API) -> id section di halaman watchlist
const SECTION_MAP: Record<string, string> = {
  series: 'series',
  anime: 'anime',
  movie: 'movie',
  film: 'movie',
  dokumenter: 'dokumenter',
  documentary: 'dokumenter',
  '18+': 'adult',
  adult: 'adult',
};

export const GET: APIRoute = async () => {
  try {
    const all: any[] = [];
    let page = 0;
    let last = false;

    while (!last && page < 20) {
      const res = await fetch(`${API_BASE}?page=${page}&size=100`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Upstream status ${res.status}`);
      const json = await res.json();
      all.push(...(json?.data?.content ?? []));
      last = json?.data?.last ?? true;
      page++;
    }

    const items = all
      .filter((w) => w && w.id)
      .map((w) => {
        const rawCategory = String(w.category ?? '').toLowerCase().trim();
        return {
          id: w.id,
          title: w.title || 'Tanpa judul',
          category: w.category || '-',
          section: SECTION_MAP[rawCategory] ?? null, // null = kategori tidak dikenal
          year: w.year ?? null,
          episodes: w.detailCount ?? 0,
          createdAt: w.createdAt ?? null,
        };
      })
      .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));

    return new Response(JSON.stringify(items), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err) {
    console.error('[watchlists] upstream error:', err);
    return new Response(JSON.stringify({ error: 'upstream failed' }), { status: 502 });
  }
};