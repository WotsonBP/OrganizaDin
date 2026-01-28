/**
 * Módulo de segurança de rede
 * Implementa proteções para comunicação HTTP/HTTPS
 */

import { Platform } from 'react-native';

/**
 * Configuração de segurança para fetch
 */
export const SECURE_FETCH_CONFIG = {
  credentials: 'omit' as RequestCredentials,
  cache: 'no-store' as RequestCache,
  redirect: 'error' as RequestRedirect,
};

/**
 * Valida URL antes de fazer requisição
 */
export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Apenas HTTPS em produção
    if (!__DEV__ && parsed.protocol !== 'https:') {
      console.error('HTTP not allowed in production');
      return false;
    }

    // Bloquear IPs locais em produção
    if (!__DEV__) {
      const localPatterns = [
        /^localhost$/i,
        /^127\./,
        /^192\.168\./,
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^0\.0\.0\.0$/,
      ];

      if (localPatterns.some((pattern) => pattern.test(parsed.hostname))) {
        console.error('Local URLs not allowed in production');
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Invalid URL:', error);
    return false;
  }
}

/**
 * Fetch seguro com validações
 */
export async function secureFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Validar URL
  if (!validateUrl(url)) {
    throw new Error('Invalid or insecure URL');
  }

  // Adicionar headers de segurança
  const secureHeaders = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(options.headers || {}),
  };

  // Merge com configurações seguras
  const secureOptions: RequestInit = {
    ...SECURE_FETCH_CONFIG,
    ...options,
    headers: secureHeaders,
  };

  // Timeout de 30 segundos
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      ...secureOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Verificar se resposta é válida
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

/**
 * Valida certificado SSL (básico - para APIs futuras)
 */
export function validateSSLCertificate(certificate: any): boolean {
  if (!certificate) {
    return false;
  }

  try {
    // Verificar se não está expirado
    const now = Date.now();
    const notBefore = new Date(certificate.notBefore).getTime();
    const notAfter = new Date(certificate.notAfter).getTime();

    if (now < notBefore || now > notAfter) {
      console.error('Certificate expired or not yet valid');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating certificate:', error);
    return false;
  }
}

/**
 * Sanitiza dados antes de enviar pela rede
 */
export function sanitizeNetworkData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sanitized = Array.isArray(data) ? [] : {};

  for (const key in data) {
    const value = data[key];

    // Remover funções
    if (typeof value === 'function') {
      continue;
    }

    // Remover propriedades privadas (começam com _)
    if (key.startsWith('_')) {
      continue;
    }

    // Recursivamente sanitizar objetos
    if (typeof value === 'object' && value !== null) {
      (sanitized as any)[key] = sanitizeNetworkData(value);
    } else {
      (sanitized as any)[key] = value;
    }
  }

  return sanitized;
}

/**
 * Configuração de segurança de rede para Android
 */
export const ANDROID_NETWORK_SECURITY_CONFIG = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
  
  <!-- Permitir cleartext apenas em debug -->
  <domain-config cleartextTrafficPermitted="${__DEV__ ? 'true' : 'false'}">
    <domain includeSubdomains="true">localhost</domain>
    <domain includeSubdomains="true">127.0.0.1</domain>
    <domain includeSubdomains="true">10.0.2.2</domain>
  </domain-config>
</network-security-config>`;

/**
 * Valida resposta da API
 */
export function validateApiResponse(response: any): boolean {
  if (!response || typeof response !== 'object') {
    return false;
  }

  // Verificar estrutura básica esperada
  // Adaptar conforme necessidade da sua API
  return true;
}

/**
 * Rate limiting local (prevenir abuse)
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number = 10;
  private windowMs: number = 60000; // 1 minuto

  canMakeRequest(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Remover requisições antigas
    const recentRequests = requests.filter((time) => now - time < this.windowMs);

    if (recentRequests.length >= this.maxRequests) {
      return false;
    }

    recentRequests.push(now);
    this.requests.set(key, recentRequests);

    return true;
  }

  reset(key: string): void {
    this.requests.delete(key);
  }
}

export const rateLimiter = new RateLimiter();
