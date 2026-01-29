export const Colors = {
  dark: {
    background: '#121212',
    surface: '#1E1E1E',
    surfaceVariant: '#2D2D2D',
    primary: '#00E676',           // Verde neon aceso (LED)
    primaryDark: '#00C853',       // Verde escuro vibrante
    primaryLight: '#69F0AE',      // Verde claro brilhante
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    textMuted: '#757575',
    border: '#333333',
    error: '#FF1744',             // Vermelho neon
    warning: '#FF9100',           // Laranja neon
    success: '#00E676',           // Verde neon
    info: '#40C4FF',              // Azul neon
    // Cores específicas do app
    income: '#00E676',            // Entrada de dinheiro (verde neon)
    expense: '#FF1744',           // Saída de dinheiro (vermelho neon)
    credit: '#00E676',            // Crédito 1x (verde neon)
    debit: '#40C4FF',             // Débito/Pix (azul neon)
    recurring: '#AB47BC',         // Recorrente (roxo)
    installmentHigh: '#FF1744',   // 3+ parcelas (vermelho neon)
    installmentMedium: '#FF9100', // 2 parcelas (laranja neon)
    installmentLow: '#00E676',    // 1 parcela (verde neon)
    balanceLow: '#FF1744',        // Saldo < 150 (vermelho neon)
    balanceOk: '#00E676',         // Saldo >= 150 (verde neon)
  },
  light: {
    background: '#F5F5F5',
    surface: '#FFFFFF',
    surfaceVariant: '#EEEEEE',
    primary: '#4CAF50',
    primaryDark: '#1B5E20',
    primaryLight: '#81C784',
    text: '#212121',
    textSecondary: '#616161',
    textMuted: '#9E9E9E',
    border: '#E0E0E0',
    error: '#D32F2F',
    warning: '#F57C00',
    success: '#388E3C',
    info: '#1976D2',
    // Cores específicas do app
    income: '#388E3C',
    expense: '#D32F2F',
    credit: '#388E3C',
    debit: '#1976D2',
    recurring: '#7B1FA2',
    installmentHigh: '#D32F2F',
    installmentMedium: '#F57C00',
    installmentLow: '#388E3C',
    balanceLow: '#D32F2F',
    balanceOk: '#388E3C',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export type ThemeType = 'dark' | 'light';
export type ColorScheme = typeof Colors.dark;
