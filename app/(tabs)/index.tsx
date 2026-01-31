import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Modal,
  FlatList,

} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Spacing, FontSize, BorderRadius } from '../../src/constants/theme';
import { getAll, getFirst } from '../../src/database';
import { ScrambleText } from '../../src/components/ScrambleText';

interface FutureMonth {
  month: string;
  total: number;
}

interface BalanceHistoryItem {
  id: number;
  amount: number;
  description: string;
  date: string;
  type: 'income' | 'expense';
  method: string;
  notes: string | null;
}

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
  notes?: string | null;
}

export default function HomeScreen() {
  const { colors, hideValues, toggleHideValues } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState(0);
  const [creditTotal, setCreditTotal] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [nextMonthProjection, setNextMonthProjection] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [showBalanceHistory, setShowBalanceHistory] = useState(false);
  const [balanceHistory, setBalanceHistory] = useState<BalanceHistoryItem[]>([]);
  const [showFutureMonths, setShowFutureMonths] = useState(false);
  const [futureMonths, setFutureMonths] = useState<FutureMonth[]>([]);

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

        // Carregar meses futuros para previsão expandível
        const futureData = await getAll<FutureMonth>(`
          SELECT
            strftime('%Y-%m', due_date) as month,
            SUM(amount) as total
          FROM installments
          WHERE status = 'pending' AND due_date >= date('now')
          GROUP BY strftime('%Y-%m', due_date)
          ORDER BY due_date ASC
          LIMIT 6
        `);
        setFutureMonths(futureData);
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
          notes,
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
          cp.notes,
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

  const loadBalanceHistory = async () => {
    try {
      const history = await getAll<BalanceHistoryItem>(
        `SELECT id, amount, description, date, type, method, notes
         FROM balance_transactions
         ORDER BY date DESC, id DESC
         LIMIT 50`
      );
      setBalanceHistory(history);
      setShowBalanceHistory(true);
    } catch (error) {
      console.log('Error loading balance history:', error);
    }
  };

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

  const getMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  const balanceColor = balance < 150 ? colors.balanceLow : colors.balanceOk;
  const projectionColor = nextMonthProjection >= 0 ? colors.success : colors.error;

  return (
    <>
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
      <Pressable
        style={[styles.card, { backgroundColor: colors.surface }]}
        onPress={loadBalanceHistory}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLabel}>
            <Pressable onPress={(e) => { e.stopPropagation(); toggleHideValues(); }} hitSlop={8}>
              <Ionicons
                name={hideValues ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
              Saldo Disponível
            </Text>
          </View>
          <Ionicons name="wallet-outline" size={24} color={balanceColor} />
        </View>
        <ScrambleText style={[styles.cardValue, { color: balanceColor }]} text={formatCurrency(balance)} isHidden={hideValues} />
        <Text style={[styles.cardSubtext, { color: colors.textMuted }]}>
          Toque para ver histórico
        </Text>
      </Pressable>

      {/* Card Total Cartão */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
            Total a Pagar (Cartão)
          </Text>
          <Ionicons name="card-outline" size={24} color={colors.warning} />
        </View>
        <ScrambleText style={[styles.cardValue, { color: colors.warning }]} text={formatCurrency(creditTotal)} isHidden={hideValues} />
        <Text style={[styles.cardSubtext, { color: colors.textMuted }]}>
          Este mês
        </Text>
      </View>

      {/* Card Previsão Próximo Mês */}
      <Pressable
        style={[styles.card, { backgroundColor: colors.surface }]}
        onPress={() => setShowFutureMonths(!showFutureMonths)}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
            Previsão Próximo Mês
          </Text>
          <View style={styles.cardHeaderIcons}>
            <Ionicons name="trending-up-outline" size={24} color={projectionColor} />
            <Ionicons
              name={showFutureMonths ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textMuted}
            />
          </View>
        </View>
        <ScrambleText style={[styles.cardValue, { color: projectionColor }]} text={formatCurrency(nextMonthProjection)} isHidden={hideValues} />
        <Text style={[styles.cardSubtext, { color: colors.textMuted }]}>
          {nextMonthProjection >= 0 ? 'Vai sobrar' : 'Vai faltar'} • Toque para expandir
        </Text>
      </Pressable>

      {/* Meses Futuros Expandidos */}
      {showFutureMonths && futureMonths.length > 0 && (
        <View style={styles.futureMonthsContainer}>
          {futureMonths.map((fm) => {
            const projected = monthlyIncome - fm.total;
            const fmColor = projected >= 0 ? colors.success : colors.error;
            return (
              <View
                key={fm.month}
                style={[styles.futureMonthItem, { backgroundColor: colors.surface }]}
              >
                <View style={styles.futureMonthLeft}>
                  <Text style={[styles.futureMonthName, { color: colors.text }]}>
                    {getMonthName(fm.month)}
                  </Text>
                  <ScrambleText style={[styles.futureMonthExpense, { color: colors.warning }]} text={`Parcelas: ${formatCurrency(fm.total)}`} hiddenText="Parcelas: R$ •••••" isHidden={hideValues} />
                </View>
                <View style={styles.futureMonthRight}>
                  <ScrambleText style={[styles.futureMonthProjection, { color: fmColor }]} text={formatCurrency(projected)} isHidden={hideValues} />
                  <Text style={[styles.futureMonthLabel, { color: fmColor }]}>
                    {projected >= 0 ? 'Sobra' : 'Falta'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

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
                  {transaction.notes ? (
                    <Text style={[styles.transactionNotes, { color: colors.warning }]} numberOfLines={2}>
                      {transaction.notes}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.transactionAmount}>
                  <ScrambleText
                    style={[styles.transactionValue, { color: getTransactionColor(transaction) }]}
                    text={
                      (transaction.type === 'balance' && transaction.transaction_type === 'expense' ? '-' : '') +
                      (transaction.type === 'balance' && transaction.transaction_type === 'income' ? '+' : '') +
                      formatCurrency(transaction.amount)
                    }
                    isHidden={hideValues}
                  />
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </ScrollView>

    {/* Modal Histórico do Saldo */}
    <Modal visible={showBalanceHistory} transparent animationType="slide">
      <View style={[styles.balanceHistoryModal, { backgroundColor: colors.background }]}>
        <View style={styles.balanceHistoryHeader}>
          <Text style={[styles.balanceHistoryTitle, { color: colors.text }]}>
            Histórico do Saldo
          </Text>
          <Pressable onPress={() => setShowBalanceHistory(false)}>
            <Ionicons name="close" size={28} color={colors.text} />
          </Pressable>
        </View>
        <FlatList
          data={balanceHistory}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.balanceHistoryList}
          ListEmptyComponent={
            <View style={styles.balanceHistoryEmpty}>
              <Ionicons name="wallet-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.balanceHistoryEmptyText, { color: colors.textMuted }]}>
                Nenhuma movimentação ainda
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.balanceHistoryItem, { backgroundColor: colors.surface }]}>
              <View style={[
                styles.balanceHistoryIcon,
                { backgroundColor: (item.type === 'income' ? colors.income : colors.expense) + '20' }
              ]}>
                <Ionicons
                  name={item.type === 'income' ? 'arrow-down-circle' : 'arrow-up-circle'}
                  size={24}
                  color={item.type === 'income' ? colors.income : colors.expense}
                />
              </View>
              <View style={styles.balanceHistoryInfo}>
                <Text style={[styles.balanceHistoryDesc, { color: colors.text }]} numberOfLines={1}>
                  {item.description}
                </Text>
                <Text style={[styles.balanceHistoryDate, { color: colors.textMuted }]}>
                  {formatDate(item.date)} • {getMethodLabel(item.method)}
                </Text>
                {item.notes ? (
                  <Text style={[styles.balanceHistoryNotes, { color: colors.warning }]} numberOfLines={2}>
                    {item.notes}
                  </Text>
                ) : null}
              </View>
              <Text style={[
                styles.balanceHistoryAmount,
                { color: item.type === 'income' ? colors.income : colors.expense }
              ]}>
                {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
              </Text>
            </View>
          )}
        />
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: 120,
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
  cardHeaderIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cardHeaderLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
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
  futureMonthsContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  futureMonthItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  futureMonthLeft: {
    flex: 1,
  },
  futureMonthName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  futureMonthExpense: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  futureMonthRight: {
    alignItems: 'flex-end',
  },
  futureMonthProjection: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
  },
  futureMonthLabel: {
    fontSize: FontSize.xs,
    fontWeight: '500',
    marginTop: 2,
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
  transactionNotes: {
    fontSize: FontSize.sm,
    fontStyle: 'italic',
    marginTop: 2,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionValue: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
  },
  balanceHistoryModal: {
    flex: 1,
    paddingTop: Spacing.xxl,
  },
  balanceHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  balanceHistoryTitle: {
    fontSize: FontSize.xxl,
    fontWeight: 'bold',
  },
  balanceHistoryList: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  balanceHistoryEmpty: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  balanceHistoryEmptyText: {
    fontSize: FontSize.md,
    marginTop: Spacing.md,
  },
  balanceHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  balanceHistoryIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  balanceHistoryInfo: {
    flex: 1,
  },
  balanceHistoryDesc: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  balanceHistoryDate: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  balanceHistoryNotes: {
    fontSize: FontSize.sm,
    marginTop: 4,
    fontStyle: 'italic',
  },
  balanceHistoryAmount: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
  },
});
