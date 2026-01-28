import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Spacing, FontSize, BorderRadius } from '../../src/constants/theme';
import { getAll, getFirst } from '../../src/database';

interface BalanceSummary {
  totalIncome: number;
  totalExpense: number;
}

interface CreditSummary {
  totalPending: number;
}

interface MonthlySettings {
  monthly_income: number;
}

interface RecentTransaction {
  id: number;
  description: string;
  amount: number;
  date: string;
  type: 'balance' | 'credit';
  method?: string;
  transaction_type?: string;
  card_name?: string;
  category_icon?: string;
  installment_info?: string;
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState(0);
  const [creditTotal, setCreditTotal] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [nextMonthProjection, setNextMonthProjection] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);

  const loadData = async () => {
    try {
      // Calcular saldo disponível
      const balanceData = await getFirst<BalanceSummary>(`
        SELECT
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as totalIncome,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as totalExpense
        FROM balance_transactions
      `);

      if (balanceData) {
        setBalance(balanceData.totalIncome - balanceData.totalExpense);
      }

      // Calcular total a pagar no cartão (mês atual)
      const currentMonth = new Date().toISOString().slice(0, 7);
      const creditData = await getFirst<CreditSummary>(`
        SELECT COALESCE(SUM(amount), 0) as totalPending
        FROM installments
        WHERE status = 'pending'
        AND strftime('%Y-%m', due_date) = ?
      `, [currentMonth]);

      if (creditData) {
        setCreditTotal(creditData.totalPending);
      }

      // Obter renda mensal
      const settings = await getFirst<MonthlySettings>(
        'SELECT monthly_income FROM user_settings WHERE id = 1'
      );

      if (settings) {
        setMonthlyIncome(settings.monthly_income);

        // Calcular previsão do próximo mês
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const nextMonthStr = nextMonth.toISOString().slice(0, 7);

        const nextMonthCredit = await getFirst<CreditSummary>(`
          SELECT COALESCE(SUM(amount), 0) as totalPending
          FROM installments
          WHERE status = 'pending'
          AND strftime('%Y-%m', due_date) = ?
        `, [nextMonthStr]);

        const projection = settings.monthly_income - (nextMonthCredit?.totalPending || 0);
        setNextMonthProjection(projection);
      }

      // Carregar últimas transações (mix de saldo e crédito)
      const recentBalance = await getAll<any>(`
        SELECT 
          id,
          description,
          amount,
          date,
          type as transaction_type,
          method,
          'balance' as type
        FROM balance_transactions
        ORDER BY date DESC, id DESC
        LIMIT 5
      `);

      const recentCredit = await getAll<any>(`
        SELECT 
          cp.id,
          cp.description,
          cp.total_amount as amount,
          cp.date,
          'credit' as type,
          cc.name as card_name,
          c.icon as category_icon,
          CASE 
            WHEN cp.installments > 1 THEN cp.installments || 'x'
            ELSE NULL
          END as installment_info
        FROM credit_purchases cp
        JOIN credit_cards cc ON cp.card_id = cc.id
        LEFT JOIN categories c ON cp.category_id = c.id
        ORDER BY cp.date DESC, cp.id DESC
        LIMIT 5
      `);

      // Combinar e ordenar por data
      const allTransactions = [...recentBalance, ...recentCredit]
        .sort((a, b) => {
          const dateCompare = b.date.localeCompare(a.date);
          if (dateCompare !== 0) return dateCompare;
          return b.id - a.id;
        })
        .slice(0, 8); // Pegar as 8 mais recentes

      setRecentTransactions(allTransactions);
    } catch (error) {
      console.log('Error loading home data:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const transactionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (transactionDate.getTime() === today.getTime()) {
      return 'Hoje';
    } else if (transactionDate.getTime() === yesterday.getTime()) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
      });
    }
  };

  const getTransactionIcon = (transaction: RecentTransaction) => {
    if (transaction.type === 'balance') {
      if (transaction.transaction_type === 'income') {
        return 'arrow-down-circle';
      } else {
        return 'arrow-up-circle';
      }
    } else {
      return 'card';
    }
  };

  const getTransactionColor = (transaction: RecentTransaction) => {
    if (transaction.type === 'balance') {
      return transaction.transaction_type === 'income' ? colors.income : colors.expense;
    } else {
      return colors.warning;
    }
  };

  const getMethodLabel = (method?: string) => {
    switch (method) {
      case 'pix':
        return 'PIX';
      case 'debit':
        return 'Débito';
      case 'cash':
        return 'Dinheiro';
      default:
        return '';
    }
  };

  const balanceColor = balance < 150 ? colors.balanceLow : colors.balanceOk;
  const projectionColor = nextMonthProjection >= 0 ? colors.success : colors.error;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Card Saldo Disponível */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
            Saldo Disponível
          </Text>
          <Ionicons name="wallet-outline" size={24} color={balanceColor} />
        </View>
        <Text style={[styles.cardValue, { color: balanceColor }]}>
          {formatCurrency(balance)}
        </Text>
      </View>

      {/* Card Total Cartão */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
            Total a Pagar (Cartão)
          </Text>
          <Ionicons name="card-outline" size={24} color={colors.warning} />
        </View>
        <Text style={[styles.cardValue, { color: colors.warning }]}>
          {formatCurrency(creditTotal)}
        </Text>
        <Text style={[styles.cardSubtext, { color: colors.textMuted }]}>
          Este mês
        </Text>
      </View>

      {/* Card Previsão Próximo Mês */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
            Previsão Próximo Mês
          </Text>
          <Ionicons name="trending-up-outline" size={24} color={projectionColor} />
        </View>
        <Text style={[styles.cardValue, { color: projectionColor }]}>
          {formatCurrency(nextMonthProjection)}
        </Text>
        <Text style={[styles.cardSubtext, { color: colors.textMuted }]}>
          {nextMonthProjection >= 0 ? 'Vai sobrar' : 'Vai faltar'}
        </Text>
      </View>

      {/* Ações Rápidas */}
      <View style={styles.actionsContainer}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Ações Rápidas
        </Text>
        <View style={styles.actionsGrid}>
          <Pressable
            style={[styles.actionButton, { backgroundColor: colors.surface }]}
            onPress={() => router.push('/add-purchase')}
          >
            <Ionicons name="card" size={28} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.text }]}>
              Compra Cartão
            </Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, { backgroundColor: colors.surface }]}
            onPress={() => router.push('/add-balance')}
          >
            <Ionicons name="swap-horizontal" size={28} color={colors.info} />
            <Text style={[styles.actionText, { color: colors.text }]}>
              Entrada/Saída
            </Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, { backgroundColor: colors.surface }]}
            onPress={() => router.push('/piggy')}
          >
            <Ionicons name="lock-closed" size={28} color={colors.primaryLight} />
            <Text style={[styles.actionText, { color: colors.text }]}>
              Porquinho
            </Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, { backgroundColor: colors.surface }]}
            onPress={() => router.push('/reports')}
          >
            <Ionicons name="bar-chart" size={28} color={colors.recurring} />
            <Text style={[styles.actionText, { color: colors.text }]}>
              Relatórios
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Últimas Movimentações */}
      <View style={styles.recentContainer}>
        <View style={styles.recentHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Últimas Movimentações
          </Text>
          {recentTransactions.length > 0 && (
            <Pressable onPress={() => router.push('/history')}>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>
                Ver todas
              </Text>
            </Pressable>
          )}
        </View>

        {recentTransactions.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Nenhuma movimentação ainda
            </Text>
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {recentTransactions.map((transaction: RecentTransaction) => (
              <Pressable
                key={`${transaction.type}-${transaction.id}`}
                style={[styles.transactionItem, { backgroundColor: colors.surface }]}
                onPress={() => {
                  if (transaction.type === 'balance') {
                    router.push(`/edit-balance?id=${transaction.id}`);
                  } else {
                    router.push(`/edit-purchase?id=${transaction.id}`);
                  }
                }}
              >
                <View style={[
                  styles.transactionIcon,
                  { backgroundColor: getTransactionColor(transaction) + '20' }
                ]}>
                  {transaction.type === 'credit' && transaction.category_icon ? (
                    <Text style={styles.transactionEmoji}>{transaction.category_icon}</Text>
                  ) : (
                    <Ionicons
                      name={getTransactionIcon(transaction)}
                      size={20}
                      color={getTransactionColor(transaction)}
                    />
                  )}
                </View>

                <View style={styles.transactionInfo}>
                  <Text style={[styles.transactionDesc, { color: colors.text }]} numberOfLines={1}>
                    {transaction.description}
                  </Text>
                  <View style={styles.transactionMeta}>
                    <Text style={[styles.transactionDate, { color: colors.textMuted }]}>
                      {formatDate(transaction.date)}
                    </Text>
                    {transaction.type === 'balance' && transaction.method && (
                      <>
                        <Text style={[styles.metaSeparator, { color: colors.textMuted }]}>•</Text>
                        <Text style={[styles.transactionMethod, { color: colors.textMuted }]}>
                          {getMethodLabel(transaction.method)}
                        </Text>
                      </>
                    )}
                    {transaction.type === 'credit' && transaction.card_name && (
                      <>
                        <Text style={[styles.metaSeparator, { color: colors.textMuted }]}>•</Text>
                        <Text style={[styles.transactionMethod, { color: colors.textMuted }]}>
                          {transaction.card_name}
                        </Text>
                      </>
                    )}
                    {transaction.installment_info && (
                      <>
                        <Text style={[styles.metaSeparator, { color: colors.textMuted }]}>•</Text>
                        <Text style={[styles.transactionInstallment, { color: colors.textMuted }]}>
                          {transaction.installment_info}
                        </Text>
                      </>
                    )}
                  </View>
                </View>

                <View style={styles.transactionAmount}>
                  <Text style={[
                    styles.transactionValue,
                    { color: getTransactionColor(transaction) }
                  ]}>
                    {transaction.type === 'balance' && transaction.transaction_type === 'expense' ? '-' : ''}
                    {transaction.type === 'balance' && transaction.transaction_type === 'income' ? '+' : ''}
                    {formatCurrency(transaction.amount)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cardLabel: {
    fontSize: FontSize.md,
  },
  cardValue: {
    fontSize: FontSize.xxxl,
    fontWeight: 'bold',
  },
  cardSubtext: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  actionsContainer: {
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  actionButton: {
    width: '47%',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  recentContainer: {
    marginTop: Spacing.xl,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  seeAllText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  emptyState: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md,
  },
  transactionsList: {
    gap: Spacing.sm,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionEmoji: {
    fontSize: 20,
  },
  transactionInfo: {
    flex: 1,
    gap: 4,
  },
  transactionDesc: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  transactionDate: {
    fontSize: FontSize.sm,
  },
  metaSeparator: {
    fontSize: FontSize.sm,
  },
  transactionMethod: {
    fontSize: FontSize.sm,
  },
  transactionInstallment: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionValue: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
  },
});
