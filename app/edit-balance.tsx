import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import { Spacing, FontSize, BorderRadius } from '../src/constants/theme';
import { getFirst, runQuery } from '../src/database';

type TransactionType = 'income' | 'expense';
type PaymentMethod = 'pix' | 'debit' | 'cash';

interface MethodOption {
  value: PaymentMethod;
  label: string;
  icon: string;
}

interface ExistingTransaction {
  id: number;
  amount: number;
  description: string;
  date: string;
  type: string;
  method: string;
  notes?: string | null;
}

const PAYMENT_METHODS: MethodOption[] = [
  { value: 'pix', label: 'Pix', icon: 'flash' },
  { value: 'debit', label: 'Débito', icon: 'card' },
  { value: 'cash', label: 'Dinheiro', icon: 'cash' },
];

export default function EditBalanceScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const transactionId = parseInt(id || '0', 10);

  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<TransactionType>('income');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('pix');

  useEffect(() => {
    loadData();
  }, [transactionId]);

  const loadData = async () => {
    try {
      const transaction = await getFirst<ExistingTransaction>(
        'SELECT * FROM balance_transactions WHERE id = ?',
        [transactionId]
      );

      if (transaction) {
        setType(transaction.type as TransactionType);
        setAmount(transaction.amount.toString().replace('.', ','));
        setDescription(transaction.description);
        setNotes(transaction.notes ?? '');
        setDate(transaction.date);
        setMethod(transaction.method as PaymentMethod);
      }
    } catch (error) {
      console.log('Error loading transaction:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados da transação');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Excluir Movimentação',
      'Tem certeza que deseja excluir esta movimentação? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await runQuery(
                'DELETE FROM balance_transactions WHERE id = ?',
                [transactionId]
              );

              Alert.alert('Sucesso', 'Movimentação excluída!', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error) {
              console.log('Error deleting transaction:', error);
              Alert.alert('Erro', 'Não foi possível excluir a movimentação');
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    const amountValue = parseFloat(amount.replace(',', '.'));

    if (!amountValue || amountValue <= 0) {
      Alert.alert('Erro', 'Digite um valor válido');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Erro', 'Digite uma descrição');
      return;
    }

    try {
      await runQuery(
        `UPDATE balance_transactions
         SET amount = ?, description = ?, notes = ?, date = ?, type = ?, method = ?
         WHERE id = ?`,
        [amountValue, description.trim(), notes.trim() || null, date, type, method, transactionId]
      );

      Alert.alert('Sucesso', 'Movimentação atualizada!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.log('Error saving transaction:', error);
      Alert.alert('Erro', 'Não foi possível salvar as alterações');
    }
  };

  const typeColor = type === 'income' ? colors.income : colors.expense;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Carregando...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        {/* Header com título */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Editar Movimentação
          </Text>
          <View style={styles.backButton} />
        </View>

        {/* Seleção de Tipo: Entrada ou Saída */}
        <View style={styles.typeSelector}>
          <Pressable
            style={[
              styles.typeButton,
              {
                backgroundColor: type === 'income' ? colors.income : colors.surface,
                borderColor: colors.income,
              },
            ]}
            onPress={() => setType('income')}
          >
            <Ionicons
              name="arrow-down-circle"
              size={24}
              color={type === 'income' ? '#FFFFFF' : colors.income}
            />
            <Text
              style={[
                styles.typeButtonText,
                { color: type === 'income' ? '#FFFFFF' : colors.income },
              ]}
            >
              Entrada
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.typeButton,
              {
                backgroundColor: type === 'expense' ? colors.expense : colors.surface,
                borderColor: colors.expense,
              },
            ]}
            onPress={() => setType('expense')}
          >
            <Ionicons
              name="arrow-up-circle"
              size={24}
              color={type === 'expense' ? '#FFFFFF' : colors.expense}
            />
            <Text
              style={[
                styles.typeButtonText,
                { color: type === 'expense' ? '#FFFFFF' : colors.expense },
              ]}
            >
              Saída
            </Text>
          </Pressable>
        </View>

        {/* Valor */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Valor</Text>
          <View style={[styles.amountInput, { backgroundColor: colors.surface }]}>
            <Text style={[styles.currency, { color: typeColor }]}>R$</Text>
            <TextInput
              style={[styles.amountText, { color: colors.text }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0,00"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {/* Descrição */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Descrição</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
            value={description}
            onChangeText={setDescription}
            placeholder={type === 'income' ? 'Ex: Salário, Freelance...' : 'Ex: Conta de luz, Mercado...'}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Notas (opcional) */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Notas</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Observações adicionais (opcional)"
            placeholderTextColor={colors.textMuted}
            multiline
          />
        </View>

        {/* Data */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Data</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Meio de Pagamento */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Meio de Pagamento
          </Text>
          <View style={styles.methodSelector}>
            {PAYMENT_METHODS.map((m) => (
              <Pressable
                key={m.value}
                style={[
                  styles.methodButton,
                  {
                    backgroundColor: method === m.value ? colors.debit : colors.surface,
                  },
                ]}
                onPress={() => setMethod(m.value)}
              >
                <Ionicons
                  name={m.icon as any}
                  size={24}
                  color={method === m.value ? '#FFFFFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.methodText,
                    { color: method === m.value ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Resumo */}
        <View style={[styles.summary, { backgroundColor: colors.surface }]}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Resumo da movimentação
          </Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryText, { color: colors.textMuted }]}>Tipo:</Text>
            <Text style={[styles.summaryValue, { color: typeColor }]}>
              {type === 'income' ? 'Entrada' : 'Saída'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryText, { color: colors.textMuted }]}>Valor:</Text>
            <Text style={[styles.summaryValue, { color: typeColor }]}>
              {type === 'income' ? '+' : '-'} R$ {amount || '0,00'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryText, { color: colors.textMuted }]}>Meio:</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {PAYMENT_METHODS.find(m => m.value === method)?.label}
            </Text>
          </View>
        </View>

        {/* Botões de ação */}
        <View style={styles.actionButtons}>
          <Pressable
            style={[styles.deleteButton, { backgroundColor: colors.error }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash" size={24} color="#FFFFFF" />
            <Text style={styles.deleteButtonText}>Excluir</Text>
          </Pressable>

          <Pressable
            style={[styles.saveButton, { backgroundColor: typeColor }]}
            onPress={handleSave}
          >
            <Ionicons name="checkmark" size={24} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Salvar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FontSize.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    paddingTop: Spacing.md,
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
  typeSelector: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    gap: Spacing.sm,
  },
  typeButtonText: {
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  field: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  currency: {
    fontSize: FontSize.xxl,
    fontWeight: 'bold',
    marginRight: Spacing.sm,
  },
  amountText: {
    flex: 1,
    fontSize: FontSize.xxl,
    fontWeight: 'bold',
  },
  input: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSize.md,
  },
  methodSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  methodButton: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  methodText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  summary: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  summaryLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  summaryText: {
    fontSize: FontSize.md,
  },
  summaryValue: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
});
