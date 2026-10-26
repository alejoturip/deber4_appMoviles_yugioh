/**
 * Configuración de entorno.
 *
 * EXPO_PUBLIC_* se incrusta en el bundle al compilar:
 *  - En desarrollo sale del archivo `.env`.
 *  - En el APK (EAS Build) sale de `eas.json` → build.preview.env,
 *    porque `.env` está en .gitignore y EAS no lo sube.
 */
export const YGO_API_URL = 'https://db.ygoprodeck.com/api/v7';

const rawMockApi = process.env.EXPO_PUBLIC_MOCKAPI_URL ?? '';
export const MOCKAPI_URL = rawMockApi.replace(/\/+$/, '');

export const isMockApiConfigured =
  MOCKAPI_URL.startsWith('https://') && !MOCKAPI_URL.includes('REEMPLAZAR');

/** Cambiarlo invalida la caché persistida (útil si cambia la forma de los datos). */
export const CACHE_BUSTER = 'duel-binder-v1';
