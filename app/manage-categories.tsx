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

interface Category {
  id: number;
  name: string;
  icon: string;
}

const EMOJI_OPTIONS = [
  '🛒', '🍔', '🚗', '🏠', '💊', '🎬', '📚', '👕',
  '✈️', '🎮', '💳', '📱', '🎁', '💰', '🏋️', '🐾',
  '💇', '🔧', '⚡', '💧', '📺', '🎵', '☕', '🍺',
];

export default function ManageCategoriesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🛒');

  const loadCategories = async () => {
    try {
      const data = await getAll<Category>(
        'SELECT id, name, icon FROM categories ORDER BY name'
      );
      setCategories(data);
    } catch (error) {
      console.log('Error loading categories:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [])
  );

  const openAddModal = () => {
    setEditingCategory(null);
    setName('');
    setIcon('🛒');
    setShowModal(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setIcon(category.icon);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Digite o nome da categoria');
      return;
    }

    try {
      if (editingCategory) {
        await runQuery(
          'UPDATE categories SET name = ?, icon = ? WHERE id = ?',
          [name.trim(), icon, editingCategory.id]
        );
        Alert.alert('Sucesso', 'Categoria atualizada!');
      } else {
        await runQuery(
          'INSERT INTO categories (name, icon) VALUES (?, ?)',
          [name.trim(), icon]
        );
        Alert.alert('Sucesso', 'Categoria criada!');
      }
      setShowModal(false);
      loadCategories();
    } catch (error) {
      console.log('Error saving category:', error);
      Alert.alert('Erro', 'Não foi possível salvar a categoria');
    }
  };

  const handleDelete = (category: Category) => {
    Alert.alert(
      'Excluir Categoria',
      `Tem certeza que deseja excluir "${category.name}"? As compras associadas não serão excluídas, mas ficarão sem categoria.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await runQuery(
                'DELETE FROM categories WHERE id = ?',
                [category.id]
              );
              Alert.alert('Sucesso', 'Categoria excluída!');
              loadCategories();
            } catch (error) {
              console.log('Error deleting category:', error);
              Alert.alert('Erro', 'Não foi possível excluir a categoria');
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
          Categorias
        </Text>
        <Pressable onPress={openAddModal} style={styles.addButton}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {categories.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <Ionicons name="pricetags-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Nenhuma categoria cadastrada
            </Text>
            <Pressable
              style={[styles.emptyButton, { backgroundColor: colors.primary }]}
              onPress={openAddModal}
            >
              <Text style={styles.emptyButtonText}>Adicionar Categoria</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.categoriesList}>
            {categories.map(category => (
              <View
                key={category.id}
                style={[styles.categoryItem, { backgroundColor: colors.surface }]}
              >
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <Text style={[styles.categoryName, { color: colors.text }]}>
                    {category.name}
                  </Text>
                </View>
                <View style={styles.categoryActions}>
                  <Pressable
                    style={styles.actionButton}
                    onPress={() => openEditModal(category)}
                  >
                    <Ionicons name="pencil" size={20} color={colors.primary} />
                  </Pressable>
                  <Pressable
                    style={styles.actionButton}
                    onPress={() => handleDelete(category)}
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
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </Text>
              <Pressable onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              {/* Nome */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Nome
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Ex: Alimentação"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
              </View>

              {/* Ícone */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Ícone
                </Text>
                <View style={styles.emojiGrid}>
                  {EMOJI_OPTIONS.map(emoji => (
                    <Pressable
                      key={emoji}
                      style={[
                        styles.emojiButton,
                        {
                          backgroundColor: icon === emoji ? colors.primary : colors.surfaceVariant,
                        },
                      ]}
                      onPress={() => setIcon(emoji)}
                    >
                      <Text style={styles.emojiText}>{emoji}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Preview */}
              <View style={[styles.preview, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.previewLabel, { color: colors.textMuted }]}>
                  Prévia:
                </Text>
                <View style={styles.previewCategory}>
                  <Text style={styles.previewIcon}>{icon}</Text>
                  <Text style={[styles.previewName, { color: colors.text }]}>
                    {name || 'Nome da categoria'}
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
                  {editingCategory ? 'Salvar' : 'Criar'}
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
  categoriesList: {
    gap: Spacing.sm,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryName: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  categoryActions: {
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
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  emojiButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 20,
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
  previewCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  previewIcon: {
    fontSize: 20,
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
