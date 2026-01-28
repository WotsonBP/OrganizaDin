import { Tabs } from 'expo-router';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { BorderRadius, Spacing } from '../../src/constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

export default function TabLayout() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const renderTabBarIcon = (name: IconName, focused: boolean) => (
    <Ionicons
      name={name}
      size={24}
      color={focused ? colors.primary : colors.textMuted}
    />
  );

  // Cor de fundo com transparência para efeito glass
  const tabBarBackground = isDark 
    ? 'rgba(30, 30, 30, 0.85)' 
    : 'rgba(255, 255, 255, 0.85)';

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 16,
          right: 16,
          height: 70,
          backgroundColor: tabBarBackground,
          borderTopWidth: 0,
          borderRadius: 35,
          paddingBottom: 0,
          paddingTop: 0,
          paddingHorizontal: 8,
          // Sombra
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 10,
          // Borda sutil
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        },
        tabBarItemStyle: {
          paddingVertical: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          headerTitle: 'OrganizaDin',
          tabBarIcon: ({ focused }) => renderTabBarIcon('home', focused),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Histórico',
          tabBarIcon: ({ focused }) => renderTabBarIcon('document-text', focused),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarButton: () => (
            <View style={styles.addButtonContainer}>
              <Pressable
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/add-purchase')}
              >
                <Ionicons name="add" size={32} color="#FFFFFF" />
              </Pressable>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="installments"
        options={{
          title: 'Parcelas',
          tabBarIcon: ({ focused }) => renderTabBarIcon('calendar', focused),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Config',
          headerTitle: 'Configurações',
          tabBarIcon: ({ focused }) => renderTabBarIcon('settings', focused),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  addButtonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -15,
    elevation: 8,
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});
