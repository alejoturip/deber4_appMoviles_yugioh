/**
 * Funciones de mutación registradas con setMutationDefaults.
 *
 * ¿Por qué no van directo en useMutation? Porque una mutación hecha sin red
 * queda pausada y se guarda en AsyncStorage, pero las funciones no se pueden
 * serializar. Al reabrir la app, TanStack restaura la mutación y busca su
 * mutationFn en los defaults usando la mutationKey. Si los defaults no están
 * registrados ANTES de restaurar, la mutación pausada nunca se envía.
 *
 * Por eso este archivo se ejecuta al crear el QueryClient (queryClient.ts),
 * antes de que PersistQueryClientProvider restaure la caché.
 */
import type { QueryClient } from '@tanstack/react-query';

import {
  createBinderEntry,
  deleteBinderEntry,
  updateBinderEntry,
  type BinderEntry,
  type BinderUpdate,
  type NewBinderEntry,
} from '@/api/binder';
import { logger } from '@/lib/logger';

import { mutationKeys, queryKeys } from './queryKeys';

/**
 * Todas las mutaciones del binder comparten scope: se ejecutan en serie y en
 * el orden en que se hicieron, también al reanudarse después de estar offline.
 */
export const BINDER_SCOPE = { id: 'binder' };

export function registerMutationDefaults(queryClient: QueryClient) {
  queryClient.setMutationDefaults(mutationKeys.binder.create, {
    scope: BINDER_SCOPE,
    retry: 2,
    mutationFn: async (entry: NewBinderEntry): Promise<BinderEntry> => {
      logger.mutation(`POST /binder → "${entry.cardName}" (creada ${entry.clientCreatedAt.slice(11, 19)})`);
      const saved = await createBinderEntry(entry);
      logger.mutation(`POST OK → id ${saved.id} "${saved.cardName}"`);
      return saved;
    },
    // Se devuelve la promesa: la mutación sigue "pending" hasta que la lista
    // se recargó, así el indicador de pendiente no parpadea.
    onSettled: (_data, _error, entry: NewBinderEntry) => {
      logger.cache(`Invalidando binder › list y binder › byCard › ${entry.cardId}`);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.binder.list() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.binder.byCard(entry.cardId) }),
      ]);
    },
  });

  queryClient.setMutationDefaults(mutationKeys.binder.update, {
    scope: BINDER_SCOPE,
    retry: 2,
    mutationFn: async (update: BinderUpdate): Promise<BinderEntry> => {
      logger.mutation(`PUT /binder/${update.id} → ${JSON.stringify(update.changes)}`);
      const saved = await updateBinderEntry(update);
      logger.mutation(`PUT OK → id ${saved.id}`);
      return saved;
    },
    onSettled: (_data, _error, update: BinderUpdate) => {
      logger.cache(
        `Invalidando binder › list, binder › byCard › ${update.cardId}, binder › detail › ${update.id}`,
      );
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.binder.list() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.binder.byCard(update.cardId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.binder.detail(update.id) }),
      ]);
    },
  });

  queryClient.setMutationDefaults(mutationKeys.binder.delete, {
    scope: BINDER_SCOPE,
    retry: 2,
    mutationFn: async ({ id, cardId }: { id: string; cardId: number }): Promise<void> => {
      logger.mutation(`DELETE /binder/${id}`);
      await deleteBinderEntry({ id });
      logger.mutation(`DELETE OK → id ${id}`);
    },
    onSettled: (_data, _error, { id, cardId }: { id: string; cardId: number }) => {
      logger.cache(
        `Invalidando binder › list, binder › byCard › ${cardId}; removiendo binder › detail › ${id}`,
      );
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.binder.list() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.binder.byCard(cardId) }),
        queryClient.removeQueries({ queryKey: queryKeys.binder.detail(id) }),
      ]);
    },
  });
}
