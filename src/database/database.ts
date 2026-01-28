import * as SQLite from 'expo-sqlite';
import {
  CREATE_TABLES_SQL,
  INSERT_DEFAULT_CATEGORIES_SQL,
  INSERT_DEFAULT_SETTINGS_SQL,
} from './schema';

const DATABASE_NAME = 'organizadin.db';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    return db;
  }

  db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  return db;
}

export async function initializeDatabase(): Promise<void> {
  const database = await getDatabase();

  // Criar tabelas
  await database.execAsync(CREATE_TABLES_SQL);

  // Inserir categorias padrão
  await database.execAsync(INSERT_DEFAULT_CATEGORIES_SQL);

  // Inserir configurações padrão
  await database.execAsync(INSERT_DEFAULT_SETTINGS_SQL);

  console.log('Database initialized successfully');
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}

// Funções auxiliares para queries

export async function runQuery(
  sql: string,
  params: (string | number | null)[] = []
): Promise<SQLite.SQLiteRunResult> {
  const database = await getDatabase();
  return database.runAsync(sql, params);
}

export async function getAll<T>(
  sql: string,
  params: (string | number | null)[] = []
): Promise<T[]> {
  const database = await getDatabase();
  return database.getAllAsync<T>(sql, params);
}

export async function getFirst<T>(
  sql: string,
  params: (string | number | null)[] = []
): Promise<T | null> {
  const database = await getDatabase();
  return database.getFirstAsync<T>(sql, params);
}
