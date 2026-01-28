/**
 * Módulo de validação de backups
 * Valida integridade e segurança de arquivos de backup
 */

import { sanitizeString, sanitizeNumber, validateDate, sanitizeId } from './inputValidation';

export interface BackupData {
  version: string;
  timestamp: string;
  data: {
    user_settings: any[];
    categories: any[];
    credit_cards: any[];
    balance_transactions: any[];
    credit_purchases: any[];
    purchase_items: any[];
    installments: any[];
    piggies: any[];
    piggy_transactions: any[];
  };
}

/**
 * Valida estrutura básica do backup
 */
export function validateBackupStructure(backup: any): backup is BackupData {
  if (!backup || typeof backup !== 'object') {
    return false;
  }

  if (!backup.version || typeof backup.version !== 'string') {
    return false;
  }

  if (!backup.timestamp || typeof backup.timestamp !== 'string') {
    return false;
  }

  if (!backup.data || typeof backup.data !== 'object') {
    return false;
  }

  // Verificar se todas as tabelas esperadas existem
  const requiredTables = [
    'user_settings',
    'categories',
    'credit_cards',
    'balance_transactions',
    'credit_purchases',
    'purchase_items',
    'installments',
    'piggies',
    'piggy_transactions',
  ];

  for (const table of requiredTables) {
    if (!Array.isArray(backup.data[table])) {
      return false;
    }
  }

  return true;
}

/**
 * Valida e sanitiza dados do backup
 */
