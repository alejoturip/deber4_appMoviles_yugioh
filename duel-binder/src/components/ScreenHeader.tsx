import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/theme/tokens';

import { logPanel } from './LogPanel';
import { NetStatus } from './NetStatus';

/** Encabezado de pantallas internas (detalle, edición) */
export function ScreenHeader({ eyebrow }: { eyebrow: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={10}>
        <Text style={styles.back}>‹ Volver</Text>
      </Pressable>
      <Text style={styles.eyebrow} numberOfLines={1}>
        {eyebrow}
      </Text>
      <View style={styles.right}>
        <NetStatus />
        <Pressable onPress={logPanel.toggle} hitSlop={6}>
          <Text style={styles.log}>REGISTRO</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { fontFamily: fonts.label, fontSize: 13, color: colors.gold, letterSpacing: 1.5 },
  eyebrow: {
    flex: 1,
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 2,
    textAlign: 'center',
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  log: { fontFamily: fonts.label, fontSize: 10, color: colors.parchmentDim, letterSpacing: 1.2 },
});
