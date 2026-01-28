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

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState(0);
  const [creditTotal, setCreditTotal] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [nextMonthProjection, setNextMonthProjection] = useState(0);

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
            onPress={() => {/* TODO: Relatórios */}}
          >
            <Ionicons name="bar-chart" size={28} color={colors.recurring} />
            <Text style={[styles.actionText, { color: colors.text }]}>
              Relatórios
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Últimas Movimentações - placeholder */}
      <View style={styles.recentContainer}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Últimas Movimentações
        </Text>
        <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
          <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Nenhuma movimentação ainda
          </Text>
        </View>
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
  emptyState: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md,
  },
});
