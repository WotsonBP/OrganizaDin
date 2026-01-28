/**
 * Módulo de monitoramento de erros e logging seguro
 * Captura e reporta erros sem expor dados sensíveis
 */

import { obfuscateSensitiveData } from './debugProtection';

/**
 * Tipos de erros
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ErrorCategory {
  DATABASE = 'database',
  NETWORK = 'network',
  SECURITY = 'security',
  UI = 'ui',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown',
}

/**
 * Interface de erro estruturado
 */
export interface AppError {
  id: string;
  timestamp: number;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  stack?: string;
  context?: Record<string, any>;
  userAgent?: string;
  appVersion?: string;
}

/**
 * Armazenamento local de erros (limitado)
 */
class ErrorStorage {
  private errors: AppError[] = [];
  private maxErrors: number = 50;

  add(error: AppError): void {
    this.errors.unshift(error);
    
    // Manter apenas os últimos N erros
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }
  }

  getAll(): AppError[] {
    return [...this.errors];
  }

  getByCategory(category: ErrorCategory): AppError[] {
    return this.errors.filter((e) => e.category === category);
  }

  getBySeverity(severity: ErrorSeverity): AppError[] {
    return this.errors.filter((e) => e.severity === severity);
  }

  clear(): void {
    this.errors = [];
  }

  getRecent(count: number = 10): AppError[] {
    return this.errors.slice(0, count);
  }
}

export const errorStorage = new ErrorStorage();

/**
 * Gera ID único para erro
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sanitiza stack trace removendo paths sensíveis
 */
function sanitizeStackTrace(stack?: string): string | undefined {
  if (!stack) return undefined;

  return stack
    .split('\n')
    .map((line) => {
      // Remover paths completos do sistema
      return line.replace(/\/Users\/[^/]+/g, '/Users/***')
        .replace(/\/home\/[^/]+/g, '/home/***')
        .replace(/C:\\Users\\[^\\]+/g, 'C:\\Users\\***');
    })
    .join('\n');
}

/**
 * Determina categoria do erro baseado na mensagem
 */
function categorizeError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();

  if (message.includes('database') || message.includes('sql')) {
    return ErrorCategory.DATABASE;
  }
  if (message.includes('network') || message.includes('fetch')) {
    return ErrorCategory.NETWORK;
  }
  if (message.includes('security') || message.includes('unauthorized')) {
    return ErrorCategory.SECURITY;
  }
  if (message.includes('render') || message.includes('component')) {
    return ErrorCategory.UI;
  }
  if (message.includes('validation') || message.includes('invalid')) {
    return ErrorCategory.VALIDATION;
  }

  return ErrorCategory.UNKNOWN;
}

/**
 * Determina severidade do erro
 */
function determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
  // Erros de segurança são sempre críticos
  if (category === ErrorCategory.SECURITY) {
    return ErrorSeverity.CRITICAL;
  }

  // Erros de banco de dados são importantes
  if (category === ErrorCategory.DATABASE) {
    return ErrorSeverity.HIGH;
  }

  // Erros de rede podem ser temporários
  if (category === ErrorCategory.NETWORK) {
    return ErrorSeverity.MEDIUM;
  }

  // Padrão
  return ErrorSeverity.MEDIUM;
}

/**
 * Captura e reporta erro de forma segura
 */
export function captureError(
  error: Error,
  context?: Record<string, any>,
  severity?: ErrorSeverity
): void {
  try {
    const category = categorizeError(error);
    const actualSeverity = severity || determineSeverity(error, category);

    const appError: AppError = {
      id: generateErrorId(),
      timestamp: Date.now(),
      message: error.message,
      category,
      severity: actualSeverity,
      stack: sanitizeStackTrace(error.stack),
      context: context ? obfuscateSensitiveData(context) : undefined,
    };

    // Armazenar localmente
    errorStorage.add(appError);

    // Log no console apenas em desenvolvimento
    if (__DEV__) {
      console.error('Captured Error:', appError);
    }

    // Em produção, você poderia enviar para serviço de monitoramento
    // Exemplo: Sentry, Bugsnag, Firebase Crashlytics
    if (!__DEV__ && actualSeverity === ErrorSeverity.CRITICAL) {
      // sendToMonitoringService(appError);
    }
  } catch (loggingError) {
    // Não deixar o logging de erros quebrar o app
    console.error('Error while capturing error:', loggingError);
  }
}

