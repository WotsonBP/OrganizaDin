/**
 * Contexto de segurança do app
 * Gerencia estado de segurança e proteções ativas
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import {
  checkDeviceSecurity,
  canRunSecurely,
  markSecurityChecked,
} from '../security/deviceSecurity';
import { useScreenshotProtection } from '../security/screenshotProtection';

interface SecurityContextType {
  isSecure: boolean;
  isChecking: boolean;
  warnings: string[];
  enableScreenshotProtection: boolean;
  setEnableScreenshotProtection: (enabled: boolean) => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

interface SecurityProviderProps {
  children: ReactNode;
}

export function SecurityProvider({ children }: SecurityProviderProps) {
  const [isSecure, setIsSecure] = useState(true);
  const [isChecking, setIsChecking] = useState(true);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [enableScreenshotProtection, setEnableScreenshotProtection] = useState(false);

  useEffect(() => {
    checkSecurity();
  }, []);

  const checkSecurity = async () => {
    setIsChecking(true);
    try {
      const security = await checkDeviceSecurity();
      const canRun = await canRunSecurely();

      setIsSecure(canRun);
      setWarnings(security.warnings);

      if (!canRun && !__DEV__) {
        Alert.alert(
          'Dispositivo Não Seguro',
          'Este app detectou que seu dispositivo pode estar comprometido (root/jailbreak). Por segurança, o app não pode ser executado neste dispositivo.\n\nSe você acredita que isso é um erro, entre em contato com o suporte.',
          [
            {
              text: 'Sair',
              onPress: () => {
                // Em produção, poderia forçar fechamento do app
                // Para desenvolvimento, apenas mostra o alerta
              },
            },
          ],
          { cancelable: false }
        );
      }

      if (security.warnings.length > 0 && __DEV__) {
        console.warn('Avisos de segurança:', security.warnings);
      }

      await markSecurityChecked();
    } catch (error) {
      console.error('Erro ao verificar segurança:', error);
      // Em caso de erro, permitir execução mas marcar como inseguro
      setIsSecure(false);
      setWarnings(['Erro ao verificar segurança do dispositivo']);
    } finally {
      setIsChecking(false);
    }
  };

  // Proteção de screenshot em telas sensíveis
  useScreenshotProtection(enableScreenshotProtection);

  return (
    <SecurityContext.Provider
      value={{
        isSecure,
        isChecking,
        warnings,
        enableScreenshotProtection,
        setEnableScreenshotProtection,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity(): SecurityContextType {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}
