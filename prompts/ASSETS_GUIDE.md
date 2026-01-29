# Guia de Assets para Publicação

Este guia descreve os assets necessários para publicar o OrganizaDin nas lojas iOS e Android.

## Assets Obrigatórios

### 1. Ícone Principal (icon.png)

**Localização:** `./assets/icon.png`

**Especificações:**
- Tamanho: 1024x1024 pixels
- Formato: PNG com transparência
- Não arredondar os cantos (o sistema faz isso automaticamente)
- Margens: 10% de espaço ao redor do elemento principal
- Peso: Menos de 1MB

**Uso:**
- App Store (iOS)
- Base para todos os tamanhos de ícone

### 2. Ícone Adaptativo Android (adaptive-icon.png)

**Localização:** `./assets/adaptive-icon.png`

**Especificações:**
- Tamanho: 1024x1024 pixels
- Formato: PNG com transparência
- Área segura: círculo central de 66% do tamanho
- Background: Definido no app.json como #1B5E20

**Uso:**
- Google Play Store
- Ícones adaptativos do Android (várias formas)

### 3. Splash Screen (splash.png)

**Localização:** `./assets/splash.png`

**Especificações:**
- Tamanho: 1284x2778 pixels (iPhone 13 Pro Max)
- Formato: PNG
- Background: #1B5E20 (verde do app)
- Conteúdo centralizado
- Compatível com diferentes proporções

**Uso:**
- Tela de carregamento inicial
- iOS e Android

## Assets Recomendados (Opcional mas Importante)

### 4. Screenshots

Para as lojas, você precisará de:

#### iOS (App Store Connect)
- **iPhone 6.7"** (iPhone 14 Pro Max): 1290x2796 pixels
  - Mínimo: 3 screenshots
  - Máximo: 10 screenshots
  
- **iPhone 6.5"** (iPhone 11 Pro Max): 1242x2688 pixels
  - Mínimo: 3 screenshots
  
- **iPad Pro 12.9"**: 2048x2732 pixels
  - Mínimo: 3 screenshots (se suporta iPad)

#### Android (Google Play Console)
- **Phone**: 1080x1920 pixels (ou superior)
  - Mínimo: 2 screenshots
  - Máximo: 8 screenshots
  
- **7-inch Tablet**: 1024x600 pixels
  - Opcional
  
- **10-inch Tablet**: 1280x800 pixels
  - Opcional

**Dicas para Screenshots:**
- Mostre as principais funcionalidades
- Use textos descritivos
- Mantenha consistência visual
- Evite mostrar dados sensíveis reais

### 5. Gráfico de Feature (Google Play)

**Especificações:**
- Tamanho: 1024x500 pixels
- Formato: PNG ou JPG
- Uso: Banner principal na Google Play Store

### 6. Ícone da App Store (iOS)

O Expo/EAS Build gera automaticamente todos os tamanhos necessários a partir do icon.png:
- 20x20, 29x29, 40x40, 58x58, 60x60, 76x76, 80x80, 87x87, 120x120, 152x152, 167x167, 180x180, 1024x1024

### 7. Ícones Android

O Expo gera automaticamente:
- mipmap-mdpi: 48x48
- mipmap-hdpi: 72x72
- mipmap-xhdpi: 96x96
- mipmap-xxhdpi: 144x144
- mipmap-xxxhdpi: 192x192

## Como Gerar Assets

### Opção 0: Script do Projeto (Recomendado)

O projeto inclui um script que lê as imagens em `src/assets/` e gera em `./assets/` nos tamanhos corretos (1024×1024 para ícones, 1284×2778 para splash) e em PNG.

```bash
npm install
npm run prepare-assets
```

Requer as imagens em `src/assets/icon.png`, `src/assets/adaptive-icon.png` e `src/assets/splash.png`. O resultado fica em `./assets/`, que é o caminho usado pelo `app.json`. Depende do pacote `sharp` (instalado com `npm install`).

### Opção 1: Usando Ferramentas de Design

#### Figma / Adobe XD / Sketch
1. Crie o design base em 1024x1024
2. Exporte como PNG
3. Coloque na pasta `./assets/`

#### Canva (Gratuito)
1. Use template 1024x1024
2. Crie seu ícone
3. Baixe como PNG
4. Coloque na pasta `./assets/`

### Opção 2: Usando Geradores Online

