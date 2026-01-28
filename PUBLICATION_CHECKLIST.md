# ✅ Checklist de Publicação - OrganizaDin

Use este checklist para garantir que tudo está pronto antes de publicar nas lojas.

---

## 📋 Antes do Build

### Código e Funcionalidades
- [x] Todas as funcionalidades implementadas
- [x] Módulos de segurança implementados
- [x] Error handling implementado
- [x] Validação de entrada em todos os formulários
- [ ] Testado em ambiente de desenvolvimento
- [ ] Sem console.log sensíveis no código
- [ ] Sem credenciais hardcoded

### Dependências
- [x] package.json atualizado
- [x] @types/react corrigido para v19
- [x] Todas as deps de segurança instaladas
- [ ] `npm install` executado sem erros
- [ ] Nenhuma vulnerabilidade crítica (`npm audit`)

### Configuração
- [x] app.json completo e correto
- [x] Bundle IDs únicos (iOS e Android)
- [x] Versões corretas (version, versionCode, buildNumber)
- [x] Permissões mínimas definidas
- [x] Permissões desnecessárias bloqueadas
- [x] eas.json configurado
- [x] .gitignore atualizado

### Assets (OBRIGATÓRIO)
- [ ] `assets/icon.png` criado (1024x1024)
- [ ] `assets/adaptive-icon.png` criado (1024x1024)
- [ ] `assets/splash.png` criado (1284x2778)
- [ ] Assets testados em diferentes tamanhos de tela

### Documentação Legal
- [x] Política de Privacidade (PRIVACY_POLICY.md)
- [x] Termos de Uso (TERMS_OF_SERVICE.md)
- [ ] Email de suporte definido
- [ ] URL de política de privacidade (se for hospedar online)

---

## 🔨 Build de Teste

### Android Preview
- [ ] `eas build --profile preview --platform android` executado
- [ ] APK baixado e testado
- [ ] Instalação funciona sem problemas
- [ ] App abre corretamente
- [ ] Ícone aparece correto
- [ ] Splash screen aparece
- [ ] Não há crashes ao abrir

### Testes Funcionais
- [ ] Criar transação de saldo (entrada/saída)
- [ ] Adicionar compra no cartão
- [ ] Criar compra parcelada
- [ ] Marcar parcela como paga
- [ ] Criar categoria personalizada
- [ ] Adicionar cartão
- [ ] Criar porquinho
- [ ] Definir senha do porquinho
- [ ] Transferir dinheiro para porquinho
- [ ] Fazer backup
- [ ] Restaurar backup
- [ ] Alternar tema (claro/escuro)
- [ ] Ver relatórios
- [ ] Filtrar histórico

### Testes de Segurança
- [ ] Senha do porquinho funciona
- [ ] Lockout após 5 tentativas incorretas
- [ ] Screenshot bloqueado (se habilitado)
- [ ] App detecta root/jailbreak (se aplicável)
- [ ] Dados persistem após fechar app
- [ ] Dados não são perdidos ao forçar fechamento

### Testes de UI/UX
- [ ] Interface responsiva
- [ ] Animações fluidas
- [ ] Botões todos funcionam
- [ ] Navegação intuitiva
- [ ] Mensagens de erro claras
- [ ] Loading states apropriados
- [ ] Tema escuro funciona
- [ ] Tema claro funciona

### Testes de Performance
- [ ] App abre em < 3 segundos
- [ ] Navegação fluida (60 fps)
- [ ] Scroll suave em listas longas
- [ ] Sem memory leaks
- [ ] Bateria não drena excessivamente

---

## 🏪 Preparação para Lojas

### Google Play (Android)

#### Conta e Configuração
- [ ] Conta Google Play Developer criada ($25)
- [ ] App criado no Google Play Console
- [ ] Nome do app definido
- [ ] Categoria selecionada
- [ ] Classificação etária definida

#### Assets para Google Play
- [ ] Ícone 512x512 PNG
- [ ] Gráfico de feature 1024x500
- [ ] Screenshots phone (mínimo 2, máximo 8)
  - [ ] Tela inicial
  - [ ] Histórico
  - [ ] Adicionar compra
  - [ ] Parcelas
  - [ ] Porquinhos
  - [ ] Configurações
- [ ] Screenshots tablet (opcional)

#### Descrição do App
- [ ] Título (max 50 caracteres)
- [ ] Descrição curta (max 80 caracteres)
- [ ] Descrição completa (max 4000 caracteres)
- [ ] Palavras-chave relevantes

#### Política e Privacidade
- [ ] URL da política de privacidade
- [ ] Declaração de conteúdo preenchida
- [ ] Questionário de segurança de dados preenchido
- [ ] Formulário de classificação de conteúdo

#### Build
- [ ] AAB (Android App Bundle) gerado
- [ ] Assinado com keystore de produção
- [ ] Upload feito no Google Play Console
- [ ] Release notes escritos

