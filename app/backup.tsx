import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../src/contexts/ThemeContext';
import { Spacing, FontSize, BorderRadius } from '../src/constants/theme';
import { getAll, runQuery, getDatabase } from '../src/database';

interface BackupData {
  version: string;
  timestamp: string;
  data: {
    user_settings: any[];
    categories: any[];
    credit_cards: any[];
    balance_transactions: any[];
    credit_purchases: any[];
    purchase_items: any[];
    installments: any[];
    piggies: any[];
    piggy_transactions: any[];
  };
}

export default function BackupScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  const generateBackup = async (): Promise<BackupData> => {
    try {
      const backup: BackupData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        data: {
          user_settings: await getAll('SELECT * FROM user_settings'),
          categories: await getAll('SELECT * FROM categories'),
          credit_cards: await getAll('SELECT * FROM credit_cards'),
          balance_transactions: await getAll('SELECT * FROM balance_transactions'),
          credit_purchases: await getAll('SELECT * FROM credit_purchases'),
          purchase_items: await getAll('SELECT * FROM purchase_items'),
          installments: await getAll('SELECT * FROM installments'),
          piggies: await getAll('SELECT * FROM piggies'),
          piggy_transactions: await getAll('SELECT * FROM piggy_transactions'),
        },
      };

      return backup;
    } catch (error) {
      console.error('Error generating backup:', error);
      throw error;
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Gerar backup
      const backup = await generateBackup();
      const jsonString = JSON.stringify(backup, null, 2);

      // Nome do arquivo com data
      const date = new Date();
      const fileName = `organizadin_backup_${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}.json`;

      // Salvar arquivo
      const docDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
      const fileUri = `${docDir}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, jsonString);

      setLastBackup(new Date().toLocaleString('pt-BR'));

      // Calcular estatísticas
      const totalRecords =
        backup.data.balance_transactions.length +
        backup.data.credit_purchases.length +
        backup.data.installments.length +
        backup.data.piggies.length +
        backup.data.piggy_transactions.length;

      const fileSizeKB = (jsonString.length / 1024).toFixed(2);

      // Compartilhar ou mostrar sucesso
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        Alert.alert(
          'Backup Criado!',
          `✓ ${totalRecords} registros exportados\n✓ Tamanho: ${fileSizeKB} KB\n\nDeseja compartilhar o arquivo?`,
          [
            { text: 'Agora não', style: 'cancel' },
            {
              text: 'Compartilhar',
              onPress: async () => {
                try {
                  await Share.share({
                    url: fileUri,
                    message: `Backup OrganizaDin - ${fileName}`,
                  });
                } catch (error) {
                  console.log('Error sharing:', error);
                }
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Backup Criado!',
          `✓ ${totalRecords} registros exportados\n✓ Tamanho: ${fileSizeKB} KB\n\nArquivo salvo em: ${fileUri}`
        );
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Erro', 'Não foi possível criar o backup: ' + (error as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    Alert.alert(
      'Importar Backup',
      'ATENÇÃO: Esta ação irá substituir TODOS os seus dados atuais pelos dados do backup. Esta operação não pode ser desfeita.\n\nDeseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: async () => {
            await pickAndImportBackup();
          },
        },
      ]
    );
  };

  const pickAndImportBackup = async () => {
    setIsImporting(true);
    try {
      // Selecionar arquivo
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setIsImporting(false);
        return;
      }

      const fileUri = result.assets[0].uri;

      // Ler arquivo
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const backup: BackupData = JSON.parse(fileContent);

      // Validar backup
      if (!backup.version || !backup.timestamp || !backup.data) {
        throw new Error('Arquivo de backup inválido');
      }

      // Importar dados
      await importBackup(backup);

      Alert.alert(
        'Sucesso!',
        'Backup restaurado com sucesso! O app será recarregado.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Recarregar app (navegar para home)
              router.replace('/');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('Erro', 'Não foi possível importar o backup: ' + (error as Error).message);
    } finally {
      setIsImporting(false);
    }
  };

  const importBackup = async (backup: BackupData) => {
    try {
      // Limpar todas as tabelas (exceto user_settings para manter senha do porquinho)
      await runQuery('DELETE FROM piggy_transactions');
      await runQuery('DELETE FROM piggies');
      await runQuery('DELETE FROM installments');
      await runQuery('DELETE FROM purchase_items');
      await runQuery('DELETE FROM credit_purchases');
      await runQuery('DELETE FROM balance_transactions');
      await runQuery('DELETE FROM credit_cards');
      await runQuery('DELETE FROM categories WHERE is_default = 0'); // Manter categorias padrão

      // Importar user_settings
      if (backup.data.user_settings.length > 0) {
        const settings = backup.data.user_settings[0];
        await runQuery(
          'UPDATE user_settings SET theme = ?, monthly_income = ?, updated_at = datetime("now") WHERE id = 1',
          [settings.theme || 'dark', settings.monthly_income || 0]
        );
      }

      // Importar categorias customizadas
      for (const category of backup.data.categories) {
        if (!category.is_default) {
          await runQuery(
            'INSERT INTO categories (name, icon, color, is_default) VALUES (?, ?, ?, ?)',
            [category.name, category.icon, category.color, 0]
          );
        }
      }

      // Importar cartões
      const cardIdMap = new Map<number, number>();
      for (const card of backup.data.credit_cards) {
        const result = await runQuery(
          'INSERT INTO credit_cards (name, color) VALUES (?, ?)',
          [card.name, card.color]
        );
        cardIdMap.set(card.id, result.lastInsertRowId as number);
      }

      // Importar transações de saldo
      for (const transaction of backup.data.balance_transactions) {
        await runQuery(
          `INSERT INTO balance_transactions (amount, description, date, type, method)
           VALUES (?, ?, ?, ?, ?)`,
          [transaction.amount, transaction.description, transaction.date, transaction.type, transaction.method]
        );
      }

      // Importar compras no cartão
      const purchaseIdMap = new Map<number, number>();
      for (const purchase of backup.data.credit_purchases) {
        const newCardId = cardIdMap.get(purchase.card_id);
        if (!newCardId) continue;

        // Buscar ID da categoria pelo nome (pode ter mudado)
        const category = await getAll<{ id: number }>(
          'SELECT id FROM categories WHERE name = ? LIMIT 1',
          [backup.data.categories.find(c => c.id === purchase.category_id)?.name || 'Outros']
        );
        const categoryId = category.length > 0 ? category[0].id : 1;

        const result = await runQuery(
          `INSERT INTO credit_purchases (total_amount, description, date, card_id, category_id, installments, is_recurring, has_multiple_items, image_uri)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            purchase.total_amount,
            purchase.description,
            purchase.date,
            newCardId,
            categoryId,
            purchase.installments,
            purchase.is_recurring,
            purchase.has_multiple_items,
            purchase.image_uri,
          ]
        );
        purchaseIdMap.set(purchase.id, result.lastInsertRowId as number);
      }

      // Importar itens de compra
      for (const item of backup.data.purchase_items) {
        const newPurchaseId = purchaseIdMap.get(item.purchase_id);
        if (!newPurchaseId) continue;

        await runQuery(
          'INSERT INTO purchase_items (purchase_id, name, amount, image_uri) VALUES (?, ?, ?, ?)',
          [newPurchaseId, item.name, item.amount, item.image_uri]
        );
      }

      // Importar parcelas
      for (const installment of backup.data.installments) {
        const newPurchaseId = purchaseIdMap.get(installment.purchase_id);
        if (!newPurchaseId) continue;

        await runQuery(
          `INSERT INTO installments (purchase_id, installment_number, amount, due_date, status, paid_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            newPurchaseId,
            installment.installment_number,
            installment.amount,
            installment.due_date,
            installment.status,
            installment.paid_at,
          ]
        );
      }

      // Importar porquinhos
      const piggyIdMap = new Map<number, number>();
      for (const piggy of backup.data.piggies) {
        const result = await runQuery(
          'INSERT INTO piggies (name, balance) VALUES (?, ?)',
          [piggy.name, piggy.balance]
        );
        piggyIdMap.set(piggy.id, result.lastInsertRowId as number);
      }

      // Importar transações dos porquinhos
      for (const transaction of backup.data.piggy_transactions) {
        const newPiggyId = piggyIdMap.get(transaction.piggy_id);
        if (!newPiggyId) continue;

        const newRelatedPiggyId = transaction.related_piggy_id
          ? piggyIdMap.get(transaction.related_piggy_id)
          : null;

        await runQuery(
          `INSERT INTO piggy_transactions (piggy_id, amount, type, description, date, related_piggy_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            newPiggyId,
            transaction.amount,
            transaction.type,
            transaction.description,
            transaction.date,
            newRelatedPiggyId,
          ]
        );
      }
    } catch (error) {
      console.error('Error importing backup:', error);
      throw error;
    }
  };

  const handleDeleteAllData = () => {
    Alert.alert(
      'ATENÇÃO: Apagar Todos os Dados',
      'Esta ação irá APAGAR PERMANENTEMENTE todos os seus dados financeiros, incluindo:\n\n• Transações de saldo\n• Compras no cartão\n• Parcelas\n• Porquinhos\n• Cartões personalizados\n• Categorias personalizadas\n\nEsta ação NÃO PODE SER DESFEITA!\n\nRecomendamos criar um backup antes.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar Tudo',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmação Final',
              'Tem ABSOLUTA CERTEZA que deseja apagar todos os dados?',
              [
                { text: 'Não, cancelar', style: 'cancel' },
                {
                  text: 'Sim, apagar tudo',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await runQuery('DELETE FROM piggy_transactions');
                      await runQuery('DELETE FROM piggies');
                      await runQuery('DELETE FROM installments');
                      await runQuery('DELETE FROM purchase_items');
                      await runQuery('DELETE FROM credit_purchases');
                      await runQuery('DELETE FROM balance_transactions');
                      await runQuery('DELETE FROM credit_cards');
                      await runQuery('DELETE FROM categories WHERE is_default = 0');
                      await runQuery('UPDATE user_settings SET monthly_income = 0 WHERE id = 1');

                      Alert.alert('Concluído', 'Todos os dados foram apagados.', [
                        {
                          text: 'OK',
                          onPress: () => router.replace('/'),
                        },
                      ]);
                    } catch (error) {
                      Alert.alert('Erro', 'Não foi possível apagar os dados: ' + (error as Error).message);
                    }
                  },
                },
              ]
            );
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
          Backup e Restauração
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.info + '20' }]}>
          <Ionicons name="information-circle" size={24} color={colors.info} />
          <Text style={[styles.infoText, { color: colors.info }]}>
            Mantenha seus dados seguros criando backups regulares. Você pode restaurar seus dados
            a qualquer momento.
          </Text>
        </View>

        {/* Exportar Backup */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cloud-upload" size={28} color={colors.success} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Exportar Backup
            </Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            Crie uma cópia de segurança de todos os seus dados financeiros em formato JSON.
          </Text>
          {lastBackup && (
            <Text style={[styles.lastBackup, { color: colors.textMuted }]}>
              Último backup: {lastBackup}
            </Text>
          )}
          <Pressable
            style={[
              styles.actionButton,
              { backgroundColor: isExporting ? colors.surfaceVariant : colors.success },
            ]}
            onPress={handleExport}
            disabled={isExporting}
          >
            <Ionicons
              name={isExporting ? 'sync' : 'download'}
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.actionButtonText}>
              {isExporting ? 'Criando backup...' : 'Criar Backup'}
            </Text>
          </Pressable>
        </View>

        {/* Importar Backup */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cloud-download" size={28} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Importar Backup
            </Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            Restaure seus dados de um arquivo de backup anterior. Todos os dados atuais serão
            substituídos.
          </Text>
          <View style={[styles.warningBox, { backgroundColor: colors.warning + '20' }]}>
            <Ionicons name="warning" size={20} color={colors.warning} />
            <Text style={[styles.warningText, { color: colors.warning }]}>
              Atenção: Esta operação irá sobrescrever todos os dados atuais
            </Text>
          </View>
          <Pressable
            style={[
              styles.actionButton,
              { backgroundColor: isImporting ? colors.surfaceVariant : colors.primary },
            ]}
            onPress={handleImport}
            disabled={isImporting}
          >
            <Ionicons
              name={isImporting ? 'sync' : 'upload'}
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.actionButtonText}>
              {isImporting ? 'Importando...' : 'Selecionar Arquivo'}
            </Text>
          </Pressable>
        </View>

        {/* Zona de Perigo */}
        <View style={[styles.dangerSection, { backgroundColor: colors.error + '15' }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle" size={28} color={colors.error} />
            <Text style={[styles.sectionTitle, { color: colors.error }]}>
              Zona de Perigo
            </Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            Ações irreversíveis que afetam permanentemente seus dados.
          </Text>
          <Pressable
            style={[styles.dangerButton, { borderColor: colors.error }]}
            onPress={handleDeleteAllData}
          >
            <Ionicons name="trash" size={20} color={colors.error} />
            <Text style={[styles.dangerButtonText, { color: colors.error }]}>
              Apagar Todos os Dados
            </Text>
          </Pressable>
        </View>

        {/* Informações Técnicas */}
        <View style={[styles.techInfo, { backgroundColor: colors.surface }]}>
          <Text style={[styles.techTitle, { color: colors.text }]}>
            Informações Técnicas
          </Text>
          <View style={styles.techItem}>
            <Text style={[styles.techLabel, { color: colors.textSecondary }]}>
              Formato:
            </Text>
            <Text style={[styles.techValue, { color: colors.text }]}>JSON</Text>
          </View>
          <View style={styles.techItem}>
            <Text style={[styles.techLabel, { color: colors.textSecondary }]}>
              Versão:
            </Text>
            <Text style={[styles.techValue, { color: colors.text }]}>1.0.0</Text>
          </View>
          <View style={styles.techItem}>
            <Text style={[styles.techLabel, { color: colors.textSecondary }]}>
              Conteúdo:
            </Text>
            <Text style={[styles.techValue, { color: colors.text }]}>
              Todas as tabelas do banco de dados
            </Text>
          </View>
          <View style={styles.techItem}>
            <Text style={[styles.techLabel, { color: colors.textSecondary }]}>
              Compatibilidade:
            </Text>
            <Text style={[styles.techValue, { color: colors.text }]}>
              OrganizaDin v1.0.0+
            </Text>
          </View>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  infoCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  section: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
  },
  sectionDesc: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  lastBackup: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
    fontStyle: 'italic',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  warningText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  dangerSection: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    gap: Spacing.sm,
  },
  dangerButtonText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  techInfo: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  techTitle: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
  },
  techItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  techLabel: {
    fontSize: FontSize.sm,
  },
  techValue: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
});
