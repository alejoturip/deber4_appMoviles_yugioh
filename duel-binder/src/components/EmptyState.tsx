import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

type Props = { title: string; detail?: string; action?: string; onAction?: () => void };

export function EmptyState({ title, detail, action, onAction }: Props) {
  return (
    <View style={styles.empty}>
      <Text style={styles.title}>{title}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      {action ? (
        <Pressable onPress={onAction} style={styles.btn}>
          <Text style={styles.btnText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', marginTop: 48, paddingHorizontal: 24, gap: 8 },
  title: { fontFamily: fonts.display, fontSize: 16, color: colors.parchment, textAlign: 'center' },
  detail: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  btn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.gold,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 3,
  },
  btnText: { fontFamily: fonts.label, color: colors.gold, letterSpacing: 2, fontSize: 12 },
});
