import { StyleSheet, Text, View } from 'react-native';

import type { Card } from '@/api/ygo';
import { ATTRIBUTES, colors, fonts } from '@/theme/tokens';

export function AttributeSigil({ attribute, size = 30 }: { attribute?: string; size?: number }) {
  if (!attribute) return null;
  const attr = ATTRIBUTES[attribute] ?? ATTRIBUTES.DIVINE;
  return (
    <View
      style={[
        styles.sigil,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: attr.color },
      ]}>
      <Text style={[styles.glyph, { fontSize: size * 0.5 }]}>{attr.glyph}</Text>
    </View>
  );
}

/** Nivel (estrellas), Rango (Xyz) o valor Link */
export function LevelLine({ card }: { card: Card }) {
  if (card.frameType.startsWith('link') && card.linkval) {
    return <Text style={styles.level}>LINK—{card.linkval}</Text>;
  }
  if (!card.level) return null;
  const isRank = card.frameType.startsWith('xyz');
  return (
    <View style={styles.levelRow}>
      <Text style={styles.levelLabel}>{isRank ? 'RANGO' : 'NIVEL'}</Text>
      <Text style={[styles.stars, isRank && styles.rankStars]}>{'★'.repeat(Math.min(card.level, 13))}</Text>
    </View>
  );
}

export function AtkDef({ card }: { card: Card }) {
  if (card.atk === undefined) return null;
  const isLink = card.frameType.startsWith('link');
  return (
    <View style={styles.atkRow}>
      <Text style={styles.atk}>ATAQUE/{card.atk < 0 ? '?' : card.atk}</Text>
      {!isLink && <Text style={styles.atk}>DEFENSA/{card.def === undefined || card.def < 0 ? '?' : card.def}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  sigil: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  glyph: { color: '#fff', fontWeight: '700' },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  levelLabel: { fontFamily: fonts.label, fontSize: 11, color: colors.textMuted, letterSpacing: 1.5 },
  level: { fontFamily: fonts.label, fontSize: 14, color: colors.goldLight, letterSpacing: 1 },
  stars: { color: '#E8A93A', fontSize: 16, letterSpacing: 1 },
  rankStars: { color: '#C9C2D6' },
  atkRow: { flexDirection: 'row', gap: 18 },
  atk: { fontFamily: fonts.label, fontSize: 16, color: colors.parchment, letterSpacing: 1 },
});
