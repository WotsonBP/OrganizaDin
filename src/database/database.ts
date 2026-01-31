import * as SQLite from 'expo-sqlite';
import {
  CREATE_TABLES_SQL,
  INSERT_DEFAULT_CATEGORIES_SQL,
  INSERT_DEFAULT_SETTINGS_SQL,
} from './schema';

const DATABASE_NAME = 'organizadin.db';

let db: SQLite.SQLiteDatabase | null = null;

function openDB(): SQLite.SQLiteDatabase {
  const database = SQLite.openDatabaseSync(DATABASE_NAME);
  database.execSync('PRAGMA journal_mode = WAL;');
  database.execSync('PRAGMA foreign_keys = ON;');
  return database;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = openDB();
  }
  return db;
}

function isConnectionError(error: unknown): boolean {
  const message = String((error as any)?.message || error || '');
  return (
    message.includes('NullPointerException') ||
    message.includes('NativeDatabase') ||
    message.includes('has been rejected')
  );
}

async function resetConnection(): Promise<void> {
  if (db) {
    try {
      db.closeSync();
    } catch {
      // ignore close errors
    }
  }
  db = null;
}

/** Migração: adiciona coluna se não existir (para bancos já criados). */
async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  type PragmaRow = { name: string };
  const hasColumn = async (table: string, column: string): Promise<boolean> => {
    const rows = await database.getAllAsync<PragmaRow>(`PRAGMA table_info(${table})`);
    return rows.some(r => r.name === column);
  };

  if (!(await hasColumn('balance_transactions', 'notes'))) {
    await database.runAsync('ALTER TABLE balance_transactions ADD COLUMN notes TEXT');
  }
  if (!(await hasColumn('credit_purchases', 'notes'))) {
    await database.runAsync('ALTER TABLE credit_purchases ADD COLUMN notes TEXT');
  }
  if (!(await hasColumn('user_settings', 'hide_values'))) {
    await database.runAsync('ALTER TABLE user_settings ADD COLUMN hide_values INTEGER DEFAULT 0');
  }

  // Corrigir cartões sem cor definida
  await database.runAsync(
    `UPDATE credit_cards SET color = '#4ECDC4' WHERE color IS NULL`
  );

  // Remover categorias duplicadas (manter uma por nome, com menor id)
  type DupRow = { name: string; cnt: number };
  const dups = await database.getAllAsync<DupRow>(
    `SELECT name, COUNT(*) as cnt FROM categories GROUP BY name HAVING COUNT(*) > 1`
  );
  if (dups.length > 0) {
    // Redirecionar compras das categorias duplicadas para o id mantido (MIN(id) por nome)
    await database.runAsync(
      `UPDATE credit_purchases SET category_id = (
        SELECT MIN(c2.id) FROM categories c2 WHERE c2.name = (
          SELECT name FROM categories WHERE id = credit_purchases.category_id
        )
      ) WHERE category_id IN (
        SELECT id FROM categories WHERE id NOT IN (
          SELECT MIN(id) FROM categories GROUP BY name
        )
      )`
    );
    await database.runAsync(
      `DELETE FROM categories WHERE id NOT IN (
        SELECT MIN(id) FROM categories GROUP BY name
      )`
    );
  }
}

export async function initializeDatabase(): Promise<void> {
  const database = await getDatabase();

  // Criar tabelas
  await database.execAsync(CREATE_TABLES_SQL);

  // Migrações (ex.: adicionar coluna notes em bancos antigos)
  await runMigrations(database);

  // Inserir categorias padrão apenas se ainda não existirem (evita duplicatas)
  type CountRow = { c: number };
  const [{ c: defaultCount }] = await database.getAllAsync<CountRow>(
    'SELECT COUNT(*) as c FROM categories WHERE is_default = 1'
  );
  if (defaultCount === 0) {
    await database.execAsync(INSERT_DEFAULT_CATEGORIES_SQL);
  }

  // Inserir configurações padrão
  await database.execAsync(INSERT_DEFAULT_SETTINGS_SQL);

  console.log('Database initialized successfully');
}

export async function closeDatabase(): Promise<void> {
  await resetConnection();
}

// Funções auxiliares para queries com reconexão automática

export async function runQuery(
  sql: string,
  params: (string | number | null)[] = []
): Promise<SQLite.SQLiteRunResult> {
  try {
    const database = await getDatabase();
    return await database.runAsync(sql, params);
  } catch (error) {
    if (isConnectionError(error)) {
      console.log('Database connection lost (runQuery), reconnecting...');
      await resetConnection();
      const database = await getDatabase();
      return database.runAsync(sql, params);
    }
    throw error;
  }
}

export async function getAll<T>(
  sql: string,
  params: (string | number | null)[] = []
): Promise<T[]> {
  try {
    const database = await getDatabase();
    return await database.getAllAsync<T>(sql, params);
  } catch (error) {
    if (isConnectionError(error)) {
      console.log('Database connection lost (getAll), reconnecting...');
      await resetConnection();
      const database = await getDatabase();
      return database.getAllAsync<T>(sql, params);
    }
    throw error;
  }
}

export async function getFirst<T>(
  sql: string,
  params: (string | number | null)[] = []
): Promise<T | null> {
  try {
    const database = await getDatabase();
    return await database.getFirstAsync<T>(sql, params);
  } catch (error) {
    if (isConnectionError(error)) {
      console.log('Database connection lost (getFirst), reconnecting...');
      await resetConnection();
      const database = await getDatabase();
      return database.getFirstAsync<T>(sql, params);
    }
    throw error;
  }
}
