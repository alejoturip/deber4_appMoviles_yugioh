/**
 * QueryClient único de la app.
 *
 * El orden de este archivo importa:
 *  1. Se crea el cliente.
 *  2. Se configuran tiempos por fuente con setQueryDefaults (usando la raíz
 *     de la jerarquía de claves: ['cards'] y ['binder']).
 *  3. Se registran los defaults de mutación.
 *  4. Se conectan onlineManager y focusManager.
 * Todo ocurre al importar el módulo, antes del primer render y, por tanto,
 * antes de que PersistQueryClientProvider restaure la caché.
 */
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { formatKey, logger } from '@/lib/logger';

import { BINDER_TIMES, PERSIST_MAX_AGE, YGO_TIMES } from './cacheTimes';
import { registerMutationDefaults } from './mutationDefaults';
import { setupNetworkManagers } from './network';
import { queryKeys } from './queryKeys';

export const queryClient = new QueryClient({
  queryCache: new QueryCache(),
  mutationCache: new MutationCache(),
  defaultOptions: {
    queries: {
      // Base para cualquier query que no tenga default propio. Nunca menor al maxAge del persister.
      gcTime: PERSIST_MAX_AGE,
      retry: 2,
    },
  },
});

// Tiempos por fuente de datos
queryClient.setQueryDefaults(queryKeys.cards.all, YGO_TIMES);
queryClient.setQueryDefaults(queryKeys.binder.all, BINDER_TIMES);

registerMutationDefaults(queryClient);
setupNetworkManagers();

// ───── Logs del ciclo de vida (lo que se ve en el video) ─────

queryClient.getQueryCache().subscribe((event) => {
  if (event.type !== 'updated') return;
  const key = formatKey(event.query.queryKey);
  const { action } = event;
  if (action.type === 'fetch') logger.query(`GET inicia → ${key}`);
  if (action.type === 'success' && !action.manual) logger.query(`GET OK → ${key}`);
  if (action.type === 'error') logger.error(`GET falló → ${key}: ${String(action.error)}`);
});

queryClient.getMutationCache().subscribe((event) => {
  const key = event.mutation ? formatKey(event.mutation.options.mutationKey ?? ['sin-clave']) : '';
  if (event.type === 'added') logger.mutation(`Mutación registrada → ${key}`);
  if (event.type !== 'updated') return;
  const { action } = event;
  if (action.type === 'pause') logger.mutation(`PAUSADA (sin red) → ${key}`);
  if (action.type === 'continue') logger.mutation(`REANUDADA → ${key}`);
  if (action.type === 'error') logger.error(`Mutación falló → ${key}: ${String(action.error)}`);
});
