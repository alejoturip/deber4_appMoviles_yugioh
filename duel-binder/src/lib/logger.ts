/**
 * Logger con hora (HH:MM:SS.mmm).
 *
 * Escribe en dos lugares:
 *  1. console.log → en el APK aparece en `adb logcat` con el tag ReactNativeJS.
 *  2. Un buffer en memoria que pinta el panel de logs dentro de la app,
 *     así los logs se ven en el video aunque no haya Metro conectado.
 */
export type LogLevel = 'app' | 'net' | 'query' | 'mutation' | 'cache' | 'error';

export type LogEntry = {
  id: number;
  time: string;
  level: LogLevel;
  message: string;
};

const MAX_ENTRIES = 150;
let entries: LogEntry[] = [];
let seq = 0;
const listeners = new Set<() => void>();

function timestamp(): string {
  const d = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

function write(level: LogLevel, message: string) {
  const entry: LogEntry = { id: ++seq, time: timestamp(), level, message };
  entries = [entry, ...entries].slice(0, MAX_ENTRIES);
  const line = `[${entry.time}] [${level.toUpperCase()}] ${message}`;
  if (level === 'error') console.warn(line);
  else console.log(line);
  listeners.forEach((listener) => listener());
}

export const logger = {
  app: (m: string) => write('app', m),
  net: (m: string) => write('net', m),
  query: (m: string) => write('query', m),
  mutation: (m: string) => write('mutation', m),
  cache: (m: string) => write('cache', m),
  error: (m: string) => write('error', m),
};

// API para useSyncExternalStore
export const logStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => entries,
  clear() {
    entries = [];
    listeners.forEach((listener) => listener());
  },
};

/** ['binder','byCard',123] → binder › byCard › 123 */
export function formatKey(key: readonly unknown[]): string {
  return key
    .map((part) => (typeof part === 'object' && part !== null ? JSON.stringify(part) : String(part)))
    .join(' › ');
}
