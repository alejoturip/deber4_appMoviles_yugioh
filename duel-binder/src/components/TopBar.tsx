import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/theme/tokens';

import { logPanel } from './LogPanel';
import { NetStatus } from './NetStatus';

type Section = 'catalog' | 'binder';

/** Barra superior de las dos secciones principales */
export function TopBar({ active }: { active: Section }) {
  const insets = useSafeAreaInsets();

  const go = (section: Section) => {
    if (section === active) return;
    router.replace(section === 'catalog' ? '/' : '/binder');
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <View style={styles.row}>
        <Text style={styles.brand}>CARPETA DE DUELO</Text>
        <View style={styles.right}>
          <NetStatus />
          <Pressable onPress={logPanel.toggle} style={styles.logBtn} hitSlop={6}>
            <Text style={styles.logText}>REGISTRO</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.tabs}>
        <Tab label="Catálogo" active={active === 'catalog'} onPress={() => go('catalog')} />
        <Tab label="Mi Carpeta" active={active === 'binder'} onPress={() => go('binder')} />
      </View>
    </View>
  );
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.tab}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label.toUpperCase()}</Text>
      <View style={[styles.tabLine, active && styles.tabLineActive]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontFamily: fonts.display, fontSize: 20, color: colors.gold, letterSpacing: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logBtn: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
  },
  logText: { fontFamily: fonts.label, fontSize: 10, color: colors.parchmentDim, letterSpacing: 1.2 },
  tabs: { flexDirection: 'row', marginTop: 12 },
  tab: { flex: 1, alignItems: 'center', paddingBottom: 0 },
  tabText: { fontFamily: fonts.label, fontSize: 13, letterSpacing: 2, color: colors.textMuted, paddingBottom: 8 },
  tabTextActive: { color: colors.parchment },
  tabLine: { height: 2, alignSelf: 'stretch', backgroundColor: 'transparent' },
  tabLineActive: { backgroundColor: colors.gold },
});
