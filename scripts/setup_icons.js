import fs from 'fs';
import path from 'path';

const srcImage = path.resolve('src/assets/images/app_pwa_icon_1791736532149.jpg');
const publicDir = path.resolve('public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

if (fs.existsSync(srcImage)) {
  const imageBuffer = fs.readFileSync(srcImage);
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), imageBuffer);
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), imageBuffer);
  fs.writeFileSync(path.join(publicDir, 'pwa-icon.png'), imageBuffer);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), imageBuffer);
  console.log('Icons copied successfully to public/');
} else {
  console.log('Source image not found, will create svg fallback');
}

// Also create public/icon.svg
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="96" fill="#0f172a"/>
  <rect x="32" y="32" width="448" height="448" rx="80" fill="#1e293b" stroke="#334155" stroke-width="4"/>
  <path d="M128 128 L256 96 L256 416 L128 384 Z" fill="#0284c7" opacity="0.9"/>
  <path d="M256 96 L384 128 L384 384 L256 416 Z" fill="#0369a1" opacity="0.9"/>
  <!-- Turkish Lira Symbol -->
  <path d="M200 160 L200 350 M170 210 L250 185 M170 255 L240 235" stroke="#38bdf8" stroke-width="18" stroke-linecap="round" fill="none"/>
  <!-- Ledger lines -->
  <line x1="280" y1="180" x2="350" y2="180" stroke="#94a3b8" stroke-width="10" stroke-linecap="round"/>
  <line x1="280" y1="220" x2="350" y2="220" stroke="#94a3b8" stroke-width="10" stroke-linecap="round"/>
  <line x1="280" y1="260" x2="350" y2="260" stroke="#94a3b8" stroke-width="10" stroke-linecap="round"/>
  <line x1="280" y1="300" x2="330" y2="300" stroke="#34d399" stroke-width="10" stroke-linecap="round"/>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);
console.log('icon.svg created');
