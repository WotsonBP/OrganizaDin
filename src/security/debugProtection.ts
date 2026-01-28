/**
 * Módulo de proteção contra debugging
 * Detecta e protege o app contra ferramentas de debugging em produção
 */

import { Platform } from 'react-native';

/**
 * Verifica se o app está em modo debug
 */
export function isDebuggerAttached(): boolean {
  // Em desenvolvimento, sempre retorna false para não afetar o workflow
  if (__DEV__) {
    return false;
  }

  // React Native Debugger
  if (typeof DedicatedWorkerGlobalScope !== 'undefined') {
    return true;
  }

  // Chrome DevTools
  if (typeof window !== 'undefined' && (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    return true;
  }

  return false;
}

/**
 * Previne console.log em produção
 */
export function disableConsoleInProduction(): void {
  if (!__DEV__) {
    console.log = () => {};
    console.debug = () => {};
    console.info = () => {};
    console.warn = () => {};
    // Manter console.error para captura de erros críticos
  }
}

/**
 * Adiciona detecção de timing para prevenir debugging
 */
export function detectDebugging(): boolean {
  if (__DEV__) {
    return false;
  }

  const start = Date.now();
  // Operação simples que seria lenta com debugger
  debugger; // eslint-disable-line no-debugger
  const end = Date.now();

  // Se demorou mais que 100ms, provavelmente tem debugger ativo
  return end - start > 100;
}

/**
 * Obfusca valores sensíveis em logs
 */
export function obfuscateSensitiveData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveKeys = [
    'password',
    'pin',
    'token',
    'secret',
    'key',
    'auth',
    'credential',
    'card',
    'cvv',
    'cpf',
    'ssn',
  ];

  const obfuscated = Array.isArray(data) ? [...data] : { ...data };

  for (const key in obfuscated) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive));

    if (isSensitive && typeof obfuscated[key] === 'string') {
      obfuscated[key] = '***REDACTED***';
    } else if (isSensitive && typeof obfuscated[key] === 'number') {
      obfuscated[key] = 0;
    } else if (typeof obfuscated[key] === 'object' && obfuscated[key] !== null) {
      obfuscated[key] = obfuscateSensitiveData(obfuscated[key]);
    }
  }

  return obfuscated;
}

/**
 * Configura proteções anti-debugging globais
 */
export function setupDebugProtection(): void {
  if (__DEV__) {
    console.log('Debug protection disabled in development mode');
    return;
  }

  // Desabilitar console em produção
  disableConsoleInProduction();

  // Verificar debugger periodicamente (a cada 30 segundos)
  setInterval(() => {
    if (isDebuggerAttached() || detectDebugging()) {
      console.error('Security: Debugger detected');
      // Em produção real, você poderia:
      // - Fechar o app
      // - Enviar alerta ao servidor
      // - Limpar dados sensíveis
    }
  }, 30000);

  // Prevenir modificação de objetos globais críticos
  if (typeof Object.freeze === 'function') {
    try {
      Object.freeze(Object.prototype);
      Object.freeze(Array.prototype);
      Object.freeze(Function.prototype);
    } catch (error) {
      // Alguns ambientes não permitem freeze de prototypes
      console.error('Could not freeze prototypes');
    }
  }
}

/**
 * Valida integridade do código (básico)
 */
export function validateCodeIntegrity(): boolean {
  if (__DEV__) {
    return true;
  }

  try {
    // Verificar se funções críticas não foram modificadas
    const functionString = isDebuggerAttached.toString();
    
    // Se a função foi minificada/obfuscada corretamente, deve ter um tamanho específico
    if (functionString.length < 50 && !__DEV__) {
      // Função muito pequena, pode ter sido modificada
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Logger seguro que não expõe dados sensíveis
 */
export const secureLog = {
  log: (message: string, data?: any) => {
    if (__DEV__) {
      console.log(message, data ? obfuscateSensitiveData(data) : '');
    }
  },
  error: (message: string, error?: any) => {
    // Sempre log errors, mas obfuscados
    console.error(message, error ? obfuscateSensitiveData(error) : '');
  },
  warn: (message: string, data?: any) => {
    if (__DEV__) {
      console.warn(message, data ? obfuscateSensitiveData(data) : '');
    }
  },
};
