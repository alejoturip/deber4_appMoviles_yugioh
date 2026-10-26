/**
 * Tiempos de caché. La justificación completa está en el README.
 *
 * Regla que se respeta: gcTime >= PERSIST_MAX_AGE para ambas fuentes.
 * Si gcTime fuera menor, una query inactiva se borraría de memoria antes
 * de vencer en disco; el persister guardaría un snapshot sin ella y al
 * reabrir la app no habría nada que mostrar desde la caché.
 */
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Edad máxima de la caché guardada en AsyncStorage */
export const PERSIST_MAX_AGE = DAY;

/** API pública YGOPRODeck: casi estática, cacheada 2 días en su servidor y con rate limit duro */
export const YGO_TIMES = {
  staleTime: DAY,
  gcTime: 7 * DAY,
};

/** MockAPI: datos que el usuario cambia, tienen que verse frescos */
export const BINDER_TIMES = {
  staleTime: 30 * SECOND,
  gcTime: 2 * DAY,
};
