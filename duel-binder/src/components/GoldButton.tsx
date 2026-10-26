import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

type Props = { label: string; onPress: () => void; disabled?: boolean; loading?: boolean };

export function GoldButton({ label, onPress, disabled, loading }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.btn, (disabled || loading) && styles.disabled, pressed && styles.pressed]}>
      {loading ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.text}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.gold,
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.goldLight,
  },
  pressed: { backgroundColor: colors.goldLight },
  disabled: { opacity: 0.45 },
  text: { fontFamily: fonts.label, fontSize: 14, letterSpacing: 2.5, color: colors.bg },
});
