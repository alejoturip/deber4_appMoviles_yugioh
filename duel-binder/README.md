# Duel Binder

App en React Native (Expo SDK 57) para explorar cartas de Yu-Gi-Oh! y armar tu carpeta de colección ("binder"). El catálogo viene de una API pública de solo lectura y tu colección se guarda en MockAPI. Funciona sin conexión: muestra los datos desde la caché persistida y las cartas que guardas sin red se envían solas cuando vuelve la conexión.

| Fuente | Uso | Tipo |
|---|---|---|
| [YGOPRODeck API v7](https://ygoprodeck.com/api-guide/) | Catálogo de cartas, detalle e imágenes | Pública, solo lectura |
| MockAPI, recurso `binder` | Cartas que el usuario guarda en su carpeta: cantidad, condición y nota | Propia (crear, editar y eliminar) |

## Puesta en marcha

1. `npm install`
2. Copia `.env.example` a `.env` y pon la URL de tu proyecto MockAPI:
   ```
   EXPO_PUBLIC_MOCKAPI_URL=https://xxxxxxxx.mockapi.io/api/v1
   ```
3. Pon **la misma URL** en `eas.json` → `build.preview.env`. El APK la toma de ahí, porque `.env` está en `.gitignore` y EAS no lo sube.
4. Desarrollo: `npx expo start` (o `npx expo run:android`).
5. APK: `npm run build:apk` (equivale a `eas build --profile preview --platform android`).
6. Logs del APK: `npm run logs:android` (`adb logcat` filtrado por `ReactNativeJS`). Los mismos logs se ven dentro de la app con el botón **LOG**.

### Esquema del recurso `binder` en MockAPI

| Campo | Tipo | Valores de `condition` |
|---|---|---|
| `id` | Object ID (el que MockAPI crea por defecto; no renombrar) | — |
| `cardId` | Number | — |
| `cardName`, `imageUrl`, `frameType`, `note` | String | — |
| `condition` | String | `Mint`, `Near Mint`, `Played` (valores en inglés, etiquetas en español: Impecable, Casi impecable, Usada) |
| `quantity` | Number | — |
| `createdAt` | Date | — |

## Arquitectura

```
src/
  app/                 Rutas (Expo Router)
    _layout.tsx          PersistQueryClientProvider + resumePausedMutations
    index.tsx            Catálogo (useInfiniteQuery, paginado num/offset)
    card/[id].tsx        Detalle de carta + "agregar al binder" (mutación de creación)
    binder/index.tsx     Mi Binder (servidor + pendientes)
    binder/[entryId].tsx Editar entrada (mutación de edición)
  query/
    queryKeys.ts         Claves jerárquicas + claves de mutación
    queryClient.ts       QueryClient, setQueryDefaults por fuente, logs del ciclo de vida
    cacheTimes.ts        staleTime / gcTime / maxAge
    mutationDefaults.ts  setMutationDefaults (crear y editar)
    persister.ts         createAsyncStoragePersister + AsyncStorage
    network.ts           onlineManager (NetInfo) y focusManager (AppState)
  api/                   Clientes HTTP (ygo.ts, binder.ts)
  hooks/                 useCards, useBinder (queries, mutaciones, pendientes)
  lib/logger.ts          Logs con hora → consola (logcat) + panel en la app
  theme/tokens.ts        Colores por frameType, atributos, tipografía
```

## Claves de consulta

```
cards                          API pública
├── list  {fname, archetype}   catálogo paginado
└── detail  id                 una carta

binder                         MockAPI
├── list                       todas las entradas del usuario
├── byCard  cardId             entradas de una carta (pantalla de detalle)
└── detail  id                 una entrada (pantalla de edición)
```

La raíz de cada rama (`['cards']` y `['binder']`) se usa con `setQueryDefaults` para dar tiempos distintos a cada fuente sin repetirlos en cada `useQuery`.

### Qué se invalida después de cada mutación y por qué

| Mutación | `mutationKey` | Invalida | Por qué |
|---|---|---|---|
| Crear entrada (`POST /binder`) | `['binder','create']` | `['binder','list']` y `['binder','byCard', cardId]` | La lista general ganó un elemento, y la pantalla de esa carta tiene que mostrar que ya está en la carpeta. No se invalida `detail` porque la entrada nueva no tenía detalle cacheado. |
| Editar entrada (`PUT /binder/:id`) | `['binder','update']` | `['binder','list']`, `['binder','byCard', cardId]` y `['binder','detail', id]` | Las tres vistas muestran cantidad, condición o nota de esa entrada. |
| Eliminar entrada (`DELETE /binder/:id`) | `['binder','delete']` | `['binder','list']`, `['binder','byCard', cardId]`; y *remueve* `['binder','detail', id]` | La lista general perdió un elemento, y la pantalla de esa carta tiene que dejar de mostrarla. Se usa `removeQueries` en `detail` para no causar una búsqueda fallida en la pantalla de edición. |

En ningún caso se invalida `['cards', …]`: la API pública es de solo lectura y nada de lo que hace el usuario la cambia. Invalidarla solo gastaría requests contra un rate limit estricto.

Se invalida con claves específicas y no con `['binder']` completo para no refetchear `detail` de otras entradas que no cambiaron.

El `onSettled` **devuelve** la promesa de invalidación. Así la mutación sigue en estado *pending* hasta que la lista ya se recargó, y el indicador de pendiente no parpadea.

## staleTime y gcTime

| Fuente | staleTime | gcTime | Justificación |
|---|---|---|---|
| YGOPRODeck (`['cards']`) | 24 h | 7 días | Las cartas casi nunca cambian y el servidor ya cachea sus respuestas 2 días, así que refetchear antes no trae datos más nuevos. Además la API bloquea 1 hora la IP que pase de 20 req/s, por lo que evitar requests innecesarios es una protección real. |
| MockAPI (`['binder']`) | 30 s | 2 días | Son datos que el propio usuario modifica, y cada vez que vuelve a una pantalla conviene confirmar contra el servidor. |
| Persister (`maxAge`) | — | 24 h | Edad máxima de la caché guardada en AsyncStorage. |

### gcTime ≥ maxAge del persister

Ambos `gcTime` (7 días y 2 días) son mayores que el `maxAge` (24 h), y el `gcTime` por defecto del cliente es igual a `maxAge`.

**Si `gcTime` fuera menor que `maxAge`:** cuando una query queda sin observadores (el usuario cambia de pantalla), TanStack la borra de memoria al cumplirse su `gcTime`. El persister guarda en AsyncStorage lo que hay en memoria, así que en el siguiente guardado esa query ya no estaría. La caché en disco "duraría" 24 h en teoría, pero en la práctica solo tendría las queries que seguían vivas en memoria. Al reabrir la app sin red, esas pantallas aparecerían vacías aunque el `maxAge` dijera que la caché seguía vigente.

## Persistencia

- `PersistQueryClientProvider` con `createAsyncStoragePersister` sobre `@react-native-async-storage/async-storage`.
- Mientras restaura (`useIsRestoring`), las queries no fetchean. Al terminar, las pantallas se pintan con los datos cacheados y **después** sale el GET de actualización. En el panel de logs se ve `Caché restaurada…` antes de `GET inicia → binder › list`.
- El catálogo guarda una versión reducida de cada carta (sin todos los sets y precios) y `maxPages: 8`, para que la caché persistida no crezca sin límite.
- Las imágenes no las persiste TanStack: las guarda `expo-image` en disco (`cachePolicy="disk"`). Por eso las cartas se ven sin red, y cada imagen se descarga una sola vez por dispositivo, que es lo que pide YGOPRODeck.
- `buster` en `src/config/env.ts`: si cambia la forma de los datos, cambiarlo descarta la caché vieja.

## Mutaciones sin conexión

1. **`onlineManager` + NetInfo** (`src/query/network.ts`). Sin red, una mutación no falla: queda en estado **pausado**.
2. **`setMutationDefaults`** (`src/query/mutationDefaults.ts`). La mutación pausada se guarda en AsyncStorage, pero una función no se puede serializar. Al reabrir la app, TanStack recupera la `mutationFn` buscando los defaults por la `mutationKey`. Por eso se registran al importar `queryClient.ts`, **antes** de que el provider restaure la caché. Si se registraran después, la mutación restaurada no tendría función y nunca se enviaría.
3. **`resumePausedMutations()` en el `onSuccess` del provider** (`src/app/_layout.tsx`). Apenas termina la restauración, reintenta las mutaciones pausadas. Si sigue sin red, quedan pausadas y `onlineManager` las reanuda al volver la conexión.
4. **Orden garantizado**: todas las mutaciones del binder comparten `scope: { id: 'binder' }`, así que se envían en serie y en el orden en que se hicieron.
5. **Cambios pendientes en pantalla** (optimista "por la UI", `useMutationState` en `src/hooks/useBinder.ts`). La pantalla combina la respuesta del servidor con las mutaciones pendientes:
   - Las creaciones pendientes aparecen como cartas en "funda sin sellar": borde punteado, imagen atenuada y la etiqueta *SIN SELLAR · ESPERANDO RED*.
   - Las ediciones pendientes se aplican encima de la entrada real, también marcadas.
   - Se eligió este enfoque en vez de escribir en la caché con `onMutate` porque el estado de la mutación sí se persiste. Tras cerrar y reabrir la app, lo pendiente sigue visible, y un refetch del servidor no puede borrarlo antes de que la mutación se envíe.
   - Una entrada creada sin red todavía no tiene `id` de MockAPI, así que no se puede editar hasta sincronizarse. La app lo explica en vez de mandar un `PUT` a un id que no existe.

## Logs para la demostración

Cada evento sale con hora `HH:MM:SS.mmm` en `adb logcat` (tag `ReactNativeJS`) y en el panel **LOG** de la app:

```
APP       App iniciada
CACHE     Caché restaurada desde AsyncStorage: 6 queries, 1 mutación(es) pausada(s)
MUTATION  resumePausedMutations() → 1 pendiente(s)
QUERY     GET inicia → binder › list
MUTATION  POST /binder → "Dark Magician" (creada 16:20:41)
MUTATION  POST OK → id 12 "Dark Magician"
CACHE     Invalidando binder › list y binder › byCard › 46986414
NET       Sin red → OFFLINE
MUTATION  PAUSADA (sin red) → binder › create
```

## Protocolo del video

1. Abrir la app con red: catálogo y carpeta cargan (logs `GET OK`).
2. Activar el modo avión. Abrir una carta → *Guardar en la carpeta*. Aparece como **PENDIENTE** y el log dice `PAUSADA (sin red)`.
3. Esperar ~1 s (throttle del persister) y cerrar la app por completo desde recientes.
4. Desactivar el modo avión y abrir la app.
5. La lista aparece desde la caché (`Caché restaurada…`) y la mutación se envía sola (`resumePausedMutations` → `POST OK`), con las horas visibles.
6. Mostrar el registro nuevo en el panel de MockAPI.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm start` | Servidor de desarrollo |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build:apk` | APK con EAS (perfil `preview`) |
| `npm run logs:android` | Logs del APK por adb |
| `npm run context` | Genera `contexto_proyecto.md` con todo el código para pasárselo a una IA |

---

Datos de cartas e imágenes: YGOPRODeck. Yu-Gi-Oh! es propiedad de Konami; este es un proyecto académico sin fines comerciales.
