/**
 * Cliente de MockAPI para el recurso `binder` (datos propios del usuario).
 *
 * Esquema del recurso en MockAPI:
 *   id, cardId (Number), cardName, imageUrl, frameType,
 *   quantity (Number), condition, note, createdAt (Date)
 */
import { isMockApiConfigured, MOCKAPI_URL } from '@/config/env';

export const CONDITIONS = ['Mint', 'Near Mint', 'Played'] as const;
export type Condition = (typeof CONDITIONS)[number];

export const CONDITION_LABELS: Record<Condition, string> = {
  Mint: 'Impecable',
  'Near Mint': 'Casi impecable',
  Played: 'Usada',
};

export type BinderEntry = {
  id: string;
  cardId: number;
  cardName: string;
  imageUrl: string;
  frameType: string;
  quantity: number;
  condition: Condition;
  note: string;
  createdAt: string;
};

/** Variables de la mutación de creación */
export type NewBinderEntry = Omit<BinderEntry, 'id' | 'createdAt'> & {
  /** Hora local en que el usuario tocó "guardar" (sirve para el log y el orden) */
  clientCreatedAt: string;
};

export type BinderChanges = Partial<Pick<BinderEntry, 'quantity' | 'condition' | 'note'>>;

/** Variables de la mutación de edición */
export type BinderUpdate = {
  id: string;
  cardId: number;
  changes: BinderChanges;
};

function baseUrl() {
  if (!isMockApiConfigured) {
    throw new Error('Falta EXPO_PUBLIC_MOCKAPI_URL (revisa .env y eas.json)');
  }
  return `${MOCKAPI_URL}/binder`;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`MockAPI respondió ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchBinder(signal?: AbortSignal): Promise<BinderEntry[]> {
  const res = await fetch(`${baseUrl()}?sortBy=createdAt&order=desc`, { signal });
  // MockAPI devuelve 404 "Not found" cuando la colección está vacía o el filtro no coincide
  if (res.status === 404) return [];
  return json<BinderEntry[]>(res);
}

export async function fetchBinderByCard(cardId: number, signal?: AbortSignal): Promise<BinderEntry[]> {
  const res = await fetch(`${baseUrl()}?cardId=${cardId}`, { signal });
  if (res.status === 404) return [];
  const list = await json<BinderEntry[]>(res);
  // El filtro de MockAPI es por coincidencia parcial: 12 también trae 123. Filtramos exacto.
  return list.filter((entry) => Number(entry.cardId) === cardId);
}

export async function fetchBinderEntry(id: string, signal?: AbortSignal): Promise<BinderEntry> {
  const res = await fetch(`${baseUrl()}/${id}`, { signal });
  return json<BinderEntry>(res);
}

export async function createBinderEntry(entry: NewBinderEntry): Promise<BinderEntry> {
  const { clientCreatedAt, ...rest } = entry;
  const res = await fetch(baseUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...rest, createdAt: clientCreatedAt }),
  });
  return json<BinderEntry>(res);
}

export async function updateBinderEntry({ id, changes }: BinderUpdate): Promise<BinderEntry> {
  const res = await fetch(`${baseUrl()}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  });
  return json<BinderEntry>(res);
}

export async function deleteBinderEntry({ id }: { id: string }): Promise<void> {
  const res = await fetch(`${baseUrl()}/${id}`, { method: 'DELETE' });
  // Tratar 404 como éxito (la entrada ya estaba eliminada)
  if (res.status === 404) return;
  if (!res.ok) throw new Error(`MockAPI respondió ${res.status}`);
}
