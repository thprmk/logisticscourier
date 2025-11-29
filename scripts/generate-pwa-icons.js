#!/usr/bin/env node

/**
 * PWA Icon Generator
 * Creates PNG icons for PWA manifest
 * Usage: node scripts/generate-pwa-icons.js
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Ensure output directory exists
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

/**
 * Generate a PWA icon with the app name and color
 */
function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#2563eb');
  gradient.addColorStop(1, '#1e40af');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // White border
  ctx.strokeStyle = 'white';
  ctx.lineWidth = Math.max(2, size / 128);
  ctx.strokeRect(5, 5, size - 10, size - 10);

  // Draw stylized truck icon
  const truckX = size * 0.25;
  const truckY = size * 0.35;
  const truckScale = size / 256;

  // Truck cabin
  ctx.fillStyle = 'white';
  ctx.fillRect(truckX, truckY, 60 * truckScale, 50 * truckScale);

  // Truck bed
  ctx.fillRect(truckX + 55 * truckScale, truckY + 15 * truckScale, 80 * truckScale, 35 * truckScale);

  // Wheel 1
  ctx.beginPath();
  ctx.arc(truckX + 35 * truckScale, truckY + 85 * truckScale, 12 * truckScale, 0, Math.PI * 2);
  ctx.fill();

  // Wheel 2
  ctx.beginPath();
  ctx.arc(truckX + 95 * truckScale, truckY + 85 * truckScale, 12 * truckScale, 0, Math.PI * 2);
  ctx.fill();

  // App name text
  ctx.fillStyle = 'white';
  ctx.font = `bold ${Math.round(size * 0.12)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Netta', size / 2, size - 20);

  return canvas.toBuffer('image/png');
}

// Generate icons
console.log('Generating PWA icons...');

try {
  // 192x192 icon
  const icon192 = generateIcon(192);
  fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), icon192);
  console.log('✓ Created icon-192x192.png');

  // 512x512 icon
  const icon512 = generateIcon(512);
  fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), icon512);
  console.log('✓ Created icon-512x512.png');

  console.log('\nPWA icons generated successfully in public/icons/');
} catch (error) {
  console.error('Error generating icons:', error);
  process.exit(1);
}
