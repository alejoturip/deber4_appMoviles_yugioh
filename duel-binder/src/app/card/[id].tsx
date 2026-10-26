import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import type { Card } from '@/api/ygo';
import { CONDITION_LABELS } from '@/api/binder';
import { CardArt } from '@/components/CardArt';
import { AtkDef, AttributeSigil, LevelLine } from '@/components/CardStats';
import { EmptyState } from '@/components/EmptyState';
import { EntryForm, type EntryFormValue } from '@/components/EntryForm';
import { GoldButton } from '@/components/GoldButton';
import { useIsOnline } from '@/components/NetStatus';
import { PendingTag } from '@/components/PendingTag';
import { ScreenHeader } from '@/components/ScreenHeader';
import { isMockApiConfigured } from '@/config/env';
import { useBinderByCard, useCreateEntry, useDisplayEntries } from '@/hooks/useBinder';
import { useCard } from '@/hooks/useCards';
import { colors, fonts, frameStyle } from '@/theme/tokens';

const EMPTY_FORM: EntryFormValue = { quantity: 1, condition: 'Near Mint', note: '' };

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cardId = Number(id);
  const { data: card, isPending, isError, error, refetch } = useCard(cardId);
  const online = useIsOnline();

  return (
    <View style={styles.screen}>
      <ScreenHeader eyebrow="CARTA" />
      {card ? (
        <CardBody card={card} />
      ) : isPending ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} />
          {!online && <Text style={styles.offlineHint}>Sin red y esta carta no está en caché.</Text>}
        </View>
      ) : isError ? (
        <EmptyState title="No se pudo cargar la carta" detail={error.message} action="REINTENTAR" onAction={() => refetch()} />
      ) : null}
    </View>
  );
}

