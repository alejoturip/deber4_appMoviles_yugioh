/**
 * Conecta TanStack Query con el estado real del dispositivo.
 *
 * - onlineManager + NetInfo: cuando no hay red, las mutaciones quedan en
 *   estado "pausado" en vez de fallar, y las queries no intentan fetchear.
 *   Al volver la red, TanStack reanuda solo lo pausado.
 * - focusManager + AppState: al volver la app a primer plano, las queries
 *   stale se refrescan (en móvil no existe el "focus" de la ventana del navegador).
 */
import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

import { logger } from '@/lib/logger';

let configured = false;

export function setupNetworkManagers() {
  if (configured) return;
  configured = true;

  onlineManager.setEventListener((setOnline) => {
    return NetInfo.addEventListener((state) => {
      // isInternetReachable puede ser null mientras se determina: solo lo tomamos como offline si es false
      const online = !!state.isConnected && state.isInternetReachable !== false;
      if (online !== onlineManager.isOnline()) {
        logger.net(online ? 'Red disponible → ONLINE' : 'Sin red → OFFLINE');
      }
      setOnline(online);
    });
  });

  focusManager.setEventListener((handleFocus) => {
    const sub = AppState.addEventListener('change', (status) => {
      if (Platform.OS !== 'web') handleFocus(status === 'active');
    });
    return () => sub.remove();
  });
}
