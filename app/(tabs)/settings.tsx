import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Spacing, FontSize, BorderRadius } from '../../src/constants/theme';
import { getFirst, runQuery } from '../../src/database';

export default function SettingsScreen() {
  const { colors, theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [isEditingIncome, setIsEditingIncome] = useState(false);

  const loadSettings = async () => {
    try {
      const settings = await getFirst<{ monthly_income: number }>(
        'SELECT monthly_income FROM user_settings WHERE id = 1'
      );
      if (settings) {
        setMonthlyIncome(settings.monthly_income.toString());
      }
    } catch (error) {
      console.log('Error loading settings:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const saveMonthlyIncome = async () => {
    try {
      const value = parseFloat(monthlyIncome.replace(',', '.')) || 0;
      await runQuery(
        'UPDATE user_settings SET monthly_income = ?, updated_at = datetime("now") WHERE id = 1',
        [value]
      );
      setIsEditingIncome(false);
      Alert.alert('Sucesso', 'Renda mensal atualizada!');
    } catch (error) {
      console.log('Error saving income:', error);
      Alert.alert('Erro', 'Não foi possível salvar a renda mensal.');
    }
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    rightElement,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
  }) => (
    <Pressable
      style={[styles.settingItem, { backgroundColor: colors.surface }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
        <Ionicons name={icon as any} size={22} color={colors.primary} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement || (
        onPress && <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      )}
    </Pressable>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Aparência */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        APARÊNCIA
      </Text>
      <View style={styles.section}>
        <SettingItem
          icon="moon"
          title="Tema Escuro"
          subtitle={theme === 'dark' ? 'Ativado' : 'Desativado'}
          rightElement={
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          }
        />
      </View>

      {/* Finanças */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        FINANÇAS
      </Text>
      <View style={styles.section}>
        <View style={[styles.settingItem, { backgroundColor: colors.surface }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="cash" size={22} color={colors.primary} />
          </View>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>
              Renda Mensal Fixa
            </Text>
            {isEditingIncome ? (
              <View style={styles.incomeEdit}>
                <TextInput
                  style={[styles.incomeInput, { color: colors.text, borderColor: colors.border }]}
                  value={monthlyIncome}
                  onChangeText={setMonthlyIncome}
                  keyboardType="numeric"
                  placeholder="0,00"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
                <Pressable
                  style={[styles.saveButton, { backgroundColor: colors.primary }]}
                  onPress={saveMonthlyIncome}
                >
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                </Pressable>
              </View>
            ) : (
              <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                R$ {parseFloat(monthlyIncome || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Text>
            )}
          </View>
          {!isEditingIncome && (
            <Pressable onPress={() => setIsEditingIncome(true)}>
              <Ionicons name="pencil" size={20} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        <SettingItem
          icon="lock-closed"
          title="Porquinhos"
          subtitle="Área de dinheiro guardado"
          onPress={() => router.push('/piggy')}
        />
      </View>

      {/* Gestão */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        GESTÃO
      </Text>
      <View style={styles.section}>
        <SettingItem
          icon="pricetags"
          title="Categorias"
          subtitle="Gerenciar categorias de gastos"
          onPress={() => router.push('/manage-categories')}
        />
        <SettingItem
          icon="card"
          title="Cartões"
          subtitle="Gerenciar cartões de crédito"
          onPress={() => router.push('/manage-cards')}
        />
      </View>

      {/* Relatórios */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        RELATÓRIOS
      </Text>
      <View style={styles.section}>
        <SettingItem
          icon="bar-chart"
          title="Análises"
          subtitle="Gastos por categoria, evolução, etc."
          onPress={() => router.push('/reports')}
        />
        <SettingItem
          icon="calendar"
          title="Resumão dos Próximos Meses"
          subtitle="Previsão financeira futura"
          onPress={() => router.push('/future-summary')}
        />
      </View>

      {/* Dados */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        DADOS
      </Text>
      <View style={styles.section}>
        <SettingItem
          icon="save"
          title="Backup e Restauração"
          subtitle="Exportar e importar dados"
          onPress={() => router.push('/backup')}
        />
      </View>

      {/* Sobre */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        SOBRE
      </Text>
      <View style={styles.section}>
        <SettingItem
          icon="book"
          title="Como usar o app"
          subtitle="Guia rápido para novos usuários"
          onPress={() => router.push('/user-manual')}
        />
        <SettingItem
          icon="information-circle"
          title="OrganizaDin"
          subtitle="Versão 1.0.0"
        />
        <SettingItem
          icon="flask"
          title="Diagnóstico do Banco"
          subtitle="Testar persistência de dados"
          onPress={() => router.push('/database-test')}
        />
      </View>
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
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.sm,
    letterSpacing: 1,
  },
  section: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  incomeEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  incomeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: FontSize.md,
  },
  saveButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
