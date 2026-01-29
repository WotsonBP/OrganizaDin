/**
 * Prepara ícones e splash no padrão das lojas (App Store / Google Play).
 * Lê de src/assets/ e gera em ./assets/ com dimensões e formato corretos.
 *
 * Uso: node scripts/prepare-store-assets.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src', 'assets');
const OUT = path.join(ROOT, 'assets');

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('Execute: npm install --save-dev sharp');
    process.exit(1);
  }

  if (!fs.existsSync(SRC)) {
    console.error('Pasta src/assets/ não encontrada.');
    process.exit(1);
  }

  fs.mkdirSync(OUT, { recursive: true });

  const iconPath = path.join(SRC, 'icon.png');
  const adaptivePath = path.join(SRC, 'adaptive-icon.png');
  const splashPath = path.join(SRC, 'splash.png');

  if (!fs.existsSync(iconPath) || !fs.existsSync(adaptivePath) || !fs.existsSync(splashPath)) {
    console.error('Arquivos icon.png, adaptive-icon.png ou splash.png não encontrados em src/assets/');
    process.exit(1);
  }

  try {
    await sharp(iconPath)
      .resize(1024, 1024)
      .png()
      .toFile(path.join(OUT, 'icon.png'));
    console.log('OK assets/icon.png (1024x1024 PNG)');

    await sharp(adaptivePath)
      .resize(1024, 1024)
      .png()
      .toFile(path.join(OUT, 'adaptive-icon.png'));
    console.log('OK assets/adaptive-icon.png (1024x1024 PNG)');

    const splashW = 1284;
    const splashH = 2778;
    const splashMeta = await sharp(splashPath).metadata();
    const scale = Math.min(splashW / splashMeta.width, splashH / splashMeta.height);
    const w = Math.round(splashMeta.width * scale);
    const h = Math.round(splashMeta.height * scale);
    const left = Math.round((splashW - w) / 2);
    const top = Math.round((splashH - h) / 2);

    const resized = await sharp(splashPath).resize(w, h).png().toBuffer();
    const background = Buffer.from(
      `<svg width="${splashW}" height="${splashH}"><rect width="100%" height="100%" fill="#000000"/></svg>`
    );

    await sharp(background)
      .composite([{ input: resized, left, top }])
      .png()
      .toFile(path.join(OUT, 'splash.png'));
    console.log('OK assets/splash.png (1284x2778 PNG)');

    console.log('\nAssets prontos para loja em ./assets/');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
