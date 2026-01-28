import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../src/contexts/ThemeContext';
import { Spacing, FontSize, BorderRadius } from '../src/constants/theme';
import { getAll, getFirst } from '../src/database';

interface FutureInstallment {
  month: string;
  total: number;
}

interface UserSettings {
  monthly_income: number;
}

export default function FutureSummaryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [futureMonths, setFutureMonths] = useState<FutureInstallment[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);

  const loadFutureData = async () => {
    try {
      // Buscar renda mensal configurada
      const settings = await getFirst<UserSettings>(
        'SELECT monthly_income FROM user_settings WHERE id = 1'
      );
      if (settings) {
        setMonthlyIncome(settings.monthly_income);
      }

      // Buscar parcelas futuras agrupadas por mês
      const months = await getAll<FutureInstallment>(`
        SELECT 
          strftime('%Y-%m', due_date) as month,
          SUM(amount) as total
        FROM installments
        WHERE status = 'pending' AND due_date >= date('now')
        GROUP BY strftime('%Y-%m', due_date)
        ORDER BY due_date ASC
        LIMIT 12
      `);
      setFutureMonths(months);
    } catch (error) {
      console.log('Error loading future data:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadFutureData();
    }, [])
  );

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  const getMonthShortName = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const months = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    return `${months[parseInt(month) - 1]}/${year.slice(2)}`;
  };

  const isCurrentMonth = (monthStr: string) => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return monthStr === currentMonth;
  };

  const calculateProjectedBalance = (expenses: number) => {
    return monthlyIncome - expenses;
  };

  const getBalanceColor = (balance: number) => {
    if (balance < 0) return colors.error;
    if (balance < 500) return colors.warning;
    return colors.success;
  };

  const totalFutureExpenses = futureMonths.reduce((sum, month) => sum + month.total, 0);
  const averageMonthlyExpense = futureMonths.length > 0 
    ? totalFutureExpenses / futureMonths.length 
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Próximos Meses
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Resumo Geral */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <View style={styles.summaryHeader}>
            <Ionicons name="analytics" size={28} color={colors.primary} />
            <Text style={[styles.summaryTitle, { color: colors.text }]}>
              Visão Geral
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Renda Mensal
              </Text>
              <Text style={[styles.summaryValue, { color: colors.income }]}>
                R$ {formatCurrency(monthlyIncome)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Gasto Médio/Mês
              </Text>
              <Text style={[styles.summaryValue, { color: colors.warning }]}>
                R$ {formatCurrency(averageMonthlyExpense)}
              </Text>
            </View>
          </View>

          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Total Comprometido (futuro)
            </Text>
            <Text style={[styles.summaryValueLarge, { color: colors.text }]}>
              R$ {formatCurrency(totalFutureExpenses)}
            </Text>
          </View>

          {monthlyIncome === 0 && (
            <View style={[styles.warningBox, { backgroundColor: colors.warning + '20' }]}>
              <Ionicons name="warning" size={20} color={colors.warning} />
              <Text style={[styles.warningText, { color: colors.warning }]}>
                Configure sua renda mensal nas configurações para ver o saldo projetado
              </Text>
            </View>
          )}
        </View>

        {/* Lista de Meses Futuros */}
        <View style={styles.monthsContainer}>
          <Text style={[styles.monthsTitle, { color: colors.textSecondary }]}>
            PREVISÃO MENSAL
          </Text>

          {futureMonths.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
              <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Nenhuma despesa futura encontrada
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                Adicione compras parceladas para ver a projeção
              </Text>
            </View>
          ) : (
            futureMonths.map((month, index) => {
              const projectedBalance = calculateProjectedBalance(month.total);
              const balanceColor = getBalanceColor(projectedBalance);
              const isCurrent = isCurrentMonth(month.month);

              return (
                <View
                  key={month.month}
                  style={[
                    styles.monthCard,
                    { 
                      backgroundColor: colors.surface,
                      borderLeftWidth: 3,
                      borderLeftColor: isCurrent ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  <View style={styles.monthHeader}>
                    <View style={styles.monthInfo}>
                      {isCurrent && (
                        <View style={[styles.currentBadge, { backgroundColor: colors.primary }]}>
                          <Text style={styles.currentBadgeText}>ATUAL</Text>
                        </View>
                      )}
                      <Text style={[styles.monthName, { color: colors.text }]}>
                        {getMonthName(month.month)}
                      </Text>
                    </View>
                    <Text style={[styles.monthNumber, { color: colors.textMuted }]}>
                      {getMonthShortName(month.month)}
                    </Text>
                  </View>

                  <View style={styles.monthDetails}>
                    <View style={styles.monthDetailRow}>
                      <View style={styles.monthDetailItem}>
                        <Ionicons name="arrow-down" size={16} color={colors.income} />
                        <Text style={[styles.monthDetailLabel, { color: colors.textSecondary }]}>
                          Renda
                        </Text>
                      </View>
                      <Text style={[styles.monthDetailValue, { color: colors.text }]}>
                        R$ {formatCurrency(monthlyIncome)}
                      </Text>
                    </View>

                    <View style={styles.monthDetailRow}>
                      <View style={styles.monthDetailItem}>
                        <Ionicons name="card" size={16} color={colors.warning} />
                        <Text style={[styles.monthDetailLabel, { color: colors.textSecondary }]}>
                          Parcelas
                        </Text>
                      </View>
                      <Text style={[styles.monthDetailValue, { color: colors.warning }]}>
                        R$ {formatCurrency(month.total)}
                      </Text>
                    </View>

                    {monthlyIncome > 0 && (
                      <>
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                        <View style={styles.monthDetailRow}>
                          <View style={styles.monthDetailItem}>
                            <Ionicons 
                              name={projectedBalance >= 0 ? "checkmark-circle" : "close-circle"} 
                              size={16} 
                              color={balanceColor} 
                            />
                            <Text style={[styles.monthDetailLabel, { color: colors.textSecondary }]}>
                              Saldo Projetado
                            </Text>
                          </View>
                          <Text style={[styles.monthBalanceValue, { color: balanceColor }]}>
                            R$ {formatCurrency(projectedBalance)}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>

                  {/* Barra de progresso */}
                  {monthlyIncome > 0 && (
                    <View style={styles.progressContainer}>
                      <View style={[styles.progressBar, { backgroundColor: colors.surfaceVariant }]}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              backgroundColor: month.total > monthlyIncome ? colors.error : colors.primary,
                              width: `${Math.min((month.total / monthlyIncome) * 100, 100)}%`,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.progressText, { color: colors.textMuted }]}>
                        {((month.total / monthlyIncome) * 100).toFixed(0)}% da renda
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
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
  // Resumo
  summaryCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  summaryTitle: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.xs,
  },
  summaryValue: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
  },
  summaryValueLarge: {
    fontSize: FontSize.xxl,
    fontWeight: 'bold',
  },
  summaryDivider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  warningText: {
    flex: 1,
    fontSize: FontSize.sm,
  },
  // Meses
  monthsContainer: {
    gap: Spacing.md,
  },
  monthsTitle: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginLeft: Spacing.sm,
    letterSpacing: 1,
  },
  monthCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  monthInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  currentBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  currentBadgeText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: 'bold',
  },
  monthName: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
  },
  monthNumber: {
    fontSize: FontSize.sm,
  },
  monthDetails: {
    gap: Spacing.sm,
  },
  monthDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  monthDetailLabel: {
    fontSize: FontSize.md,
  },
  monthDetailValue: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  monthBalanceValue: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  progressContainer: {
    marginTop: Spacing.md,
  },
  progressBar: {
    height: 8,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.sm,
  },
  progressText: {
    fontSize: FontSize.xs,
    textAlign: 'right',
  },
  // Empty state
  emptyState: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.md,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});
