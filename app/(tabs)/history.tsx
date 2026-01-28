import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
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
  cardId?: number;
  cardName?: string;
  categoryId?: number;
  categoryName?: string;
  hasImage?: boolean;
  purchaseId?: number;
  balanceId?: number;
}

interface MonthGroup {
  month: string;
  label: string;
  transactions: Transaction[];
  isExpanded: boolean;
}

interface FilterOption {
  id: number | string;
  name: string;
}

type FilterType = 'month' | 'category' | 'card' | 'type';

export default function HistoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [monthGroups, setMonthGroups] = useState<MonthGroup[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

  // Filtros
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Opções de filtro
  const [availableMonths, setAvailableMonths] = useState<FilterOption[]>([]);
  const [availableCategories, setAvailableCategories] = useState<FilterOption[]>([]);
  const [availableCards, setAvailableCards] = useState<FilterOption[]>([]);

  const typeOptions: FilterOption[] = [
    { id: 'income', name: 'Entradas' },
    { id: 'expense', name: 'Saídas' },
    { id: 'credit', name: 'Cartão' },
  ];

  const loadData = async () => {
    try {
      // Carregar categorias disponíveis
      const categories = await getAll<{ id: number; name: string }>(
        'SELECT id, name FROM categories ORDER BY name'
      );
      setAvailableCategories(categories.map(c => ({ id: c.id, name: c.name })));

      // Carregar cartões disponíveis
      const cards = await getAll<{ id: number; name: string }>(
        'SELECT id, name FROM credit_cards ORDER BY name'
      );
      setAvailableCards(cards.map(c => ({ id: c.id, name: c.name })));

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
        card_id: number;
        card_name: string;
        category_id: number;
        category_name: string;
        image_uri: string | null;
      }>(`
        SELECT
          cp.id,
          cp.total_amount,
          cp.description,
          cp.date,
          cp.card_id,
          cc.name as card_name,
          cp.category_id,
          c.name as category_name,
          cp.image_uri
        FROM credit_purchases cp
        LEFT JOIN credit_cards cc ON cp.card_id = cc.id
        LEFT JOIN categories c ON cp.category_id = c.id
        ORDER BY date DESC
      `);

      // Combinar transações
      const transactions: Transaction[] = [
        ...balanceTransactions.map(t => ({
          id: t.id,
          amount: t.amount,
          description: t.description,
          date: t.date,
          type: t.type as 'income' | 'expense',
          method: t.method,
          balanceId: t.id,
        })),
        ...creditPurchases.map(p => ({
          id: p.id + 100000,
          amount: p.total_amount,
          description: p.description,
          date: p.date,
          type: 'credit' as const,
          cardId: p.card_id,
          cardName: p.card_name,
          categoryId: p.category_id,
          categoryName: p.category_name,
          hasImage: !!p.image_uri,
          purchaseId: p.id,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setAllTransactions(transactions);

      // Extrair meses disponíveis
      const months = new Set<string>();
      transactions.forEach(t => months.add(t.date.slice(0, 7)));

      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];

      const monthOptions: FilterOption[] = Array.from(months)
        .sort((a, b) => b.localeCompare(a))
        .map(m => {
          const [year, monthNum] = m.split('-');
          return {
            id: m,
            name: `${monthNames[parseInt(monthNum, 10) - 1]} ${year}`,
          };
        });

      setAvailableMonths(monthOptions);
      groupTransactions(transactions);
    } catch (error) {
      console.log('Error loading history:', error);
    }
  };

  const groupTransactions = (transactions: Transaction[]) => {
    const grouped: Map<string, Transaction[]> = new Map();
    transactions.forEach(t => {
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

    const groups: MonthGroup[] = Array.from(grouped.entries()).map(([month, trans]) => {
      const [year, monthNum] = month.split('-');
      const monthIndex = parseInt(monthNum, 10) - 1;
      return {
        month,
        label: `${monthNames[monthIndex]} ${year}`,
        transactions: trans,
        isExpanded: true,
      };
    });

    setMonthGroups(groups);
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

  const clearFilters = () => {
    setSelectedMonth(null);
    setSelectedCategory(null);
    setSelectedCard(null);
    setSelectedType(null);
  };

  const hasActiveFilters = selectedMonth || selectedCategory || selectedCard || selectedType;
  const activeFilterCount = [selectedMonth, selectedCategory, selectedCard, selectedType].filter(Boolean).length;

  // Aplicar filtros
  const filteredGroups = monthGroups
    .map(group => ({
      ...group,
      transactions: group.transactions.filter(t => {
        // Filtro de busca
        if (searchText && !t.description.toLowerCase().includes(searchText.toLowerCase())) {
          return false;
        }
        // Filtro de mês
        if (selectedMonth && t.date.slice(0, 7) !== selectedMonth) {
          return false;
        }
        // Filtro de categoria
        if (selectedCategory && t.categoryId !== selectedCategory) {
          return false;
        }
        // Filtro de cartão
        if (selectedCard && t.cardId !== selectedCard) {
          return false;
        }
        // Filtro de tipo
        if (selectedType && t.type !== selectedType) {
          return false;
        }
        return true;
      }),
    }))
    .filter(group => group.transactions.length > 0);

  const FilterChip = ({
    label,
    isSelected,
    onPress,
  }: {
    label: string;
    isSelected: boolean;
    onPress: () => void;
  }) => (
    <Pressable
      style={[
        styles.filterChip,
        {
          backgroundColor: isSelected ? colors.primary : colors.surfaceVariant,
        },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterChipText,
          { color: isSelected ? '#FFFFFF' : colors.text },
        ]}
      >
        {label}
      </Text>
      {isSelected && (
        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
      )}
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Barra de busca e filtros */}
      <View style={styles.searchRow}>
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
        <Pressable
          style={[
            styles.filterButton,
            {
              backgroundColor: hasActiveFilters ? colors.primary : colors.surface,
            },
          ]}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons
            name="options"
            size={20}
            color={hasActiveFilters ? '#FFFFFF' : colors.text}
          />
          {activeFilterCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: colors.error }]}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Chips de filtros ativos */}
      {hasActiveFilters && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.activeFiltersRow}
          contentContainerStyle={styles.activeFiltersContent}
        >
          {selectedMonth && (
            <Pressable
              style={[styles.activeFilterChip, { backgroundColor: colors.primary }]}
              onPress={() => setSelectedMonth(null)}
            >
              <Text style={styles.activeFilterText}>
                {availableMonths.find(m => m.id === selectedMonth)?.name}
              </Text>
              <Ionicons name="close" size={14} color="#FFFFFF" />
            </Pressable>
          )}
          {selectedCategory && (
            <Pressable
              style={[styles.activeFilterChip, { backgroundColor: colors.primary }]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={styles.activeFilterText}>
                {availableCategories.find(c => c.id === selectedCategory)?.name}
              </Text>
              <Ionicons name="close" size={14} color="#FFFFFF" />
            </Pressable>
          )}
          {selectedCard && (
            <Pressable
              style={[styles.activeFilterChip, { backgroundColor: colors.primary }]}
              onPress={() => setSelectedCard(null)}
            >
              <Text style={styles.activeFilterText}>
                {availableCards.find(c => c.id === selectedCard)?.name}
              </Text>
              <Ionicons name="close" size={14} color="#FFFFFF" />
            </Pressable>
          )}
          {selectedType && (
            <Pressable
              style={[styles.activeFilterChip, { backgroundColor: colors.primary }]}
              onPress={() => setSelectedType(null)}
            >
              <Text style={styles.activeFilterText}>
                {typeOptions.find(t => t.id === selectedType)?.name}
              </Text>
              <Ionicons name="close" size={14} color="#FFFFFF" />
            </Pressable>
          )}
          <Pressable
            style={[styles.clearFiltersChip, { borderColor: colors.error }]}
            onPress={clearFilters}
          >
            <Text style={[styles.clearFiltersText, { color: colors.error }]}>
              Limpar
            </Text>
          </Pressable>
        </ScrollView>
      )}

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
              {searchText || hasActiveFilters
                ? 'Nenhum resultado encontrado'
                : 'Nenhuma movimentação ainda'}
            </Text>
            {hasActiveFilters && (
              <Pressable
                style={[styles.clearFiltersButton, { backgroundColor: colors.primary }]}
                onPress={clearFilters}
              >
                <Text style={styles.clearFiltersButtonText}>Limpar Filtros</Text>
              </Pressable>
            )}
          </View>
        ) : (
          filteredGroups.map(group => (
            <View key={group.month} style={styles.monthGroup}>
              <Pressable
                style={[styles.monthHeader, { backgroundColor: colors.surface }]}
                onPress={() => toggleMonth(group.month)}
              >
                <View style={styles.monthHeaderLeft}>
                  <Text style={[styles.monthLabel, { color: colors.text }]}>
                    {group.label}
                  </Text>
                  <Text style={[styles.monthCount, { color: colors.textMuted }]}>
                    {group.transactions.length} itens
                  </Text>
                </View>
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
                      onPress={() => {
                        if (transaction.type === 'credit' && transaction.purchaseId) {
                          router.push(`/edit-purchase?id=${transaction.purchaseId}`);
                        } else if ((transaction.type === 'income' || transaction.type === 'expense') && transaction.balanceId) {
                          router.push(`/edit-balance?id=${transaction.balanceId}`);
                        }
                      }}
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

      {/* Modal de Filtros */}
      <Modal visible={showFilters} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Filtros</Text>
              <Pressable onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Filtro por Mês */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
                  MÊS
                </Text>
                <View style={styles.filterChipsContainer}>
                  {availableMonths.map(month => (
                    <FilterChip
                      key={month.id}
                      label={month.name}
                      isSelected={selectedMonth === month.id}
                      onPress={() =>
                        setSelectedMonth(selectedMonth === month.id ? null : month.id as string)
                      }
                    />
                  ))}
                </View>
              </View>

              {/* Filtro por Tipo */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
                  TIPO
                </Text>
                <View style={styles.filterChipsContainer}>
                  {typeOptions.map(type => (
                    <FilterChip
                      key={type.id}
                      label={type.name}
                      isSelected={selectedType === type.id}
                      onPress={() =>
                        setSelectedType(selectedType === type.id ? null : type.id as string)
                      }
                    />
                  ))}
                </View>
              </View>

              {/* Filtro por Categoria */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
                  CATEGORIA
                </Text>
                <View style={styles.filterChipsContainer}>
                  {availableCategories.map(cat => (
                    <FilterChip
                      key={cat.id}
                      label={cat.name}
                      isSelected={selectedCategory === cat.id}
                      onPress={() =>
                        setSelectedCategory(selectedCategory === cat.id ? null : cat.id as number)
                      }
                    />
                  ))}
                </View>
              </View>

              {/* Filtro por Cartão */}
              {availableCards.length > 0 && (
                <View style={styles.filterSection}>
                  <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
                    CARTÃO
                  </Text>
                  <View style={styles.filterChipsContainer}>
                    {availableCards.map(card => (
                      <FilterChip
                        key={card.id}
                        label={card.name}
                        isSelected={selectedCard === card.id}
                        onPress={() =>
                          setSelectedCard(selectedCard === card.id ? null : card.id as number)
                        }
                      />
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.modalClearButton, { borderColor: colors.border }]}
                onPress={clearFilters}
              >
                <Text style={[styles.modalClearButtonText, { color: colors.text }]}>
                  Limpar Filtros
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalApplyButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.modalApplyButtonText}>Aplicar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  activeFiltersRow: {
    maxHeight: 44,
  },
  activeFiltersContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    flexDirection: 'row',
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  activeFilterText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  clearFiltersChip: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  clearFiltersText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
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
    textAlign: 'center',
  },
  clearFiltersButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  clearFiltersButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
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
  monthHeaderLeft: {
    gap: 2,
  },
  monthLabel: {
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  monthCount: {
    fontSize: FontSize.sm,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
  },
  modalScroll: {
    padding: Spacing.lg,
  },
  filterSection: {
    marginBottom: Spacing.xl,
  },
  filterLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  filterChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  filterChipText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  modalClearButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalClearButtonText: {
    fontWeight: '600',
  },
  modalApplyButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  modalApplyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