/**
 * Captura exceção não tratada
 */
export function captureException(
  message: string,
  severity: ErrorSeverity = ErrorSeverity.HIGH,
  context?: Record<string, any>
): void {
  const error = new Error(message);
  captureError(error, context, severity);
}

/**
 * Wrapper para funções assíncronas com captura de erro
 */
export function withErrorCapture<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: Record<string, any>
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureError(
        error instanceof Error ? error : new Error(String(error)),
        { ...context, args: obfuscateSensitiveData(args) }
      );
      throw error;
    }
  }) as T;
}

/**
 * Configuração global de error handlers
 */
export function setupGlobalErrorHandlers(): void {
  // Error boundary para React Native
  const originalHandler = ErrorUtils.getGlobalHandler();

  ErrorUtils.setGlobalHandler((error, isFatal) => {
    captureError(
      error instanceof Error ? error : new Error(String(error)),
      { isFatal },
      isFatal ? ErrorSeverity.CRITICAL : ErrorSeverity.HIGH
    );

    // Chamar handler original
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });

  // Promise rejections não tratadas
  if (typeof global !== 'undefined') {
    const rejectionHandler = (event: any) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
      
      captureError(error, { type: 'unhandledRejection' }, ErrorSeverity.HIGH);
    };

    // @ts-ignore
    global.addEventListener?.('unhandledrejection', rejectionHandler);
  }

  if (__DEV__) {
    console.log('Global error handlers configured');
  }
}

/**
 * Obtém estatísticas de erros
 */
export function getErrorStats(): {
  total: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  recent: AppError[];
} {
  const allErrors = errorStorage.getAll();

  const byCategory: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};

  for (const error of allErrors) {
    byCategory[error.category] = (byCategory[error.category] || 0) + 1;
    bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
  }

  return {
    total: allErrors.length,
    byCategory,
    bySeverity,
    recent: errorStorage.getRecent(5),
  };
}

/**
 * Exporta erros para debugging (apenas dev)
 */
export function exportErrors(): string | null {
  if (!__DEV__) {
    console.warn('Error export is only available in development');
    return null;
  }

  const errors = errorStorage.getAll();
  return JSON.stringify(errors, null, 2);
}

/**
 * Limpa histórico de erros
 */
export function clearErrors(): void {
  errorStorage.clear();
}

/**
 * Logger seguro para uso no app
 */
export const logger = {
  debug: (message: string, data?: any) => {
    if (__DEV__) {
      console.log(`[DEBUG] ${message}`, data ? obfuscateSensitiveData(data) : '');
    }
  },

  info: (message: string, data?: any) => {
    if (__DEV__) {
      console.info(`[INFO] ${message}`, data ? obfuscateSensitiveData(data) : '');
    }
  },

  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data ? obfuscateSensitiveData(data) : '');
  },

  error: (message: string, error?: Error | any, context?: Record<string, any>) => {
    const actualError = error instanceof Error ? error : new Error(message);
    captureError(actualError, context);
  },

  security: (message: string, context?: Record<string, any>) => {
    captureException(message, ErrorSeverity.CRITICAL, {
      ...context,
      category: ErrorCategory.SECURITY,
    });
  },
};

/**
 * Teste de logging (apenas dev)
 */
export function testErrorLogging(): void {
  if (!__DEV__) {
    return;
  }

  logger.debug('Test debug message');
  logger.info('Test info message');
  logger.warn('Test warning message');
  
  try {
    throw new Error('Test error');
  } catch (error) {
    logger.error('Test error caught', error);
  }

  console.log('Error stats:', getErrorStats());
}
