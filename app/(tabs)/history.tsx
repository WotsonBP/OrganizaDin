import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Spacing, FontSize, BorderRadius } from '../../src/constants/theme';
import { getAll } from '../../src/database';

interface Transaction {
  id: number;
  amount: number;
  description: string;
  date: string;
  type: 'income' | 'expense' | 'credit';
  method?: string;
  cardName?: string;
  categoryName?: string;
  hasImage?: boolean;
}

interface MonthGroup {
  month: string;
  label: string;
  transactions: Transaction[];
  isExpanded: boolean;
}

export default function HistoryScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [monthGroups, setMonthGroups] = useState<MonthGroup[]>([]);

  const loadData = async () => {
    try {
      // Carregar movimentações de saldo
      const balanceTransactions = await getAll<{
        id: number;
        amount: number;
        description: string;
        date: string;
        type: string;
        method: string;
      }>(`
        SELECT id, amount, description, date, type, method
        FROM balance_transactions
        ORDER BY date DESC
      `);

      // Carregar compras no cartão
      const creditPurchases = await getAll<{
        id: number;
        total_amount: number;
        description: string;
        date: string;
        card_name: string;
        category_name: string;
        image_uri: string | null;
      }>(`
        SELECT
          cp.id,
          cp.total_amount,
          cp.description,
          cp.date,
          cc.name as card_name,
          c.name as category_name,
          cp.image_uri
        FROM credit_purchases cp
        LEFT JOIN credit_cards cc ON cp.card_id = cc.id
        LEFT JOIN categories c ON cp.category_id = c.id
        ORDER BY date DESC
      `);

      // Combinar e agrupar por mês
      const allTransactions: Transaction[] = [
        ...balanceTransactions.map(t => ({
          id: t.id,
          amount: t.amount,
          description: t.description,
          date: t.date,
          type: t.type as 'income' | 'expense',
          method: t.method,
        })),
        ...creditPurchases.map(p => ({
          id: p.id + 100000, // Offset para evitar conflito de IDs
          amount: p.total_amount,
          description: p.description,
          date: p.date,
          type: 'credit' as const,
          cardName: p.card_name,
          categoryName: p.category_name,
          hasImage: !!p.image_uri,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Agrupar por mês
      const grouped: Map<string, Transaction[]> = new Map();
      allTransactions.forEach(t => {
        const month = t.date.slice(0, 7);
        if (!grouped.has(month)) {
          grouped.set(month, []);
        }
        grouped.get(month)!.push(t);
      });

      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];

      const groups: MonthGroup[] = Array.from(grouped.entries()).map(([month, transactions]) => {
        const [year, monthNum] = month.split('-');
        const monthIndex = parseInt(monthNum, 10) - 1;
        return {
          month,
          label: `${monthNames[monthIndex]} ${year}`,
          transactions,
          isExpanded: true,
        };
      });

      setMonthGroups(groups);
    } catch (error) {
      console.log('Error loading history:', error);
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

  const toggleMonth = (month: string) => {
    setMonthGroups(prev =>
      prev.map(g =>
        g.month === month ? { ...g, isExpanded: !g.isExpanded } : g
      )
    );
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const getTransactionIcon = (type: string, method?: string) => {
    if (type === 'income') return 'arrow-down-circle';
    if (type === 'expense') {
      if (method === 'pix') return 'flash';
      if (method === 'debit') return 'card';
      return 'cash';
    }
    return 'card';
  };

  const getTransactionColor = (type: string, method?: string) => {
    if (type === 'income') return colors.income;
    if (type === 'expense') {
      if (method === 'pix' || method === 'debit') return colors.debit;
      return colors.expense;
    }
    return colors.credit;
  };

  const filteredGroups = monthGroups.map(group => ({
    ...group,
    transactions: group.transactions.filter(t =>
      t.description.toLowerCase().includes(searchText.toLowerCase())
    ),
  })).filter(group => group.transactions.length > 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Barra de busca */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Buscar movimentação..."
          placeholderTextColor={colors.textMuted}
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <Pressable onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {filteredGroups.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {searchText ? 'Nenhum resultado encontrado' : 'Nenhuma movimentação ainda'}
            </Text>
          </View>
        ) : (
          filteredGroups.map(group => (
            <View key={group.month} style={styles.monthGroup}>
              <Pressable
                style={[styles.monthHeader, { backgroundColor: colors.surface }]}
                onPress={() => toggleMonth(group.month)}
              >
                <Text style={[styles.monthLabel, { color: colors.text }]}>
                  {group.label}
                </Text>
                <Ionicons
                  name={group.isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>

              {group.isExpanded && (
                <View style={styles.transactionsList}>
                  {group.transactions.map(transaction => (
                    <Pressable
                      key={transaction.id}
                      style={[styles.transactionItem, { backgroundColor: colors.surface }]}
                    >
                      <View
                        style={[
                          styles.transactionIcon,
                          { backgroundColor: getTransactionColor(transaction.type, transaction.method) + '20' },
                        ]}
                      >
                        <Ionicons
                          name={getTransactionIcon(transaction.type, transaction.method)}
                          size={20}
                          color={getTransactionColor(transaction.type, transaction.method)}
                        />
                      </View>
                      <View style={styles.transactionInfo}>
                        <Text style={[styles.transactionDesc, { color: colors.text }]}>
                          {transaction.description}
                        </Text>
                        <Text style={[styles.transactionMeta, { color: colors.textMuted }]}>
                          {formatDate(transaction.date)}
                          {transaction.cardName && ` • ${transaction.cardName}`}
                          {transaction.categoryName && ` • ${transaction.categoryName}`}
                        </Text>
                      </View>
                      <View style={styles.transactionAmount}>
                        <Text
                          style={[
                            styles.amountText,
                            { color: getTransactionColor(transaction.type, transaction.method) },
                          ]}
                        >
                          {transaction.type === 'income' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </Text>
                        {transaction.hasImage && (
                          <Ionicons name="image-outline" size={14} color={colors.textMuted} />
                        )}
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: Spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  emptyState: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  emptyText: {
    fontSize: FontSize.md,
  },
  monthGroup: {
    marginBottom: Spacing.md,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  monthLabel: {
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  transactionsList: {
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  transactionMeta: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  transactionAmount: {
    alignItems: 'flex-end',
    gap: 2,
  },
  amountText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
