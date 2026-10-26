import { onlineManager, useIsMutating } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

export function useIsOnline() {
  return useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
  );
}

/** Indicador de red + número de cambios del binder sin sincronizar */
export function NetStatus() {
  const online = useIsOnline();
  const pending = useIsMutating({ mutationKey: ['binder'] });

  return (
    <View style={styles.row}>
      {pending > 0 && (
        <View style={[styles.pill, styles.pendingPill]}>
          <Text style={[styles.text, { color: colors.pending }]}>{pending} PEND.</Text>
        </View>
      )}
      <View style={[styles.pill, { borderColor: online ? colors.ok : colors.danger }]}>
        <View style={[styles.dot, { backgroundColor: online ? colors.ok : colors.danger }]} />
        <Text style={[styles.text, { color: online ? colors.ok : colors.danger }]}>
          {online ? 'ONLINE' : 'OFFLINE'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderRadius: 999,
  },
  pendingPill: { borderColor: colors.pending, borderStyle: 'dashed' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontFamily: fonts.label, fontSize: 10, letterSpacing: 1.2 },
});
