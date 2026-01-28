import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DatabaseProvider, useDatabase } from '../src/contexts/DatabaseContext';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { SecurityProvider } from '../src/contexts/SecurityContext';
import { setupDebugProtection } from '../src/security/debugProtection';
import { setupGlobalErrorHandlers } from '../src/security/errorMonitoring';

function RootLayoutNav() {
  const { isReady, error } = useDatabase();
  const { colors, theme } = useTheme();

  // Configurar proteções de segurança ao iniciar
  useEffect(() => {
    setupDebugProtection();
    setupGlobalErrorHandlers();
  }, []);

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          Erro ao carregar o app: {error}
        </Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Carregando...
        </Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="add-purchase"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Nova Compra',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
          }}
        />
        <Stack.Screen
          name="piggy"
          options={{
            headerShown: true,
            headerTitle: 'Meus Porquinhos',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
          }}
        />
        <Stack.Screen
          name="add-balance"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SecurityProvider>
        <DatabaseProvider>
          <ThemeProvider>
            <RootLayoutNav />
          </ThemeProvider>
        </DatabaseProvider>
      </SecurityProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
