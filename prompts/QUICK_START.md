# 🚀 Quick Start - OrganizaDin

## ⚡ Começar AGORA (3 passos)

### 1️⃣ Instalar Dependências (2 minutos)

```bash
cd "/Users/macintosh/Desktop/Teste do app OrganizaDin(Vivi)/OrganizaDin"
npm install
```

### 2️⃣ Criar Assets Mínimos (5 minutos)

**Opção A: Placeholders Temporários**

Crie 3 arquivos PNG simples na pasta `assets/`:
- `icon.png` (1024x1024) - Fundo verde com "OD"
- `adaptive-icon.png` (1024x1024) - Igual ao icon.png
- `splash.png` (1284x2778) - Fundo verde com "OrganizaDin"

Você pode usar qualquer editor de imagens ou:
- Canva (gratuito): https://canva.com
- Figma (gratuito): https://figma.com

**Opção B: Usar Gerador Online**
- https://www.appicon.co/

Veja detalhes completos em [ASSETS_GUIDE.md](ASSETS_GUIDE.md)

### 3️⃣ Build de Teste

```bash
# Login no Expo (criar conta gratuita se não tiver)
eas login

# Build APK para testar no Android
eas build --profile preview --platform android
```

**Tempo do build:** 10-15 minutos  
**Resultado:** Link para baixar APK

---

## 📱 Testar no Celular (Alternativa Rápida)

Se quiser testar IMEDIATAMENTE sem build:

```bash
# Iniciar servidor
npm start

# Escanear QR code com:
# - Android: Expo Go app
# - iOS: Câmera nativa
```

**Nota:** Isso requer o app Expo Go instalado.

---

## ✅ Verificar Instalação

```bash
# Verificar se dependências foram instaladas
ls node_modules | wc -l
# Deve mostrar um número grande (várias centenas)

# Verificar configuração
cat package.json
```

---

## 🔍 Próximos Passos Após o Build

### 1. Testar Funcionalidades
- [ ] Criar transações de saldo
- [ ] Adicionar compra no cartão
- [ ] Criar porquinho
- [ ] Testar backup/restore
- [ ] Verificar segurança (tentar screenshot)

### 2. Corrigir Problemas (se houver)
- Veja [BUILD_GUIDE.md](BUILD_GUIDE.md) - seção Troubleshooting
- Logs de erro em: `eas build:list`

### 3. Preparar para Produção
- [ ] Criar ícones definitivos (profissionais)
- [ ] Fazer screenshots de qualidade
- [ ] Testar em diferentes dispositivos
- [ ] Revisar textos e tradução (se aplicável)

---

## 🆘 Problemas Comuns

### Erro: "Assets not found"
```bash
# Verifique que os arquivos existem
ls -la assets/
# Devem existir: icon.png, adaptive-icon.png, splash.png
```

### Erro: "Module not found"
```bash
# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

### Erro: "Build failed"
```bash
# Ver logs detalhados
eas build:list
eas build:view [BUILD_ID]
```

### Erro: "@types/react version conflict"
```bash
# Já corrigido no package.json
# Se persistir:
npm install --legacy-peer-deps
```

---

## 📚 Documentação Completa

- [BUILD_GUIDE.md](BUILD_GUIDE.md) - Guia completo de build
- [ASSETS_GUIDE.md](ASSETS_GUIDE.md) - Como criar assets
- [SECURITY_SUMMARY.md](SECURITY_SUMMARY.md) - Resumo de segurança
- [README_NEW.md](README_NEW.md) - Documentação principal

---

## 💡 Dicas

### Build Mais Rápido
```bash
# Usar cache
eas build --profile preview --platform android --non-interactive
```

### Build Local (sem EAS)
```bash
# Android
npx expo run:android

# iOS (apenas Mac)
npx expo run:ios
```

### Ver Status
```bash
# Listar todos os builds
eas build:list

# Baixar último build
eas build:download --platform android --latest
```

---

## 🎯 Objetivo Final

**Android:** APK instalável para testes  
**iOS:** IPA para TestFlight (requer Apple Developer Account)  
**Produção:** AAB (Android) + IPA (iOS) para lojas

---

## ⏱️ Tempo Estimado Total

| Etapa | Tempo |
|-------|-------|
| Instalar deps | 2 min |
| Criar assets | 5-30 min |
| Build EAS | 10-15 min |
| **TOTAL** | **17-47 min** |

---

## 🎉 Sucesso!

Quando o build terminar:
1. Baixe o APK do link fornecido
2. Envie para seu celular Android
3. Instale (habilite "Fontes Desconhecidas" se necessário)
4. Teste todas as funcionalidades
5. Reporte bugs ou problemas

---

## 📞 Precisa de Ajuda?

- Erro de build: Veja logs com `eas build:view [BUILD_ID]`
- Dúvidas técnicas: Veja documentação completa
- Problemas de segurança: Veja [SECURITY_SUMMARY.md](SECURITY_SUMMARY.md)

---

**Boa sorte! 🚀**

*Última atualização: 28 de Janeiro de 2026*
