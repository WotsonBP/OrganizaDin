/**
 * Módulo de proteção contra screenshots
 * Bloqueia capturas de tela em telas sensíveis
 */

import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';

/**
 * Habilita proteção contra screenshots
 */
export function enableScreenshotProtection(): void {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    ScreenCapture.preventScreenCaptureAsync().catch((error) => {
      console.warn('Erro ao habilitar proteção de screenshot:', error);
    });
  }
}

/**
 * Desabilita proteção contra screenshots
 */
export function disableScreenshotProtection(): void {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    ScreenCapture.allowScreenCaptureAsync().catch((error) => {
      console.warn('Erro ao desabilitar proteção de screenshot:', error);
    });
  }
}

/**
 * Hook para proteger tela contra screenshots
 */
export function useScreenshotProtection(enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    enableScreenshotProtection();

    // Reativar proteção quando app volta ao foreground
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        enableScreenshotProtection();
      }
    });

    return () => {
      disableScreenshotProtection();
      subscription.remove();
    };
  }, [enabled]);
}
