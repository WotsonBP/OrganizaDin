import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { initializeDatabase } from '../database';

interface DatabaseContextType {
  isReady: boolean;
  error: string | null;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

interface DatabaseProviderProps {
  children: ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initDB();
  }, []);

  const initDB = async () => {
    try {
      await initializeDatabase();
      setIsReady(true);
    } catch (err) {
      console.error('Database initialization error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao inicializar banco de dados');
    }
  };

  return (
    <DatabaseContext.Provider value={{ isReady, error }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase(): DatabaseContextType {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}