**App Icon Generator:**
- https://www.appicon.co/
- https://apetools.webprofusion.com/app/#/tools/imagegorilla
- https://easyappicon.com/

**Splash Screen Generator:**
- https://www.appicon.co/
- https://apetools.webprofusion.com/tools/splashscreen

### Opção 3: Usando Expo Asset Generator (Recomendado)

Se você tem uma imagem base, o Expo pode gerar automaticamente:

```bash
# Instalar dependência
npm install -g sharp-cli

# Gerar ícone de 1024x1024 a partir de uma imagem maior
npx sharp-cli resize 1024 1024 --input seu-icone.png --output ./assets/icon.png

# Para splash
npx sharp-cli resize 1284 2778 --input seu-splash.png --output ./assets/splash.png
```

## Placeholders Temporários

Para testes, você pode criar placeholders simples:

### Usando ImageMagick (se instalado):

```bash
# Ícone placeholder
convert -size 1024x1024 xc:#1B5E20 \
  -gravity center -pointsize 200 -fill white \
  -annotate +0+0 "OD" \
  ./assets/icon.png

# Adaptive icon
cp ./assets/icon.png ./assets/adaptive-icon.png

# Splash screen
convert -size 1284x2778 xc:#1B5E20 \
  -gravity center -pointsize 150 -fill white \
  -annotate +0+0 "OrganizaDin" \
  ./assets/splash.png
```

### Usando Python (se instalado):

```python
from PIL import Image, ImageDraw, ImageFont

# Ícone
img = Image.new('RGB', (1024, 1024), color='#1B5E20')
d = ImageDraw.Draw(img)
d.text((512, 512), "OD", fill='white', anchor="mm")
img.save('./assets/icon.png')

# Splash
img = Image.new('RGB', (1284, 2778), color='#1B5E20')
d = ImageDraw.Draw(img)
d.text((642, 1389), "OrganizaDin", fill='white', anchor="mm")
img.save('./assets/splash.png')
```

## Checklist Antes de Publicar

- [ ] icon.png criado (1024x1024) — use `npm run prepare-assets` para gerar a partir de `src/assets/`
- [ ] adaptive-icon.png criado (1024x1024)
- [ ] splash.png criado (1284x2778)
- [ ] Screenshots preparados (mínimo 3 para iOS, 2 para Android)
- [ ] Gráfico de feature criado (apenas Android)
- [ ] Testado em dispositivos reais
- [ ] Verificado em diferentes tamanhos de tela

## Ferramentas Úteis

### Design
- **Figma** (gratuito): https://figma.com
- **Canva** (gratuito): https://canva.com
- **GIMP** (gratuito): https://gimp.org

### Otimização de Imagens
- **TinyPNG**: https://tinypng.com
- **ImageOptim** (Mac): https://imageoptim.com
- **Squoosh** (Web): https://squoosh.app

### Testes Visuais
- **App Store Screenshots** (iOS): Use o simulador do Xcode
- **Google Play Screenshots** (Android): Use emulador Android Studio

## Dicas de Design

### Cores do OrganizaDin
- **Verde Principal:** #1B5E20
- **Verde Claro:** #43A047
- **Verde Escuro:** #1B5E20
- **Texto:** #FFFFFF (branco)

### Ícone
- Simples e reconhecível
- Funciona em pequenas dimensões
- Contraste adequado
- Representa finanças/organização

### Splash Screen
- Logo/nome do app centralizado
- Background verde (#1B5E20)
- Minimalista
- Carrega rápido

## Resolução de Problemas

### Erro: Icon not found
- Verifique se o arquivo está em `./assets/icon.png`
- Verifique o nome exato (case-sensitive)
- Certifique-se que é PNG válido

### Splash não aparece
- Verifique dimensões (1284x2778)
- Verifique formato PNG
- Limpe cache: `expo start -c`

### Ícone cortado no Android
- Use adaptive-icon.png
- Mantenha conteúdo principal no círculo central (66%)
- Teste diferentes formas no Android Studio

## Recursos Adicionais

- [Expo Asset Guide](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [Android Icon Guidelines](https://developer.android.com/guide/practices/ui_guidelines/icon_design_adaptive)
- [Google Play Asset Guidelines](https://support.google.com/googleplay/android-developer/answer/9866151)

---

**Nota:** Para build de produção, é **obrigatório** ter todos os assets principais (icon, adaptive-icon, splash). O build falhará sem eles.
