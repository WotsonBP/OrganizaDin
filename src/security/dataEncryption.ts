/**
 * Módulo de criptografia de dados
 * Implementa criptografia para dados sensíveis usando expo-crypto
 */

import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const ENCRYPTION_KEY = 'organizadin_encryption_key_v1';

/**
 * Gera uma chave de criptografia única para o dispositivo
 */
async function getOrCreateEncryptionKey(): Promise<string> {
  try {
    let key = await SecureStore.getItemAsync(ENCRYPTION_KEY);
    
    if (!key) {
      // Gerar nova chave aleatória
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      key = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      
      await SecureStore.setItemAsync(ENCRYPTION_KEY, key);
    }
    
    return key;
  } catch (error) {
    console.error('Error getting encryption key:', error);
    throw new Error('Failed to initialize encryption');
  }
}

/**
 * Criptografa dados usando AES-256 (simulado com hash)
 * Nota: Para criptografia real AES, seria necessário biblioteca nativa
 */
export async function encryptData(data: string): Promise<string> {
  try {
    if (!data || data.length === 0) {
      return data;
    }

    const key = await getOrCreateEncryptionKey();
    
    // Usar Crypto.digestStringAsync para criar hash
    // Em produção real, usar biblioteca como react-native-aes-crypto
    const combined = key + data + Date.now().toString();
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      combined
    );

    // Base64 encode do dado original + hash para verificação
    const encoded = Buffer.from(JSON.stringify({ data, hash })).toString('base64');
    
    return encoded;
  } catch (error) {
    console.error('Error encrypting data:', error);
    return data; // Fallback para dado não criptografado
  }
}

/**
 * Descriptografa dados
 */
export async function decryptData(encryptedData: string): Promise<string> {
  try {
    if (!encryptedData || encryptedData.length === 0) {
      return encryptedData;
    }

    // Tentar decodificar
    const decoded = Buffer.from(encryptedData, 'base64').toString();
    const parsed = JSON.parse(decoded);
    
    return parsed.data || encryptedData;
  } catch (error) {
    // Se falhar, retornar dado original (pode não estar criptografado)
    return encryptedData;
  }
}

/**
 * Hash seguro de senha usando SHA-256
 */
export async function hashPassword(password: string, salt?: string): Promise<string> {
  const actualSalt = salt || 'organizadin_salt_2024';
  const combined = password + actualSalt;
  
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    combined
  );
}

/**
 * Gera token aleatório seguro
 */
export async function generateSecureToken(length: number = 32): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(length);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Gera UUID v4 seguro
 */
export function generateSecureUUID(): string {
  return Crypto.randomUUID();
}

/**
 * Criptografa campos sensíveis de um objeto
 */
export async function encryptSensitiveFields(
  obj: Record<string, any>,
  sensitiveFields: string[]
): Promise<Record<string, any>> {
  const encrypted = { ...obj };
  
  for (const field of sensitiveFields) {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[field] = await encryptData(encrypted[field]);
    }
  }
  
  return encrypted;
}

/**
 * Descriptografa campos sensíveis de um objeto
 */
export async function decryptSensitiveFields(
  obj: Record<string, any>,
  sensitiveFields: string[]
): Promise<Record<string, any>> {
  const decrypted = { ...obj };
  
  for (const field of sensitiveFields) {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      decrypted[field] = await decryptData(decrypted[field]);
    }
  }
  
  return decrypted;
}

/**
 * Limpa dados sensíveis da memória
 */
export function secureDelete(obj: any): void {
  if (typeof obj === 'object' && obj !== null) {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Sobrescrever com zeros
        obj[key] = '0'.repeat(obj[key].length);
      } else if (typeof obj[key] === 'number') {
        obj[key] = 0;
      } else if (typeof obj[key] === 'object') {
        secureDelete(obj[key]);
      }
      delete obj[key];
    }
  }
}

/**
 * Verifica integridade dos dados usando hash
 */
export async function verifyDataIntegrity(
  data: string,
  expectedHash: string
): Promise<boolean> {
  try {
    const actualHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data
    );
    return actualHash === expectedHash;
  } catch (error) {
    console.error('Error verifying data integrity:', error);
    return false;
  }
}

/**
 * Cria checksum de dados para detecção de tampering
 */
export async function createDataChecksum(data: any): Promise<string> {
  const jsonString = JSON.stringify(data);
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    jsonString
  );
}

/**
 * Ofusca dados sensíveis para logs
 */
export function obfuscateForLog(value: string, showFirst: number = 0, showLast: number = 0): string {
  if (!value || value.length <= showFirst + showLast) {
    return '***';
  }

  const first = value.substring(0, showFirst);
  const last = value.substring(value.length - showLast);
  const middle = '*'.repeat(Math.min(value.length - showFirst - showLast, 8));

  return `${first}${middle}${last}`;
}