export function validateAndSanitizeBackup(backup: BackupData): {
  isValid: boolean;
  errors: string[];
  sanitized: BackupData | null;
} {
  const errors: string[] = [];

  // Validar estrutura
  if (!validateBackupStructure(backup)) {
    return {
      isValid: false,
      errors: ['Estrutura do backup inválida'],
      sanitized: null,
    };
  }

  // Validar versão
  if (backup.version !== '1.0.0') {
    errors.push(`Versão do backup (${backup.version}) pode ser incompatível`);
  }

  // Validar timestamp
  if (!validateDate(backup.timestamp.split('T')[0])) {
    errors.push('Timestamp do backup inválido');
  }

  // Sanitizar e validar cada tabela
  const sanitized: BackupData = {
    version: backup.version,
    timestamp: backup.timestamp,
    data: {
      user_settings: [],
      categories: [],
      credit_cards: [],
      balance_transactions: [],
      credit_purchases: [],
      purchase_items: [],
      installments: [],
      piggies: [],
      piggy_transactions: [],
    },
  };

  // Validar user_settings
  if (backup.data.user_settings.length > 0) {
    const settings = backup.data.user_settings[0];
    if (settings.theme && !['dark', 'light'].includes(settings.theme)) {
      errors.push('Tema inválido no backup');
    }
    const income = sanitizeNumber(settings.monthly_income, 0, 999999999);
    if (income === null && settings.monthly_income !== undefined) {
      errors.push('Renda mensal inválida no backup');
    }
    sanitized.data.user_settings = [
      {
        ...settings,
        theme: settings.theme === 'dark' || settings.theme === 'light' ? settings.theme : 'dark',
        monthly_income: income ?? 0,
      },
    ];
  }

  // Validar categorias
  for (const category of backup.data.categories) {
    if (!category.name || typeof category.name !== 'string') {
      errors.push('Categoria com nome inválido');
      continue;
    }
    sanitized.data.categories.push({
      ...category,
      name: sanitizeString(category.name, 50),
      icon: category.icon ? sanitizeString(category.icon, 10) : null,
      color: category.color ? sanitizeString(category.color, 20) : null,
      is_default: category.is_default ? 1 : 0,
    });
  }

  // Validar cartões
  for (const card of backup.data.credit_cards) {
    if (!card.name || typeof card.name !== 'string') {
      errors.push('Cartão com nome inválido');
      continue;
    }
    sanitized.data.credit_cards.push({
      ...card,
      name: sanitizeString(card.name, 50),
      color: card.color ? sanitizeString(card.color, 20) : null,
    });
  }

  // Validar transações de saldo
  for (const transaction of backup.data.balance_transactions) {
    const amount = sanitizeNumber(transaction.amount, -999999999, 999999999);
    if (amount === null) {
      errors.push('Transação de saldo com valor inválido');
      continue;
    }
    if (!validateDate(transaction.date)) {
      errors.push('Transação de saldo com data inválida');
      continue;
    }
    if (!['income', 'expense'].includes(transaction.type)) {
      errors.push('Transação de saldo com tipo inválido');
      continue;
    }
    if (!['pix', 'debit', 'cash'].includes(transaction.method)) {
      errors.push('Transação de saldo com método inválido');
      continue;
    }
    sanitized.data.balance_transactions.push({
      ...transaction,
      amount,
      description: sanitizeString(transaction.description, 200),
      date: transaction.date,
      type: transaction.type,
      method: transaction.method,
    });
  }

  // Validar compras
  for (const purchase of backup.data.credit_purchases) {
    const amount = sanitizeNumber(purchase.total_amount, 0.01, 999999999);
    if (amount === null) {
      errors.push('Compra com valor inválido');
      continue;
    }
    if (!validateDate(purchase.date)) {
      errors.push('Compra com data inválida');
      continue;
    }
    const cardId = sanitizeId(purchase.card_id);
    const categoryId = sanitizeId(purchase.category_id);
    if (!cardId || !categoryId) {
      errors.push('Compra com IDs inválidos');
      continue;
    }
    sanitized.data.credit_purchases.push({
      ...purchase,
      total_amount: amount,
      description: sanitizeString(purchase.description, 200),
      date: purchase.date,
      card_id: cardId,
      category_id: categoryId,
      installments: Math.max(1, Math.min(999, sanitizeId(purchase.installments) ?? 1)),
      is_recurring: purchase.is_recurring ? 1 : 0,
      has_multiple_items: purchase.has_multiple_items ? 1 : 0,
      image_uri: purchase.image_uri ? sanitizeString(purchase.image_uri, 500) : null,
    });
  }

  // Validar itens de compra
  for (const item of backup.data.purchase_items) {
    const amount = sanitizeNumber(item.amount, 0.01, 999999999);
    if (amount === null) {
      errors.push('Item de compra com valor inválido');
      continue;
    }
    sanitized.data.purchase_items.push({
      ...item,
      name: sanitizeString(item.name, 200),
      amount,
      image_uri: item.image_uri ? sanitizeString(item.image_uri, 500) : null,
    });
  }

  // Validar parcelas
  for (const installment of backup.data.installments) {
    const amount = sanitizeNumber(installment.amount, 0.01, 999999999);
    if (amount === null) {
      errors.push('Parcela com valor inválido');
      continue;
    }
    if (!validateDate(installment.due_date)) {
      errors.push('Parcela com data de vencimento inválida');
      continue;
    }
    if (!['pending', 'paid'].includes(installment.status)) {
      errors.push('Parcela com status inválido');
      continue;
    }
    sanitized.data.installments.push({
      ...installment,
      amount,
      due_date: installment.due_date,
      status: installment.status,
    });
  }

  // Validar porquinhos
  for (const piggy of backup.data.piggies) {
    if (!piggy.name || typeof piggy.name !== 'string') {
      errors.push('Porquinho com nome inválido');
      continue;
    }
    const balance = sanitizeNumber(piggy.balance, 0, 999999999);
    if (balance === null) {
      errors.push('Porquinho com saldo inválido');
      continue;
    }
    sanitized.data.piggies.push({
      ...piggy,
      name: sanitizeString(piggy.name, 50),
      balance: balance,
    });
  }

  // Validar transações de porquinhos
  for (const transaction of backup.data.piggy_transactions) {
    const amount = sanitizeNumber(transaction.amount, 0.01, 999999999);
    if (amount === null) {
      errors.push('Transação de porquinho com valor inválido');
      continue;
    }
    if (!validateDate(transaction.date)) {
      errors.push('Transação de porquinho com data inválida');
      continue;
    }
    if (!['deposit', 'withdraw', 'transfer_in', 'transfer_out'].includes(transaction.type)) {
      errors.push('Transação de porquinho com tipo inválido');
      continue;
    }
    sanitized.data.piggy_transactions.push({
      ...transaction,
      amount,
      description: sanitizeString(transaction.description, 200),
      date: transaction.date,
      type: transaction.type,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : null,
  };
}

/**
 * Valida tamanho máximo do backup
 */
export function validateBackupSize(backup: BackupData, maxSizeMB: number = 10): boolean {
  const jsonString = JSON.stringify(backup);
  const sizeMB = jsonString.length / (1024 * 1024);
  return sizeMB <= maxSizeMB;
}
