/**
 * Módulo de segurança de senhas
 * Implementa hash seguro e proteção contra ataques
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const PASSWORD_KEY = 'piggy_password';
const PASSWORD_HASH_KEY = 'piggy_password_hash';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutos
const ATTEMPTS_KEY = 'password_attempts';
const LOCKOUT_KEY = 'password_lockout';

/**
 * Gera hash simples mas seguro para senha de 4 dígitos
 * Usa SHA-256 através de Web Crypto API quando disponível
 */
async function hashPassword(password: string): Promise<string> {
  // Validação básica
  if (!/^\d{4}$/.test(password)) {
    throw new Error('Senha deve ter 4 dígitos');
  }

  // Usar Web Crypto API se disponível (mais seguro)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password + 'organizadin_salt_2024');
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.warn('Web Crypto API não disponível, usando hash simples');
    }
  }

  // Fallback: hash simples (não ideal, mas melhor que texto plano)
  let hash = 0;
  const str = password + 'organizadin_salt_2024';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Salva senha de forma segura
 */
export async function savePassword(password: string): Promise<void> {
  if (!/^\d{4}$/.test(password)) {
    throw new Error('Senha deve ter exatamente 4 dígitos');
  }

  const hash = await hashPassword(password);
  
  // Salvar hash no SecureStore
  await SecureStore.setItemAsync(PASSWORD_HASH_KEY, hash);
  
  // Manter compatibilidade com código antigo (remover depois)
  await SecureStore.setItemAsync(PASSWORD_KEY, password);
  
  // Limpar tentativas
  await SecureStore.deleteItemAsync(ATTEMPTS_KEY);
  await SecureStore.deleteItemAsync(LOCKOUT_KEY);
}

/**
 * Verifica se a senha está correta
 */
export async function verifyPassword(password: string): Promise<boolean> {
  // Verificar lockout
  const lockoutUntil = await SecureStore.getItemAsync(LOCKOUT_KEY);
  if (lockoutUntil) {
    const lockoutTime = parseInt(lockoutUntil, 10);
    if (Date.now() < lockoutTime) {
      const minutesLeft = Math.ceil((lockoutTime - Date.now()) / 60000);
      throw new Error(`Muitas tentativas. Tente novamente em ${minutesLeft} minutos.`);
    }
    // Lockout expirado, limpar
    await SecureStore.deleteItemAsync(LOCKOUT_KEY);
    await SecureStore.deleteItemAsync(ATTEMPTS_KEY);
  }

  // Verificar tentativas
  const attemptsStr = await SecureStore.getItemAsync(ATTEMPTS_KEY);
  const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;

  if (attempts >= MAX_ATTEMPTS) {
    const lockoutTime = Date.now() + LOCKOUT_DURATION;
    await SecureStore.setItemAsync(LOCKOUT_KEY, lockoutTime.toString());
    throw new Error('Muitas tentativas incorretas. Tente novamente em 15 minutos.');
  }

  // Verificar senha
  const storedHash = await SecureStore.getItemAsync(PASSWORD_HASH_KEY);
  
  // Compatibilidade com código antigo
  if (!storedHash) {
    const storedPassword = await SecureStore.getItemAsync(PASSWORD_KEY);
    if (storedPassword === password) {
      // Migrar para hash
      await savePassword(password);
      return true;
    }
    await incrementAttempts();
    return false;
  }

  const inputHash = await hashPassword(password);
  const isValid = inputHash === storedHash;

  if (!isValid) {
    await incrementAttempts();
  } else {
    // Senha correta, limpar tentativas
    await SecureStore.deleteItemAsync(ATTEMPTS_KEY);
  }

  return isValid;
}

/**
 * Incrementa contador de tentativas
 */
async function incrementAttempts(): Promise<void> {
  const attemptsStr = await SecureStore.getItemAsync(ATTEMPTS_KEY);
  const attempts = attemptsStr ? parseInt(attemptsStr, 10) + 1 : 1;
  await SecureStore.setItemAsync(ATTEMPTS_KEY, attempts.toString());
}

/**
 * Verifica se existe senha configurada
 */
export async function hasPassword(): Promise<boolean> {
  const hash = await SecureStore.getItemAsync(PASSWORD_HASH_KEY);
  const password = await SecureStore.getItemAsync(PASSWORD_KEY);
  return !!(hash || password);
}

/**
 * Remove senha (para reset)
 */
export async function removePassword(): Promise<void> {
  await SecureStore.deleteItemAsync(PASSWORD_KEY);
  await SecureStore.deleteItemAsync(PASSWORD_HASH_KEY);
  await SecureStore.deleteItemAsync(ATTEMPTS_KEY);
  await SecureStore.deleteItemAsync(LOCKOUT_KEY);
}

/**
 * Obtém tentativas restantes
 */
export async function getRemainingAttempts(): Promise<number> {
  const attemptsStr = await SecureStore.getItemAsync(ATTEMPTS_KEY);
  const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
  return Math.max(0, MAX_ATTEMPTS - attempts);
}
