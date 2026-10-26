import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchCard, fetchCardsPage, type Card, type CardFilters, type CardPage } from '@/api/ygo';
import { queryKeys } from '@/query/queryKeys';

/** Catálogo paginado. staleTime/gcTime vienen de setQueryDefaults(['cards']). */
export function useCards(filters: CardFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.cards.list(filters),
    queryFn: ({ pageParam, signal }) => fetchCardsPage(filters, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (last: CardPage) => last.nextOffset,
    // Tope de páginas en caché: evita que la caché persistida crezca sin límite
    maxPages: 8,
  });
}

/**
 * Detalle de una carta. Si la carta ya vino en alguna página del catálogo,
 * se usa como placeholder: la pantalla se pinta al instante sin esperar el GET.
 */
export function useCard(id: number) {
  const queryClient = useQueryClient();
  return useQuery<Card, Error, Card, ReturnType<typeof queryKeys.cards.detail>>({
    queryKey: queryKeys.cards.detail(id),
    queryFn: ({ signal }) => fetchCard(id, signal),
    placeholderData: () => findCardInLists(queryClient, id),
  });
}

function findCardInLists(queryClient: ReturnType<typeof useQueryClient>, id: number): Card | undefined {
  const lists = queryClient.getQueriesData<{ pages: CardPage[] }>({ queryKey: queryKeys.cards.lists() });
  for (const [, data] of lists) {
    for (const page of data?.pages ?? []) {
      const card = page.cards.find((c) => c.id === id);
      if (card) return card;
    }
  }
  return undefined;
}
