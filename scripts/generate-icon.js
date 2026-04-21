const sharp = require('sharp');
const fs = require('fs');

const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#8B5CF6"/>
    </linearGradient>
    <linearGradient id="highlight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.25)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#2563eb" flood-opacity="0.35"/>
    </filter>
    <filter id="textShadow">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.2"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect x="0" y="0" width="512" height="512" rx="112" ry="112" fill="url(#bgGrad)" filter="url(#shadow)"/>

  <!-- Top highlight overlay -->
  <rect x="0" y="0" width="512" height="256" rx="112" ry="112" fill="url(#highlight)"/>

  <!-- Subtle precision grid -->
  <g stroke="rgba(255,255,255,0.06)" stroke-width="1">
    <line x1="96" y1="96" x2="416" y2="96"/>
    <line x1="96" y1="176" x2="416" y2="176"/>
    <line x1="96" y1="256" x2="416" y2="256"/>
    <line x1="96" y1="336" x2="416" y2="336"/>
    <line x1="96" y1="416" x2="416" y2="416"/>
    <line x1="96" y1="96" x2="96" y2="416"/>
    <line x1="176" y1="96" x2="176" y2="416"/>
    <line x1="256" y1="96" x2="256" y2="416"/>
    <line x1="336" y1="96" x2="336" y2="416"/>
    <line x1="416" y1="96" x2="416" y2="416"/>
  </g>

  <!-- Corner precision marks -->
  <g fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M72 130 L72 96 L106 96"/>
    <path d="M440 96 L406 96 L406 130"/>
    <path d="M72 382 L72 416 L106 416"/>
    <path d="M406 416 L440 416 L440 382"/>
  </g>

  <!-- Outer targeting ring -->
  <circle cx="256" cy="256" r="148" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>

  <!-- Inner crosshairs -->
  <g stroke="rgba(255,255,255,0.2)" stroke-width="1.5">
    <line x1="168" y1="256" x2="344" y2="256"/>
    <line x1="256" y1="168" x2="256" y2="344"/>
  </g>

  <!-- Center focus dot -->
  <circle cx="256" cy="256" r="5" fill="white" opacity="0.9"/>

  <!-- Main P letter - bold geometric -->
  <text x="246" y="298" font-family="system-ui, -apple-system, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" font-size="220" font-weight="700" fill="white" text-anchor="middle" dominant-baseline="auto" letter-spacing="-12" filter="url(#textShadow)">P</text>

  <!-- C accent - positioned as design element -->
  <text x="342" y="205" font-family="system-ui, -apple-system, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" font-size="44" font-weight="600" fill="rgba(255,255,255,0.75)" text-anchor="middle">C</text>
</svg>`;

sharp(Buffer.from(svgContent))
  .resize(512, 512)
  .png()
  .toFile('docs/app-icon.png')
  .then(() => {
    console.log('Icon created: docs/app-icon.png (512x512)');
  })
  .catch(err => {
    console.error('Error:', err);
  });