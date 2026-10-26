import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { CONDITION_LABELS, CONDITIONS, type Condition } from '@/api/binder';
import { colors, fonts } from '@/theme/tokens';

export type EntryFormValue = { quantity: number; condition: Condition; note: string };

type Props = {
  value: EntryFormValue;
  onChange: (value: EntryFormValue) => void;
};

/** Cantidad, condición y nota: compartido por "agregar" y "editar" */
export function EntryForm({ value, onChange }: Props) {
  const set = (patch: Partial<EntryFormValue>) => onChange({ ...value, ...patch });

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>CANTIDAD</Text>
        <View style={styles.stepper}>
          <StepButton label="−" onPress={() => set({ quantity: Math.max(1, value.quantity - 1) })} />
          <Text style={styles.qty}>{value.quantity}</Text>
          <StepButton label="+" onPress={() => set({ quantity: Math.min(99, value.quantity + 1) })} />
        </View>
      </View>

      <Text style={styles.label}>CONDICIÓN</Text>
      <View style={styles.chips}>
        {CONDITIONS.map((c) => {
          const active = value.condition === c;
          return (
            <Pressable key={c} onPress={() => set({ condition: c })} style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{CONDITION_LABELS[c]}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>NOTA</Text>
      <TextInput
        value={value.note}
        onChangeText={(note) => set({ note })}
        placeholder="Ej.: la saqué de un sobre de Metal Raiders"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        multiline
        maxLength={200}
      />
    </View>
  );
}

function StepButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.stepBtn} hitSlop={6}>
      <Text style={styles.stepText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontFamily: fonts.label, fontSize: 11, letterSpacing: 2, color: colors.textMuted },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.goldDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: colors.gold, fontSize: 20, lineHeight: 22 },
  qty: { fontFamily: fonts.display, fontSize: 22, color: colors.parchment, minWidth: 28, textAlign: 'center' },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 3,
  },
  chipActive: { borderColor: colors.gold, backgroundColor: 'rgba(201,162,39,0.12)' },
  chipText: { fontFamily: fonts.label, fontSize: 11, letterSpacing: 1.2, color: colors.textMuted },
  chipTextActive: { color: colors.goldLight },
  input: {
    minHeight: 70,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: 10,
    color: colors.parchment,
    fontFamily: fonts.body,
    fontSize: 14,
    textAlignVertical: 'top',
    backgroundColor: colors.surface,
  },
});