### Apple App Store (iOS)

#### Conta e Configuração
- [ ] Conta Apple Developer criada ($99/ano)
- [ ] App ID criado no portal
- [ ] App criado no App Store Connect
- [ ] Bundle ID correto

#### Assets para App Store
- [ ] Ícone 1024x1024
- [ ] Screenshots iPhone 6.7" (mínimo 3)
- [ ] Screenshots iPhone 6.5" (mínimo 3)
- [ ] Screenshots iPad (se suporta)
- [ ] Vídeo preview (opcional)

#### Descrição do App
- [ ] Nome do app
- [ ] Subtítulo
- [ ] Descrição
- [ ] Palavras-chave (max 100 caracteres)
- [ ] URL de suporte
- [ ] URL de marketing (opcional)

#### Política e Privacidade
- [ ] URL da política de privacidade
- [ ] Category selecionada
- [ ] Age rating correto
- [ ] Copyright info

#### Build
- [ ] IPA gerado via EAS
- [ ] Upload via Transporter/Xcode
- [ ] TestFlight (recomendado para testes)
- [ ] Release notes escritos

---

## 🔐 Checklist de Segurança

### Dados
- [x] SecureStore implementado
- [x] Criptografia de senhas (SHA-256)
- [x] Validação de entrada
- [x] Proteção SQL Injection
- [x] Backup seguro com validação

### Dispositivo
- [x] Detecção de root/jailbreak
- [x] Verificação de integridade
- [x] Screenshot protection (opcional)

### Código
- [x] Anti-debugging em produção
- [x] Console.log desabilitado em produção
- [x] Ofuscação de dados sensíveis
- [x] Error monitoring seguro

### Rede
- [x] HTTPS obrigatório em produção
- [x] Validação de URLs
- [x] Timeout de requisições
- [x] Rate limiting

### Compliance
- [x] LGPD compliance
- [x] GDPR compliance
- [x] Política de privacidade completa
- [x] Termos de uso definidos

---

## 📱 Após Submissão

### Monitoramento
- [ ] Configurar analytics (opcional)
- [ ] Configurar crash reporting (Sentry/Bugsnag)
- [ ] Configurar alertas de erro
- [ ] Monitorar reviews da loja

### Marketing
- [ ] Website/landing page (opcional)
- [ ] Redes sociais (opcional)
- [ ] Press kit (opcional)
- [ ] Email de lançamento

### Suporte
- [ ] Email de suporte configurado
- [ ] FAQ preparado
- [ ] Canais de suporte definidos
- [ ] Sistema de tickets (se aplicável)

---

## 🐛 Plano de Contingência

### Se o build falhar:
1. Ver logs: `eas build:view [BUILD_ID]`
2. Verificar assets existem
3. Verificar dependências instaladas
4. Limpar cache: `eas build --clear-cache`
5. Ver BUILD_GUIDE.md - Troubleshooting

### Se aprovação for rejeitada:
1. Ler motivo da rejeição cuidadosamente
2. Corrigir problema específico
3. Incrementar versão (versionCode/buildNumber)
4. Rebuild e resubmit
5. Responder ao reviewer se necessário

### Se houver bugs após lançamento:
1. Coletar logs de erro
2. Reproduzir bug localmente
3. Corrigir código
4. Testar extensivamente
5. Incrementar versão
6. Build e submit update

---

## 📊 Métricas de Sucesso

### Primeira Semana
- [ ] 0 crashes críticos
- [ ] Reviews 4+ estrelas
- [ ] Tempo de carregamento < 3s
- [ ] Taxa de retenção > 40%

### Primeiro Mês
- [ ] Bugs críticos resolvidos
- [ ] Feedback de usuários respondido
- [ ] Atualizações menores lançadas
- [ ] Comunidade engajada

---

## 🎯 Status Final

**Antes de submeter, verifique:**

- [ ] ✅ Todos os itens "OBRIGATÓRIO" completos
- [ ] ✅ Build de teste funcionando perfeitamente
- [ ] ✅ Assets profissionais criados
- [ ] ✅ Descrições e textos revisados
- [ ] ✅ Política de privacidade online (se necessário)
- [ ] ✅ Contas das lojas configuradas
- [ ] ✅ Backup do código em local seguro
- [ ] ✅ Keystore/certificados backup salvos

---

## 🚀 Comando Final

### Android
```bash
eas build --profile production --platform android
eas submit --platform android
```

### iOS
```bash
eas build --profile production --platform ios
eas submit --platform ios
```

---

**Boa sorte com a publicação! 🎉**

*Última atualização: 28 de Janeiro de 2026*

---

## 📞 Suporte

Problemas? Consulte:
- [BUILD_GUIDE.md](BUILD_GUIDE.md) - Guia completo
- [SECURITY_SUMMARY.md](SECURITY_SUMMARY.md) - Segurança
- [Expo Docs](https://docs.expo.dev) - Documentação oficial
