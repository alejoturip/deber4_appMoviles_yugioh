// Import por subruta: solo entran al APK los 4 pesos que se usan
import { Cinzel_400Regular } from '@expo-google-fonts/cinzel/400Regular';
import { Cinzel_700Bold } from '@expo-google-fonts/cinzel/700Bold';
import { Oswald_400Regular } from '@expo-google-fonts/oswald/400Regular';
import { Oswald_600SemiBold } from '@expo-google-fonts/oswald/600SemiBold';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { LogPanel } from '@/components/LogPanel';
import { CACHE_BUSTER } from '@/config/env';
import { logger } from '@/lib/logger';
import { PERSIST_MAX_AGE } from '@/query/cacheTimes';
import { persister } from '@/query/persister';
// Importar el cliente ejecuta setQueryDefaults, setMutationDefaults y onlineManager
// ANTES de que el provider restaure la caché.
import { queryClient } from '@/query/queryClient';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();
logger.app('App iniciada');

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, primary: colors.gold },
};

async function onCacheRestored() {
  const queries = queryClient.getQueryCache().getAll().length;
  const paused = queryClient
    .getMutationCache()
    .getAll()
    .filter((m) => m.state.isPaused).length;
  logger.cache(`Caché restaurada desde AsyncStorage: ${queries} queries, ${paused} mutación(es) pausada(s)`);

  // Las mutaciones restauradas usan la mutationFn registrada con setMutationDefaults.
  // Si no hay red, siguen pausadas y onlineManager las reanuda al volver la conexión.
  if (paused > 0) logger.mutation(`resumePausedMutations() → ${paused} pendiente(s)`);
  await queryClient.resumePausedMutations();
  if (paused > 0) logger.mutation('resumePausedMutations() terminó');
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Cinzel_400Regular, Cinzel_700Bold, Oswald_400Regular, Oswald_600SemiBold });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: PERSIST_MAX_AGE, buster: CACHE_BUSTER }}
      onSuccess={onCacheRestored}
      onError={() => logger.error('No se pudo restaurar la caché persistida')}>
      <ThemeProvider value={navTheme}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'fade' }} />
        <LogPanel />
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}
