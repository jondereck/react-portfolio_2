import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const pngToIcoModule = require('png-to-ico');
const pngToIco =
  typeof pngToIcoModule === 'function'
    ? pngToIcoModule
    : pngToIcoModule?.default ?? pngToIcoModule?.imagesToIco;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const publicDir = path.join(repoRoot, 'public');

const ICON_BG = '#ffffff';
const SOURCE_LOGO = 'pwa-logo-source.png';

const resolvePublicPath = (filename) => path.join(publicDir, filename);

const parseHexColor = (hex) => {
  const value = hex.replace('#', '').trim();
  if (value.length !== 6) {
    throw new Error(`Expected 6-digit hex color, got "${hex}"`);
  }

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
    alpha: 1,
  };
};

const buildSquarePng = async ({ logoBuffer, size, paddingRatio, backgroundHex }) => {
  const padding = Math.round(size * paddingRatio);
  const inner = Math.max(1, size - padding * 2);

  const resizedLogo = await sharp(logoBuffer)
    .resize({
      width: inner,
      height: inner,
      fit: 'contain',
      withoutEnlargement: true,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: parseHexColor(backgroundHex),
    },
  })
    .composite([
      {
        input: resizedLogo,
        left: Math.round((size - inner) / 2),
        top: Math.round((size - inner) / 2),
      },
    ])
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: false,
    })
    .toBuffer();
};

async function main() {
  const sourceLogoPath = resolvePublicPath(SOURCE_LOGO);
  let inputLogoPath = sourceLogoPath;

  try {
    await fs.access(sourceLogoPath);
  } catch {
    inputLogoPath = resolvePublicPath('logo512.png');
  }

  const inputLogo = await fs.readFile(inputLogoPath);

  if (inputLogoPath !== sourceLogoPath) {
    await fs.writeFile(sourceLogoPath, inputLogo);
  }

  const outputs = [
    { filename: 'logo192.png', size: 192, paddingRatio: 0.06 },
    { filename: 'logo512.png', size: 512, paddingRatio: 0.06 },
    { filename: 'logo512-maskable.png', size: 512, paddingRatio: 0.14 },
    { filename: 'apple-touch-icon.png', size: 180, paddingRatio: 0.08 },
    { filename: 'favicon-32x32.png', size: 32, paddingRatio: 0.04 },
    { filename: 'favicon-16x16.png', size: 16, paddingRatio: 0.04 },
  ];

  await fs.mkdir(publicDir, { recursive: true });

  const generatedBuffers = new Map();
  for (const output of outputs) {
    const buffer = await buildSquarePng({
      logoBuffer: inputLogo,
      size: output.size,
      paddingRatio: output.paddingRatio,
      backgroundHex: ICON_BG,
    });
    generatedBuffers.set(output.filename, buffer);
    await fs.writeFile(resolvePublicPath(output.filename), buffer);
  }

  const favicon48 = await buildSquarePng({
    logoBuffer: inputLogo,
    size: 48,
    paddingRatio: 0.04,
    backgroundHex: ICON_BG,
  });

  const icoBuffer = await pngToIco([
    generatedBuffers.get('favicon-16x16.png'),
    generatedBuffers.get('favicon-32x32.png'),
    favicon48,
  ]);

  await fs.writeFile(resolvePublicPath('favicon.ico'), icoBuffer);

  // eslint-disable-next-line no-console
  console.log('Generated icons in /public');
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
