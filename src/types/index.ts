// Tipos base do app OrganizaDin

// Meios de pagamento para dinheiro real
export type PaymentMethod = 'pix' | 'debit' | 'cash';

// Tipo de movimentação de saldo
export type TransactionType = 'income' | 'expense';

// Status de pagamento do cartão
export type PaymentStatus = 'pending' | 'paid';

// Categorias
export interface Category {
  id: number;
  name: string;
  icon?: string;
  color?: string;
  isDefault: boolean;
  createdAt: string;
}

// Cartões de crédito
export interface CreditCard {
  id: number;
  name: string;
  color?: string;
  createdAt: string;
}

// Movimentação de saldo (dinheiro real)
export interface BalanceTransaction {
  id: number;
  amount: number;
  description: string;
  date: string;
  type: TransactionType;
  method: PaymentMethod;
  createdAt: string;
  updatedAt: string;
}

// Compra no cartão de crédito
export interface CreditPurchase {
  id: number;
  totalAmount: number;
  description: string;
  date: string;
  cardId: number;
  categoryId: number;
  installments: number;
  isRecurring: boolean;
  hasMultipleItems: boolean;
  imageUri?: string;
  createdAt: string;
  updatedAt: string;
}

// Item de compra (quando a compra tem múltiplos itens)
export interface PurchaseItem {
  id: number;
  purchaseId: number;
  name: string;
  amount: number;
  imageUri?: string;
}

// Parcela individual
export interface Installment {
  id: number;
  purchaseId: number;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  status: PaymentStatus;
  paidAt?: string;
}

// Porquinho (área de dinheiro guardado)
export interface Piggy {
  id: number;
  name: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

// Movimentação do porquinho
export interface PiggyTransaction {
  id: number;
  piggyId: number;
  amount: number;
  type: 'deposit' | 'withdraw' | 'transfer_in' | 'transfer_out';
  description: string;
  date: string;
  relatedPiggyId?: number; // Para transferências entre porcos
  createdAt: string;
}

// Configurações do usuário
export interface UserSettings {
  id: number;
  theme: 'dark' | 'light';
  monthlyIncome: number;
  piggyPassword?: string; // Hash da senha de 4 dígitos
  createdAt: string;
  updatedAt: string;
}

// Tipos para exibição e cálculos

export interface MonthSummary {
  month: string; // formato: YYYY-MM
  totalIncome: number;
  totalExpense: number;
  totalCreditPending: number;
  totalCreditPaid: number;
  balance: number;
}

export interface InstallmentSummary {
  purchaseId: number;
  description: string;
  cardName: string;
  installmentAmount: number;
  totalInstallments: number;
  remainingInstallments: number;
  paidAmount: number;
  remainingAmount: number;
  endMonth: string;
}

export interface FutureMonthProjection {
  month: string;
  expectedIncome: number;
  committedExpenses: number;
  projectedBalance: number;
}
