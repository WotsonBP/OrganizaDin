# Publicar OrganizaDin na Google Play Store

Guia objetivo para build e submissão do app na Play Store.

---

## ✅ O que já está pronto

- **Assets:** `assets/icon.png` (1024×1024), `assets/adaptive-icon.png` (1024×1024), `assets/splash.png` (1284×2778) em PNG
- **app.json:** nome, slug, versão 1.0.0, package `com.organizadin.app`, ícones e splash apontando para `./assets/`
- **eas.json:** perfil `production` com AAB (Android App Bundle), necessário para a Play Store
- **Scripts:** `npm run build:android:production` para gerar o build

---

## 1. Antes do build

### Conta e ferramentas

1. **Conta Expo:** faça login no EAS.
   ```bash
   npx eas login
   ```

2. **Conta Google Play Developer:** se ainda não tiver, crie em [Google Play Console](https://play.google.com/console) (taxa única ~US$ 25).

3. **App na Play Console:** crie um novo app, defina o nome "OrganizaDin" e o pacote **`com.organizadin.app`** (igual ao `app.json`).

### Opcional: testar antes com APK

Para testar em dispositivo sem publicar:

```bash
npm run build:android:preview
```

Isso gera um APK. Baixe pelo link do EAS e instale no celular.

---

## 2. Gerar o AAB para a loja

Na raiz do projeto:

```bash
npm run build:android:production
```

Ou:

```bash
npx eas build --profile production --platform android
```

- O EAS gera um **Android App Bundle (AAB)**.
- Quando terminar, o link do build aparece no terminal e no [Expo dashboard](https://expo.dev).

---

## 3. Subir para a Play Store

### Opção A: Submit automático (EAS Submit)

1. **Service account (Play Console):**
   - Play Console → Configurações → Acesso à API → Criar conta de serviço.
   - Baixe o JSON da chave e salve no projeto como **`android-service-account.json`** (na raiz).
   - Esse arquivo está no `.gitignore` — **nunca** commite no Git.

2. **Enviar o último build:**
   ```bash
   npx eas submit --platform android --latest
   ```
   Ou use o perfil configurado no `eas.json`:
   ```bash
   npm run submit:android
   ```
   (O `eas.json` está com `track: "internal"` — primeiro release costuma ser internal testing.)

### Opção B: Upload manual

1. No [expo.dev](https://expo.dev), abra o projeto → Builds → clique no build Android **production** concluído.
2. Baixe o **AAB**.
3. No Google Play Console → seu app → **Produção** (ou **Testes internos**) → **Criar nova versão** → faça upload do AAB.

---

## 4. Na Play Console (antes de publicar)

- **Conteúdo do app:** descrição curta e longa, screenshots (mín. 2 para celular), ícone 512×512, gráfico de feature 1024×500 (ver ASSETS_GUIDE.md).
- **Política de privacidade:** URL (ex.: GitHub Pages ou site com o texto do PRIVACY_POLICY.md).
- **Classificação de conteúdo:** preencher questionário.
- **Preço e distribuição:** países e se é gratuito/pago.

---

## 5. Comandos em sequência (resumo)

```bash
# 1. Login EAS (uma vez)
npx eas login

# 2. Build de produção (AAB)
npm run build:android:production

# 3. Após o build terminar: submit (se tiver android-service-account.json)
npx eas submit --platform android --latest
```

Depois, conclua as configurações na Play Console e envie para revisão.

---

*Última atualização: Janeiro 2026*