function CardBody({ card }: { card: Card }) {
  const { width } = useWindowDimensions();
  const frame = frameStyle(card.frameType);
  const [form, setForm] = useState<EntryFormValue>(EMPTY_FORM);
  const [justSaved, setJustSaved] = useState(false);
  const create = useCreateEntry();
  const online = useIsOnline();

  const byCard = useBinderByCard(card.id);
  const entries = useDisplayEntries(byCard.data, card.id);

  const save = () => {
    // mutate (no mutateAsync): sin red la mutación queda pausada y la UI la muestra como pendiente
    create.mutate({
      cardId: card.id,
      cardName: card.name,
      imageUrl: card.imageUrlSmall,
      frameType: card.frameType,
      quantity: form.quantity,
      condition: form.condition,
      note: form.note.trim(),
      clientCreatedAt: new Date().toISOString(),
    });
    setForm(EMPTY_FORM);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        {/* Franja de "zona de campo" del color del marco, detrás de la carta */}
        <View style={[styles.zone, { backgroundColor: frame.primary }]} />
        <View style={[styles.zoneLine, { top: '22%', backgroundColor: frame.primary }]} />
        <View style={[styles.zoneLine, { bottom: '22%', backgroundColor: frame.primary }]} />
        <CardArt uri={card.imageUrl} frameType={card.frameType} width={width * 0.58} />
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.name}>{card.name}</Text>
        <AttributeSigil attribute={card.attribute} />
      </View>

      <Text style={[styles.typeLine, { color: frame.primary }]}>
        {card.race ? `${card.race} / ` : ''}
        {card.type}
      </Text>

      <View style={styles.statsRow}>
        <LevelLine card={card} />
        <AtkDef card={card} />
      </View>

      <View style={styles.textBox}>
        <Text style={styles.desc}>{card.desc}</Text>
      </View>

      {card.archetype || card.price ? (
        <View style={styles.metaRow}>
          {card.archetype ? <Meta label="ARQUETIPO" value={card.archetype} /> : null}
          {card.price ? <Meta label="TCGPLAYER" value={`$${card.price}`} /> : null}
        </View>
      ) : null}

      {card.sets.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>APARECE EN LOS SOBRES</Text>
          {card.sets.map((s) => (
            <Text key={s.code + s.rarity} style={styles.setLine}>
              <Text style={styles.setCode}>{s.code}</Text> · {s.name} · {s.rarity}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>EN TU CARPETA</Text>
        {entries.length === 0 ? (
          <Text style={styles.muted}>Todavía no tienes esta carta guardada.</Text>
        ) : (
          entries.map((e) => (
            <Pressable
              key={e.id}
              disabled={e.isLocalOnly}
              onPress={() => router.push(`/binder/${e.id}`)}
              style={[styles.entryRow, e.pending && styles.entryRowPending]}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.entryMain}>
                  ×{e.quantity} · {CONDITION_LABELS[e.condition]}
                </Text>
                {e.note ? <Text style={styles.entryNote} numberOfLines={2}>{e.note}</Text> : null}
                {e.pending && <PendingTag paused={e.paused} pendingDelete={e.pendingDelete} />}
              </View>
              {!e.isLocalOnly && <Text style={styles.chevron}>EDITAR ›</Text>}
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AGREGAR A LA CARPETA</Text>
        {!isMockApiConfigured ? (
          <Text style={styles.warning}>Configura EXPO_PUBLIC_MOCKAPI_URL para guardar cartas.</Text>
        ) : (
          <>
            <EntryForm value={form} onChange={setForm} />
            <GoldButton label="GUARDAR EN LA CARPETA" onPress={save} />
            {justSaved && (
              <Text style={styles.savedHint}>
                {online ? 'Enviando a MockAPI…' : 'Guardada sin red: se enviará sola al volver la conexión.'}
              </Text>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.meta}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  offlineHint: { fontFamily: fonts.body, color: colors.textMuted },
  content: { padding: 16, paddingBottom: 60, gap: 14 },
  hero: { alignItems: 'center', paddingVertical: 12 },
  zone: { position: 'absolute', left: -16, right: -16, top: '22%', bottom: '22%', opacity: 0.1 },
  zoneLine: { position: 'absolute', left: -16, right: -16, height: 1, opacity: 0.5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { flex: 1, fontFamily: fonts.display, fontSize: 24, color: colors.parchment, lineHeight: 30 },
  typeLine: { fontFamily: fonts.label, fontSize: 13, letterSpacing: 1.2, marginTop: -6 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  textBox: {
    backgroundColor: '#E9DFC4',
    borderRadius: 3,
    padding: 14,
    borderWidth: 1,
    borderColor: '#B9A579',
  },
  desc: { fontFamily: 'serif', fontSize: 14, lineHeight: 20, color: '#2A2116' },
  metaRow: { flexDirection: 'row', gap: 12 },
  meta: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 3, padding: 10, gap: 2 },
  metaLabel: { fontFamily: fonts.label, fontSize: 10, letterSpacing: 1.8, color: colors.textMuted },
  metaValue: { fontFamily: fonts.body, fontSize: 14, color: colors.parchment },
  section: { gap: 10, marginTop: 8, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  sectionTitle: { fontFamily: fonts.label, fontSize: 12, letterSpacing: 2.5, color: colors.gold },
  setLine: { fontFamily: fonts.body, fontSize: 13, color: colors.parchmentDim },
  setCode: { fontFamily: fonts.label, color: colors.parchment },
  muted: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  warning: { fontFamily: fonts.body, fontSize: 13, color: colors.danger },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    backgroundColor: colors.surface,
  },
  entryRowPending: { borderColor: colors.pending, borderStyle: 'dashed' },
  entryMain: { fontFamily: fonts.label, fontSize: 15, color: colors.parchment, letterSpacing: 0.5 },
  entryNote: { fontFamily: fonts.body, fontSize: 13, color: colors.parchmentDim },
  chevron: { fontFamily: fonts.label, fontSize: 11, letterSpacing: 1.2, color: colors.gold },
  savedHint: { fontFamily: fonts.body, fontSize: 13, color: colors.pending, textAlign: 'center' },
});
