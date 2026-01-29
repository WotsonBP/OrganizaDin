// Esquema do banco de dados SQLite para OrganizaDin

export const CREATE_TABLES_SQL = `
-- Configurações do usuário
CREATE TABLE IF NOT EXISTS user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  theme TEXT DEFAULT 'dark' CHECK(theme IN ('dark', 'light')),
  monthly_income REAL DEFAULT 0,
  piggy_password TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Categorias
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  is_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Cartões de crédito
CREATE TABLE IF NOT EXISTS credit_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Movimentações de saldo (dinheiro real: Pix, Débito, Dinheiro)
CREATE TABLE IF NOT EXISTS balance_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount REAL NOT NULL,
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
  method TEXT NOT NULL CHECK(method IN ('pix', 'debit', 'cash')),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Compras no cartão de crédito
CREATE TABLE IF NOT EXISTS credit_purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  total_amount REAL NOT NULL,
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  card_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  installments INTEGER DEFAULT 1,
  is_recurring INTEGER DEFAULT 0,
  has_multiple_items INTEGER DEFAULT 0,
  image_uri TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (card_id) REFERENCES credit_cards(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Itens de compra (para compras com múltiplos itens)
CREATE TABLE IF NOT EXISTS purchase_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  image_uri TEXT,
  FOREIGN KEY (purchase_id) REFERENCES credit_purchases(id) ON DELETE CASCADE
);

-- Parcelas individuais
CREATE TABLE IF NOT EXISTS installments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id INTEGER NOT NULL,
  installment_number INTEGER NOT NULL,
  amount REAL NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid')),
  paid_at TEXT,
  FOREIGN KEY (purchase_id) REFERENCES credit_purchases(id) ON DELETE CASCADE
);

-- Porquinhos (área de dinheiro guardado)
CREATE TABLE IF NOT EXISTS piggies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  balance REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Movimentações dos porquinhos
CREATE TABLE IF NOT EXISTS piggy_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  piggy_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('deposit', 'withdraw', 'transfer_in', 'transfer_out')),
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  related_piggy_id INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (piggy_id) REFERENCES piggies(id) ON DELETE CASCADE,
  FOREIGN KEY (related_piggy_id) REFERENCES piggies(id) ON DELETE SET NULL
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_balance_transactions_date ON balance_transactions(date);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_type ON balance_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_date ON credit_purchases(date);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_card ON credit_purchases(card_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_category ON credit_purchases(category_id);
CREATE INDEX IF NOT EXISTS idx_installments_due_date ON installments(due_date);
CREATE INDEX IF NOT EXISTS idx_installments_status ON installments(status);
CREATE INDEX IF NOT EXISTS idx_piggy_transactions_piggy ON piggy_transactions(piggy_id);
CREATE INDEX IF NOT EXISTS idx_piggy_transactions_date ON piggy_transactions(date);
`;

// Categorias padrão
export const DEFAULT_CATEGORIES = [
  { name: 'Alimentação', icon: '🍔', color: '#FF9800' },
  { name: 'Casa', icon: '🏠', color: '#795548' },
  { name: 'Transporte', icon: '🚗', color: '#2196F3' },
  { name: 'Lazer', icon: '🎮', color: '#9C27B0' },
  { name: 'Saúde', icon: '💊', color: '#F44336' },
  { name: 'Compras', icon: '🛒', color: '#E91E63' },
  { name: 'Assinaturas', icon: '📺', color: '#673AB7' },
  { name: 'Outros', icon: '📦', color: '#607D8B' },
];

export const INSERT_DEFAULT_CATEGORIES_SQL = `
INSERT OR IGNORE INTO categories (name, icon, color, is_default) VALUES
('Alimentação', '🍔', '#FF9800', 1),
('Casa', '🏠', '#795548', 1),
('Transporte', '🚗', '#2196F3', 1),
('Lazer', '🎮', '#9C27B0', 1),
('Saúde', '💊', '#F44336', 1),
('Compras', '🛒', '#E91E63', 1),
('Assinaturas', '📺', '#673AB7', 1),
('Outros', '📦', '#607D8B', 1);
`;

export const INSERT_DEFAULT_SETTINGS_SQL = `
INSERT OR IGNORE INTO user_settings (id, theme, monthly_income) VALUES (1, 'dark', 0);
`;
