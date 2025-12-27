#!/usr/bin/env node

/**
 * PWA Icon Generator from Logo
 * Creates PNG icons for PWA manifest from nettaa-logo.png
 * 
 * Requirements:
 * - sharp package: npm install sharp --save-dev
 * 
 * Usage: node scripts/generate-icons-from-logo.js
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('❌ Error: sharp package is required.');
  console.error('   Please install it: npm install sharp --save-dev');
  process.exit(1);
}

const logoPath = path.join(__dirname, '../public/nettaa-logo.png');
const iconsDir = path.join(__dirname, '../public/icons');

// Ensure output directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Check if logo exists
if (!fs.existsSync(logoPath)) {
  console.error(`❌ Error: Logo not found at ${logoPath}`);
  console.error('   Please ensure nettaa-logo.png exists in the public folder');
  process.exit(1);
}

// Icon sizes to generate
const iconSizes = [
  { size: 192, filename: 'icon-192x192.png' },
  { size: 512, filename: 'icon-512x512.png' },
  { size: 180, filename: 'apple-touch-icon.png' }, // Apple touch icon
  { size: 32, filename: 'favicon-32x32.png' },
  { size: 16, filename: 'favicon-16x16.png' },
];

async function generateIcons() {
  console.log('🔄 Generating PWA icons from nettaa-logo.png...\n');

  try {
    // Read the logo
    const logoBuffer = await sharp(logoPath).toBuffer();

    // Generate each icon size
    for (const { size, filename } of iconSizes) {
      const outputPath = path.join(iconsDir, filename);
      
      await sharp(logoBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(outputPath);

      console.log(`✓ Created ${filename} (${size}x${size})`);
    }

    // Also create favicon.ico (requires additional package or manual conversion)
    console.log('\n✅ PWA icons generated successfully!');
    console.log(`   Location: ${iconsDir}`);
    console.log('\n📝 Note: For favicon.ico, you may need to manually convert');
    console.log('   icon-32x32.png to .ico format using an online converter.');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

generateIcons();

