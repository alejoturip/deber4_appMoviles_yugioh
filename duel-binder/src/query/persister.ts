/**
 * Persister: guarda la caché de TanStack Query (queries exitosas y
 * mutaciones pausadas) en AsyncStorage y la restaura al abrir la app.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

export const CACHE_STORAGE_KEY = 'DUEL_BINDER_QUERY_CACHE';

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: CACHE_STORAGE_KEY,
  // Agrupa escrituras: como mucho una cada 500 ms. Tras crear algo offline,
  // espera ~1 s antes de cerrar la app para asegurar que se guardó.
  throttleTime: 500,
});
