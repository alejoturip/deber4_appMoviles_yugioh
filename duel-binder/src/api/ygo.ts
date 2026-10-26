/**
 * Cliente de la API pública de YGOPRODeck (solo lectura).
 * Guía: https://ygoprodeck.com/api-guide/
 *
 * Reglas de la API que condicionan el diseño:
 *  - Rate limit: 20 req/s; si se excede, bloqueo de 1 hora.
 *  - Las respuestas se cachean 2 días del lado del servidor.
 *  - Pedir cardinfo.php sin parámetros devuelve TODAS las cartas (miles):
 *    siempre paginamos con num/offset.
 *  - Las imágenes no se deben hotlinkear repetidamente: expo-image las
 *    guarda en disco (cachePolicy="disk") y se bajan una vez por dispositivo.
 */
import { YGO_API_URL } from '@/config/env';

export const PAGE_SIZE = 24;

/**
 * Versión reducida de la carta. La respuesta original trae todos los sets
 * y precios, que inflan la caché persistida (AsyncStorage en Android tiene
 * límites de tamaño por entrada), así que guardamos solo lo que se muestra.
 */
export type Card = {
  id: number;
  name: string;
  type: string;
  frameType: string;
  desc: string;
  atk?: number;
  def?: number;
  level?: number;
  linkval?: number;
  scale?: number;
  race?: string;
  attribute?: string;
  archetype?: string;
  imageUrl: string;
  imageUrlSmall: string;
  sets: { name: string; code: string; rarity: string }[];
  price?: string;
};

export type CardFilters = {
  fname?: string;
  archetype?: string;
};

export type CardPage = {
  cards: Card[];
  nextOffset?: number;
  total: number;
};

type RawCard = {
  id: number;
  name: string;
  type: string;
  frameType: string;
  desc: string;
  atk?: number;
  def?: number;
  level?: number;
  linkval?: number;
  scale?: number;
  race?: string;
  attribute?: string;
  archetype?: string;
  card_images: { image_url: string; image_url_small: string }[];
  card_sets?: { set_name: string; set_code: string; set_rarity: string }[];
  card_prices?: { cardmarket_price?: string; tcgplayer_price?: string }[];
};

type RawResponse = {
  data?: RawCard[];
  error?: string;
  meta?: { next_page_offset?: number; total_rows?: number };
};

function slim(raw: RawCard): Card {
  const image = raw.card_images[0];
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    frameType: raw.frameType,
    desc: raw.desc,
    atk: raw.atk,
    def: raw.def,
    level: raw.level,
    linkval: raw.linkval,
    scale: raw.scale,
    race: raw.race,
    attribute: raw.attribute,
    archetype: raw.archetype,
    imageUrl: image?.image_url ?? '',
    imageUrlSmall: image?.image_url_small ?? '',
    sets: (raw.card_sets ?? []).slice(0, 4).map((s) => ({
      name: s.set_name,
      code: s.set_code,
      rarity: s.set_rarity,
    })),
    price: raw.card_prices?.[0]?.tcgplayer_price,
  };
}

async function request(params: URLSearchParams, signal?: AbortSignal): Promise<RawResponse> {
  const res = await fetch(`${YGO_API_URL}/cardinfo.php?${params.toString()}`, { signal });
  const body = (await res.json().catch(() => ({}))) as RawResponse;

  // La API responde 400 cuando una búsqueda no encuentra nada: no es un error para la UI.
  if (res.status === 400 && body.error?.toLowerCase().includes('no card')) {
    return { data: [], meta: { total_rows: 0 } };
  }
  if (!res.ok) {
    throw new Error(body.error ?? `YGOPRODeck respondió ${res.status}`);
  }
  return body;
}

export async function fetchCardsPage(
  filters: CardFilters,
  offset: number,
  signal?: AbortSignal,
): Promise<CardPage> {
  const params = new URLSearchParams({
    num: String(PAGE_SIZE),
    offset: String(offset),
    sort: 'name',
  });
  if (filters.fname) params.set('fname', filters.fname);
  if (filters.archetype) params.set('archetype', filters.archetype);

  const body = await request(params, signal);
  return {
    cards: (body.data ?? []).map(slim),
    nextOffset: body.meta?.next_page_offset,
    total: body.meta?.total_rows ?? body.data?.length ?? 0,
  };
}

export async function fetchCard(id: number, signal?: AbortSignal): Promise<Card> {
  const body = await request(new URLSearchParams({ id: String(id) }), signal);
  const raw = body.data?.[0];
  if (!raw) throw new Error(`No existe la carta ${id}`);
  return slim(raw);
}
