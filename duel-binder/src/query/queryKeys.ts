/**
 * Claves de consulta con jerarquía.
 *
 * La jerarquía permite invalidar con precisión: invalidar ['binder','list']
 * solo toca la lista, mientras que ['binder'] tocaría todo lo del binder.
 *
 *   cards                         ← API pública (solo lectura)
 *   ├── list  {fname, archetype}  ← catálogo paginado (useInfiniteQuery)
 *   └── detail  id                ← una carta
 *
 *   binder                        ← MockAPI (datos propios)
 *   ├── list                      ← todas las entradas del usuario
 *   ├── byCard  cardId            ← entradas de una carta (pantalla de detalle)
 *   └── detail  id                ← una entrada (pantalla de edición)
 */
import type { CardFilters } from '@/api/ygo';

const CARDS = ['cards'] as const;
const BINDER = ['binder'] as const;

export const queryKeys = {
  cards: {
    all: CARDS,
    lists: () => [...CARDS, 'list'] as const,
    list: (filters: CardFilters) => [...CARDS, 'list', filters] as const,
    details: () => [...CARDS, 'detail'] as const,
    detail: (id: number) => [...CARDS, 'detail', id] as const,
  },
  binder: {
    all: BINDER,
    list: () => [...BINDER, 'list'] as const,
    byCard: (cardId: number) => [...BINDER, 'byCard', cardId] as const,
    detail: (id: string) => [...BINDER, 'detail', id] as const,
  },
};

/**
 * Claves de mutación. Son las que conectan cada mutación con su
 * setMutationDefaults: una mutación pausada que se restaura desde
 * AsyncStorage no trae su función (las funciones no se serializan),
 * TanStack la recupera buscando los defaults por esta clave.
 */
export const mutationKeys = {
  binder: {
    create: ['binder', 'create'] as const,
    update: ['binder', 'update'] as const,
    delete: ['binder', 'delete'] as const,
  },
};
