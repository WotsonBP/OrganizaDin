import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../src/contexts/ThemeContext';
import { Spacing, FontSize, BorderRadius } from '../src/constants/theme';
import { getAll } from '../src/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - Spacing.md * 2;

interface CategorySpending {
  category_name: string;
  category_icon: string;
  category_color: string;
  total: number;
}

interface CardSpending {
  card_name: string;
  card_color: string;
  total: number;
}

interface MonthlySpending {
  month: string;
  year: string;
  total: number;
}

interface IncomeExpenseData {
  total_income: number;
  total_expense: number;
  total_credit: number;
}

export default function ReportsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [categoryData, setCategoryData] = useState<CategorySpending[]>([]);
  const [cardData, setCardData] = useState<CardSpending[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlySpending[]>([]);
  const [incomeExpenseData, setIncomeExpenseData] = useState<IncomeExpenseData>({
    total_income: 0,
    total_expense: 0,
    total_credit: 0,
  });
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | '6m' | '3m' | '1m'>('3m');

  const loadReports = async () => {
    try {
      // Gastos por Categoria (últimos 3 meses)
      const categories = await getAll<CategorySpending>(`
        SELECT 
          c.name as category_name,
          c.icon as category_icon,
          c.color as category_color,
          SUM(cp.total_amount) as total
        FROM credit_purchases cp
        JOIN categories c ON cp.category_id = c.id
        WHERE cp.date >= date('now', '-3 months')
        GROUP BY c.id
        ORDER BY total DESC
        LIMIT 10
      `);
      setCategoryData(categories);

      // Gastos por Cartão (últimos 3 meses)
      const cards = await getAll<CardSpending>(`
        SELECT 
          cc.name as card_name,
          cc.color as card_color,
          SUM(cp.total_amount) as total
        FROM credit_purchases cp
        JOIN credit_cards cc ON cp.card_id = cc.id
        WHERE cp.date >= date('now', '-3 months')
        GROUP BY cc.id
        ORDER BY total DESC
      `);
      setCardData(cards);

      // Gastos por Mês (últimos 6 meses)
      const months = await getAll<MonthlySpending>(`
        SELECT 
          strftime('%m', date) as month,
          strftime('%Y', date) as year,
          SUM(total_amount) as total
        FROM credit_purchases
        WHERE date >= date('now', '-6 months')
        GROUP BY strftime('%Y-%m', date)
        ORDER BY date DESC
        LIMIT 6
      `);
      setMonthlyData(months.reverse());

      // Entrada vs Saída (todos os tempos)
      const incomeExpense = await getAll<IncomeExpenseData>(`
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
          COALESCE((SELECT SUM(total_amount) FROM credit_purchases), 0) as total_credit
        FROM balance_transactions
      `);
      if (incomeExpense.length > 0) {
        setIncomeExpenseData(incomeExpense[0]);
      }
    } catch (error) {
      console.log('Error loading reports:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [selectedPeriod])
  );

  const getMonthName = (month: string) => {
    const months = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    return months[parseInt(month) - 1];
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const calculatePercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return (value / total) * 100;
  };

  // Calcular totais
  const totalCategorySpending = categoryData.reduce((sum, item) => sum + item.total, 0);
  const totalCardSpending = cardData.reduce((sum, item) => sum + item.total, 0);
  const maxMonthlySpending = Math.max(...monthlyData.map(m => m.total), 1);

  // Mês que mais gastou
  const maxSpendingMonth = monthlyData.length > 0
    ? monthlyData.reduce((max, current) => current.total > max.total ? current : max)
    : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Análises
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Entrada vs Saída */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="swap-horizontal" size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Entrada vs Saída
            </Text>
          </View>
          <View style={styles.incomeExpenseContainer}>
            <View style={styles.incomeExpenseItem}>
              <View style={[styles.incomeExpenseIcon, { backgroundColor: colors.income + '20' }]}>
                <Ionicons name="arrow-down" size={20} color={colors.income} />
              </View>
              <Text style={[styles.incomeExpenseLabel, { color: colors.textSecondary }]}>
                Entradas
              </Text>
              <Text style={[styles.incomeExpenseValue, { color: colors.income }]}>
                R$ {formatCurrency(incomeExpenseData.total_income)}
              </Text>
            </View>
            <View style={styles.incomeExpenseItem}>
              <View style={[styles.incomeExpenseIcon, { backgroundColor: colors.expense + '20' }]}>
                <Ionicons name="arrow-up" size={20} color={colors.expense} />
              </View>
              <Text style={[styles.incomeExpenseLabel, { color: colors.textSecondary }]}>
                Saídas
              </Text>
              <Text style={[styles.incomeExpenseValue, { color: colors.expense }]}>
                R$ {formatCurrency(incomeExpenseData.total_expense)}
              </Text>
            </View>
            <View style={styles.incomeExpenseItem}>
              <View style={[styles.incomeExpenseIcon, { backgroundColor: colors.warning + '20' }]}>
                <Ionicons name="card" size={20} color={colors.warning} />
              </View>
              <Text style={[styles.incomeExpenseLabel, { color: colors.textSecondary }]}>
                Crédito
              </Text>
              <Text style={[styles.incomeExpenseValue, { color: colors.warning }]}>
                R$ {formatCurrency(incomeExpenseData.total_credit)}
              </Text>
            </View>
          </View>
          <View style={[styles.balanceBar, { backgroundColor: colors.surfaceVariant }]}>
            <View
              style={[
                styles.balanceBarIncome,
                {
                  backgroundColor: colors.income,
                  width: `${calculatePercentage(
                    incomeExpenseData.total_income,
                    incomeExpenseData.total_income + incomeExpenseData.total_expense + incomeExpenseData.total_credit
                  )}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Gastos por Categoria */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="pricetags" size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Gastos por Categoria
            </Text>
          </View>
          {categoryData.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Nenhum gasto registrado
            </Text>
          ) : (
            <View style={styles.chartContainer}>
              {categoryData.map((item, index) => (
                <View key={index} style={styles.categoryItem}>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryIcon}>{item.category_icon}</Text>
                    <Text style={[styles.categoryName, { color: colors.text }]}>
                      {item.category_name}
                    </Text>
                  </View>
                  <View style={styles.categoryValueContainer}>
                    <Text style={[styles.categoryValue, { color: colors.textSecondary }]}>
                      R$ {formatCurrency(item.total)}
                    </Text>
                    <View style={[styles.categoryBar, { backgroundColor: colors.surfaceVariant }]}>
                      <View
                        style={[
                          styles.categoryBarFill,
                          {
                            backgroundColor: item.category_color,
                            width: `${calculatePercentage(item.total, totalCategorySpending)}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Gastos por Cartão */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card" size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Gastos por Cartão
            </Text>
          </View>
          {cardData.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Nenhum gasto no cartão
            </Text>
          ) : (
            <View style={styles.chartContainer}>
              {cardData.map((item, index) => (
                <View key={index} style={styles.cardItem}>
                  <View style={styles.cardInfo}>
                    <View
                      style={[styles.cardColorDot, { backgroundColor: item.card_color }]}
                    />
                    <Text style={[styles.cardName, { color: colors.text }]}>
                      {item.card_name}
                    </Text>
                  </View>
                  <View style={styles.cardValueContainer}>
                    <Text style={[styles.cardValue, { color: colors.textSecondary }]}>
                      R$ {formatCurrency(item.total)}
                    </Text>
                    <View style={[styles.cardBar, { backgroundColor: colors.surfaceVariant }]}>
                      <View
                        style={[
                          styles.cardBarFill,
                          {
                            backgroundColor: item.card_color,
                            width: `${calculatePercentage(item.total, totalCardSpending)}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Gastos por Mês */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Gastos por Mês
            </Text>
          </View>
          {monthlyData.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Nenhum gasto registrado
            </Text>
          ) : (
            <View style={styles.monthlyChartContainer}>
              {monthlyData.map((item, index) => {
                const barHeight = (item.total / maxMonthlySpending) * 150;
                return (
                  <View key={index} style={styles.monthlyBarContainer}>
                    <View style={styles.monthlyBarWrapper}>
                      <View
                        style={[
                          styles.monthlyBar,
                          {
                            height: barHeight,
                            backgroundColor: colors.primary,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.monthlyValue, { color: colors.textSecondary }]}>
                      R$ {(item.total / 1000).toFixed(1)}k
                    </Text>
                    <Text style={[styles.monthlyLabel, { color: colors.textMuted }]}>
                      {getMonthName(item.month)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Mês que mais gastou */}
        {maxSpendingMonth && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="trophy" size={24} color={colors.warning} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Mês que mais gastou
              </Text>
            </View>
            <View style={styles.maxSpendingContainer}>
              <Text style={[styles.maxSpendingMonth, { color: colors.primary }]}>
                {getMonthName(maxSpendingMonth.month)}/{maxSpendingMonth.year}
              </Text>
              <Text style={[styles.maxSpendingValue, { color: colors.text }]}>
                R$ {formatCurrency(maxSpendingMonth.total)}
              </Text>
            </View>
          </View>
        )}

        {/* Evolução Financeira */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up" size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Evolução Financeira
            </Text>
          </View>
          <View style={styles.evolutionContainer}>
            <View style={styles.evolutionItem}>
              <Text style={[styles.evolutionLabel, { color: colors.textSecondary }]}>
                Saldo Disponível
              </Text>
              <Text style={[styles.evolutionValue, { color: colors.text }]}>
                R$ {formatCurrency(incomeExpenseData.total_income - incomeExpenseData.total_expense)}
              </Text>
            </View>
            <View style={styles.evolutionItem}>
              <Text style={[styles.evolutionLabel, { color: colors.textSecondary }]}>
                Total Movimentado
              </Text>
              <Text style={[styles.evolutionValue, { color: colors.text }]}>
                R$ {formatCurrency(
                  incomeExpenseData.total_income + 
                  incomeExpenseData.total_expense + 
                  incomeExpenseData.total_credit
                )}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    paddingTop: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  section: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: FontSize.md,
    textAlign: 'center',
    padding: Spacing.lg,
  },
  // Entrada vs Saída
  incomeExpenseContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  incomeExpenseItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  incomeExpenseIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  incomeExpenseLabel: {
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
  },
  incomeExpenseValue: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
  },
  balanceBar: {
    height: 8,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  balanceBarIncome: {
    height: '100%',
    borderRadius: BorderRadius.sm,
  },
  // Categoria
  chartContainer: {
    gap: Spacing.md,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  categoryIcon: {
    fontSize: 20,
  },
  categoryName: {
    fontSize: FontSize.md,
  },
  categoryValueContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  categoryValue: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.xs,
  },
  categoryBar: {
    width: '100%',
    height: 6,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: BorderRadius.sm,
  },
  // Cartão
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  cardColorDot: {
    width: 16,
    height: 16,
    borderRadius: BorderRadius.full,
  },
  cardName: {
    fontSize: FontSize.md,
  },
  cardValueContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  cardValue: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.xs,
  },
  cardBar: {
    width: '100%',
    height: 6,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  cardBarFill: {
    height: '100%',
    borderRadius: BorderRadius.sm,
  },
  // Mensal
  monthlyChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 200,
    paddingTop: Spacing.lg,
  },
  monthlyBarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  monthlyBarWrapper: {
    height: 150,
    justifyContent: 'flex-end',
  },
  monthlyBar: {
    width: 32,
    borderTopLeftRadius: BorderRadius.sm,
    borderTopRightRadius: BorderRadius.sm,
  },
  monthlyValue: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
  monthlyLabel: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  // Mês que mais gastou
  maxSpendingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  maxSpendingMonth: {
    fontSize: FontSize.xxl,
    fontWeight: 'bold',
  },
  maxSpendingValue: {
    fontSize: FontSize.xl,
    marginTop: Spacing.xs,
  },
  // Evolução
  evolutionContainer: {
    gap: Spacing.md,
  },
  evolutionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  evolutionLabel: {
    fontSize: FontSize.md,
  },
  evolutionValue: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
  },
});
