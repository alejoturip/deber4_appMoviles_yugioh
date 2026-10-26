import { useIsRestoring } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import type { Card, CardFilters } from '@/api/ygo';
import { CardArt } from '@/components/CardArt';
import { EmptyState } from '@/components/EmptyState';
import { TopBar } from '@/components/TopBar';
import { useCards } from '@/hooks/useCards';
import { colors, fonts, frameStyle } from '@/theme/tokens';

const ARCHETYPES = ['Blue-Eyes', 'Dark Magician', 'Red-Eyes', 'Elemental HERO', 'Kuriboh', 'Sky Striker'];
const COLUMNS = 3;
const GUTTER = 16;
const GAP = 10;

export default function CatalogScreen() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<CardFilters>({});
  const { width } = useWindowDimensions();
  const isRestoring = useIsRestoring();

  // Debounce de la búsqueda: cada letra NO es un request (rate limit de 20 req/s)
  useEffect(() => {
    const t = setTimeout(() => {
      const fname = search.trim().length >= 3 ? search.trim() : undefined;
      setFilters((f) => (f.fname === fname ? f : { ...f, fname }));
    }, 450);
    return () => clearTimeout(t);
  }, [search]);

  const query = useCards(filters);
  const cards = query.data?.pages.flatMap((p) => p.cards) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;
  const tileWidth = (width - GUTTER * 2 - GAP * (COLUMNS - 1)) / COLUMNS - 8;

  const toggleArchetype = (a: string) =>
    setFilters((f) => ({ ...f, archetype: f.archetype === a ? undefined : a }));

  return (
    <View style={styles.screen}>
      <TopBar active="catalog" />

      <View style={styles.controls}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar carta (mín. 3 letras)"
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          autoCorrect={false}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {ARCHETYPES.map((a) => {
            const active = filters.archetype === a;
            return (
              <Pressable key={a} onPress={() => toggleArchetype(a)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{a}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <StatusLine
          restoring={isRestoring}
          loading={query.isPending}
          refreshing={query.isFetching && !query.isPending && !query.isFetchingNextPage}
          total={total}
          hasData={cards.length > 0}
        />
      </View>

      <FlatList
        data={cards}
        keyExtractor={(c) => String(c.id)}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <CardTile card={item} width={tileWidth} />}
        onEndReachedThreshold={0.6}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
        }}
        ListFooterComponent={
          query.isFetchingNextPage ? <ActivityIndicator color={colors.gold} style={{ margin: 20 }} /> : null
        }
        ListEmptyComponent={
          query.isPending ? (
            <ActivityIndicator color={colors.gold} style={{ marginTop: 40 }} />
          ) : query.isError ? (
            <EmptyState
              title="No se pudo cargar el catálogo"
              detail={query.error.message}
              action="REINTENTAR"
              onAction={() => query.refetch()}
            />
          ) : (
            <EmptyState title="Sin resultados" detail="Prueba con otro nombre o arquetipo." />
          )
        }
      />
    </View>
  );
}

function CardTile({ card, width }: { card: Card; width: number }) {
  const frame = frameStyle(card.frameType);
  return (
    <Pressable onPress={() => router.push(`/card/${card.id}`)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
      <CardArt uri={card.imageUrlSmall} frameType={card.frameType} width={width} />
      <Text style={[styles.tileName, { width: width + 8 }]} numberOfLines={2}>
        {card.name}
      </Text>
      <Text style={[styles.tileType, { color: frame.primary }]} numberOfLines={1}>
        {frame.label.toUpperCase()}
      </Text>
    </Pressable>
  );
}

function StatusLine(props: { restoring: boolean; loading: boolean; refreshing: boolean; total: number; hasData: boolean }) {
  let text = '';
  if (props.restoring) text = 'Restaurando caché…';
  else if (props.loading) text = 'Consultando YGOPRODeck…';
  else if (props.hasData) text = `${props.total.toLocaleString('es')} cartas`;
  return (
    <View style={styles.statusRow}>
      <Text style={styles.status}>{text}</Text>
      {props.refreshing && <Text style={styles.statusCache}>DESDE CACHÉ · ACTUALIZANDO</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  controls: { paddingHorizontal: GUTTER, paddingTop: 12, gap: 10 },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.parchment,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  chips: { gap: 8, paddingRight: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 3 },
  chipActive: { borderColor: colors.gold, backgroundColor: 'rgba(201,162,39,0.12)' },
  chipText: { fontFamily: fonts.label, fontSize: 12, color: colors.textMuted, letterSpacing: 0.8 },
  chipTextActive: { color: colors.goldLight },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 18 },
  status: { fontFamily: fonts.label, fontSize: 11, color: colors.textMuted, letterSpacing: 1.5 },
  statusCache: { fontFamily: fonts.label, fontSize: 10, color: colors.pending, letterSpacing: 1.2 },
  list: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 40 },
  column: { gap: GAP, marginBottom: 16 },
  tileName: { fontFamily: fonts.body, fontSize: 12, color: colors.parchment, marginTop: 6, lineHeight: 15 },
  tileType: { fontFamily: fonts.label, fontSize: 9, letterSpacing: 1.2, marginTop: 2 },
});
