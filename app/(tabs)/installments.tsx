import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Spacing, FontSize, BorderRadius } from '../../src/constants/theme';
import { getAll, getFirst, runQuery } from '../../src/database';

interface InstallmentItem {
  purchaseId: number;
  description: string;
  cardId: number;
  cardName: string;
  installmentAmount: number;
  totalInstallments: number;
  remainingInstallments: number;
  paidAmount: number;
  remainingAmount: number;
  endMonth: string;
  nextInstallmentId: number | null;
}

interface MonthPending {
  month: string;
  label: string;
  total: number;
  count: number;
}

interface CardPending {
  cardId: number;
  cardName: string;
  total: number;
  count: number;
}

interface FutureSummary {
  month: string;
  label: string;
  reduction: number;
}

interface CompletedPurchase {
  purchaseId: number;
  description: string;
  cardName: string;
  totalAmount: number;
  installments: number;
  date: string;
  completedAt: string;
}

export default function InstallmentsScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [installments, setInstallments] = useState<InstallmentItem[]>([]);
  const [futureSummary, setFutureSummary] = useState<FutureSummary[]>([]);
  const [monthPending, setMonthPending] = useState<MonthPending | null>(null);
  const [cardsPending, setCardsPending] = useState<CardPending[]>([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InstallmentItem | null>(null);
  const [completedPurchases, setCompletedPurchases] = useState<CompletedPurchase[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);

  const loadData = async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);

      // Total pendente do mês atual
      const monthData = await getFirst<{ total: number; count: number }>(`
        SELECT
          COALESCE(SUM(amount), 0) as total,
          COUNT(*) as count
        FROM installments
        WHERE status = 'pending'
        AND strftime('%Y-%m', due_date) = ?
      `, [currentMonth]);

      if (monthData && monthData.count > 0) {
        const monthNames = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        const [year, monthNum] = currentMonth.split('-');
        setMonthPending({
          month: currentMonth,
          label: `${monthNames[parseInt(monthNum, 10) - 1]} ${year}`,
          total: monthData.total,
          count: monthData.count,
        });
      } else {
        setMonthPending(null);
      }

      // Total pendente por cartão
      const cardsData = await getAll<{ card_id: number; card_name: string; total: number; count: number }>(`
        SELECT
          cc.id as card_id,
          cc.name as card_name,
          COALESCE(SUM(i.amount), 0) as total,
          COUNT(*) as count
        FROM installments i
        JOIN credit_purchases cp ON i.purchase_id = cp.id
        JOIN credit_cards cc ON cp.card_id = cc.id
        WHERE i.status = 'pending'
        AND strftime('%Y-%m', i.due_date) = ?
        GROUP BY cc.id
        ORDER BY total DESC
      `, [currentMonth]);

      setCardsPending(cardsData.map(c => ({
        cardId: c.card_id,
        cardName: c.card_name,
        total: c.total,
        count: c.count,
      })));

      // Carregar parcelas agrupadas por compra
      const data = await getAll<{
        purchase_id: number;
        description: string;
        card_id: number;
        card_name: string;
        installment_amount: number;
        total_installments: number;
        paid_count: number;
        total_paid: number;
        max_due_date: string;
        next_installment_id: number | null;
      }>(`
        SELECT
          cp.id as purchase_id,
          cp.description,
          cp.card_id,
          cc.name as card_name,
          i.amount as installment_amount,
          cp.installments as total_installments,
          COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as paid_count,
          COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END), 0) as total_paid,
          MAX(i.due_date) as max_due_date,
          (SELECT id FROM installments WHERE purchase_id = cp.id AND status = 'pending' ORDER BY due_date LIMIT 1) as next_installment_id
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
        cardId: d.card_id,
        cardName: d.card_name,
        installmentAmount: d.installment_amount,
        totalInstallments: d.total_installments,
        remainingInstallments: d.total_installments - d.paid_count,
        paidAmount: d.total_paid,
        remainingAmount: d.installment_amount * (d.total_installments - d.paid_count),
        endMonth: d.max_due_date,
        nextInstallmentId: d.next_installment_id,
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

      const monthNamesShort = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
      ];

      const summary: FutureSummary[] = futureData.slice(0, 6).map(d => {
        const [year, monthNum] = d.month.split('-');
        const monthIndex = parseInt(monthNum, 10) - 1;
        return {
          month: d.month,
          label: `${monthNamesShort[monthIndex]}/${year.slice(2)}`,
          reduction: d.ending_amount,
        };
      });

      setFutureSummary(summary);

      // Carregar compras finalizadas (todas as parcelas pagas)
      const completedData = await getAll<{
        purchase_id: number;
        description: string;
        card_name: string;
        total_amount: number;
        installments: number;
        date: string;
        completed_at: string;
      }>(`
        SELECT
          cp.id as purchase_id,
          cp.description,
          cc.name as card_name,
          cp.total_amount,
          cp.installments,
          cp.date,
          MAX(i.paid_at) as completed_at
        FROM credit_purchases cp
        JOIN credit_cards cc ON cp.card_id = cc.id
        JOIN installments i ON i.purchase_id = cp.id
        WHERE cp.installments > 1
        GROUP BY cp.id
        HAVING COUNT(CASE WHEN i.status = 'pending' THEN 1 END) = 0
        ORDER BY MAX(i.paid_at) DESC
        LIMIT 20
      `);

      setCompletedPurchases(completedData.map(d => ({
        purchaseId: d.purchase_id,
        description: d.description,
        cardName: d.card_name,
        totalAmount: d.total_amount,
        installments: d.installments,
        date: d.date,
        completedAt: d.completed_at,
      })));
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

  // Pagar uma parcela individual
  const payInstallment = async (installmentId: number, amount: number) => {
    try {
      // Marcar como paga
      await runQuery(
        `UPDATE installments SET status = 'paid', paid_at = datetime('now') WHERE id = ?`,
        [installmentId]
      );

      // Deduzir do saldo
      await runQuery(
        `INSERT INTO balance_transactions (amount, description, date, type, method)
         VALUES (?, 'Pagamento fatura cartão', date('now'), 'expense', 'debit')`,
        [amount]
      );

      Alert.alert('Sucesso', 'Parcela paga e deduzida do saldo!');
      await loadData();
    } catch (error) {
      console.log('Error paying installment:', error);
      Alert.alert('Erro', 'Não foi possível processar o pagamento');
    }
  };

  // Pagar todas do mês
  const payAllMonth = async () => {
    if (!monthPending) return;

    Alert.alert(
      'Pagar Fatura do Mês',
      `Deseja marcar todas as ${monthPending.count} parcelas como pagas?\n\nTotal: ${formatCurrency(monthPending.total)}\n\nIsso será deduzido do seu saldo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Pagar Tudo',
          style: 'destructive',
          onPress: async () => {
            try {
              const currentMonth = new Date().toISOString().slice(0, 7);

              // Marcar todas como pagas
              await runQuery(
                `UPDATE installments SET status = 'paid', paid_at = datetime('now')
                 WHERE status = 'pending' AND strftime('%Y-%m', due_date) = ?`,
                [currentMonth]
              );

              // Deduzir do saldo
              await runQuery(
                `INSERT INTO balance_transactions (amount, description, date, type, method)
                 VALUES (?, 'Pagamento fatura cartão - Mês completo', date('now'), 'expense', 'debit')`,
                [monthPending.total]
              );

              Alert.alert('Sucesso', 'Todas as parcelas do mês foram pagas!');
              await loadData();
            } catch (error) {
              console.log('Error paying all month:', error);
              Alert.alert('Erro', 'Não foi possível processar o pagamento');
            }
          },
        },
      ]
    );
  };

  // Pagar todas de um cartão
  const payAllCard = async (card: CardPending) => {
    const currentMonth = new Date().toISOString().slice(0, 7);

    Alert.alert(
      `Pagar ${card.cardName}`,
      `Deseja marcar todas as ${card.count} parcelas do ${card.cardName} como pagas?\n\nTotal: ${formatCurrency(card.total)}\n\nIsso será deduzido do seu saldo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Pagar Tudo',
          style: 'destructive',
          onPress: async () => {
            try {
              // Marcar todas do cartão como pagas
              await runQuery(
                `UPDATE installments SET status = 'paid', paid_at = datetime('now')
                 WHERE id IN (
                   SELECT i.id FROM installments i
                   JOIN credit_purchases cp ON i.purchase_id = cp.id
                   WHERE cp.card_id = ? AND i.status = 'pending'
                   AND strftime('%Y-%m', i.due_date) = ?
                 )`,
                [card.cardId, currentMonth]
              );

              // Deduzir do saldo
              await runQuery(
                `INSERT INTO balance_transactions (amount, description, date, type, method)
                 VALUES (?, ?, date('now'), 'expense', 'debit')`,
                [card.total, `Pagamento fatura - ${card.cardName}`]
              );

              Alert.alert('Sucesso', `Parcelas do ${card.cardName} pagas!`);
              await loadData();
            } catch (error) {
              console.log('Error paying card:', error);
              Alert.alert('Erro', 'Não foi possível processar o pagamento');
            }
          },
        },
      ]
    );
  };

  // Pagar próxima parcela de uma compra
  const payNextInstallment = (item: InstallmentItem) => {
    if (!item.nextInstallmentId) return;

    Alert.alert(
      'Pagar Parcela',
      `Deseja pagar a próxima parcela de "${item.description}"?\n\nValor: ${formatCurrency(item.installmentAmount)}\n\nIsso será deduzido do seu saldo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Pagar',
          onPress: () => payInstallment(item.nextInstallmentId!, item.installmentAmount),
        },
      ]
    );
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
      {/* Card Total do Mês */}
      {monthPending && (
        <View style={[styles.monthCard, { backgroundColor: colors.primaryDark }]}>
          <View style={styles.monthCardHeader}>
            <View>
              <Text style={styles.monthCardLabel}>Fatura de {monthPending.label}</Text>
              <Text style={styles.monthCardValue}>{formatCurrency(monthPending.total)}</Text>
              <Text style={styles.monthCardCount}>{monthPending.count} parcelas pendentes</Text>
            </View>
            <Pressable
              style={[styles.payAllButton, { backgroundColor: colors.success }]}
              onPress={payAllMonth}
            >
              <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
              <Text style={styles.payAllButtonText}>Pagar Tudo</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Pagamento por Cartão */}
      {cardsPending.length > 0 && (
        <View style={styles.cardsSectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Por Cartão
          </Text>
        </View>
      )}
      {cardsPending.map(card => (
        <Pressable
          key={card.cardId}
          style={[styles.cardPayItem, { backgroundColor: colors.surface }]}
          onPress={() => payAllCard(card)}
        >
          <View style={styles.cardPayInfo}>
            <Ionicons name="card" size={20} color={colors.primary} />
            <View style={styles.cardPayText}>
              <Text style={[styles.cardPayName, { color: colors.text }]}>
                {card.cardName}
              </Text>
              <Text style={[styles.cardPayCount, { color: colors.textMuted }]}>
                {card.count} parcelas
              </Text>
            </View>
          </View>
          <View style={styles.cardPayRight}>
            <Text style={[styles.cardPayTotal, { color: colors.warning }]}>
              {formatCurrency(card.total)}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
        </Pressable>
      ))}

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
              {futureSummary.map((item) => (
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
      <View style={styles.installmentsSectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Compras Parceladas
        </Text>
      </View>

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
            <Pressable
              key={item.purchaseId}
              style={[styles.installmentCard, { backgroundColor: colors.surface }]}
              onPress={() => payNextInstallment(item)}
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
                <View style={styles.cardRight}>
                  <Text style={[styles.installmentValue, { color: colors.text }]}>
                    {formatCurrency(item.installmentAmount)}
                  </Text>
                  <Text style={[styles.tapHint, { color: colors.textMuted }]}>
                    Toque para pagar
                  </Text>
                </View>
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
            </Pressable>
          );
        })
      )}

      {/* Compras Finalizadas */}
      {completedPurchases.length > 0 && (
        <>
          <Pressable
            style={styles.completedSectionHeader}
            onPress={() => setShowCompleted(!showCompleted)}
          >
            <View style={styles.completedHeaderLeft}>
              <Ionicons name="checkmark-done-circle" size={20} color={colors.success} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Compras Finalizadas
              </Text>
              <View style={[styles.completedBadge, { backgroundColor: colors.success + '20' }]}>
                <Text style={[styles.completedBadgeText, { color: colors.success }]}>
                  {completedPurchases.length}
                </Text>
              </View>
            </View>
            <Ionicons
              name={showCompleted ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textMuted}
            />
          </Pressable>

          {showCompleted && completedPurchases.map(item => (
            <View
              key={item.purchaseId}
              style={[styles.completedCard, { backgroundColor: colors.surface }]}
            >
              <View style={styles.completedCardTop}>
                <View
                  style={[styles.statusIndicator, { backgroundColor: colors.success }]}
                />
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {item.description}
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                    {item.cardName} • {item.installments}x
                  </Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={[styles.completedAmount, { color: colors.success }]}>
                    {formatCurrency(item.totalAmount)}
                  </Text>
                  <View style={[styles.completedTag, { backgroundColor: colors.success + '20' }]}>
                    <Text style={[styles.completedTagText, { color: colors.success }]}>
                      Pago
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </>
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
    paddingBottom: 120,
  },
  monthCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  monthCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthCardLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSize.sm,
  },
  monthCardValue: {
    color: '#FFFFFF',
    fontSize: FontSize.xxxl,
    fontWeight: 'bold',
    marginVertical: Spacing.xs,
  },
  monthCardCount: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FontSize.sm,
  },
  payAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  payAllButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: FontSize.sm,
  },
  cardsSectionHeader: {
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  cardPayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  cardPayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  cardPayText: {
    gap: 2,
  },
  cardPayName: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  cardPayCount: {
    fontSize: FontSize.sm,
  },
  cardPayRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cardPayTotal: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  summaryCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
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
  installmentsSectionHeader: {
    marginBottom: Spacing.sm,
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
  cardRight: {
    alignItems: 'flex-end',
  },
  installmentValue: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
  },
  tapHint: {
    fontSize: FontSize.xs,
    marginTop: 2,
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
  completedSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  completedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  completedBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  completedBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  completedCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  completedCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedAmount: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  completedTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginTop: 4,
  },
  completedTagText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
});
