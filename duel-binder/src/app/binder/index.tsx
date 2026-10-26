import { useIsRestoring } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { CardArt } from '@/components/CardArt';
import { EmptyState } from '@/components/EmptyState';
import { PendingTag } from '@/components/PendingTag';
import { TopBar } from '@/components/TopBar';
import { isMockApiConfigured } from '@/config/env';
import { CONDITION_LABELS } from '@/api/binder';
import { useBinderList, useDisplayEntries, type DisplayEntry } from '@/hooks/useBinder';
import { colors, fonts } from '@/theme/tokens';

const COLUMNS = 3;
const GUTTER = 16;
const GAP = 10;

export default function BinderScreen() {
  const { width } = useWindowDimensions();
  const isRestoring = useIsRestoring();
  const list = useBinderList();
  const entries = useDisplayEntries(list.data);

  const copies = entries.reduce((n, e) => n + Number(e.quantity || 0), 0);
  const pending = entries.filter((e) => e.pending).length;
  // Ancho de cada bolsillo: 3 por fila, como una página de carpeta 3×3
  const pocketWidth = (width - GUTTER * 2 - GAP * (COLUMNS - 1)) / COLUMNS;

  return (
    <View style={styles.screen}>
      <TopBar active="binder" />

      {!isMockApiConfigured && (
        <Text style={styles.warning}>Falta EXPO_PUBLIC_MOCKAPI_URL: revisa .env (dev) y eas.json (APK).</Text>
      )}

      <View style={styles.summary}>
        <Summary label="CARTAS" value={entries.length} />
        <Summary label="CANTIDAD" value={copies} />
        <Summary label="PENDIENTES" value={pending} highlight={pending > 0} />
      </View>

      <FlatList
        data={entries}
        keyExtractor={(e) => e.id}
        numColumns={COLUMNS}
        columnWrapperStyle={{ gap: GAP }}
        contentContainerStyle={styles.page}
        refreshControl={
          <RefreshControl
            refreshing={list.isRefetching}
            onRefresh={() => list.refetch()}
            tintColor={colors.gold}
            colors={[colors.gold]}
          />
        }
        renderItem={({ item }) => <Pocket entry={item} width={pocketWidth} />}
        ListEmptyComponent={
          isRestoring || list.isPending ? (
            <Text style={styles.loading}>{isRestoring ? 'Restaurando caché…' : 'Consultando MockAPI…'}</Text>
          ) : list.isError ? (
            <EmptyState title="No se pudo cargar tu carpeta" detail={list.error.message} action="REINTENTAR" onAction={() => list.refetch()} />
          ) : (
            <EmptyState
              title="Tu carpeta está vacía"
              detail="Abre una carta del catálogo y guárdala aquí."
              action="IR AL CATÁLOGO"
              onAction={() => router.replace('/')}
            />
          )
        }
      />
    </View>
  );
}

function Pocket({ entry, width }: { entry: DisplayEntry; width: number }) {
  const artWidth = width - 16;
  return (
    <Pressable
      disabled={entry.isLocalOnly}
      onPress={() => router.push(`/binder/${entry.id}`)}
      style={({ pressed }) => [styles.pocket, { width, opacity: pressed ? 0.7 : 1 }]}>
      <View>
        <CardArt uri={entry.imageUrl} frameType={entry.frameType} width={artWidth} unsealed={entry.pending} />
        <View style={styles.qtyBadge}>
          <Text style={styles.qtyText}>×{entry.quantity}</Text>
        </View>
      </View>
      <Text style={styles.pocketName} numberOfLines={1}>
        {entry.cardName}
      </Text>
      <Text style={[styles.pocketCond, entry.pendingDelete && { textDecorationLine: 'line-through', opacity: 0.5 }]}>
        {CONDITION_LABELS[entry.condition]}
      </Text>
      {entry.pending && <PendingTag paused={entry.paused} pendingDelete={entry.pendingDelete} />}
    </Pressable>
  );
}

function Summary({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={[styles.summaryValue, highlight && { color: colors.pending }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  warning: {
    margin: 16,
    marginBottom: 0,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 4,
    color: colors.danger,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  summary: {
    flexDirection: 'row',
    marginHorizontal: GUTTER,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    backgroundColor: colors.surface,
  },
  summaryItem: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  summaryValue: { fontFamily: fonts.display, fontSize: 22, color: colors.parchment },
  summaryLabel: { fontFamily: fonts.label, fontSize: 10, letterSpacing: 1.8, color: colors.textMuted },
  page: { padding: GUTTER, paddingBottom: 60, gap: 14 },
  loading: { fontFamily: fonts.label, color: colors.textMuted, letterSpacing: 1.5, textAlign: 'center', marginTop: 40 },
  pocket: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  qtyBadge: {
    position: 'absolute',
    right: -4,
    top: -6,
    backgroundColor: colors.gold,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  qtyText: { fontFamily: fonts.label, fontSize: 11, color: colors.bg },
  pocketName: { fontFamily: fonts.body, fontSize: 11.5, color: colors.parchment, paddingHorizontal: 6 },
  pocketCond: { fontFamily: fonts.label, fontSize: 9, letterSpacing: 1.2, color: colors.textMuted },
});
