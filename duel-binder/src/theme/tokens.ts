/**
 * Identidad visual: "playmat" oscuro + acentos dorados, y el color de cada
 * carta sale de su frameType real (efecto naranja, fusión violeta, etc.).
 */
export const colors = {
  bg: '#0E0B14',
  surface: '#17121F',
  surfaceRaised: '#211A2C',
  sleeve: '#1C1626',
  border: '#352A44',
  borderStrong: '#4A3B5E',
  gold: '#C9A227',
  goldLight: '#E6C766',
  goldDim: '#7A6420',
  parchment: '#F2EAD3',
  parchmentDim: '#B9AE96',
  textMuted: '#8C809C',
  pending: '#6FB7D9',
  danger: '#E0605A',
  ok: '#5FBF8A',
};

export const fonts = {
  display: 'Cinzel_700Bold',
  displayRegular: 'Cinzel_400Regular',
  label: 'Oswald_600SemiBold',
  body: 'Oswald_400Regular',
  mono: 'monospace',
};

type FrameStyle = { primary: string; secondary?: string; label: string };

const FRAMES: Record<string, FrameStyle> = {
  normal: { primary: '#D2AE5A', label: 'Normal' },
  effect: { primary: '#C8662E', label: 'Efecto' },
  ritual: { primary: '#5A82CC', label: 'Ritual' },
  fusion: { primary: '#9257B0', label: 'Fusión' },
  synchro: { primary: '#D8D8DC', label: 'Sincronía' },
  xyz: { primary: '#5C5C66', label: 'Xyz' },
  link: { primary: '#2F72BF', label: 'Link' },
  spell: { primary: '#1F9E88', label: 'Mágica' },
  trap: { primary: '#B4408E', label: 'Trampa' },
  token: { primary: '#9A9AA2', label: 'Token' },
  skill: { primary: '#3E7CC1', label: 'Habilidad' },
};

/** Los péndulo combinan el color del monstruo con el verde de mágica */
export function frameStyle(frameType: string): FrameStyle {
  if (frameType.endsWith('_pendulum')) {
    const base = FRAMES[frameType.replace('_pendulum', '')] ?? FRAMES.effect;
    return { primary: base.primary, secondary: FRAMES.spell.primary, label: `${base.label} Péndulo` };
  }
  return FRAMES[frameType] ?? FRAMES.normal;
}

/** Atributos con su kanji, como en las cartas físicas */
export const ATTRIBUTES: Record<string, { color: string; glyph: string }> = {
  DARK: { color: '#6E3FA3', glyph: '闇' },
  LIGHT: { color: '#D9B531', glyph: '光' },
  FIRE: { color: '#D4462C', glyph: '炎' },
  WATER: { color: '#2E86C1', glyph: '水' },
  WIND: { color: '#3BA35C', glyph: '風' },
  EARTH: { color: '#8B6B3D', glyph: '地' },
  DIVINE: { color: '#C9A227', glyph: '神' },
};

/** Proporción real de una carta: 59 × 86 mm */
export const CARD_RATIO = 59 / 86;
