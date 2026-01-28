import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../src/contexts/ThemeContext';
import { Spacing, FontSize, BorderRadius } from '../src/constants/theme';
import { getAll, runQuery } from '../src/database';

interface CreditCard {
  id: number;
  name: string;
  color: string;
}

const COLOR_OPTIONS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
  '#98D8C8', '#6C5CE7', '#A29BFE', '#FD79A8',
  '#FDCB6E', '#E17055', '#74B9FF', '#A29BFE',
  '#55EFC4', '#81ECEC', '#FAB1A0', '#FF7675',
];

export default function ManageCardsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);

  const loadCards = async () => {
    try {
      const data = await getAll<CreditCard>(
        'SELECT id, name, color FROM credit_cards ORDER BY name'
      );
      setCards(data);
    } catch (error) {
      console.log('Error loading cards:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCards();
    }, [])
  );

  const openAddModal = () => {
    setEditingCard(null);
    setName('');
    setSelectedColor(COLOR_OPTIONS[0]);
    setShowModal(true);
  };

  const openEditModal = (card: CreditCard) => {
    setEditingCard(card);
    setName(card.name);
    setSelectedColor(card.color);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Digite o nome do cartão');
      return;
    }

    try {
      if (editingCard) {
        await runQuery(
          'UPDATE credit_cards SET name = ?, color = ? WHERE id = ?',
          [name.trim(), selectedColor, editingCard.id]
        );
        Alert.alert('Sucesso', 'Cartão atualizado!');
      } else {
        await runQuery(
          'INSERT INTO credit_cards (name, color) VALUES (?, ?)',
          [name.trim(), selectedColor]
        );
        Alert.alert('Sucesso', 'Cartão criado!');
      }
      setShowModal(false);
      loadCards();
    } catch (error) {
      console.log('Error saving card:', error);
      Alert.alert('Erro', 'Não foi possível salvar o cartão');
    }
  };

  const handleDelete = (card: CreditCard) => {
    Alert.alert(
      'Excluir Cartão',
      `Tem certeza que deseja excluir "${card.name}"? Todas as compras associadas a este cartão também serão excluídas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await runQuery(
                'DELETE FROM credit_cards WHERE id = ?',
                [card.id]
              );
              Alert.alert('Sucesso', 'Cartão excluído!');
              loadCards();
            } catch (error) {
              console.log('Error deleting card:', error);
              Alert.alert('Erro', 'Não foi possível excluir o cartão');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Cartões
        </Text>
        <Pressable onPress={openAddModal} style={styles.addButton}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {cards.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <Ionicons name="card-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Nenhum cartão cadastrado
            </Text>
            <Pressable
              style={[styles.emptyButton, { backgroundColor: colors.primary }]}
              onPress={openAddModal}
            >
              <Text style={styles.emptyButtonText}>Adicionar Cartão</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.cardsList}>
            {cards.map(card => (
              <View
                key={card.id}
                style={[styles.cardItem, { backgroundColor: colors.surface }]}
              >
                <View style={styles.cardInfo}>
                  <View
                    style={[
                      styles.cardColorIndicator,
                      { backgroundColor: card.color },
                    ]}
                  />
                  <Text style={[styles.cardName, { color: colors.text }]}>
                    {card.name}
                  </Text>
                </View>
                <View style={styles.cardActions}>
                  <Pressable
                    style={styles.actionButton}
                    onPress={() => openEditModal(card)}
                  >
                    <Ionicons name="pencil" size={20} color={colors.primary} />
                  </Pressable>
                  <Pressable
                    style={styles.actionButton}
                    onPress={() => handleDelete(card)}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal de Adicionar/Editar */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingCard ? 'Editar Cartão' : 'Novo Cartão'}
              </Text>
              <Pressable onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              {/* Nome */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Nome do Cartão
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Ex: Nubank, Inter, C6"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
              </View>

              {/* Cor */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Cor
                </Text>
                <View style={styles.colorGrid}>
                  {COLOR_OPTIONS.map(color => (
                    <Pressable
                      key={color}
                      style={[
                        styles.colorButton,
                        { backgroundColor: color },
                        selectedColor === color && styles.colorButtonSelected,
                      ]}
                      onPress={() => setSelectedColor(color)}
                    >
                      {selectedColor === color && (
                        <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Preview */}
              <View style={[styles.preview, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.previewLabel, { color: colors.textMuted }]}>
                  Prévia:
                </Text>
                <View style={styles.previewCard}>
                  <View
                    style={[
                      styles.previewColorIndicator,
                      { backgroundColor: selectedColor },
                    ]}
                  />
                  <Text style={[styles.previewName, { color: colors.text }]}>
                    {name || 'Nome do cartão'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setShowModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                  Cancelar
                </Text>
              </Pressable>
              <Pressable
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>
                  {editingCard ? 'Salvar' : 'Criar'}
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
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md,
    textAlign: 'center',
  },
  emptyButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cardsList: {
    gap: Spacing.sm,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  cardColorIndicator: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
  },
  cardName: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    padding: Spacing.sm,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: Spacing.lg,
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
  input: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSize.md,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  colorButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorButtonSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  previewLabel: {
    fontSize: FontSize.sm,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  previewColorIndicator: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
  },
  previewName: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  cancelButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
