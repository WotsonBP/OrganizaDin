# Guia de Build e Publicação - OrganizaDin

Este guia descreve o processo completo para fazer build e publicar o app nas lojas.

## Pré-requisitos

### 1. Conta Expo

```bash
# Instalar EAS CLI globalmente
npm install -g eas-cli

# Fazer login
eas login
```

### 2. Configuração do Projeto

```bash
# Instalar dependências
npm install

# Verificar configuração
eas build:configure
```

### 3. Assets Necessários

- [ ] `./assets/icon.png` (1024x1024)
- [ ] `./assets/adaptive-icon.png` (1024x1024)
- [ ] `./assets/splash.png` (1284x2778)

Veja `ASSETS_GUIDE.md` para detalhes.

## Perfis de Build

### Development

Para desenvolvimento e testes internos com Expo Go:

```bash
eas build --profile development --platform android
eas build --profile development --platform ios
```

### Preview

Para testes antes da produção (APK standalone):

```bash
# Android APK (instalável diretamente)
eas build --profile preview --platform android

# iOS para TestFlight interno
eas build --profile preview --platform ios
```

### Production

Para submissão às lojas:

```bash
# Android (AAB para Google Play)
eas build --profile production --platform android

# iOS (para App Store)
eas build --profile production --platform ios

# Ambos
eas build --profile production --platform all
```

### Build local (sem usar cota do EAS)

Quando o plano gratuito do EAS atingir o limite de builds, use build local na sua máquina:

**Pré-requisito:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e em execução (recomendado).

```bash
# Gera o AAB na sua máquina (não consome cota EAS)
npm run build:android:aab:local
```

