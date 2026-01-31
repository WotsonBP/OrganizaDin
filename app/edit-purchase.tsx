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
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../src/contexts/ThemeContext';
import { Spacing, FontSize, BorderRadius } from '../src/constants/theme';
import { getAll, getFirst, runQuery } from '../src/database';

interface Category {
  id: number;
  name: string;
  icon: string;
}

interface CreditCard {
  id: number;
  name: string;
}

interface PurchaseItem {
  id: string;
  name: string;
  amount: string;
  imageUri: string | null;
  isNew?: boolean;
}

interface ExistingPurchase {
  id: number;
  total_amount: number;
  description: string;
  date: string;
  card_id: number;
  category_id: number;
  installments: number;
  is_recurring: number;
  image_uri: string | null;
  notes?: string | null;
}

interface ExistingItem {
  id: number;
  name: string;
  amount: number;
  image_uri: string | null;
}

export default function EditPurchaseScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const purchaseId = parseInt(id || '0', 10);

  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [installmentsCount, setInstallmentsCount] = useState('1');
  const [isRecurring, setIsRecurring] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Multi-item state
  const [isMultiItem, setIsMultiItem] = useState(false);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [viewingImageUri, setViewingImageUri] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [purchaseId]);

  const loadData = async () => {
    try {
      // Carregar categorias e cartões
      const categoriesData = await getAll<Category>(
        'SELECT id, name, icon FROM categories ORDER BY name'
      );
      const byName = new Map<string, Category>();
      for (const cat of categoriesData) {
        if (!byName.has(cat.name)) byName.set(cat.name, cat);
      }
      setCategories(Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name)));

      const cardsData = await getAll<CreditCard>(
        'SELECT id, name FROM credit_cards ORDER BY name'
      );
      setCards(cardsData);

      // Carregar dados da compra
      const purchase = await getFirst<ExistingPurchase>(
        'SELECT * FROM credit_purchases WHERE id = ?',
        [purchaseId]
      );

      if (purchase) {
        setAmount(purchase.total_amount.toString().replace('.', ','));
        setDescription(purchase.description);
        setNotes(purchase.notes ?? '');
        setDate(purchase.date);
        setSelectedCard(purchase.card_id);
        setSelectedCategory(purchase.category_id);
        setInstallmentsCount(purchase.installments.toString());
        setIsRecurring(purchase.is_recurring === 1);
        setImageUri(purchase.image_uri);

        // Carregar itens da compra
        const existingItems = await getAll<ExistingItem>(
          'SELECT * FROM purchase_items WHERE purchase_id = ?',
          [purchaseId]
        );

        if (existingItems.length > 0) {
          setIsMultiItem(true);
          setItems(
            existingItems.map(item => ({
              id: item.id.toString(),
              name: item.name,
              amount: item.amount.toString().replace('.', ','),
              imageUri: item.image_uri,
              isNew: false,
            }))
          );
        }
      }
    } catch (error) {
      console.log('Error loading data:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados da compra');
    } finally {
      setLoading(false);
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

  const handlePickItemImage = async (itemId: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setItems(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, imageUri: result.assets[0].uri } : item
        )
      );
    }
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) {
      Alert.alert('Erro', 'Digite o nome do item');
      return;
    }

    const itemAmount = parseFloat(newItemAmount.replace(',', '.'));
    if (!itemAmount || itemAmount <= 0) {
      Alert.alert('Erro', 'Digite um valor válido para o item');
      return;
    }

    const newItem: PurchaseItem = {
      id: `new_${Date.now()}`,
      name: newItemName.trim(),
      amount: newItemAmount,
      imageUri: null,
      isNew: true,
    };

    setItems(prev => [...prev, newItem]);
    setNewItemName('');
    setNewItemAmount('');
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  const calculateItemsTotal = () => {
    return items.reduce((total, item) => {
      const itemAmount = parseFloat(item.amount.replace(',', '.')) || 0;
      return total + itemAmount;
    }, 0);
  };

  const handleDelete = () => {
    Alert.alert(
      'Excluir Compra',
      'Tem certeza que deseja excluir esta compra? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              // Excluir itens
              await runQuery(
                'DELETE FROM purchase_items WHERE purchase_id = ?',
                [purchaseId]
              );
              // Excluir parcelas
              await runQuery(
                'DELETE FROM installments WHERE purchase_id = ?',
                [purchaseId]
              );
              // Excluir compra
              await runQuery(
                'DELETE FROM credit_purchases WHERE id = ?',
                [purchaseId]
              );

              Alert.alert('Sucesso', 'Compra excluída!', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error) {
              console.log('Error deleting purchase:', error);
              Alert.alert('Erro', 'Não foi possível excluir a compra');
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    // Calculate total amount based on mode
    let amountValue: number;

    if (isMultiItem) {
      if (items.length === 0) {
        Alert.alert('Erro', 'Adicione pelo menos um item');
        return;
      }
      amountValue = calculateItemsTotal();
    } else {
      amountValue = parseFloat(amount.replace(',', '.'));
      if (!amountValue || amountValue <= 0) {
        Alert.alert('Erro', 'Digite um valor válido');
        return;
      }
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

    try {
      // Atualizar compra
      await runQuery(
        `UPDATE credit_purchases
         SET total_amount = ?, description = ?, date = ?, card_id = ?,
             category_id = ?, is_recurring = ?, image_uri = ?, notes = ?
         WHERE id = ?`,
        [
          amountValue,
          description.trim(),
          date,
          selectedCard,
          selectedCategory,
          isRecurring ? 1 : 0,
          isMultiItem ? null : imageUri,
          notes.trim() || null,
          purchaseId,
        ]
      );

      // Atualizar parcelas pendentes com novo valor
      const installmentsValue = parseInt(installmentsCount, 10) || 1;
      const installmentAmount = amountValue / installmentsValue;

      await runQuery(
        `UPDATE installments
         SET amount = ?
         WHERE purchase_id = ? AND status = 'pending'`,
        [installmentAmount, purchaseId]
      );

      // Gerenciar itens
      if (isMultiItem) {
        // Remover itens antigos que não estão mais na lista
        const existingIds = items
          .filter(i => !i.isNew)
          .map(i => i.id);

        if (existingIds.length > 0) {
          await runQuery(
            `DELETE FROM purchase_items
             WHERE purchase_id = ? AND id NOT IN (${existingIds.join(',')})`,
            [purchaseId]
          );
        } else {
          await runQuery(
            'DELETE FROM purchase_items WHERE purchase_id = ?',
            [purchaseId]
          );
        }

        // Atualizar itens existentes e inserir novos
        for (const item of items) {
          const itemAmount = parseFloat(item.amount.replace(',', '.'));
          if (item.isNew) {
            await runQuery(
              `INSERT INTO purchase_items (purchase_id, name, amount, image_uri)
               VALUES (?, ?, ?, ?)`,
              [purchaseId, item.name, itemAmount, item.imageUri]
            );
          } else {
            await runQuery(
              `UPDATE purchase_items
               SET name = ?, amount = ?, image_uri = ?
               WHERE id = ?`,
              [item.name, itemAmount, item.imageUri, parseInt(item.id, 10)]
            );
          }
        }
      } else {
        // Remover todos os itens se não é multi-item
        await runQuery(
          'DELETE FROM purchase_items WHERE purchase_id = ?',
          [purchaseId]
        );
      }

      Alert.alert('Sucesso', 'Compra atualizada!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.log('Error saving purchase:', error);
      Alert.alert('Erro', 'Não foi possível salvar as alterações');
    }
  };

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
        {/* Toggle Multi-Item */}
        <Pressable
          style={[styles.toggleRow, { backgroundColor: colors.surface }]}
          onPress={() => {
            setIsMultiItem(!isMultiItem);
            if (!isMultiItem) {
              setAmount('');
              setImageUri(null);
            } else {
              setItems([]);
            }
          }}
        >
          <View style={styles.toggleInfo}>
            <Ionicons
              name="list"
              size={20}
              color={isMultiItem ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.toggleText, { color: colors.text }]}>
              Compra com vários itens
            </Text>
          </View>
          <View
            style={[
              styles.toggleSwitch,
              { backgroundColor: isMultiItem ? colors.primary : colors.border },
            ]}
          >
            <View
              style={[
                styles.toggleThumb,
                { transform: [{ translateX: isMultiItem ? 20 : 0 }] },
              ]}
            />
          </View>
        </Pressable>

        {/* Valor - Modo simples */}
        {!isMultiItem && (
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
        )}

        {/* Multi-Item Mode */}
        {isMultiItem && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Itens da Compra</Text>

            {/* Add Item Form */}
            <View style={[styles.addItemForm, { backgroundColor: colors.surface }]}>
              <View style={styles.addItemRow}>
                <TextInput
                  style={[styles.itemNameInput, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
                  value={newItemName}
                  onChangeText={setNewItemName}
                  placeholder="Nome do item"
                  placeholderTextColor={colors.textMuted}
                />
                <View style={[styles.itemAmountWrapper, { backgroundColor: colors.surfaceVariant }]}>
                  <Text style={[styles.itemCurrency, { color: colors.primary }]}>R$</Text>
                  <TextInput
                    style={[styles.itemAmountInput, { color: colors.text }]}
                    value={newItemAmount}
                    onChangeText={setNewItemAmount}
                    keyboardType="numeric"
                    placeholder="0,00"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>
              <Pressable
                style={[styles.addItemButton, { backgroundColor: colors.primary }]}
                onPress={handleAddItem}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.addItemButtonText}>Adicionar Item</Text>
              </Pressable>
            </View>

            {/* Items List */}
            {items.length > 0 && (
              <View style={styles.itemsList}>
                {items.map((item) => {
                  const itemAmount = parseFloat(item.amount.replace(',', '.')) || 0;
                  return (
                    <View
                      key={item.id}
                      style={[styles.itemCard, { backgroundColor: colors.surface }]}
                    >
                      <View style={styles.itemInfo}>
                        <Text style={[styles.itemName, { color: colors.text }]}>
                          {item.name}
                        </Text>
                        <Text style={[styles.itemAmount, { color: colors.primary }]}>
                          R$ {itemAmount.toFixed(2).replace('.', ',')}
                        </Text>
                      </View>
                      <View style={styles.itemActions}>
                        <Pressable
                          style={styles.itemImageButton}
                          onPress={() => handlePickItemImage(item.id)}
                        >
                          <Ionicons
                            name={item.imageUri ? 'image' : 'camera-outline'}
                            size={20}
                            color={item.imageUri ? colors.success : colors.textMuted}
                          />
                        </Pressable>
                        <Pressable
                          style={styles.itemRemoveButton}
                          onPress={() => handleRemoveItem(item.id)}
                        >
                          <Ionicons name="trash-outline" size={20} color={colors.error} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Total */}
            <View style={[styles.totalCard, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
                Total ({items.length} {items.length === 1 ? 'item' : 'itens'})
              </Text>
              <Text style={[styles.totalAmount, { color: colors.primary }]}>
                R$ {calculateItemsTotal().toFixed(2).replace('.', ',')}
              </Text>
            </View>
          </View>
        )}

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
          </View>
        </View>

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

        {/* Parcelas (somente leitura) */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Parcelas</Text>
          <View style={[styles.readOnlyField, { backgroundColor: colors.surface }]}>
            <Text style={[styles.readOnlyText, { color: colors.textMuted }]}>
              {installmentsCount}x (não editável após criação)
            </Text>
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

        {/* Imagem - only for single item mode */}
        {!isMultiItem && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Foto/Comprovante (opcional)
            </Text>
            {imageUri ? (
              <View style={[styles.imageContainer, { backgroundColor: colors.surface }]}>
                <Pressable onPress={() => setViewingImageUri(imageUri)}>
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.imageThumb}
                    resizeMode="cover"
                  />
                </Pressable>
                <View style={styles.imageActions}>
                  <Pressable
                    style={[styles.imageActionBtn, { backgroundColor: colors.primary + '20' }]}
                    onPress={() => setViewingImageUri(imageUri)}
                  >
                    <Ionicons name="eye" size={18} color={colors.primary} />
                    <Text style={[styles.imageActionText, { color: colors.primary }]}>Ver</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.imageActionBtn, { backgroundColor: colors.info + '20' }]}
                    onPress={handlePickImage}
                  >
                    <Ionicons name="swap-horizontal" size={18} color={colors.info} />
                    <Text style={[styles.imageActionText, { color: colors.info }]}>Trocar</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.imageActionBtn, { backgroundColor: colors.error + '20' }]}
                    onPress={() => setImageUri(null)}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                    <Text style={[styles.imageActionText, { color: colors.error }]}>Remover</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                style={[styles.imageButton, { backgroundColor: colors.surface }]}
                onPress={handlePickImage}
              >
                <Ionicons name="camera-outline" size={24} color={colors.textMuted} />
                <Text style={[styles.imageText, { color: colors.textMuted }]}>
                  Adicionar imagem
                </Text>
              </Pressable>
            )}
          </View>
        )}

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
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleSave}
          >
            <Ionicons name="checkmark" size={24} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Salvar</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Modal Visualizar Imagem */}
      <Modal visible={!!viewingImageUri} transparent animationType="fade">
        <View style={styles.imageViewerOverlay}>
          <Pressable
            style={styles.imageViewerClose}
            onPress={() => setViewingImageUri(null)}
          >
            <Ionicons name="close" size={32} color="#FFFFFF" />
          </Pressable>
          {viewingImageUri && (
            <Image
              source={{ uri: viewingImageUri }}
              style={styles.imageViewerImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
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
  readOnlyField: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  readOnlyText: {
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
  imageText: {
    fontSize: FontSize.md,
  },
  imageContainer: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  imageThumb: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  imageActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  imageActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  imageActionText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: Spacing.sm,
  },
  imageViewerImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.7,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
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
  // Multi-item styles
  addItemForm: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  addItemRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  itemNameInput: {
    flex: 2,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontSize: FontSize.md,
  },
  itemAmountWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
  },
  itemCurrency: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginRight: 4,
  },
  itemAmountInput: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: Spacing.sm,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  addItemButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  itemsList: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: FontSize.md,
    fontWeight: '500',
    marginBottom: 2,
  },
  itemAmount: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  itemActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  itemImageButton: {
    padding: Spacing.xs,
  },
  itemRemoveButton: {
    padding: Spacing.xs,
  },
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  totalLabel: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
  },
});
