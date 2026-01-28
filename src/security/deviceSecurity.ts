/**
 * Módulo de segurança do dispositivo
 * Detecta root/jailbreak e outras vulnerabilidades
 */

import * as Device from 'expo-device';
import { Platform, Linking } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Verifica se o dispositivo está em modo de desenvolvimento
 */
export function isDevelopmentMode(): boolean {
  return __DEV__;
}

/**
 * Verifica se o app está rodando em um emulador/simulador
 */
export async function isEmulator(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    return !Device.isDevice;
  }

  if (Platform.OS === 'android') {
    // Verificações básicas para Android emulador
    const model = Device.modelName?.toLowerCase() || '';
    const brand = Device.brand?.toLowerCase() || '';
    
    const emulatorIndicators = [
      'emulator',
      'sdk',
      'google_sdk',
      'droid4x',
      'genymotion',
      'bluestacks',
      'andy',
      'nox',
      'mumu',
    ];

    return emulatorIndicators.some(
      (indicator) => model.includes(indicator) || brand.includes(indicator)
    );
  }

  return false;
}

/**
 * Verifica indicadores básicos de root/jailbreak
 * Nota: Para detecção completa, seria necessário biblioteca nativa
 */
export async function checkDeviceSecurity(): Promise<{
  isSecure: boolean;
  warnings: string[];
  isRooted: boolean;
}> {
  const warnings: string[] = [];
  let isRooted = false;

  // Verificar se está em modo de desenvolvimento (apenas aviso)
  if (isDevelopmentMode()) {
    warnings.push('App está em modo de desenvolvimento');
  }

  // Verificar se é emulador (apenas aviso)
  const isEmu = await isEmulator();
  if (isEmu) {
    warnings.push('Dispositivo pode ser um emulador');
  }

  // Verificações específicas por plataforma
  if (Platform.OS === 'android') {
    // Verificar se permite instalação de fontes desconhecidas
    // (não podemos verificar diretamente, mas podemos avisar)
    warnings.push('Verifique se "Fontes desconhecidas" está desabilitado nas configurações');
  }

  // Verificar integridade do SecureStore
  try {
    const testKey = '__security_test__';
    const testValue = 'test_' + Date.now();
    await SecureStore.setItemAsync(testKey, testValue);
    const retrieved = await SecureStore.getItemAsync(testKey);
    await SecureStore.deleteItemAsync(testKey);

    if (retrieved !== testValue) {
      warnings.push('SecureStore pode estar comprometido');
      isRooted = true;
    }
  } catch (error) {
    warnings.push('Erro ao verificar SecureStore');
    isRooted = true;
  }

  return {
    isSecure: warnings.length === 0 && !isRooted,
    warnings,
    isRooted,
  };
}

/**
 * Verifica se o app pode ser executado com segurança
 */
export async function canRunSecurely(): Promise<boolean> {
  const security = await checkDeviceSecurity();
  
  // Em produção, bloquear se root detectado
  if (!isDevelopmentMode() && security.isRooted) {
    return false;
  }

  return true;
}

/**
 * Armazena flag de segurança do dispositivo
 */
const SECURITY_CHECK_KEY = 'device_security_checked';

export async function markSecurityChecked(): Promise<void> {
  await SecureStore.setItemAsync(SECURITY_CHECK_KEY, Date.now().toString());
}

export async function getLastSecurityCheck(): Promise<number | null> {
  const timestamp = await SecureStore.getItemAsync(SECURITY_CHECK_KEY);
  return timestamp ? parseInt(timestamp, 10) : null;
}
