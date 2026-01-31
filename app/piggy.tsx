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
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '../src/contexts/ThemeContext';
import { Spacing, FontSize, BorderRadius } from '../src/constants/theme';
import { getAll, getFirst, runQuery } from '../src/database';
import { ScrambleText } from '../src/components/ScrambleText';

interface Piggy {
  id: number;
  name: string;
  balance: number;
}

interface PiggyTransaction {
  id: number;
  amount: number;
  type: 'deposit' | 'withdraw' | 'transfer_in' | 'transfer_out';
  description: string;
  date: string;
  related_piggy_id?: number;
}

interface BalanceInfo {
  total_balance: number;
}

export default function PiggyScreen() {
  const { colors, hideValues, toggleHideValues } = useTheme();
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

  // Novas funcionalidades
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferFrom, setTransferFrom] = useState<Piggy | null>(null);
  const [transferTo, setTransferTo] = useState<Piggy | null>(null);
  const [transferAmount, setTransferAmount] = useState('');

  const [showBalanceTransfer, setShowBalanceTransfer] = useState(false);
  const [balanceTransferPiggy, setBalanceTransferPiggy] = useState<Piggy | null>(null);
  const [balanceTransferAmount, setBalanceTransferAmount] = useState('');
  const [availableBalance, setAvailableBalance] = useState(0);

  const [showPiggyToBalance, setShowPiggyToBalance] = useState(false);
  const [piggyToBalancePiggy, setPiggyToBalancePiggy] = useState<Piggy | null>(null);
  const [piggyToBalanceAmount, setPiggyToBalanceAmount] = useState('');

  const [showHistory, setShowHistory] = useState(false);
  const [historyPiggy, setHistoryPiggy] = useState<Piggy | null>(null);
  const [transactions, setTransactions] = useState<PiggyTransaction[]>([]);

  const [showEditPiggy, setShowEditPiggy] = useState(false);
  const [editingPiggy, setEditingPiggy] = useState<Piggy | null>(null);
  const [editPiggyName, setEditPiggyName] = useState('');

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

      // Carregar saldo disponível
      const balanceData = await getAll<BalanceInfo>(`
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as total_balance
        FROM balance_transactions
      `);
      if (balanceData.length > 0) {
        setAvailableBalance(balanceData[0].total_balance);
      }
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

  const handleTransferBetweenPiggies = async () => {
    if (!transferFrom || !transferTo) {
      Alert.alert('Erro', 'Selecione os porquinhos');
      return;
    }

    if (transferFrom.id === transferTo.id) {
      Alert.alert('Erro', 'Selecione porquinhos diferentes');
      return;
    }

    const amount = parseFloat(transferAmount.replace(',', '.'));
    if (!amount || amount <= 0) {
      Alert.alert('Erro', 'Digite um valor válido');
      return;
    }

    if (amount > transferFrom.balance) {
      Alert.alert('Erro', 'Saldo insuficiente no porquinho de origem');
      return;
    }

    try {
      // Atualizar saldo do porquinho de origem
      await runQuery(
        'UPDATE piggies SET balance = balance - ?, updated_at = datetime("now") WHERE id = ?',
        [amount, transferFrom.id]
      );

      // Atualizar saldo do porquinho de destino
      await runQuery(
        'UPDATE piggies SET balance = balance + ?, updated_at = datetime("now") WHERE id = ?',
        [amount, transferTo.id]
      );

      // Registrar transação de saída
      await runQuery(
        `INSERT INTO piggy_transactions (piggy_id, amount, type, description, date, related_piggy_id)
         VALUES (?, ?, 'transfer_out', ?, date('now'), ?)`,
        [transferFrom.id, amount, `Transferência para ${transferTo.name}`, transferTo.id]
      );

      // Registrar transação de entrada
      await runQuery(
        `INSERT INTO piggy_transactions (piggy_id, amount, type, description, date, related_piggy_id)
         VALUES (?, ?, 'transfer_in', ?, date('now'), ?)`,
        [transferTo.id, amount, `Transferência de ${transferFrom.name}`, transferFrom.id]
      );

      setShowTransfer(false);
      setTransferFrom(null);
      setTransferTo(null);
      setTransferAmount('');
      await loadData();

      Alert.alert('Sucesso', 'Transferência realizada!');
    } catch (error) {
      console.log('Error transferring:', error);
      Alert.alert('Erro', 'Não foi possível realizar a transferência');
    }
  };

  const handleTransferFromBalance = async () => {
    if (!balanceTransferPiggy) return;

    const amount = parseFloat(balanceTransferAmount.replace(',', '.'));
    if (!amount || amount <= 0) {
      Alert.alert('Erro', 'Digite um valor válido');
      return;
    }

    if (amount > availableBalance) {
      Alert.alert('Erro', 'Saldo insuficiente');
      return;
    }

    try {
      // Atualizar saldo do porquinho
      await runQuery(
        'UPDATE piggies SET balance = balance + ?, updated_at = datetime("now") WHERE id = ?',
        [amount, balanceTransferPiggy.id]
      );

      // Registrar saída no saldo
      await runQuery(
        `INSERT INTO balance_transactions (amount, description, date, type, method)
         VALUES (?, ?, date('now'), 'expense', 'cash')`,
        [amount, `Transferência para porquinho: ${balanceTransferPiggy.name}`]
      );

      // Registrar entrada no porquinho
      await runQuery(
        `INSERT INTO piggy_transactions (piggy_id, amount, type, description, date)
         VALUES (?, ?, 'deposit', ?, date('now'))`,
        [balanceTransferPiggy.id, amount, 'Transferência do saldo']
      );

      setShowBalanceTransfer(false);
      setBalanceTransferPiggy(null);
      setBalanceTransferAmount('');
      await loadData();

      Alert.alert('Sucesso', 'Transferência realizada!');
    } catch (error) {
      console.log('Error transferring from balance:', error);
      Alert.alert('Erro', 'Não foi possível realizar a transferência');
    }
  };

  const handleTransferToBalance = async () => {
    if (!piggyToBalancePiggy) return;

    const amount = parseFloat(piggyToBalanceAmount.replace(',', '.'));
    if (!amount || amount <= 0) {
      Alert.alert('Erro', 'Digite um valor válido');
      return;
    }

    if (amount > piggyToBalancePiggy.balance) {
      Alert.alert('Erro', 'Saldo insuficiente no porquinho');
      return;
    }

    try {
      // Atualizar saldo do porquinho
      await runQuery(
        'UPDATE piggies SET balance = balance - ?, updated_at = datetime("now") WHERE id = ?',
        [amount, piggyToBalancePiggy.id]
      );

      // Registrar entrada no saldo
      await runQuery(
        `INSERT INTO balance_transactions (amount, description, date, type, method)
         VALUES (?, ?, date('now'), 'income', 'cash')`,
        [amount, `Transferência do porquinho: ${piggyToBalancePiggy.name}`]
      );

      // Registrar saída no porquinho
      await runQuery(
        `INSERT INTO piggy_transactions (piggy_id, amount, type, description, date)
         VALUES (?, ?, 'withdraw', ?, date('now'))`,
        [piggyToBalancePiggy.id, amount, 'Transferência para o saldo']
      );

      setShowPiggyToBalance(false);
      setPiggyToBalancePiggy(null);
      setPiggyToBalanceAmount('');
      await loadData();

      Alert.alert('Sucesso', 'Transferência realizada!');
    } catch (error) {
      console.log('Error transferring to balance:', error);
      Alert.alert('Erro', 'Não foi possível realizar a transferência');
    }
  };

  const loadHistory = async (piggy: Piggy) => {
    try {
      const history = await getAll<PiggyTransaction>(
        `SELECT * FROM piggy_transactions 
         WHERE piggy_id = ? 
         ORDER BY date DESC, id DESC
         LIMIT 50`,
        [piggy.id]
      );
      setTransactions(history);
      setHistoryPiggy(piggy);
      setShowHistory(true);
    } catch (error) {
      console.log('Error loading history:', error);
      Alert.alert('Erro', 'Não foi possível carregar o histórico');
    }
  };

  const handleEditPiggy = async () => {
    if (!editingPiggy) return;

    if (!editPiggyName.trim()) {
      Alert.alert('Erro', 'Digite um nome para o porquinho');
      return;
    }

    try {
      await runQuery(
        'UPDATE piggies SET name = ?, updated_at = datetime("now") WHERE id = ?',
        [editPiggyName.trim(), editingPiggy.id]
      );

      setShowEditPiggy(false);
      setEditingPiggy(null);
      setEditPiggyName('');
      await loadData();

      Alert.alert('Sucesso', 'Porquinho atualizado!');
    } catch (error) {
      console.log('Error editing piggy:', error);
      Alert.alert('Erro', 'Não foi possível editar o porquinho');
    }
  };

  const handleDeletePiggy = (piggy: Piggy) => {
    Alert.alert(
      'Excluir Porquinho',
      `Tem certeza que deseja excluir "${piggy.name}"? ${
        piggy.balance > 0
          ? `O saldo de ${formatCurrency(piggy.balance)} será perdido.`
          : ''
      }`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await runQuery('DELETE FROM piggies WHERE id = ?', [piggy.id]);
              await loadData();
              Alert.alert('Sucesso', 'Porquinho excluído!');
            } catch (error) {
              console.log('Error deleting piggy:', error);
              Alert.alert('Erro', 'Não foi possível excluir o porquinho');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'arrow-down-circle';
      case 'withdraw':
        return 'arrow-up-circle';
      case 'transfer_in':
        return 'arrow-forward-circle';
      case 'transfer_out':
        return 'arrow-back-circle';
      default:
        return 'help-circle';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'transfer_in':
        return colors.success;
      case 'withdraw':
      case 'transfer_out':
        return colors.warning;
      default:
        return colors.textMuted;
    }
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
        <View style={styles.totalCardHeader}>
          <Text style={styles.totalLabel}>Total Guardado</Text>
          <Pressable onPress={toggleHideValues} hitSlop={8}>
            <Ionicons
              name={hideValues ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color="rgba(255,255,255,0.7)"
            />
          </Pressable>
        </View>
        <ScrambleText style={styles.totalValue} text={formatCurrency(totalSaved)} isHidden={hideValues} />
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
                  <ScrambleText style={[styles.piggyBalance, { color: colors.primary }]} text={formatCurrency(piggy.balance)} isHidden={hideValues} />
                </View>
                <View style={styles.piggyHeaderActions}>
                  <Pressable
                    style={styles.iconButton}
                    onPress={() => loadHistory(piggy)}
                  >
                    <Ionicons name="time-outline" size={20} color={colors.textMuted} />
                  </Pressable>
                  <Pressable
                    style={styles.iconButton}
                    onPress={() => {
                      setEditingPiggy(piggy);
                      setEditPiggyName(piggy.name);
                      setShowEditPiggy(true);
                    }}
                  >
                    <Ionicons name="pencil" size={20} color={colors.textMuted} />
                  </Pressable>
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
                  <Ionicons name="add" size={18} color={colors.success} />
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
                  <Ionicons name="remove" size={18} color={colors.warning} />
                  <Text style={[styles.actionBtnText, { color: colors.warning }]}>
                    Retirar
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        {/* Botões de Ação */}
        <Pressable
          style={[styles.addPiggyButton, { backgroundColor: colors.surface }]}
          onPress={() => setShowAddPiggy(true)}
        >
          <Ionicons name="add-circle" size={24} color={colors.primary} />
          <Text style={[styles.addPiggyText, { color: colors.primary }]}>
            Novo Porquinho
          </Text>
        </Pressable>

        {piggies.length >= 2 && (
          <Pressable
            style={[styles.addPiggyButton, { backgroundColor: colors.surface }]}
            onPress={() => setShowTransfer(true)}
          >
            <Ionicons name="swap-horizontal" size={24} color={colors.info} />
            <Text style={[styles.addPiggyText, { color: colors.info }]}>
              Transferir entre Porcos
            </Text>
          </Pressable>
        )}

        {piggies.length > 0 && (
          <Pressable
            style={[styles.addPiggyButton, { backgroundColor: colors.surface }]}
            onPress={() => setShowBalanceTransfer(true)}
          >
            <Ionicons name="cash" size={24} color={colors.success} />
            <Text style={[styles.addPiggyText, { color: colors.success }]}>
              Transferir do Saldo
            </Text>
          </Pressable>
        )}

        {piggies.length > 0 && (
          <Pressable
            style={[styles.addPiggyButton, { backgroundColor: colors.surface }]}
            onPress={() => setShowPiggyToBalance(true)}
          >
            <Ionicons name="wallet" size={24} color={colors.warning} />
            <Text style={[styles.addPiggyText, { color: colors.warning }]}>
              Transferir para o Saldo
            </Text>
          </Pressable>
        )}
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

      {/* Modal Transferir entre Porcos */}
      <Modal visible={showTransfer} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Transferir entre Porcos
            </Text>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>DE:</Text>
            <ScrollView style={styles.pickerScroll} horizontal showsHorizontalScrollIndicator={false}>
              {piggies.map(piggy => (
                <Pressable
                  key={piggy.id}
                  style={[
                    styles.pickerItem,
                    {
                      backgroundColor: transferFrom?.id === piggy.id ? colors.primary : colors.surfaceVariant,
                    },
                  ]}
                  onPress={() => setTransferFrom(piggy)}
                >
                  <Text style={[styles.pickerText, { color: transferFrom?.id === piggy.id ? '#FFFFFF' : colors.text }]}>
                    {piggy.name}
                  </Text>
                  <Text style={[styles.pickerBalance, { color: transferFrom?.id === piggy.id ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]}>
                    {formatCurrency(piggy.balance)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: Spacing.md }]}>PARA:</Text>
            <ScrollView style={styles.pickerScroll} horizontal showsHorizontalScrollIndicator={false}>
              {piggies.map(piggy => (
                <Pressable
                  key={piggy.id}
                  style={[
                    styles.pickerItem,
                    {
                      backgroundColor: transferTo?.id === piggy.id ? colors.primary : colors.surfaceVariant,
                    },
                  ]}
                  onPress={() => setTransferTo(piggy)}
                >
                  <Text style={[styles.pickerText, { color: transferTo?.id === piggy.id ? '#FFFFFF' : colors.text }]}>
                    {piggy.name}
                  </Text>
                  <Text style={[styles.pickerBalance, { color: transferTo?.id === piggy.id ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]}>
                    {formatCurrency(piggy.balance)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surfaceVariant, color: colors.text, marginTop: Spacing.md }]}
              value={transferAmount}
              onChangeText={setTransferAmount}
              placeholder="Valor"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.surfaceVariant }]}
                onPress={() => {
                  setShowTransfer(false);
                  setTransferFrom(null);
                  setTransferTo(null);
                  setTransferAmount('');
                }}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.info }]}
                onPress={handleTransferBetweenPiggies}
              >
                <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>Transferir</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Transferir do Saldo */}
      <Modal visible={showBalanceTransfer} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Transferir do Saldo
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Saldo disponível: {formatCurrency(availableBalance)}
            </Text>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>PARA:</Text>
            <ScrollView style={styles.pickerScroll} horizontal showsHorizontalScrollIndicator={false}>
              {piggies.map(piggy => (
                <Pressable
                  key={piggy.id}
                  style={[
                    styles.pickerItem,
                    {
                      backgroundColor: balanceTransferPiggy?.id === piggy.id ? colors.primary : colors.surfaceVariant,
                    },
                  ]}
                  onPress={() => setBalanceTransferPiggy(piggy)}
                >
                  <Text style={[styles.pickerText, { color: balanceTransferPiggy?.id === piggy.id ? '#FFFFFF' : colors.text }]}>
                    {piggy.name}
                  </Text>
                  <Text style={[styles.pickerBalance, { color: balanceTransferPiggy?.id === piggy.id ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]}>
                    {formatCurrency(piggy.balance)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surfaceVariant, color: colors.text, marginTop: Spacing.md }]}
              value={balanceTransferAmount}
              onChangeText={setBalanceTransferAmount}
              placeholder="Valor"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.surfaceVariant }]}
                onPress={() => {
                  setShowBalanceTransfer(false);
                  setBalanceTransferPiggy(null);
                  setBalanceTransferAmount('');
                }}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.success }]}
                onPress={handleTransferFromBalance}
              >
                <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>Transferir</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Transferir para o Saldo */}
      <Modal visible={showPiggyToBalance} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Transferir para o Saldo
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Transferir dinheiro de um porquinho para o saldo disponível
            </Text>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>DE:</Text>
            <ScrollView style={styles.pickerScroll} horizontal showsHorizontalScrollIndicator={false}>
              {piggies.map(piggy => (
                <Pressable
                  key={piggy.id}
                  style={[
                    styles.pickerItem,
                    {
                      backgroundColor: piggyToBalancePiggy?.id === piggy.id ? colors.primary : colors.surfaceVariant,
                    },
                  ]}
                  onPress={() => setPiggyToBalancePiggy(piggy)}
                >
                  <Text style={[styles.pickerText, { color: piggyToBalancePiggy?.id === piggy.id ? '#FFFFFF' : colors.text }]}>
                    {piggy.name}
                  </Text>
                  <Text style={[styles.pickerBalance, { color: piggyToBalancePiggy?.id === piggy.id ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]}>
                    {formatCurrency(piggy.balance)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surfaceVariant, color: colors.text, marginTop: Spacing.md }]}
              value={piggyToBalanceAmount}
              onChangeText={setPiggyToBalanceAmount}
              placeholder="Valor"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.surfaceVariant }]}
                onPress={() => {
                  setShowPiggyToBalance(false);
                  setPiggyToBalancePiggy(null);
                  setPiggyToBalanceAmount('');
                }}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.warning }]}
                onPress={handleTransferToBalance}
              >
                <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>Transferir</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Histórico */}
      <Modal visible={showHistory} transparent animationType="slide">
        <View style={[styles.historyModal, { backgroundColor: colors.background }]}>
          <View style={styles.historyHeader}>
            <View>
              <Text style={[styles.historyTitle, { color: colors.text }]}>
                Histórico
              </Text>
              {historyPiggy && (
                <Text style={[styles.historySubtitle, { color: colors.textSecondary }]}>
                  {historyPiggy.name}
                </Text>
              )}
            </View>
            <Pressable onPress={() => setShowHistory(false)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </Pressable>
          </View>

          <FlatList
            data={transactions}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.historyList}
            ListEmptyComponent={
              <View style={styles.emptyHistory}>
                <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyHistoryText, { color: colors.textMuted }]}>
                  Nenhuma movimentação ainda
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={[styles.historyItem, { backgroundColor: colors.surface }]}>
                <View style={[styles.historyIcon, { backgroundColor: getTransactionColor(item.type) + '20' }]}>
                  <Ionicons name={getTransactionIcon(item.type)} size={24} color={getTransactionColor(item.type)} />
                </View>
                <View style={styles.historyInfo}>
                  <Text style={[styles.historyDesc, { color: colors.text }]}>
                    {item.description}
                  </Text>
                  <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                    {formatDate(item.date)}
                  </Text>
                </View>
                <Text style={[styles.historyAmount, { color: getTransactionColor(item.type) }]}>
                  {item.type === 'withdraw' || item.type === 'transfer_out' ? '-' : '+'}
                  {formatCurrency(item.amount)}
                </Text>
              </View>
            )}
          />
        </View>
      </Modal>

      {/* Modal Editar Porquinho */}
      <Modal visible={showEditPiggy} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Editar Porquinho
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
              value={editPiggyName}
              onChangeText={setEditPiggyName}
              placeholder="Nome"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.surfaceVariant }]}
                onPress={() => {
                  setShowEditPiggy(false);
                  setEditingPiggy(null);
                  setEditPiggyName('');
                }}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleEditPiggy}
              >
                <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>Salvar</Text>
              </Pressable>
            </View>
            {editingPiggy && (
              <Pressable
                style={[styles.deleteBtn, { backgroundColor: colors.error + '20' }]}
                onPress={() => {
                  setShowEditPiggy(false);
                  handleDeletePiggy(editingPiggy);
                }}
              >
                <Ionicons name="trash" size={18} color={colors.error} />
                <Text style={[styles.deleteBtnText, { color: colors.error }]}>
                  Excluir Porquinho
                </Text>
              </Pressable>
            )}
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
  totalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  totalLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSize.md,
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
  piggyHeaderActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  iconButton: {
    padding: Spacing.xs,
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
  fieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerScroll: {
    maxHeight: 80,
  },
  pickerItem: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.sm,
    minWidth: 120,
  },
  pickerText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  pickerBalance: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  deleteBtnText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  historyModal: {
    flex: 1,
    paddingTop: Spacing.xxl,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  historyTitle: {
    fontSize: FontSize.xxl,
    fontWeight: 'bold',
  },
  historySubtitle: {
    fontSize: FontSize.md,
    marginTop: 2,
  },
  historyList: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  historyIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  historyInfo: {
    flex: 1,
  },
  historyDesc: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  historyDate: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  historyAmount: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyHistoryText: {
    fontSize: FontSize.md,
    marginTop: Spacing.md,
  },
});
