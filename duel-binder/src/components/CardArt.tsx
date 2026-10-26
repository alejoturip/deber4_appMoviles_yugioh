import { Image } from 'expo-image';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { CARD_RATIO, colors, frameStyle } from '@/theme/tokens';

type Props = {
  uri: string;
  frameType: string;
  width: number;
  /** Funda "sin sellar": la carta todavía no se sincronizó con el servidor */
  unsealed?: boolean;
  style?: ViewStyle;
};

/**
 * Imagen de carta dentro de una "funda" del color de su frameType.
 * expo-image con cachePolicy="disk": la imagen se baja una sola vez por
 * dispositivo (lo pide YGOPRODeck) y sigue visible sin red.
 */
export function CardArt({ uri, frameType, width, unsealed, style }: Props) {
  const frame = frameStyle(frameType);
  const height = width / CARD_RATIO;

  return (
    <View
      style={[
        styles.sleeve,
        {
          width: width + 8,
          height: height + 8,
          borderColor: unsealed ? colors.pending : frame.primary,
          borderStyle: unsealed ? 'dashed' : 'solid',
          borderBottomColor: unsealed ? colors.pending : (frame.secondary ?? frame.primary),
        },
        style,
      ]}>
      <Image
        source={{ uri }}
        style={{ width, height, borderRadius: 3, opacity: unsealed ? 0.55 : 1 }}
        contentFit="cover"
        cachePolicy="disk"
        recyclingKey={uri}
        transition={180}
        placeholder={{ blurhash: 'L03[%0IU00~q00xu-;M{00of%Mxu' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sleeve: {
    padding: 2,
    borderWidth: 2,
    borderRadius: 6,
    backgroundColor: colors.sleeve,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
