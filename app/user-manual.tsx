import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import { Spacing, FontSize, BorderRadius } from '../src/constants/theme';

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.section, { backgroundColor: colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

export default function UserManualScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Como usar o OrganizaDin
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.introCard, { backgroundColor: colors.info + '20' }]}>
          <Ionicons name="book" size={24} color={colors.info} />
          <Text style={[styles.introText, { color: colors.info }]}>
            Este guia rápido foi feito para quem está abrindo o app pela primeira vez e quer
            entender, na prática, como organizar o dinheiro usando o OrganizaDin.
          </Text>
        </View>

        <Section title="1. Conceito principal do app">
          <Text style={[styles.paragraph, { color: colors.text }]}>
            O OrganizaDin separa o seu dinheiro em duas partes para ficar fácil de entender:
          </Text>
          <Text style={[styles.bullet, { color: colors.text }]}>
            • <Text style={styles.bold}>Saldo Disponível (dinheiro real):</Text> é o que você tem
            hoje na conta, Pix, carteira, etc.
          </Text>
          <Text style={[styles.bullet, { color: colors.text }]}>
            • <Text style={styles.bold}>Cartão de Crédito (dívida futura):</Text> são compras que
            você fez no crédito e que vão virar fatura depois.
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary, marginTop: Spacing.sm }]}>
            Regra de ouro: tudo que você guarda nos porquinhos sai do Saldo Disponível para você
            não gastar por engano.
          </Text>
        </Section>

        <Section title="2. O que configurar primeiro">
          <Text style={[styles.paragraph, { color: colors.text }]}>
            Recomendamos fazer estes três passos assim que instalar o app:
          </Text>
          <Text style={[styles.bullet, { color: colors.text }]}>
            1. <Text style={styles.bold}>Definir sua renda mensal fixa</Text> em Configurações {'>'}{' '}
            Renda Mensal Fixa.
          </Text>
          <Text style={[styles.bullet, { color: colors.text }]}>
            2. <Text style={styles.bold}>Cadastrar seus cartões</Text> em Configurações {'>'}{' '}
            Cartões.
          </Text>
          <Text style={[styles.bullet, { color: colors.text }]}>
            3. <Text style={styles.bold}>Ajustar o saldo inicial</Text> na tela Início, adicionando
            quanto você tem disponível hoje.
          </Text>
        </Section>

        <Section title="3. Registrando gastos do dia a dia">
          <Text style={[styles.paragraph, { color: colors.text }]}>
            Para registrar compras feitas no débito, Pix ou dinheiro:
          </Text>
          <Text style={[styles.bullet, { color: colors.text }]}>
            1. Toque no botão de <Text style={styles.bold}>Movimentação de Saldo</Text> na tela
            inicial.
          </Text>
          <Text style={[styles.bullet, { color: colors.text }]}>2. Escolha Saída.</Text>
          <Text style={[styles.bullet, { color: colors.text }]}>
            3. Informe valor, descrição e meio de pagamento.
          </Text>
          <Text style={[styles.bullet, { color: colors.text }]}>
            4. Salve e veja o Saldo Disponível ser atualizado na hora.
          </Text>
        </Section>

        <Section title="4. Compras no cartão de crédito">
          <Text style={[styles.paragraph, { color: colors.text }]}>
            Para registrar uma compra parcelada ou à vista no cartão:
          </Text>
          <Text style={[styles.bullet, { color: colors.text }]}>
            1. Toque no <Text style={styles.bold}>botão central (+)</Text>.
          </Text>
          <Text style={[styles.bullet, { color: colors.text }]}>
            2. Informe o valor total e o número de parcelas (1x se for à vista).
          </Text>
          <Text style={[styles.bullet, { color: colors.text }]}>
            3. Escolha o cartão e a categoria da compra.
          </Text>
          <Text style={[styles.bullet, { color: colors.text }]}>
            4. Opcional: tire uma foto da nota fiscal ou produto.
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary, marginTop: Spacing.sm }]}>
            O saldo não muda na hora: a compra entra nas faturas dos meses corretos e no Total a
            Pagar.
          </Text>
        </Section>

        <Section title="5. Porquinhos (dinheiro guardado)">
          <Text style={[styles.paragraph, { color: colors.text }]}>
            Use os porquinhos para separar dinheiro de objetivos específicos (viagem, reserva de
            emergência, etc.):
          </Text>
          <Text style={[styles.bullet, { color: colors.text }]}>
            1. Acesse a tela <Text style={styles.bold}>Porquinhos</Text> pelo menu.
          </Text>
          <Text style={[styles.bullet, { color: colors.text }]}>
            2. Crie sua senha de 4 dígitos.
          </Text>
          <Text style={[styles.bullet, { color: colors.text }]}>
            3. Crie um porquinho (ex.: Viagem, Reserva).
          </Text>
          <Text style={[styles.bullet, { color: colors.text }]}>
            4. Use a opção <Text style={styles.bold}>Guardar Dinheiro</Text> para mandar parte do
            saldo para o porquinho.
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary, marginTop: Spacing.sm }]}>
            O valor some do Saldo Disponível e passa a ficar protegido dentro do porquinho até você
            resgatar.
          </Text>
        </Section>

        <Section title="6. Dúvidas rápidas">
          <Text style={[styles.qTitle, { color: colors.text }]}>
            • Errei uma compra parcelada, e agora?
          </Text>
          <Text style={[styles.qAnswer, { color: colors.textSecondary }]}>
            Abra o Histórico, toque na compra, edite os valores ou o número de parcelas e salve. O
            app recalcula tudo automaticamente.
          </Text>

          <Text style={[styles.qTitle, { color: colors.text, marginTop: Spacing.sm }]}>
            • O dinheiro do porquinho some do app?
          </Text>
          <Text style={[styles.qAnswer, { color: colors.textSecondary }]}>
            Não. Ele só deixa de aparecer no Saldo Disponível. Para usar, você precisa resgatar
            dentro da tela de Porquinhos.
          </Text>

          <Text style={[styles.qTitle, { color: colors.text, marginTop: Spacing.sm }]}>
            • Meus dados são enviados para a internet?
          </Text>
          <Text style={[styles.qAnswer, { color: colors.textSecondary }]}>
            Não. O OrganizaDin é 100% offline, os dados ficam apenas no seu celular.
          </Text>
        </Section>

        <Section title="7. Dicas finais">
          <Text style={[styles.bullet, { color: colors.text }]}>
            • Tire fotos das notas de compras importantes (eletrônicos, garantias).
          </Text>
          <Text style={[styles.bullet, { color: colors.text }]}>
            • Faça backups regulares em Configurações {'>'} Backup e Restauração.
          </Text>
          <Text style={[styles.bullet, { color: colors.text }]}>
            • Antes de parcelar grandes valores, olhe o Resumão dos Próximos Meses para ver o
            impacto no futuro.
          </Text>
        </Section>
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
    fontSize: FontSize.lg,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  introCard: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  introText: {
    flex: 1,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  section: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  sectionContent: {
    gap: Spacing.xs,
  },
  paragraph: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  bullet: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
  },
  qTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  qAnswer: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
});

