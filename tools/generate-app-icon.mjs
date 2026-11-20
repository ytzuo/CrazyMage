#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = resolve(root, 'assets');
mkdirSync(assetsDir, { recursive: true });

// Exact female fire mage palette & vector geometry from src/game/art/CharacterTextures.ts.
const INK = '#252b35';
const FIRE = {
  robe: '#a54b3c',
  light: '#e18a59',
  dark: '#602e38',
  trim: '#ffd19a',
  crystal: '#ffae55',
};

const poly = (pts, fill, stroke = INK, strokeWidth = 2) => {
  const pairs = [];
  for (let i = 0; i < pts.length; i += 2) pairs.push(`${pts[i]},${pts[i + 1]}`);
  return `<polygon points="${pairs.join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-linecap="round"/>`;
};

const line = (x1, y1, x2, y2, stroke, strokeWidth = 2) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`;

const curls = [];
for (let i = 0; i < 4; i++) {
  const y = 103 + i * 14;
  for (const x of [i % 2 ? 38 : 42, i % 2 ? 89 : 85]) {
    curls.push(
      `<circle cx="${x}" cy="${y}" r="8" fill="#9c6b2f"/>`,
      `<circle cx="${x}" cy="${y - 1}" r="6.5" fill="#e9bb5e"/>`,
      `<ellipse cx="${x - 2}" cy="${y - 2}" rx="1.5" ry="4" fill="#ffe499" opacity="0.85"/>`,
      `<ellipse cx="${x + 1}" cy="${y + 1}" rx="3.5" ry="4" fill="none" stroke="#b77d36" stroke-width="1.5"/>`,
    );
  }
}

// Position the portrait inside the translucent arcane medallion so hat tip, face, and curls stay centered.
const scale = 6.9;
const cx = 61.5;
const cy = 90;
const tx = 512 - cx * scale;
const ty = 516 - cy * scale;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="bg-translucent" cx="50%" cy="48%" r="50%">
      <stop offset="0%" stop-color="#261816" stop-opacity="0.58"/>
      <stop offset="68%" stop-color="#171113" stop-opacity="0.44"/>
      <stop offset="100%" stop-color="#100c0e" stop-opacity="0.24"/>
    </radialGradient>
    <radialGradient id="fire-aura" cx="50%" cy="50%" r="48%">
      <stop offset="0%" stop-color="#ffae55" stop-opacity="0.42"/>
      <stop offset="52%" stop-color="#d6653c" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#a54b3c" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="rim-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffe7b8" stop-opacity="0.88"/>
      <stop offset="50%" stop-color="#d6a056" stop-opacity="0.62"/>
      <stop offset="100%" stop-color="#9e5b3c" stop-opacity="0.72"/>
    </linearGradient>
    <clipPath id="medallion-clip">
      <circle cx="512" cy="512" r="446"/>
    </clipPath>
    <filter id="portrait-shadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="2.5" stdDeviation="3.2" flood-color="#0d0808" flood-opacity="0.45"/>
    </filter>
    <filter id="flame-glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="2.2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Semi-transparent circular backdrop & warm fire aura (no green background) -->
  <circle cx="512" cy="512" r="446" fill="url(#bg-translucent)"/>
  <circle cx="512" cy="512" r="446" fill="url(#fire-aura)"/>

  <!-- Arcane seal behind portrait -->
  <g fill="none" stroke="url(#rim-gold)" opacity="0.82">
    <circle cx="512" cy="512" r="446" stroke-width="4" opacity="0.55"/>
    <circle cx="512" cy="512" r="404" stroke-width="5"/>
    <circle cx="512" cy="512" r="376" stroke-width="3.2" stroke-dasharray="6 22"/>
    <circle cx="512" cy="512" r="322" stroke-width="2.5" opacity="0.58"/>
    <polygon points="512,174 805,681 219,681" stroke-width="2.4" opacity="0.42"/>
    <polygon points="512,850 219,343 805,343" stroke-width="2.4" opacity="0.34"/>
  </g>

  <!-- Warm drifting fire embers -->
  <g fill="#ffbe6b" clip-path="url(#medallion-clip)">
    <circle cx="206" cy="300" r="8" opacity="0.62"/>
    <circle cx="834" cy="272" r="6" opacity="0.7"/>
    <circle cx="790" cy="408" r="10" fill="#ff9642" opacity="0.46"/>
    <circle cx="230" cy="458" r="5" opacity="0.56"/>
    <circle cx="748" cy="216" r="4.5" fill="#ffe499" opacity="0.75"/>
    <circle cx="294" cy="212" r="5.5" fill="#ffe499" opacity="0.65"/>
  </g>

  <!-- Female Fire Mage portrait clipped cleanly to the translucent medallion -->
  <g clip-path="url(#medallion-clip)">
  <g transform="translate(${tx.toFixed(2)}, ${ty.toFixed(2)}) scale(${scale})" filter="url(#portrait-shadow)">
    <!-- Robe torso & shoulders -->
    ${poly([47, 112, 80, 112, 91, 163, 78, 176, 63, 172, 45, 177, 30, 164], FIRE.robe)}
    ${poly([44, 119, 57, 126, 49, 166, 34, 163], FIRE.light, FIRE.robe)}
    ${poly([71, 119, 83, 116, 93, 164, 77, 169], FIRE.dark, FIRE.dark)}
    ${line(44, 128, 39, 159, FIRE.trim, 2)}
    ${line(56, 135, 53, 164, FIRE.trim, 2)}
    ${line(70, 133, 74, 166, FIRE.dark, 2)}
    ${line(84, 140, 88, 159, FIRE.dark, 2)}
    ${poly([43, 113, 32, 125, 30, 145, 41, 148, 49, 123], FIRE.robe)}
    <rect x="30" y="141" width="11" height="10" rx="4" fill="#e3bf99"/>
    <rect x="42" y="127" width="42" height="9" rx="2" fill="#584839"/>
    <rect x="59" y="127" width="10" height="9" fill="none" stroke="#b49765" stroke-width="2"/>
    <rect x="75" y="132" width="13" height="15" rx="3" fill="#8a6248"/>
    ${line(77, 137, 86, 137, '#c59464', 1)}
    ${poly([42, 112, 62, 123, 84, 112, 78, 104, 48, 104], '#b5c6d0')}
    ${poly([49, 112, 63, 119, 56, 128], FIRE.light)}

    <!-- Golden cascading curls -->
    ${poly([42, 91, 55, 88, 51, 116, 47, 134, 43, 150, 32, 147, 35, 129, 32, 112, 37, 99], '#dbaa4b')}
    ${poly([75, 89, 86, 94, 94, 109, 90, 125, 96, 139, 88, 153, 78, 147, 81, 130, 77, 112], '#dbaa4b')}
    ${curls.join('\n    ')}

    <!-- Face -->
    <rect x="46" y="91" width="36" height="26" rx="8" fill="#ab785b"/>
    <rect x="47" y="89" width="32" height="24" rx="8" fill="#e6bf94"/>
    <ellipse cx="57" cy="97" rx="8.5" ry="6.5" fill="#f8d9ad"/>
    <polygon points="45,88 58,88 45,103" fill="#e9bb5e"/>
    <polygon points="79,88 70,89 80,103" fill="#e9bb5e"/>
    <rect x="53" y="98" width="5" height="8" rx="2" fill="${INK}"/>
    <rect x="69" y="98" width="5" height="8" rx="2" fill="${INK}"/>
    <rect x="54" y="98" width="2" height="2" fill="#ffffff"/>
    <rect x="70" y="98" width="2" height="2" fill="#ffffff"/>
    ${line(61, 110, 66, 110, '#9f6958', 1)}
    ${line(51, 99, 56, 97, INK, 2)}
    ${line(71, 97, 76, 99, INK, 2)}
    <ellipse cx="51" cy="107" rx="3" ry="1.5" fill="#d98d88" opacity="0.5"/>
    <ellipse cx="76" cy="107" rx="3" ry="1.5" fill="#d98d88" opacity="0.5"/>
    <circle cx="81" cy="108" r="2.5" fill="${FIRE.trim}"/>

    <!-- Fire Mage Hat -->
    ${poly([34, 88, 52, 41, 63, 36, 67, 51, 84, 88], FIRE.robe)}
    ${poly([37, 86, 53, 44, 59, 42, 53, 85], FIRE.light, FIRE.light)}
    ${poly([65, 51, 82, 86, 65, 84], FIRE.dark, FIRE.dark)}
    ${line(49, 64, 45, 77, '#b3d2db', 1)}
    ${line(36, 83, 80, 83, '#d6b77a', 2)}
    <rect x="36" y="82" width="47" height="7" rx="2" fill="#a98553"/>
    <rect x="59" y="82" width="8" height="7" fill="#ebd59e"/>
    ${poly([28, 88, 42, 86, 81, 86, 98, 91, 93, 98, 36, 97, 25, 93], FIRE.dark)}
    ${line(29, 89, 48, 91, FIRE.trim, 2)}
    ${line(48, 91, 91, 91, FIRE.trim, 2)}
    <g filter="url(#flame-glow)">
      <circle cx="61" cy="64" r="2" fill="${FIRE.crystal}"/>
      <circle cx="66" cy="74" r="1.5" fill="${FIRE.crystal}"/>
      ${poly([60, 57, 56, 69, 63, 67, 67, 72, 69, 63, 64, 53], FIRE.crystal, FIRE.trim, 1.8)}
    </g>
  </g>
  </g>

  <!-- Subtle outer gold rim over clipped bust -->
  <circle cx="512" cy="512" r="446" fill="none" stroke="url(#rim-gold)" stroke-width="5" opacity="0.72"/>
</svg>
`;

const svgPath = resolve(assetsDir, 'icon-source.svg');
const pngPath = resolve(assetsDir, 'app-icon.png');
writeFileSync(svgPath, svg, 'utf8');

if (!process.argv.includes('--svg-only')) {
  // Rasterize SVG to 1024x1024 transparent RGBA PNG via headless Chrome (macOS/Linux) or rsvg-convert.
  const chromeCandidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'google-chrome',
    'chromium',
  ];
  let rendered = false;
  for (const bin of chromeCandidates) {
    try {
      execFileSync(bin, [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--default-background-color=00000000',
        '--force-device-scale-factor=1',
        '--window-size=1024,1024',
        `--screenshot=${pngPath}`,
        `file://${svgPath}`,
      ], { stdio: 'ignore' });
      rendered = true;
      break;
    } catch { /* Try next candidate. */ }
  }
  if (!rendered) {
    execFileSync('rsvg-convert', ['-w', '1024', '-h', '1024', svgPath, '-o', pngPath], { stdio: 'inherit' });
  }
}

console.log(`Generated ${svgPath}${process.argv.includes('--svg-only') ? '' : ` and ${pngPath}`}`);
