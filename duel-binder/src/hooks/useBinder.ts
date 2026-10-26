/**
 * Queries y mutaciones del binder (MockAPI).
 *
 * Actualización optimista "por la UI": en vez de escribir datos falsos en
 * la caché, la pantalla combina lo que devolvió el servidor con las
 * mutaciones que todavía están pendientes (useMutationState). Ventaja clave
 * para este deber: el estado de las mutaciones pausadas se persiste, así que
 * después de cerrar y reabrir la app sin red las entradas pendientes siguen
 * apareciendo, y un refetch del servidor nunca las "borra" antes de tiempo.
 */
import { useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  fetchBinder,
  fetchBinderByCard,
  fetchBinderEntry,
  type BinderEntry,
  type BinderUpdate,
  type NewBinderEntry,
} from '@/api/binder';
import { mutationKeys, queryKeys } from '@/query/queryKeys';

export type DisplayEntry = BinderEntry & {
  /** true si hay una creación o edición sin confirmar por el servidor */
  pending: boolean;
  /** true si la mutación está pausada esperando red */
  paused: boolean;
  /** Entradas creadas offline: todavía no tienen id real */
  isLocalOnly: boolean;
  /** true si hay una eliminación pendiente */
  pendingDelete: boolean;
};

// ───── Queries ─────

export function useBinderList() {
  return useQuery({
    queryKey: queryKeys.binder.list(),
    queryFn: ({ signal }) => fetchBinder(signal),
  });
}

export function useBinderByCard(cardId: number) {
  return useQuery({
    queryKey: queryKeys.binder.byCard(cardId),
    queryFn: ({ signal }) => fetchBinderByCard(cardId, signal),
  });
}

export function useBinderEntry(id: string) {
  const queryClient = useQueryClient();
  return useQuery<BinderEntry, Error, BinderEntry, ReturnType<typeof queryKeys.binder.detail>>({
    queryKey: queryKeys.binder.detail(id),
    queryFn: ({ signal }) => fetchBinderEntry(id, signal),
    enabled: !id.startsWith('local-'),
    // Si la entrada está en la lista cacheada, se muestra al instante
    placeholderData: () =>
      queryClient.getQueryData<BinderEntry[]>(queryKeys.binder.list())?.find((e) => e.id === id),
  });
}

// ───── Mutaciones (mutationFn viene de setMutationDefaults) ─────

export function useCreateEntry() {
  return useMutation<BinderEntry, Error, NewBinderEntry>({
    mutationKey: mutationKeys.binder.create,
  });
}

export function useUpdateEntry() {
  return useMutation<BinderEntry, Error, BinderUpdate>({
    mutationKey: mutationKeys.binder.update,
  });
}

export function useDeleteEntry() {
  return useMutation<void, Error, { id: string; cardId: number }>({
    mutationKey: mutationKeys.binder.delete,
  });
}

// ───── Mutaciones pendientes ─────

type PendingCreate = { mutationId: number; variables: NewBinderEntry; isPaused: boolean };
type PendingUpdate = { variables: BinderUpdate; isPaused: boolean };
type PendingDelete = { variables: { id: string; cardId: number }; isPaused: boolean };

export function usePendingCreates(): PendingCreate[] {
  return useMutationState({
    filters: { mutationKey: mutationKeys.binder.create, status: 'pending' },
    select: (m) => ({
      mutationId: m.mutationId,
      variables: m.state.variables as NewBinderEntry,
      isPaused: m.state.isPaused,
    }),
  });
}

export function usePendingUpdates(): PendingUpdate[] {
  return useMutationState({
    filters: { mutationKey: mutationKeys.binder.update, status: 'pending' },
    select: (m) => ({
      variables: m.state.variables as BinderUpdate,
      isPaused: m.state.isPaused,
    }),
  });
}

export function usePendingDeletes(): PendingDelete[] {
  return useMutationState({
    filters: { mutationKey: mutationKeys.binder.delete, status: 'pending' },
    select: (m) => ({
      variables: m.state.variables as { id: string; cardId: number },
      isPaused: m.state.isPaused,
    }),
  });
}

/** Combina datos del servidor con creaciones/ediciones/eliminaciones pendientes. */
export function useDisplayEntries(serverEntries: BinderEntry[] | undefined, cardId?: number) {
  const creates = usePendingCreates();
  const updates = usePendingUpdates();
  const deletes = usePendingDeletes();

  return useMemo<DisplayEntry[]>(() => {
    const pendingDeleteIds = new Set(deletes.map((d) => d.variables.id));

    const fromServer: DisplayEntry[] = (serverEntries ?? []).map((entry) => {
      const mine = updates.filter((u) => u.variables.id === entry.id);
      const willDelete = pendingDeleteIds.has(entry.id);
      if (mine.length === 0 && !willDelete) return { ...entry, pending: false, paused: false, isLocalOnly: false, pendingDelete: false };
      // Se aplican en orden: la última edición gana
      const changes = Object.assign({}, ...mine.map((u) => u.variables.changes));
      return {
        ...entry,
        ...changes,
        pending: true,
        paused: mine.some((u) => u.isPaused) || (willDelete ? deletes.find((d) => d.variables.id === entry.id)?.isPaused ?? false : false),
        isLocalOnly: false,
        pendingDelete: willDelete,
      };
    });

    // Si el servidor ya devolvió la entrada (misma carta y misma hora de creación),
    // no se duplica durante el instante en que la mutación todavía figura como pendiente.
    const alreadySaved = (c: PendingCreate) =>
      fromServer.some(
        (e) => Number(e.cardId) === c.variables.cardId && e.createdAt === c.variables.clientCreatedAt,
      );

    const local: DisplayEntry[] = creates
      .filter((c) => cardId === undefined || c.variables.cardId === cardId)
      .filter((c) => !alreadySaved(c))
      .map((c) => {
        const { clientCreatedAt, ...rest } = c.variables;
        return {
          ...rest,
          id: `local-${c.mutationId}`,
          createdAt: clientCreatedAt,
          pending: true,
          paused: c.isPaused,
          isLocalOnly: true,
          pendingDelete: false,
        };
      });

    // Las pendientes van primero: son lo más reciente
    return [...local.reverse(), ...fromServer];
  }, [serverEntries, creates, updates, deletes, cardId]);
}
