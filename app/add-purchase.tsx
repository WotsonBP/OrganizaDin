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
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../src/contexts/ThemeContext';
import { Spacing, FontSize, BorderRadius } from '../src/constants/theme';
import { getAll, runQuery } from '../src/database';

interface Category {
  id: number;
  name: string;
  icon: string;
}

interface CreditCard {
  id: number;
  name: string;
}

export default function AddPurchaseScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [installments, setInstallments] = useState('1');
  const [isRecurring, setIsRecurring] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [showCardModal, setShowCardModal] = useState(false);
  const [newCardName, setNewCardName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const categoriesData = await getAll<Category>(
        'SELECT id, name, icon FROM categories ORDER BY name'
      );
      setCategories(categoriesData);

      const cardsData = await getAll<CreditCard>(
        'SELECT id, name FROM credit_cards ORDER BY name'
      );
      setCards(cardsData);
    } catch (error) {
      console.log('Error loading data:', error);
    }
  };

  const handleAddCard = async () => {
    if (!newCardName.trim()) {
      Alert.alert('Erro', 'Digite o nome do cartão');
      return;
    }

    try {
      const result = await runQuery(
        'INSERT INTO credit_cards (name) VALUES (?)',
        [newCardName.trim()]
      );
      setSelectedCard(result.lastInsertRowId);
      setNewCardName('');
      setShowCardModal(false);
      await loadData();
    } catch (error) {
      console.log('Error adding card:', error);
      Alert.alert('Erro', 'Não foi possível adicionar o cartão');
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
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

    if (!selectedCard) {
      Alert.alert('Erro', 'Selecione um cartão');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Erro', 'Selecione uma categoria');
      return;
    }

    const installmentsValue = parseInt(installments, 10) || 1;

    try {
      // Inserir compra
      const purchaseResult = await runQuery(
        `INSERT INTO credit_purchases
         (total_amount, description, date, card_id, category_id, installments, is_recurring, image_uri)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          amountValue,
          description.trim(),
          date,
          selectedCard,
          selectedCategory,
          installmentsValue,
          isRecurring ? 1 : 0,
          imageUri,
        ]
      );

      const purchaseId = purchaseResult.lastInsertRowId;
      const installmentAmount = amountValue / installmentsValue;

      // Criar parcelas
      for (let i = 1; i <= installmentsValue; i++) {
        const dueDate = new Date(date);
        dueDate.setMonth(dueDate.getMonth() + i - 1);
        const dueDateStr = dueDate.toISOString().split('T')[0];

        await runQuery(
          `INSERT INTO installments
           (purchase_id, installment_number, amount, due_date, status)
           VALUES (?, ?, ?, ?, 'pending')`,
          [purchaseId, i, installmentAmount, dueDateStr]
        );
      }

      Alert.alert('Sucesso', 'Compra adicionada!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.log('Error saving purchase:', error);
      Alert.alert('Erro', 'Não foi possível salvar a compra');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        {/* Valor */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Valor Total</Text>
          <View style={[styles.amountInput, { backgroundColor: colors.surface }]}>
            <Text style={[styles.currency, { color: colors.primary }]}>R$</Text>
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
            placeholder="Ex: Compras no mercado"
            placeholderTextColor={colors.textMuted}
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

        {/* Cartão */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Cartão</Text>
          <View style={styles.chipContainer}>
            {cards.map(card => (
              <Pressable
                key={card.id}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      selectedCard === card.id ? colors.primary : colors.surface,
                  },
                ]}
                onPress={() => setSelectedCard(card.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: selectedCard === card.id ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {card.name}
                </Text>
              </Pressable>
            ))}
            <Pressable
              style={[styles.chip, { backgroundColor: colors.surface, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border }]}
              onPress={() => setShowCardModal(true)}
            >
              <Ionicons name="add" size={16} color={colors.textMuted} />
              <Text style={[styles.chipText, { color: colors.textMuted }]}>Novo</Text>
            </Pressable>
          </View>
        </View>

        {/* Modal Novo Cartão */}
        {showCardModal && (
          <View style={[styles.inlineModal, { backgroundColor: colors.surface }]}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text, flex: 1 }]}
              value={newCardName}
              onChangeText={setNewCardName}
              placeholder="Nome do cartão"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <Pressable
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={handleAddCard}
            >
              <Text style={styles.modalButtonText}>Adicionar</Text>
            </Pressable>
            <Pressable onPress={() => setShowCardModal(false)}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>
        )}

        {/* Categoria */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Categoria</Text>
          <View style={styles.chipContainer}>
            {categories.map(cat => (
              <Pressable
                key={cat.id}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      selectedCategory === cat.id ? colors.primary : colors.surface,
                  },
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text style={styles.chipIcon}>{cat.icon}</Text>
                <Text
                  style={[
                    styles.chipText,
                    { color: selectedCategory === cat.id ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {cat.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Parcelas */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Parcelas</Text>
          <View style={styles.installmentsRow}>
            {['1', '2', '3', '6', '10', '12'].map(num => (
              <Pressable
                key={num}
                style={[
                  styles.installmentChip,
                  {
                    backgroundColor:
                      installments === num ? colors.primary : colors.surface,
                  },
                ]}
                onPress={() => setInstallments(num)}
              >
                <Text
                  style={[
                    styles.installmentText,
                    { color: installments === num ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {num}x
                </Text>
              </Pressable>
            ))}
            <TextInput
              style={[
                styles.installmentInput,
                { backgroundColor: colors.surface, color: colors.text },
              ]}
              value={installments}
              onChangeText={setInstallments}
              keyboardType="numeric"
              placeholder="Outro"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {/* Recorrente */}
        <Pressable
          style={[styles.toggleRow, { backgroundColor: colors.surface }]}
          onPress={() => setIsRecurring(!isRecurring)}
        >
          <View style={styles.toggleInfo}>
            <Ionicons
              name="repeat"
              size={20}
              color={isRecurring ? colors.recurring : colors.textMuted}
            />
            <Text style={[styles.toggleText, { color: colors.text }]}>
              Despesa Recorrente
            </Text>
          </View>
          <View
            style={[
              styles.toggleSwitch,
              { backgroundColor: isRecurring ? colors.recurring : colors.border },
            ]}
          >
            <View
              style={[
                styles.toggleThumb,
                { transform: [{ translateX: isRecurring ? 20 : 0 }] },
              ]}
            />
          </View>
        </Pressable>

        {/* Imagem */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Foto/Comprovante (opcional)
          </Text>
          <Pressable
            style={[styles.imageButton, { backgroundColor: colors.surface }]}
            onPress={handlePickImage}
          >
            {imageUri ? (
              <View style={styles.imagePreview}>
                <Ionicons name="image" size={24} color={colors.success} />
                <Text style={[styles.imageText, { color: colors.success }]}>
                  Imagem selecionada
                </Text>
                <Pressable onPress={() => setImageUri(null)}>
                  <Ionicons name="close-circle" size={20} color={colors.error} />
                </Pressable>
              </View>
            ) : (
              <>
                <Ionicons name="camera-outline" size={24} color={colors.textMuted} />
                <Text style={[styles.imageText, { color: colors.textMuted }]}>
                  Adicionar imagem
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Botão Salvar */}
        <Pressable
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleSave}
        >
          <Ionicons name="checkmark" size={24} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>Salvar Compra</Text>
        </Pressable>
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
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  chipIcon: {
    fontSize: 14,
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  inlineModal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  modalButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: FontSize.sm,
  },
  installmentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  installmentChip: {
    width: 48,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  installmentText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  installmentInput: {
    width: 70,
    height: 40,
    borderRadius: BorderRadius.md,
    textAlign: 'center',
    fontSize: FontSize.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  toggleText: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  imagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  imageText: {
    fontSize: FontSize.md,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
});
