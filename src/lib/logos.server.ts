import fs from 'fs';
import path from 'path';

function readLogo(filename: string): string {
  try {
    return fs.readFileSync(path.join(process.cwd(), 'public', 'logos', filename), 'utf-8');
  } catch {
    return '';
  }
}

// Light logo (for dark backgrounds — white paths)
export const LOGO_LIGHT_SVG = readLogo('borderpass_logo_horizontal_light.svg');
// Dark logo (for light backgrounds — black paths)
export const LOGO_DARK_SVG = readLogo('borderpass_logo_horizontal.svg');

// Sized wrapper for embedding in 1080×1080 cards
export function logoHtml(variant: 'light' | 'dark', widthPx = 320): string {
  const svg = variant === 'light' ? LOGO_LIGHT_SVG : LOGO_DARK_SVG;
  if (!svg) return '';
  // Override width/height attributes while preserving viewBox
  const sized = svg.replace(
    /width="[\d.]+"/, `width="${widthPx}"`
  ).replace(
    /height="[\d.]+"/, `height="auto"`
  );
  return `<div style="width:${widthPx}px">${sized}</div>`;
}
