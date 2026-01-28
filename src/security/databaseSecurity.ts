/**
 * Módulo de segurança do banco de dados
 * Wrapper seguro para queries SQL com proteção contra SQL Injection
 */

import { runQuery as dbRunQuery, getAll as dbGetAll, getFirst as dbGetFirst } from '../database/database';
import { sanitizeSqlParams, sanitizeId, sanitizeString, sanitizeNumber } from './inputValidation';

/**
 * Executa query SQL de forma segura
 */
export async function secureRunQuery(
  sql: string,
  params: (string | number | null)[] = []
): Promise<any> {
  // Validar que SQL não contém comandos perigosos
  const dangerousPatterns = [
    /DROP\s+TABLE/gi,
    /DELETE\s+FROM\s+\w+\s*;?\s*$/gi, // DELETE sem WHERE
    /TRUNCATE/gi,
    /ALTER\s+TABLE/gi,
    /CREATE\s+TABLE/gi,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(sql)) {
      throw new Error('Operação SQL não permitida por segurança');
    }
  }

  // Sanitizar parâmetros
  const sanitizedParams = sanitizeSqlParams(params);

  return dbRunQuery(sql, sanitizedParams);
}

/**
 * Busca todos os registros de forma segura
 */
export async function secureGetAll<T>(
  sql: string,
  params: (string | number | null)[] = []
): Promise<T[]> {
  // Validar que é uma query SELECT
  if (!/^\s*SELECT/gi.test(sql.trim())) {
    throw new Error('Apenas queries SELECT são permitidas');
  }

  const sanitizedParams = sanitizeSqlParams(params);
  return dbGetAll<T>(sql, sanitizedParams);
}

/**
 * Busca primeiro registro de forma segura
 */
export async function secureGetFirst<T>(
  sql: string,
  params: (string | number | null)[] = []
): Promise<T | null> {
  // Validar que é uma query SELECT
  if (!/^\s*SELECT/gi.test(sql.trim())) {
    throw new Error('Apenas queries SELECT são permitidas');
  }

  const sanitizedParams = sanitizeSqlParams(params);
  return dbGetFirst<T>(sql, sanitizedParams);
}

/**
 * Deleta registro de forma segura (sempre requer ID)
 */
export async function secureDelete(
  table: string,
  id: string | number
): Promise<void> {
  // Validar nome da tabela
  const validTables = [
    'balance_transactions',
    'credit_purchases',
    'purchase_items',
    'installments',
    'piggies',
    'piggy_transactions',
    'credit_cards',
    'categories',
  ];

  if (!validTables.includes(table)) {
    throw new Error('Tabela inválida');
  }

  const sanitizedId = sanitizeId(id);
  if (!sanitizedId) {
    throw new Error('ID inválido');
  }

  await dbRunQuery(`DELETE FROM ${table} WHERE id = ?`, [sanitizedId]);
}

/**
 * Insere registro de forma segura
 */
export async function secureInsert(
  table: string,
  data: Record<string, any>
): Promise<number> {
  const validTables = [
    'balance_transactions',
    'credit_purchases',
    'purchase_items',
    'installments',
    'piggies',
    'piggy_transactions',
    'credit_cards',
    'categories',
  ];

  if (!validTables.includes(table)) {
    throw new Error('Tabela inválida');
  }

  // Sanitizar dados baseado no tipo
  const sanitizedData: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      sanitizedData[key] = null;
    } else if (typeof value === 'number') {
      sanitizedData[key] = sanitizeNumber(value) ?? null;
    } else if (typeof value === 'string') {
      sanitizedData[key] = sanitizeString(value);
    } else {
      sanitizedData[key] = value;
    }
  }

  const columns = Object.keys(sanitizedData).join(', ');
  const placeholders = Object.keys(sanitizedData).map(() => '?').join(', ');
  const values = Object.values(sanitizedData);

  const result = await dbRunQuery(
    `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
    values
  );

  return result.lastInsertRowId as number;
}

/**
 * Atualiza registro de forma segura (sempre requer ID)
 */
export async function secureUpdate(
  table: string,
  id: string | number,
  data: Record<string, any>
): Promise<void> {
  const validTables = [
    'balance_transactions',
    'credit_purchases',
    'purchase_items',
    'installments',
    'piggies',
    'piggy_transactions',
    'credit_cards',
    'categories',
    'user_settings',
  ];

  if (!validTables.includes(table)) {
    throw new Error('Tabela inválida');
  }

  const sanitizedId = sanitizeId(id);
  if (!sanitizedId) {
    throw new Error('ID inválido');
  }

  // Sanitizar dados
  const sanitizedData: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      sanitizedData[key] = null;
    } else if (typeof value === 'number') {
      sanitizedData[key] = sanitizeNumber(value) ?? null;
    } else if (typeof value === 'string') {
      sanitizedData[key] = sanitizeString(value);
    } else {
      sanitizedData[key] = value;
    }
  }

  const setClause = Object.keys(sanitizedData)
    .map((key) => `${key} = ?`)
    .join(', ');
  const values = [...Object.values(sanitizedData), sanitizedId];

  await dbRunQuery(`UPDATE ${table} SET ${setClause} WHERE id = ?`, values);
}
