import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '../src/contexts/ThemeContext';
import { Spacing, FontSize, BorderRadius } from '../src/constants/theme';
import { getAll, getFirst, runQuery } from '../src/database';

interface Piggy {
  id: number;
  name: string;
  balance: number;
}

export default function PiggyScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [piggies, setPiggies] = useState<Piggy[]>([]);
  const [totalSaved, setTotalSaved] = useState(0);

  const [showAddPiggy, setShowAddPiggy] = useState(false);
  const [newPiggyName, setNewPiggyName] = useState('');

  const [showTransaction, setShowTransaction] = useState(false);
  const [selectedPiggy, setSelectedPiggy] = useState<Piggy | null>(null);
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdraw'>('deposit');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionDesc, setTransactionDesc] = useState('');

  const [hasPassword, setHasPassword] = useState(false);
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useFocusEffect(
    useCallback(() => {
      checkPassword();
    }, [])
  );

  const checkPassword = async () => {
    try {
      const storedPassword = await SecureStore.getItemAsync('piggy_password');
      setHasPassword(!!storedPassword);
      if (!storedPassword) {
        setShowSetPassword(true);
      }
    } catch (error) {
      console.log('Error checking password:', error);
    }
  };

  const loadData = async () => {
    try {
      const piggiesData = await getAll<Piggy>(
        'SELECT id, name, balance FROM piggies ORDER BY name'
      );
      setPiggies(piggiesData);

      const total = piggiesData.reduce((sum, p) => sum + p.balance, 0);
      setTotalSaved(total);
    } catch (error) {
      console.log('Error loading piggies:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSetPassword = async () => {
    if (newPassword.length !== 4 || !/^\d{4}$/.test(newPassword)) {
      Alert.alert('Erro', 'A senha deve ter exatamente 4 números');
      return;
    }

    try {
      await SecureStore.setItemAsync('piggy_password', newPassword);
      setHasPassword(true);
      setShowSetPassword(false);
      setIsUnlocked(true);
      setNewPassword('');
      await loadData();
    } catch (error) {
      console.log('Error setting password:', error);
      Alert.alert('Erro', 'Não foi possível salvar a senha');
    }
  };

  const handleUnlock = async () => {
    try {
      const storedPassword = await SecureStore.getItemAsync('piggy_password');
      if (password === storedPassword) {
        setIsUnlocked(true);
        setPassword('');
        await loadData();
      } else {
        Alert.alert('Erro', 'Senha incorreta');
        setPassword('');
      }
    } catch (error) {
      console.log('Error unlocking:', error);
    }
  };

  const handleAddPiggy = async () => {
    if (!newPiggyName.trim()) {
      Alert.alert('Erro', 'Digite um nome para o porquinho');
      return;
    }

    try {
      await runQuery('INSERT INTO piggies (name, balance) VALUES (?, 0)', [
        newPiggyName.trim(),
      ]);
      setNewPiggyName('');
      setShowAddPiggy(false);
      await loadData();
    } catch (error) {
      console.log('Error adding piggy:', error);
      Alert.alert('Erro', 'Não foi possível criar o porquinho');
    }
  };

  const handleTransaction = async () => {
    if (!selectedPiggy) return;

    const amount = parseFloat(transactionAmount.replace(',', '.'));
    if (!amount || amount <= 0) {
      Alert.alert('Erro', 'Digite um valor válido');
      return;
    }

    if (!transactionDesc.trim()) {
      Alert.alert('Erro', 'Digite um motivo');
      return;
    }

    if (transactionType === 'withdraw' && amount > selectedPiggy.balance) {
      Alert.alert('Erro', 'Saldo insuficiente no porquinho');
      return;
    }

    try {
      const newBalance =
        transactionType === 'deposit'
          ? selectedPiggy.balance + amount
          : selectedPiggy.balance - amount;

      await runQuery('UPDATE piggies SET balance = ?, updated_at = datetime("now") WHERE id = ?', [
        newBalance,
        selectedPiggy.id,
      ]);

      await runQuery(
        `INSERT INTO piggy_transactions (piggy_id, amount, type, description, date)
         VALUES (?, ?, ?, ?, date('now'))`,
        [selectedPiggy.id, amount, transactionType, transactionDesc.trim()]
      );

      setShowTransaction(false);
      setSelectedPiggy(null);
      setTransactionAmount('');
      setTransactionDesc('');
      await loadData();

      Alert.alert('Sucesso', transactionType === 'deposit' ? 'Valor guardado!' : 'Valor retirado!');
    } catch (error) {
      console.log('Error processing transaction:', error);
      Alert.alert('Erro', 'Não foi possível processar a transação');
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  // Tela de definir senha
  if (showSetPassword) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <View style={[styles.lockCard, { backgroundColor: colors.surface }]}>
          <Text style={styles.piggyIcon}>🐷</Text>
          <Text style={[styles.lockTitle, { color: colors.text }]}>
            Criar Senha
          </Text>
          <Text style={[styles.lockSubtitle, { color: colors.textSecondary }]}>
            Defina uma senha de 4 números para proteger seus porquinhos
          </Text>
          <TextInput
            style={[styles.passwordInput, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
            value={newPassword}
            onChangeText={setNewPassword}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            placeholder="••••"
            placeholderTextColor={colors.textMuted}
            autoFocus
          />
          <Pressable
            style={[styles.unlockButton, { backgroundColor: colors.primary }]}
            onPress={handleSetPassword}
          >
            <Text style={styles.unlockButtonText}>Criar Senha</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Tela de desbloqueio
  if (!isUnlocked) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <View style={[styles.lockCard, { backgroundColor: colors.surface }]}>
          <Text style={styles.piggyIcon}>🐷</Text>
          <Text style={[styles.lockTitle, { color: colors.text }]}>
            Área Protegida
          </Text>
          <Text style={[styles.lockSubtitle, { color: colors.textSecondary }]}>
            Digite a senha de 4 números
          </Text>
          <TextInput
            style={[styles.passwordInput, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
            value={password}
            onChangeText={setPassword}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            placeholder="••••"
            placeholderTextColor={colors.textMuted}
            autoFocus
          />
          <Pressable
            style={[styles.unlockButton, { backgroundColor: colors.primary }]}
            onPress={handleUnlock}
          >
            <Text style={styles.unlockButtonText}>Desbloquear</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Tela principal desbloqueada
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Total Guardado */}
      <View style={[styles.totalCard, { backgroundColor: colors.primaryDark }]}>
        <Text style={styles.totalLabel}>Total Guardado</Text>
        <Text style={styles.totalValue}>{formatCurrency(totalSaved)}</Text>
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
        {piggies.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <Text style={styles.emptyIcon}>🐷</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Nenhum porquinho ainda
            </Text>
            <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
              Crie um para começar a guardar dinheiro!
            </Text>
          </View>
        ) : (
          piggies.map(piggy => (
            <View
              key={piggy.id}
              style={[styles.piggyCard, { backgroundColor: colors.surface }]}
            >
              <View style={styles.piggyHeader}>
                <Text style={styles.piggyCardIcon}>🐷</Text>
                <View style={styles.piggyInfo}>
                  <Text style={[styles.piggyName, { color: colors.text }]}>
                    {piggy.name}
                  </Text>
                  <Text style={[styles.piggyBalance, { color: colors.primary }]}>
                    {formatCurrency(piggy.balance)}
                  </Text>
                </View>
              </View>
              <View style={styles.piggyActions}>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: colors.success + '20' }]}
                  onPress={() => {
                    setSelectedPiggy(piggy);
                    setTransactionType('deposit');
                    setShowTransaction(true);
                  }}
                >
                  <Ionicons name="add" size={20} color={colors.success} />
                  <Text style={[styles.actionBtnText, { color: colors.success }]}>
                    Guardar
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: colors.warning + '20' }]}
                  onPress={() => {
                    setSelectedPiggy(piggy);
                    setTransactionType('withdraw');
                    setShowTransaction(true);
                  }}
                >
                  <Ionicons name="remove" size={20} color={colors.warning} />
                  <Text style={[styles.actionBtnText, { color: colors.warning }]}>
                    Retirar
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        {/* Botão Adicionar Porquinho */}
        <Pressable
          style={[styles.addPiggyButton, { backgroundColor: colors.surface }]}
          onPress={() => setShowAddPiggy(true)}
        >
          <Ionicons name="add-circle" size={24} color={colors.primary} />
          <Text style={[styles.addPiggyText, { color: colors.primary }]}>
            Novo Porquinho
          </Text>
        </Pressable>
      </ScrollView>

      {/* Modal Adicionar Porquinho */}
      <Modal visible={showAddPiggy} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Novo Porquinho
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
              value={newPiggyName}
              onChangeText={setNewPiggyName}
              placeholder="Nome (ex: Viagem, Reserva)"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.surfaceVariant }]}
                onPress={() => {
                  setShowAddPiggy(false);
                  setNewPiggyName('');
                }}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleAddPiggy}
              >
                <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>Criar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Transação */}
      <Modal visible={showTransaction} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {transactionType === 'deposit' ? 'Guardar Dinheiro' : 'Retirar Dinheiro'}
            </Text>
            {selectedPiggy && (
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                {selectedPiggy.name} • Saldo: {formatCurrency(selectedPiggy.balance)}
              </Text>
            )}
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
              value={transactionAmount}
              onChangeText={setTransactionAmount}
              placeholder="Valor"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
              value={transactionDesc}
              onChangeText={setTransactionDesc}
              placeholder="Motivo"
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.surfaceVariant }]}
                onPress={() => {
                  setShowTransaction(false);
                  setSelectedPiggy(null);
                  setTransactionAmount('');
                  setTransactionDesc('');
                }}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalBtn,
                  { backgroundColor: transactionType === 'deposit' ? colors.success : colors.warning },
                ]}
                onPress={handleTransaction}
              >
                <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>
                  {transactionType === 'deposit' ? 'Guardar' : 'Retirar'}
                </Text>
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  lockCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  piggyIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  lockTitle: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  lockSubtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  passwordInput: {
    width: '100%',
    fontSize: FontSize.xxl,
    textAlign: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    letterSpacing: 16,
    marginBottom: Spacing.lg,
  },
  unlockButton: {
    width: '100%',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  unlockButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  totalCard: {
    margin: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
  },
  totalLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSize.md,
    marginBottom: Spacing.xs,
  },
  totalValue: {
    color: '#FFFFFF',
    fontSize: FontSize.xxxl,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  emptyState: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.lg,
    fontWeight: '500',
  },
  emptyHint: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  piggyCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  piggyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  piggyCardIcon: {
    fontSize: 36,
    marginRight: Spacing.md,
  },
  piggyInfo: {
    flex: 1,
  },
  piggyName: {
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  piggyBalance: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    marginTop: 2,
  },
  piggyActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  actionBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  addPiggyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  addPiggyText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.lg,
  },
  modalInput: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSize.md,
    marginBottom: Spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  modalBtn: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  modalBtnText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