Ao terminar, o AAB estará na pasta do projeto (ex.: `./build-<timestamp>` ou o caminho exibido no final do comando). Use esse arquivo `.aab` no [Google Play Console](https://play.google.com/console) para publicar.

## Build Android (APK para Testes)

### Passo 1: Build Preview

```bash
eas build --profile preview --platform android
```

Este comando:

- Gera um APK instalável
- Não requer Google Play Console
- Pode ser instalado diretamente no dispositivo

### Passo 2: Baixar APK

```bash
# O EAS fornecerá uma URL
# Você pode baixar via browser ou CLI
eas build:download --platform android
```

### Passo 3: Instalar no Dispositivo

**Opção 1: Via cabo USB**

```bash
adb install caminho/para/app.apk
```

**Opção 2: Via link**

- Abra a URL do EAS no navegador do celular
- Baixe e instale (habilite "Fontes Desconhecidas" se necessário)

**Opção 3: Via Google Drive/Dropbox**

- Faça upload do APK
- Baixe no celular e instale

## Build iOS (TestFlight)

### Passo 1: Configurar Apple Developer Account

1. Ter conta Apple Developer ($99/ano)
2. Configurar App ID no portal
3. Configurar certificados

### Passo 2: Build

```bash
eas build --profile production --platform ios
```

### Passo 3: Submit para TestFlight

```bash
eas submit --platform ios
```

## Build para Produção (Lojas)

### Android - Google Play Store

#### 1. Preparação

- [ ] Conta Google Play Developer ($25 one-time)
- [ ] App criado no Google Play Console
- [ ] Screenshots preparados
- [ ] Descrição do app escrita
- [ ] Política de privacidade publicada

#### 2. Build

```bash
eas build --profile production --platform android
```

Isso gera um **AAB (Android App Bundle)** otimizado.

#### 3. Service Account (Opcional)

Para submissão automática:

```bash
# Baixar service account key do Google Play Console
# Salvar como android-service-account.json
# Adicionar ao .gitignore

eas submit --platform android
```

#### 4. Submissão Manual

1. Acesse Google Play Console
2. Vá em "Produção" > "Criar nova versão"
3. Faça upload do AAB
4. Preencha as informações de lançamento
5. Envie para revisão

#### 5. Testes Internos (Recomendado)

Antes da produção, teste com:

- Track "Internal Testing" (até 100 testadores)
- Track "Closed Testing" (testadores específicos)
- Track "Open Testing" (beta público)

### iOS - App Store

#### 1. Preparação

- [ ] Apple Developer Account ($99/ano)
- [ ] App criado no App Store Connect
- [ ] Screenshots preparados
- [ ] Descrição do app escrita
- [ ] Política de privacidade URL

#### 2. Build

```bash
eas build --profile production --platform ios
```

#### 3. Submit

```bash
eas submit --platform ios
```

Ou manualmente via Transporter ou Xcode.

#### 4. App Store Connect

1. Acesse App Store Connect
2. Configure as informações do app
3. Adicione screenshots
4. Configure pricing and availability
5. Submita para revisão

## Segurança e Otimizações

### 1. Proguard (Android)

O Expo aplica automaticamente ofuscação de código em builds de produção.

### 2. Bitcode (iOS)

Habilitado automaticamente para otimização da Apple.

### 3. Source Maps

```bash
# Enviar source maps para debugging
eas build --profile production --platform android --non-interactive
```

### 4. Verificação de Segurança

Antes do build de produção:

- [ ] Remover console.logs sensíveis
- [ ] Verificar credenciais não estão hardcoded
- [ ] Testar em dispositivos reais
- [ ] Verificar permissões necessárias
- [ ] Testar backup/restore

## Versionamento

### Atualizar Versão

Edite `app.json`:

```json
{
  "expo": {
    "version": "1.0.1", // Versão semântica
    "android": {
      "versionCode": 2 // Incrementar sempre
    },
    "ios": {
      "buildNumber": "2" // Incrementar sempre
    }
  }
}
```

### Regras de Versionamento

- **version**: Semântico (1.0.0, 1.0.1, 1.1.0, 2.0.0)
- **versionCode** (Android): Inteiro crescente (1, 2, 3, ...)
- **buildNumber** (iOS): String crescente ("1", "2", "3", ...)

## Over-the-Air Updates (OTA)

### Configurar

```bash
eas update:configure
```

### Publicar Update

```bash
# Atualizar sem rebuild
eas update --branch production --message "Fix crítico"
```

### Quando usar OTA:

✅ Correções de bugs JavaScript
✅ Mudanças de UI/UX
✅ Atualizações de conteúdo

### Quando NÃO usar OTA:

❌ Mudanças em dependências nativas
❌ Alteração de permissões
❌ Mudança de versão do Expo SDK

## Troubleshooting

### Erro: Assets não encontrados

```bash
# Verificar que assets existem
ls -la assets/

# Limpar cache e rebuild
eas build --clear-cache --profile production --platform android
```

### Erro: Dependências

```bash
# Limpar e reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Erro: Certificados iOS

```bash
# Limpar credenciais
eas credentials --platform ios
# Seguir prompts para regenerar
```

### Erro: Assinatura Android

```bash
# Verificar keystore
eas credentials --platform android
```

## Checklist Pré-Build

### Código

- [ ] Código testado e funcionando
- [ ] Nenhum console.log sensível
- [ ] Todos os arquivos commitados
- [ ] Versão atualizada em app.json

### Assets

- [ ] Ícones criados e testados
- [ ] Splash screen criado
- [ ] Screenshots preparados

### Configuração

- [ ] app.json configurado corretamente
- [ ] Permissões corretas definidas
- [ ] Política de privacidade pronta

### Segurança

- [ ] Proteções de segurança implementadas
- [ ] Dados sensíveis não hardcoded
- [ ] Testes de segurança realizados

### Stores

- [ ] Contas criadas (Google Play / App Store)
- [ ] Apps registrados
- [ ] Descrições escritas
- [ ] Categorias definidas

## Comandos Úteis

### Verificar status de builds

```bash
eas build:list
```

### Cancelar build

```bash
eas build:cancel [BUILD_ID]
```

### Ver logs de build

```bash
eas build:view [BUILD_ID]
```

### Baixar builds

```bash
eas build:download --platform android
eas build:download --platform ios
```

### Verificar configuração

```bash
eas build:inspect --platform android --profile production
```

## Custos

### Expo

- **Grátis:** 30 builds/mês
- **Production ($29/mês):** Builds ilimitados
- **Enterprise:** Builds privados

### Apple

- **Developer Account:** $99/ano (obrigatório)

### Google

- **Play Console:** $25 one-time (obrigatório)

## Timelines de Aprovação

### Google Play Store

- **Primeira submissão:** 1-7 dias
- **Updates:** Algumas horas a 1 dia
- **Rejeição:** Pode levar várias rodadas

### Apple App Store

- **Primeira submissão:** 1-7 dias
- **Updates:** 24-48 horas
- **Rejeição:** Mais rigoroso que Google

## Suporte

### Documentação

- [Expo EAS Build](https://docs.expo.dev/build/introduction/)
- [Expo Submit](https://docs.expo.dev/submit/introduction/)
- [Google Play Console](https://support.google.com/googleplay/android-developer)
- [App Store Connect](https://developer.apple.com/app-store-connect/)

### Comunidade

- [Expo Discord](https://chat.expo.dev/)
- [Expo Forums](https://forums.expo.dev/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/expo)

---

## Quick Start

Para build de teste rápido:

```bash
# 1. Instalar dependências
npm install

# 2. Login no Expo
eas login

# 3. Build APK para testes
eas build --profile preview --platform android

# 4. Baixar e instalar no celular
# URL será fornecida no terminal
```

---

**Boa sorte com sua publicação! 🚀**
