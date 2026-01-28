/**
 * Módulo de proteção contra screenshots
 * Bloqueia capturas de tela em telas sensíveis
 * 
 * NOTA: Proteção de screenshot desabilitada temporariamente
 * Para habilitar, instale: expo-screen-capture
 */

import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Habilita proteção contra screenshots
 * NOTA: Implementação placeholder - expo-screen-capture não está instalado
 */
export function enableScreenshotProtection(): void {
  if (__DEV__) {
    console.log('[Screenshot Protection] Proteção desabilitada - expo-screen-capture não instalado');
  }
  // Placeholder - implementar quando expo-screen-capture for adicionado
}

/**
 * Desabilita proteção contra screenshots
 * NOTA: Implementação placeholder - expo-screen-capture não está instalado
 */
export function disableScreenshotProtection(): void {
  if (__DEV__) {
    console.log('[Screenshot Protection] Proteção desabilitada - expo-screen-capture não instalado');
  }
  // Placeholder - implementar quando expo-screen-capture for adicionado
}

/**
 * Hook para proteger tela contra screenshots
 * NOTA: Implementação placeholder - expo-screen-capture não está instalado
 */
export function useScreenshotProtection(enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (__DEV__) {
      console.log('[Screenshot Protection] Hook desabilitado - expo-screen-capture não instalado');
    }

    // Placeholder - implementar quando expo-screen-capture for adicionado
    return () => {
      // Cleanup placeholder
    };
  }, [enabled]);
}
