import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

/** Etiqueta de estado de sincronización de una entrada del binder */
export function PendingTag({ paused, pendingDelete }: { paused: boolean; pendingDelete?: boolean }) {
  if (pendingDelete) {
    return (
      <View style={styles.tag}>
        <View style={[styles.dot, styles.dotPaused]} />
        <Text style={styles.text}>Se eliminará al reconectar</Text>
      </View>
    );
  }

  return (
    <View style={styles.tag}>
      <View style={[styles.dot, paused ? styles.dotPaused : styles.dotSending]} />
      <Text style={styles.text}>{paused ? 'Pendiente · sin conexión' : 'Sincronizando…'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.pending,
    backgroundColor: 'rgba(111,183,217,0.08)',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotPaused: { backgroundColor: colors.pending },
  dotSending: { backgroundColor: colors.goldLight },
  text: { fontFamily: fonts.label, fontSize: 10, letterSpacing: 1.2, color: colors.pending },
});
