import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Spacing, FontSize, BorderRadius } from '../../src/constants/theme';
import { getAll } from '../../src/database';

interface InstallmentItem {
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

interface FutureSummary {
  month: string;
  label: string;
  reduction: number;
}

export default function InstallmentsScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [installments, setInstallments] = useState<InstallmentItem[]>([]);
  const [futureSummary, setFutureSummary] = useState<FutureSummary[]>([]);

  const loadData = async () => {
    try {
      // Carregar parcelas agrupadas por compra
      const data = await getAll<{
        purchase_id: number;
        description: string;
        card_name: string;
        installment_amount: number;
        total_installments: number;
        paid_count: number;
        total_paid: number;
        max_due_date: string;
      }>(`
        SELECT
          cp.id as purchase_id,
          cp.description,
          cc.name as card_name,
          i.amount as installment_amount,
          cp.installments as total_installments,
          COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as paid_count,
          COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END), 0) as total_paid,
          MAX(i.due_date) as max_due_date
        FROM credit_purchases cp
        JOIN credit_cards cc ON cp.card_id = cc.id
        JOIN installments i ON i.purchase_id = cp.id
        WHERE cp.installments > 1
        GROUP BY cp.id
        HAVING COUNT(CASE WHEN i.status = 'pending' THEN 1 END) > 0
        ORDER BY i.amount DESC
      `);

      const items: InstallmentItem[] = data.map(d => ({
        purchaseId: d.purchase_id,
        description: d.description,
        cardName: d.card_name,
        installmentAmount: d.installment_amount,
        totalInstallments: d.total_installments,
        remainingInstallments: d.total_installments - d.paid_count,
        paidAmount: d.total_paid,
        remainingAmount: d.installment_amount * (d.total_installments - d.paid_count),
        endMonth: d.max_due_date,
      }));

      setInstallments(items);

      // Calcular redução futura na fatura
      const futureData = await getAll<{
        month: string;
        ending_amount: number;
      }>(`
        SELECT
          strftime('%Y-%m', MAX(i.due_date)) as month,
          SUM(i.amount) as ending_amount
        FROM credit_purchases cp
        JOIN installments i ON i.purchase_id = cp.id
        WHERE cp.installments > 1
        AND i.status = 'pending'
        GROUP BY cp.id
        ORDER BY month
      `);

      const monthNames = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
      ];

      const summary: FutureSummary[] = futureData.slice(0, 6).map(d => {
        const [year, monthNum] = d.month.split('-');
        const monthIndex = parseInt(monthNum, 10) - 1;
        return {
          month: d.month,
          label: `${monthNames[monthIndex]}/${year.slice(2)}`,
          reduction: d.ending_amount,
        };
      });

      setFutureSummary(summary);
    } catch (error) {
      console.log('Error loading installments:', error);
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

  const getInstallmentColor = (remaining: number) => {
    if (remaining >= 3) return colors.installmentHigh;
    if (remaining === 2) return colors.installmentMedium;
    return colors.installmentLow;
  };

  const formatEndMonth = (dateStr: string) => {
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const [year, month] = dateStr.split('-');
    return `${monthNames[parseInt(month, 10) - 1]}/${year}`;
  };

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
      {/* Resumo de redução futura */}
      {futureSummary.length > 0 && (
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <View style={styles.summaryHeader}>
            <Ionicons name="trending-down" size={20} color={colors.success} />
            <Text style={[styles.summaryTitle, { color: colors.text }]}>
              Redução da Fatura
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.summaryRow}>
              {futureSummary.map((item, index) => (
                <View key={item.month} style={styles.summaryItem}>
                  <Text style={[styles.summaryMonth, { color: colors.textSecondary }]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.success }]}>
                    -{formatCurrency(item.reduction)}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Lista de parcelas */}
      {installments.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
          <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Nenhuma compra parcelada
          </Text>
        </View>
      ) : (
        installments.map(item => {
          const statusColor = getInstallmentColor(item.remainingInstallments);
          return (
            <View
              key={item.purchaseId}
              style={[styles.installmentCard, { backgroundColor: colors.surface }]}
            >
              <View style={styles.cardTop}>
                <View
                  style={[styles.statusIndicator, { backgroundColor: statusColor }]}
                />
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {item.description}
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                    {item.cardName}
                  </Text>
                </View>
                <Text style={[styles.installmentValue, { color: colors.text }]}>
                  {formatCurrency(item.installmentAmount)}
                </Text>
              </View>

              <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                    Parcelas
                  </Text>
                  <Text style={[styles.detailValue, { color: statusColor }]}>
                    {item.totalInstallments - item.remainingInstallments}/{item.totalInstallments}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                    Faltam
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {item.remainingInstallments}x
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                    Já pago
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.success }]}>
                    {formatCurrency(item.paidAmount)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                    Falta pagar
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.warning }]}>
                    {formatCurrency(item.remainingAmount)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                    Termina em
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.textSecondary }]}>
                    {formatEndMonth(item.endMonth)}
                  </Text>
                </View>
              </View>
            </View>
          );
        })
      )}
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
  summaryCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  summaryTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  summaryItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  summaryMonth: {
    fontSize: FontSize.sm,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: FontSize.md,
    fontWeight: '600',
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
  installmentCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  statusIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: Spacing.md,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  installmentValue: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
  },
  cardDetails: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: FontSize.sm,
  },
  detailValue: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
});
