import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CONDITION_LABELS } from '@/api/binder';
import { CardArt } from '@/components/CardArt';
import { EmptyState } from '@/components/EmptyState';
import { EntryForm, type EntryFormValue } from '@/components/EntryForm';
import { GoldButton } from '@/components/GoldButton';
import { PendingTag } from '@/components/PendingTag';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useBinderEntry, useDeleteEntry, useDisplayEntries, useUpdateEntry, type DisplayEntry } from '@/hooks/useBinder';
import { colors, fonts } from '@/theme/tokens';

export default function EditEntryScreen() {
  const { entryId } = useLocalSearchParams<{ entryId: string }>();
  const query = useBinderEntry(entryId);
  // Aplica sobre la entrada las ediciones que aún estén pendientes de enviar
  const [entry] = useDisplayEntries(query.data ? [query.data] : undefined, query.data ? Number(query.data.cardId) : -1);

  return (
    <View style={styles.screen}>
      <ScreenHeader eyebrow="EDITAR ENTRADA" />
      {entryId.startsWith('local-') ? (
        <EmptyState
          title="Esta carta aún no se ha guardado"
          detail="Se creó sin conexión. Podrás editarla cuando se sincronice con MockAPI."
        />
      ) : entry ? (
        <EditForm key={entry.id} entry={entry} />
      ) : query.isError ? (
        <EmptyState title="No se pudo cargar la entrada" detail={query.error.message} action="REINTENTAR" onAction={() => query.refetch()} />
      ) : (
        <ActivityIndicator color={colors.gold} style={{ marginTop: 40 }} />
      )}
    </View>
  );
}

function EditForm({ entry }: { entry: DisplayEntry }) {
  const update = useUpdateEntry();
  const deleteEntry = useDeleteEntry();
  const [form, setForm] = useState<EntryFormValue>({
    quantity: Number(entry.quantity),
    condition: entry.condition,
    note: entry.note ?? '',
  });

  const changed =
    form.quantity !== Number(entry.quantity) || form.condition !== entry.condition || form.note.trim() !== (entry.note ?? '');

  const save = () => {
    update.mutate({
      id: entry.id,
      cardId: Number(entry.cardId),
      changes: { quantity: form.quantity, condition: form.condition, note: form.note.trim() },
    });
    router.back();
  };

  const handleDelete = () => {
    Alert.alert('¿Eliminar esta carta de tu carpeta?', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          deleteEntry.mutate({ id: entry.id, cardId: Number(entry.cardId) });
          router.back();
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.head}>
        <CardArt uri={entry.imageUrl} frameType={entry.frameType} width={110} unsealed={entry.pending} />
        <View style={styles.headText}>
          <Text style={styles.name}>{entry.cardName}</Text>
          <Text style={styles.meta}>EN TU CARPETA DESDE {formatDate(entry.createdAt)}</Text>
          {entry.pending && <PendingTag paused={entry.paused} pendingDelete={entry.pendingDelete} />}
        </View>
      </View>

      <EntryForm value={form} onChange={setForm} />
      <GoldButton label="GUARDAR CAMBIOS" onPress={save} disabled={!changed} />
      <Text style={styles.hint}>Sin red, el cambio queda pendiente y se envía solo al reconectar.</Text>

      {!entry.isLocalOnly && (
        <Pressable
          onPress={handleDelete}
          style={({ pressed }) => [
            styles.deleteButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}>
          <Text style={styles.deleteButtonText}>ELIMINAR DE MI CARPETA</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 18, paddingBottom: 60 },
  head: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  headText: { flex: 1, gap: 8 },
  name: { fontFamily: fonts.display, fontSize: 20, color: colors.parchment, lineHeight: 26 },
  meta: { fontFamily: fonts.label, fontSize: 10, letterSpacing: 1.5, color: colors.textMuted },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  deleteButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 4,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontFamily: fonts.label,
    fontSize: 13,
    letterSpacing: 1.5,
    color: colors.danger,
  },
});
