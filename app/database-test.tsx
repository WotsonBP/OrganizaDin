import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import { Spacing, FontSize, BorderRadius } from '../src/constants/theme';
import { getAll, runQuery, getFirst } from '../src/database';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  details?: string;
}

export default function DatabaseTestScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [dbStats, setDbStats] = useState<any>(null);

  const runTests = async () => {
    setIsRunning(true);
    const results: TestResult[] = [];

    try {
      // Teste 1: Verificar se as tabelas existem
      results.push(await testTablesExist());

      // Teste 2: Verificar categorias padrão
      results.push(await testDefaultCategories());

      // Teste 3: Teste de inserção e leitura
      results.push(await testInsertAndRead());

      // Teste 4: Teste de atualização
      results.push(await testUpdate());

      // Teste 5: Teste de relacionamentos (Foreign Keys)
      results.push(await testRelationships());

      // Teste 6: Verificar índices
      results.push(await testIndexes());

      // Teste 7: Teste de transações
      results.push(await testTransactions());

      // Carregar estatísticas do banco
      await loadDatabaseStats();

      setTestResults(results);
    } catch (error) {
      console.error('Error running tests:', error);
      Alert.alert('Erro', 'Erro ao executar testes: ' + (error as Error).message);
    } finally {
      setIsRunning(false);
    }
  };

  const testTablesExist = async (): Promise<TestResult> => {
    try {
      const tables = await getAll<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      );

      const expectedTables = [
        'balance_transactions',
        'categories',
        'credit_cards',
        'credit_purchases',
        'installments',
        'piggies',
        'piggy_transactions',
        'purchase_items',
        'user_settings',
      ];

      const foundTables = tables.map(t => t.name);
      const missingTables = expectedTables.filter(t => !foundTables.includes(t));

      if (missingTables.length === 0) {
        return {
          name: 'Estrutura de Tabelas',
          status: 'success',
          message: `✓ Todas as ${expectedTables.length} tabelas foram criadas`,
          details: foundTables.join(', '),
        };
      } else {
        return {
          name: 'Estrutura de Tabelas',
          status: 'error',
          message: `✗ Tabelas faltando: ${missingTables.length}`,
          details: missingTables.join(', '),
        };
      }
    } catch (error) {
      return {
        name: 'Estrutura de Tabelas',
        status: 'error',
        message: '✗ Erro ao verificar tabelas',
        details: (error as Error).message,
      };
    }
  };

  const testDefaultCategories = async (): Promise<TestResult> => {
    try {
      const categories = await getAll<{ id: number; name: string }>(
        'SELECT id, name FROM categories WHERE is_default = 1'
      );

      if (categories.length >= 8) {
        return {
          name: 'Categorias Padrão',
          status: 'success',
          message: `✓ ${categories.length} categorias padrão carregadas`,
          details: categories.map(c => c.name).join(', '),
        };
      } else {
        return {
          name: 'Categorias Padrão',
          status: 'error',
          message: `✗ Apenas ${categories.length} categorias encontradas`,
          details: 'Esperado: 8 categorias',
        };
      }
    } catch (error) {
      return {
        name: 'Categorias Padrão',
        status: 'error',
        message: '✗ Erro ao verificar categorias',
        details: (error as Error).message,
      };
    }
  };

  const testInsertAndRead = async (): Promise<TestResult> => {
    try {
      const testDesc = `Test_${Date.now()}`;
      
      // Inserir uma transação de teste
      const result = await runQuery(
        `INSERT INTO balance_transactions (amount, description, date, type, method)
         VALUES (100.00, ?, date('now'), 'income', 'pix')`,
        [testDesc]
      );

      // Ler a transação inserida
      const transaction = await getFirst<{ id: number; description: string; amount: number }>(
        'SELECT id, description, amount FROM balance_transactions WHERE description = ?',
        [testDesc]
      );

      // Limpar teste
      if (transaction) {
        await runQuery('DELETE FROM balance_transactions WHERE id = ?', [transaction.id]);

        return {
          name: 'Inserção e Leitura',
          status: 'success',
          message: '✓ Dados inseridos e lidos com sucesso',
          details: `ID: ${transaction.id}, Valor: R$ ${transaction.amount}`,
        };
      } else {
        return {
          name: 'Inserção e Leitura',
          status: 'error',
          message: '✗ Falha ao ler dados inseridos',
          details: 'Transação não encontrada após inserção',
        };
      }
    } catch (error) {
      return {
        name: 'Inserção e Leitura',
        status: 'error',
        message: '✗ Erro no teste de I/O',
        details: (error as Error).message,
      };
    }
  };

  const testUpdate = async (): Promise<TestResult> => {
    try {
      // Inserir um porquinho de teste
      const result = await runQuery(
        'INSERT INTO piggies (name, balance) VALUES (?, ?)',
        ['Test_Piggy', 0]
      );

      const piggyId = result.lastInsertRowId;

      // Atualizar o saldo
      await runQuery(
        'UPDATE piggies SET balance = ? WHERE id = ?',
        [500, piggyId]
      );

      // Verificar atualização
      const piggy = await getFirst<{ balance: number }>(
        'SELECT balance FROM piggies WHERE id = ?',
        [piggyId]
      );

      // Limpar teste
      await runQuery('DELETE FROM piggies WHERE id = ?', [piggyId]);

      if (piggy && piggy.balance === 500) {
        return {
          name: 'Atualização de Dados',
          status: 'success',
          message: '✓ UPDATE executado corretamente',
          details: 'Valor atualizado de 0 para 500',
        };
      } else {
        return {
          name: 'Atualização de Dados',
          status: 'error',
          message: '✗ Falha na atualização',
          details: `Saldo esperado: 500, recebido: ${piggy?.balance}`,
        };
      }
    } catch (error) {
      return {
        name: 'Atualização de Dados',
        status: 'error',
        message: '✗ Erro no UPDATE',
        details: (error as Error).message,
      };
    }
  };

  const testRelationships = async (): Promise<TestResult> => {
    try {
      // Criar um cartão de teste
      const cardResult = await runQuery(
        'INSERT INTO credit_cards (name, color) VALUES (?, ?)',
        ['Test_Card', '#FF0000']
      );
      const cardId = cardResult.lastInsertRowId;

      // Criar uma categoria de teste
      const catResult = await runQuery(
        'INSERT INTO categories (name, icon) VALUES (?, ?)',
        ['Test_Cat', '🧪']
      );
      const catId = catResult.lastInsertRowId;

      // Criar uma compra associada
      const purchaseResult = await runQuery(
        `INSERT INTO credit_purchases (total_amount, description, date, card_id, category_id, installments)
         VALUES (?, ?, date('now'), ?, ?, ?)`,
        [300, 'Test_Purchase', cardId, catId, 1]
      );
      const purchaseId = purchaseResult.lastInsertRowId;

      // Verificar JOIN
      const purchase = await getFirst<{ card_name: string; category_name: string }>(
        `SELECT cc.name as card_name, c.name as category_name
         FROM credit_purchases cp
         JOIN credit_cards cc ON cp.card_id = cc.id
         JOIN categories c ON cp.category_id = c.id
         WHERE cp.id = ?`,
        [purchaseId]
      );

      // Limpar teste (CASCADE deve deletar a compra)
      await runQuery('DELETE FROM credit_cards WHERE id = ?', [cardId]);
      await runQuery('DELETE FROM categories WHERE id = ?', [catId]);

      if (purchase && purchase.card_name === 'Test_Card' && purchase.category_name === 'Test_Cat') {
        return {
          name: 'Relacionamentos (FK)',
          status: 'success',
          message: '✓ Foreign Keys funcionando',
          details: 'JOINs e CASCADE operando corretamente',
        };
      } else {
        return {
          name: 'Relacionamentos (FK)',
          status: 'error',
          message: '✗ Problema nos relacionamentos',
          details: 'Falha no JOIN entre tabelas',
        };
      }
    } catch (error) {
      return {
        name: 'Relacionamentos (FK)',
        status: 'error',
        message: '✗ Erro nos relacionamentos',
        details: (error as Error).message,
      };
    }
  };

  const testIndexes = async (): Promise<TestResult> => {
    try {
      const indexes = await getAll<{ name: string; tbl_name: string }>(
        "SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'"
      );

      const expectedIndexes = [
        'idx_balance_transactions_date',
        'idx_balance_transactions_type',
        'idx_credit_purchases_date',
        'idx_credit_purchases_card',
        'idx_credit_purchases_category',
        'idx_installments_due_date',
        'idx_installments_status',
        'idx_piggy_transactions_piggy',
        'idx_piggy_transactions_date',
      ];

      const foundIndexes = indexes.map(i => i.name);
      const missingIndexes = expectedIndexes.filter(i => !foundIndexes.includes(i));

      if (missingIndexes.length === 0) {
        return {
          name: 'Índices do Banco',
          status: 'success',
          message: `✓ Todos os ${expectedIndexes.length} índices criados`,
          details: 'Otimização de queries ativa',
        };
      } else {
        return {
          name: 'Índices do Banco',
          status: 'error',
          message: `✗ Índices faltando: ${missingIndexes.length}`,
          details: missingIndexes.join(', '),
        };
      }
    } catch (error) {
      return {
        name: 'Índices do Banco',
        status: 'error',
        message: '✗ Erro ao verificar índices',
        details: (error as Error).message,
      };
    }
  };

  const testTransactions = async (): Promise<TestResult> => {
    try {
      // Teste de múltiplas inserções sequenciais
      const startTime = Date.now();
      
      for (let i = 0; i < 10; i++) {
        await runQuery(
          `INSERT INTO balance_transactions (amount, description, date, type, method)
           VALUES (?, ?, date('now'), 'income', 'pix')`,
          [10 * (i + 1), `Batch_Test_${i}`]
        );
      }

      // Verificar se todas foram inseridas
      const count = await getFirst<{ total: number }>(
        "SELECT COUNT(*) as total FROM balance_transactions WHERE description LIKE 'Batch_Test_%'"
      );

      // Limpar testes
      await runQuery("DELETE FROM balance_transactions WHERE description LIKE 'Batch_Test_%'");

      const endTime = Date.now();
      const duration = endTime - startTime;

      if (count && count.total === 10) {
        return {
          name: 'Performance de Escrita',
          status: 'success',
          message: `✓ 10 transações em ${duration}ms`,
          details: `Média: ${(duration / 10).toFixed(1)}ms por operação`,
        };
      } else {
        return {
          name: 'Performance de Escrita',
          status: 'error',
          message: `✗ Esperado 10, obtido ${count?.total || 0}`,
          details: 'Falha na persistência em lote',
        };
      }
    } catch (error) {
      return {
        name: 'Performance de Escrita',
        status: 'error',
        message: '✗ Erro no teste de performance',
        details: (error as Error).message,
      };
    }
  };

  const loadDatabaseStats = async () => {
    try {
      const stats = {
        balance_transactions: await getFirst<{ count: number }>(
          'SELECT COUNT(*) as count FROM balance_transactions'
        ),
        credit_purchases: await getFirst<{ count: number }>(
          'SELECT COUNT(*) as count FROM credit_purchases'
        ),
        installments: await getFirst<{ count: number }>(
          'SELECT COUNT(*) as count FROM installments'
        ),
        categories: await getFirst<{ count: number }>(
          'SELECT COUNT(*) as count FROM categories'
        ),
        credit_cards: await getFirst<{ count: number }>(
          'SELECT COUNT(*) as count FROM credit_cards'
        ),
        piggies: await getFirst<{ count: number }>(
          'SELECT COUNT(*) as count FROM piggies'
        ),
        piggy_transactions: await getFirst<{ count: number }>(
          'SELECT COUNT(*) as count FROM piggy_transactions'
        ),
      };

      setDbStats(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      default:
        return 'time';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.error;
      default:
        return colors.textMuted;
    }
  };

  const successCount = testResults.filter(r => r.status === 'success').length;
  const errorCount = testResults.filter(r => r.status === 'error').length;
  const totalTests = testResults.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Diagnóstico do Banco
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Botão de Teste */}
        <Pressable
          style={[
            styles.runButton,
            { backgroundColor: isRunning ? colors.surfaceVariant : colors.primary },
          ]}
          onPress={runTests}
          disabled={isRunning}
        >
          <Ionicons
            name={isRunning ? 'sync' : 'play-circle'}
            size={24}
            color="#FFFFFF"
          />
          <Text style={styles.runButtonText}>
            {isRunning ? 'Executando Testes...' : 'Executar Diagnóstico'}
          </Text>
        </Pressable>

        {/* Resumo dos Resultados */}
        {testResults.length > 0 && (
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>
              Resumo
            </Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.success }]}>
                  {successCount}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  Sucesso
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.error }]}>
                  {errorCount}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  Erros
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {totalTests}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  Total
                </Text>
              </View>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.surfaceVariant }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: errorCount > 0 ? colors.error : colors.success,
                    width: `${(successCount / totalTests) * 100}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Resultados dos Testes */}
        {testResults.map((result, index) => (
          <View
            key={index}
            style={[styles.resultCard, { backgroundColor: colors.surface }]}
          >
            <View style={styles.resultHeader}>
              <Ionicons
                name={getStatusIcon(result.status)}
                size={28}
                color={getStatusColor(result.status)}
              />
              <Text style={[styles.resultName, { color: colors.text }]}>
                {result.name}
              </Text>
            </View>
            <Text style={[styles.resultMessage, { color: colors.textSecondary }]}>
              {result.message}
            </Text>
            {result.details && (
              <View style={[styles.detailsBox, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.detailsText, { color: colors.textMuted }]}>
                  {result.details}
                </Text>
              </View>
            )}
          </View>
        ))}

        {/* Estatísticas do Banco */}
        {dbStats && (
          <View style={[styles.statsCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statsTitle, { color: colors.text }]}>
              Estatísticas do Banco
            </Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Transações Saldo
                </Text>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {dbStats.balance_transactions?.count || 0}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Compras Cartão
                </Text>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {dbStats.credit_purchases?.count || 0}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Parcelas
                </Text>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {dbStats.installments?.count || 0}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Categorias
                </Text>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {dbStats.categories?.count || 0}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Cartões
                </Text>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {dbStats.credit_cards?.count || 0}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Porquinhos
                </Text>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {dbStats.piggies?.count || 0}
                </Text>
              </View>
            </View>
          </View>
        )}

        {testResults.length === 0 && !isRunning && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <Ionicons name="flask-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Clique no botão acima para executar o diagnóstico completo do banco de dados
            </Text>
          </View>
        )}
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
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  runButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.lg,
    fontWeight: 'bold',
  },
  summaryCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  summaryTitle: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: FontSize.xxxl,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  progressBar: {
    height: 8,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.sm,
  },
  resultCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  resultName: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    flex: 1,
  },
  resultMessage: {
    fontSize: FontSize.md,
    marginBottom: Spacing.sm,
  },
  detailsBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
  },
  detailsText: {
    fontSize: FontSize.sm,
    fontFamily: 'monospace',
  },
  statsCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  statsTitle: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    marginBottom: Spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statItem: {
    width: '47%',
    padding: Spacing.md,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  statValue: {
    fontSize: FontSize.xxl,
    fontWeight: 'bold',
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
    lineHeight: 22,
  },
});
