import { useSyncExternalStore } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { logStore, type LogLevel } from '@/lib/logger';
import { colors, fonts } from '@/theme/tokens';

// Estado global mínimo para abrir/cerrar el panel desde cualquier pantalla
let open = false;
const listeners = new Set<() => void>();
export const logPanel = {
  toggle() {
    open = !open;
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  isOpen: () => open,
};

const LEVEL_COLOR: Record<LogLevel, string> = {
  app: colors.goldLight,
  net: '#B98CE0',
  query: '#7FC4A4',
  mutation: colors.pending,
  cache: colors.parchmentDim,
  error: colors.danger,
};

/** Consola dentro de la app: así los logs con hora se ven en el video desde el APK */
export function LogPanel() {
  const isOpen = useSyncExternalStore(logPanel.subscribe, logPanel.isOpen);
  const entries = useSyncExternalStore(logStore.subscribe, logStore.getSnapshot);
  const insets = useSafeAreaInsets();

  if (!isOpen) return null;

  return (
    <View style={[styles.panel, { paddingBottom: insets.bottom + 6 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>REGISTRO</Text>
        <View style={styles.actions}>
          <Pressable onPress={logStore.clear} hitSlop={8}>
            <Text style={styles.action}>LIMPIAR</Text>
          </Pressable>
          <Pressable onPress={logPanel.toggle} hitSlop={8}>
            <Text style={styles.action}>CERRAR</Text>
          </Pressable>
        </View>
      </View>
      <FlatList
        data={entries}
        keyExtractor={(e) => String(e.id)}
        renderItem={({ item }) => {
          const levelNames: Record<string, string> = {
            app: 'APP',
            net: 'RED',
            query: 'QUERY',
            mutation: 'MUTATION',
            cache: 'CACHE',
            error: 'ERROR',
          };
          return (
            <Text style={styles.line}>
              <Text style={styles.time}>{item.time} </Text>
              <Text style={{ color: LEVEL_COLOR[item.level] }}>{levelNames[item.level].padEnd(8)} </Text>
              <Text style={styles.msg}>{item.message}</Text>
            </Text>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>Sin eventos todavía.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '46%',
    backgroundColor: 'rgba(8,6,12,0.97)',
    borderTopWidth: 1,
    borderTopColor: colors.goldDim,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { fontFamily: fonts.label, color: colors.gold, letterSpacing: 2, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 16 },
  action: { fontFamily: fonts.label, color: colors.textMuted, fontSize: 11, letterSpacing: 1.2 },
  line: { fontFamily: fonts.mono, fontSize: 10.5, lineHeight: 15, marginBottom: 2 },
  time: { color: colors.textMuted },
  msg: { color: colors.parchment },
  empty: { fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted, marginTop: 8 },
});
