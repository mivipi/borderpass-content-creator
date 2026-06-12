/**
 * BorderPass social image templates — 1080×1080px
 * Pattern: background layer → gradient overlay → text → frosted glass cards
 * Claude provides content JSON only; all layout/design is controlled here.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface StatCard {
  value: string;   // e.g. "+3.8%" or "24%"
  label: string;   // e.g. "Nigeria's approval rate"
  note?: string;   // optional small supporting line
}

export type ImageLayout =
  | 'gradient_news'    // dark gradient bg, rich depth, headline + body (like news/editorial)
  | 'stat_cards'       // gradient bg + row of 2–3 frosted glass stat cards at bottom
  | 'editorial_warm'   // warm cream/gold gradient, large Crimson Pro, horizontal rule
  | 'textured_dark'    // dark bg with subtle wavy texture, large statement text
  | 'checklist';       // dark bg, frosted glass bullet list

export interface ImageContent {
  layout: ImageLayout;
  tag?: string;           // small label e.g. "Express Entry · Update"
  sourceLabel?: string;   // publication-style label e.g. "FINANCIAL TIMES"
  headline: string;
  subhead?: string;       // secondary line under headline
  body?: string;
  stats?: StatCard[];     // 2–3 items for stat_cards layout
  points?: string[];      // 3–4 items for checklist layout
}

export interface CarouselSlideContent {
  type: 'cover' | 'content' | 'cta';
  tag?: string;
  headline: string;
  body?: string;
  ctaLine?: string;
}

// ── Shared ──────────────────────────────────────────────────────────────────

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;1,400&family=Outfit:wght@300;400;500;600&display=swap');`;

const RESET = `* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1080px; height: 1080px; overflow: hidden; }`;

// Wavy SVG texture pattern (inline, no external fetch needed)
const WAVE_PATTERN = (color = 'rgba(255,255,255,0.045)') =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='24'%3E%3Cpath d='M0 12 Q30 2 60 12 Q90 22 120 12' stroke='${encodeURIComponent(color)}' stroke-width='1.8' fill='none'/%3E%3C/svg%3E")`;

// Radial light burst (simulates a photo highlight)
const RADIAL_LIGHT = (x = '75%', y = '30%', color = 'rgba(74,99,129,0.45)') =>
  `radial-gradient(ellipse 55% 45% at ${x} ${y}, ${color} 0%, transparent 70%)`;

function resizeLogo(svg: string, w: number): string {
  return svg.replace(/width="[^"]+"/, `width="${w}"`).replace(/height="[^"]+"/, 'height="auto"');
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/\n/g, '<br>');
}

// ── Template 1: Gradient News ───────────────────────────────────────────────
// Rich layered gradient, optional radial light burst, clean text hierarchy.
// Closest to references 1 & 5 but without requiring a photo.

export function renderGradientNews(c: ImageContent, logoLight: string): string {
  const logo = resizeLogo(logoLight, 240);
  const tag = c.tag
    ? `<div class="tag"><span class="tag-dot">•</span> ${esc(c.tag)}</div>` : '';
  const body = c.body ? `<p class="body">${esc(c.body)}</p>` : '';
  const subhead = c.subhead ? `<p class="subhead">${esc(c.subhead)}</p>` : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${FONTS}
${RESET}
.canvas {
  width: 1080px; height: 1080px;
  position: relative; overflow: hidden;
  background:
    ${RADIAL_LIGHT('78%', '25%', 'rgba(70,99,129,0.5)')},
    ${RADIAL_LIGHT('20%', '80%', 'rgba(16,39,61,0.3)')},
    linear-gradient(155deg, #1B3E5F 0%, #10273D 50%, #0B1E30 100%);
}
.noise {
  position: absolute; inset: 0;
  background-image: ${WAVE_PATTERN('rgba(255,255,255,0.03)')};
  background-size: 120px 24px;
}
.gold-line {
  position: absolute; top: 0; left: 0; right: 0;
  height: 4px;
  background: linear-gradient(90deg, #B68D54 0%, #CCB38E 50%, transparent 100%);
}
.content {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  justify-content: flex-end;
  padding: 80px 88px 196px;
}
.tag {
  display: inline-flex; align-items: center; gap: 10px;
  font-family: 'Outfit', sans-serif;
  font-size: 26px; font-weight: 500;
  color: #CCB38E;
  letter-spacing: 0.08em; text-transform: uppercase;
  background: rgba(182,141,84,0.12);
  border: 1px solid rgba(182,141,84,0.3);
  border-radius: 999px;
  padding: 10px 24px;
  margin-bottom: 40px;
  width: fit-content;
}
.tag-dot { color: #B68D54; font-size: 18px; }
.headline {
  font-family: 'Crimson Pro', Georgia, serif;
  font-size: 100px; font-weight: 600;
  color: #FEFBF6;
  line-height: 1.05; letter-spacing: -0.02em;
  margin-bottom: 32px;
  text-shadow: 0 2px 40px rgba(0,0,0,0.4);
}
.subhead {
  font-family: 'Outfit', sans-serif;
  font-size: 36px; font-weight: 400;
  color: #7A99B8;
  margin-bottom: 16px; line-height: 1.4;
}
.body {
  font-family: 'Outfit', sans-serif;
  font-size: 34px; font-weight: 300;
  color: rgba(224,232,240,0.85);
  line-height: 1.6; max-width: 900px;
}
.logo {
  position: absolute; bottom: 60px; left: 88px;
  width: 240px; line-height: 0;
}
</style></head><body>
<div class="canvas">
  <div class="noise"></div>
  <div class="gold-line"></div>
  <div class="content">
    ${tag}
    <div class="headline">${esc(c.headline)}</div>
    ${subhead}
    ${body}
  </div>
  <div class="logo">${logo}</div>
</div>
</body></html>`;
}

// ── Template 2: Stat Cards ──────────────────────────────────────────────────
// Like reference image 1: gradient bg, headline up top, frosted glass stat
// cards in a row at the bottom.

export function renderStatCards(c: ImageContent, logoLight: string): string {
  const logo = resizeLogo(logoLight, 240);
  const tag = c.tag
    ? `<div class="tag"><span class="tag-dot">•</span> ${esc(c.tag)}</div>` : '';
  const stats = (c.stats ?? []).slice(0, 3);

  const statHtml = stats.map(s => `
    <div class="stat-card">
      <div class="stat-value">${esc(s.value)}</div>
      <div class="stat-label">${esc(s.label)}</div>
      ${s.note ? `<div class="stat-note">${esc(s.note)}</div>` : ''}
    </div>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${FONTS}
${RESET}
.canvas {
  width: 1080px; height: 1080px;
  position: relative; overflow: hidden;
  background:
    ${RADIAL_LIGHT('80%', '20%', 'rgba(70,99,129,0.55)')},
    linear-gradient(160deg, #1B3E5F 0%, #10273D 55%, #081825 100%);
}
.noise {
  position: absolute; inset: 0;
  background-image: ${WAVE_PATTERN('rgba(255,255,255,0.025)')};
  background-size: 120px 24px;
}
.gold-line {
  position: absolute; top: 0; left: 0; right: 0; height: 4px;
  background: linear-gradient(90deg, #B68D54, #CCB38E 40%, transparent);
}
.content {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  padding: 72px 88px 56px;
}
.tag {
  display: inline-flex; align-items: center; gap: 10px;
  font-family: 'Outfit', sans-serif;
  font-size: 24px; font-weight: 500;
  color: #CCB38E; letter-spacing: 0.08em; text-transform: uppercase;
  background: rgba(182,141,84,0.1);
  border: 1px solid rgba(182,141,84,0.28);
  border-radius: 999px; padding: 8px 20px;
  margin-bottom: 36px; width: fit-content;
}
.tag-dot { color: #B68D54; font-size: 16px; }
.headline {
  font-family: 'Crimson Pro', Georgia, serif;
  font-size: 88px; font-weight: 600;
  color: #FEFBF6; line-height: 1.05;
  letter-spacing: -0.02em; margin-bottom: 24px;
  text-shadow: 0 2px 32px rgba(0,0,0,0.35);
  flex: 1;
}
.body {
  font-family: 'Outfit', sans-serif;
  font-size: 30px; font-weight: 300;
  color: rgba(224,232,240,0.8);
  line-height: 1.55; max-width: 860px;
  margin-bottom: 40px;
}
.stat-row {
  display: flex; gap: 20px; align-items: stretch;
}
.stat-card {
  flex: 1;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.13);
  border-radius: 20px;
  padding: 32px 28px;
  backdrop-filter: blur(8px);
}
.stat-value {
  font-family: 'Crimson Pro', Georgia, serif;
  font-size: 72px; font-weight: 600;
  color: #FEFBF6; line-height: 1; margin-bottom: 10px;
  letter-spacing: -0.02em;
}
.stat-label {
  font-family: 'Outfit', sans-serif;
  font-size: 24px; font-weight: 600;
  color: #CCB38E; margin-bottom: 8px;
  line-height: 1.3;
}
.stat-note {
  font-family: 'Outfit', sans-serif;
  font-size: 20px; font-weight: 300;
  color: rgba(224,232,240,0.65); line-height: 1.4;
}
.logo {
  position: absolute; bottom: 52px; left: 88px;
  width: 220px; line-height: 0;
}
</style></head><body>
<div class="canvas">
  <div class="noise"></div>
  <div class="gold-line"></div>
  <div class="content">
    ${tag}
    <div class="headline">${esc(c.headline)}</div>
    ${c.body ? `<div class="body">${esc(c.body)}</div>` : ''}
    ${stats.length ? `<div class="stat-row">${statHtml}</div>` : ''}
  </div>
  <div class="logo">${logo}</div>
</div>
</body></html>`;
}

// ── Template 3: Editorial Warm ──────────────────────────────────────────────
// Like reference image 3: warm cream/gold gradient, publication-style label,
// large Crimson Pro headline, horizontal rule, body text.

export function renderEditorialWarm(c: ImageContent, logoDark: string): string {
  const logo = resizeLogo(logoDark, 240);
  const sourceLabel = c.sourceLabel
    ? `<div class="source-label">${esc(c.sourceLabel)}</div>` : '';
  const tag = c.tag
    ? `<div class="tag-line">${esc(c.tag)}</div>` : '';
  const body = c.body ? `<p class="body">${esc(c.body)}</p>` : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${FONTS}
${RESET}
.canvas {
  width: 1080px; height: 1080px;
  position: relative; overflow: hidden;
  background: radial-gradient(ellipse 90% 70% at 60% 40%, #EDE0C8 0%, #D4B896 40%, #C8A87E 70%, #B8956A 100%);
}
.overlay {
  position: absolute; inset: 0;
  background: linear-gradient(160deg, rgba(254,251,246,0.6) 0%, rgba(244,237,226,0.2) 60%, transparent 100%);
}
.content {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  justify-content: center;
  padding: 88px 96px 200px;
}
.source-label {
  font-family: 'Outfit', sans-serif;
  font-size: 28px; font-weight: 600;
  color: #5A4424; letter-spacing: 0.14em; text-transform: uppercase;
  margin-bottom: 6px;
}
.tag-line {
  font-family: 'Outfit', sans-serif;
  font-size: 24px; font-weight: 400;
  color: #826741; letter-spacing: 0.1em; text-transform: uppercase;
  margin-bottom: 48px;
}
.headline {
  font-family: 'Crimson Pro', Georgia, serif;
  font-size: 96px; font-weight: 600;
  color: #2A1F0E; line-height: 1.06;
  letter-spacing: -0.02em; margin-bottom: 40px;
}
.rule {
  width: 100%; height: 1.5px;
  background: linear-gradient(90deg, #826741, rgba(130,103,65,0.2));
  margin-bottom: 36px;
}
.body {
  font-family: 'Outfit', sans-serif;
  font-size: 34px; font-weight: 400;
  color: #4A3A1E; line-height: 1.6;
  max-width: 880px;
}
.logo {
  position: absolute; bottom: 60px; left: 96px;
  width: 240px; line-height: 0;
}
</style></head><body>
<div class="canvas">
  <div class="overlay"></div>
  <div class="content">
    ${sourceLabel}
    ${tag}
    <div class="headline">${esc(c.headline)}</div>
    <div class="rule"></div>
    ${body}
  </div>
  <div class="logo">${logo}</div>
</div>
</body></html>`;
}

// ── Template 4: Textured Dark ───────────────────────────────────────────────
// Like references 2 & 4: dark bg with wavy line texture, large bold text,
// optional large accent number.

export function renderTexturedDark(c: ImageContent, logoLight: string): string {
  const logo = resizeLogo(logoLight, 240);
  const tag = c.tag
    ? `<div class="tag"><span class="tag-dot">•</span> ${esc(c.tag)}</div>` : '';

  // If there's a stat, make it huge and use it as the hero element
  const hasHeroStat = !!c.stats?.[0];
  const heroStat = c.stats?.[0];

  const body = c.body ? `<p class="body">${esc(c.body)}</p>` : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${FONTS}
${RESET}
.canvas {
  width: 1080px; height: 1080px;
  position: relative; overflow: hidden;
  background-color: #10273D;
  background-image: ${WAVE_PATTERN('rgba(255,255,255,0.05)')};
  background-size: 120px 24px;
}
.glow {
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse 60% 50% at 85% 15%, rgba(70,99,129,0.35) 0%, transparent 65%),
    radial-gradient(ellipse 40% 35% at 10% 90%, rgba(182,141,84,0.1) 0%, transparent 60%);
}
.gold-line {
  position: absolute; top: 0; left: 0; right: 0; height: 4px;
  background: linear-gradient(90deg, #B68D54, #CCB38E 40%, transparent);
}
.content {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  justify-content: center;
  padding: 80px 88px 200px;
}
.tag {
  display: inline-flex; align-items: center; gap: 10px;
  font-family: 'Outfit', sans-serif;
  font-size: 26px; font-weight: 500;
  color: #CCB38E; letter-spacing: 0.08em; text-transform: uppercase;
  background: rgba(182,141,84,0.1);
  border: 1px solid rgba(182,141,84,0.28);
  border-radius: 999px; padding: 10px 24px;
  margin-bottom: 48px; width: fit-content;
}
.tag-dot { color: #B68D54; font-size: 16px; }
.hero-stat {
  font-family: 'Crimson Pro', Georgia, serif;
  font-size: 220px; font-weight: 600;
  color: #B68D54; line-height: 0.9;
  letter-spacing: -0.04em; margin-bottom: 16px;
}
.hero-label {
  font-family: 'Outfit', sans-serif;
  font-size: 40px; font-weight: 400;
  color: #FEFBF6; margin-bottom: 32px;
}
.headline {
  font-family: 'Crimson Pro', Georgia, serif;
  font-size: ${hasHeroStat ? '76px' : '108px'}; font-weight: 600;
  color: #FEFBF6; line-height: 1.06;
  letter-spacing: -0.02em; margin-bottom: 32px;
}
.body {
  font-family: 'Outfit', sans-serif;
  font-size: 34px; font-weight: 300;
  color: #7A99B8; line-height: 1.6; max-width: 860px;
}
.logo {
  position: absolute; bottom: 60px; left: 88px;
  width: 240px; line-height: 0;
}
</style></head><body>
<div class="canvas">
  <div class="glow"></div>
  <div class="gold-line"></div>
  <div class="content">
    ${tag}
    ${hasHeroStat ? `
      <div class="hero-stat">${esc(heroStat!.value)}</div>
      <div class="hero-label">${esc(heroStat!.label)}</div>
    ` : ''}
    <div class="headline">${esc(c.headline)}</div>
    ${body}
  </div>
  <div class="logo">${logo}</div>
</div>
</body></html>`;
}

// ── Template 5: Checklist ───────────────────────────────────────────────────
// Gradient bg + frosted glass list items.

export function renderChecklist(c: ImageContent, logoLight: string): string {
  const logo = resizeLogo(logoLight, 220);
  const tag = c.tag
    ? `<div class="tag"><span class="tag-dot">•</span> ${esc(c.tag)}</div>` : '';
  const points = (c.points ?? []).slice(0, 4);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${FONTS}
${RESET}
.canvas {
  width: 1080px; height: 1080px;
  position: relative; overflow: hidden;
  background:
    ${RADIAL_LIGHT('80%', '15%', 'rgba(70,99,129,0.5)')},
    linear-gradient(155deg, #1B3E5F 0%, #10273D 60%, #081825 100%);
}
.noise {
  position: absolute; inset: 0;
  background-image: ${WAVE_PATTERN('rgba(255,255,255,0.03)')};
  background-size: 120px 24px;
}
.gold-line {
  position: absolute; top: 0; left: 0; right: 0; height: 4px;
  background: linear-gradient(90deg, #B68D54, #CCB38E 40%, transparent);
}
.content {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  justify-content: center;
  padding: 72px 88px 196px;
}
.tag {
  display: inline-flex; align-items: center; gap: 10px;
  font-family: 'Outfit', sans-serif;
  font-size: 24px; font-weight: 500;
  color: #CCB38E; letter-spacing: 0.08em; text-transform: uppercase;
  background: rgba(182,141,84,0.1); border: 1px solid rgba(182,141,84,0.28);
  border-radius: 999px; padding: 8px 20px;
  margin-bottom: 36px; width: fit-content;
}
.tag-dot { color: #B68D54; font-size: 16px; }
.headline {
  font-family: 'Crimson Pro', Georgia, serif;
  font-size: 80px; font-weight: 600;
  color: #FEFBF6; line-height: 1.08;
  letter-spacing: -0.02em; margin-bottom: 40px;
}
.points { display: flex; flex-direction: column; gap: 20px; }
.point {
  display: flex; align-items: flex-start; gap: 0;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 16px;
  padding: 24px 28px;
}
.bullet-wrap {
  flex-shrink: 0; width: 36px; padding-top: 5px;
}
.bullet {
  width: 14px; height: 14px; border-radius: 50%;
  background: #B68D54;
}
.point-text {
  font-family: 'Outfit', sans-serif;
  font-size: 34px; font-weight: 300;
  color: #FEFBF6; line-height: 1.4;
}
.logo {
  position: absolute; bottom: 56px; left: 88px;
  width: 220px; line-height: 0;
}
</style></head><body>
<div class="canvas">
  <div class="noise"></div>
  <div class="gold-line"></div>
  <div class="content">
    ${tag}
    <div class="headline">${esc(c.headline)}</div>
    <div class="points">
      ${points.map(p => `
        <div class="point">
          <div class="bullet-wrap"><div class="bullet"></div></div>
          <div class="point-text">${esc(p)}</div>
        </div>`).join('')}
    </div>
  </div>
  <div class="logo">${logo}</div>
</div>
</body></html>`;
}

// ── Carousel Templates ──────────────────────────────────────────────────────

export function renderCarouselCover(c: CarouselSlideContent, logoLight: string): string {
  const logo = resizeLogo(logoLight, 200);
  const tag = c.tag
    ? `<div class="tag"><span class="dot">•</span> ${esc(c.tag)}</div>` : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${FONTS}
${RESET}
.canvas {
  width: 1080px; height: 1080px;
  position: relative; overflow: hidden;
  background:
    ${RADIAL_LIGHT('80%', '20%', 'rgba(70,99,129,0.55)')},
    linear-gradient(155deg, #1B3E5F 0%, #10273D 60%, #081825 100%);
}
.noise { position:absolute;inset:0;background-image:${WAVE_PATTERN()};background-size:120px 24px; }
.gold-line { position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#B68D54,#CCB38E 40%,transparent); }
.content {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  justify-content: flex-end;
  padding: 80px 88px 200px;
}
.tag {
  display:inline-flex;align-items:center;gap:10px;
  font-family:'Outfit',sans-serif;font-size:26px;font-weight:500;
  color:#CCB38E;letter-spacing:0.08em;text-transform:uppercase;
  background:rgba(182,141,84,0.1);border:1px solid rgba(182,141,84,0.28);
  border-radius:999px;padding:10px 24px;margin-bottom:40px;width:fit-content;
}
.dot { color:#B68D54; }
.headline {
  font-family:'Crimson Pro',Georgia,serif;
  font-size:104px;font-weight:600;color:#FEFBF6;
  line-height:1.05;letter-spacing:-0.02em;margin-bottom:44px;
  text-shadow:0 2px 40px rgba(0,0,0,0.4);
}
.swipe {
  font-family:'Outfit',sans-serif;font-size:30px;font-weight:400;
  color:#7A99B8;letter-spacing:0.03em;
}
.logo { position:absolute;bottom:56px;left:88px;width:200px;line-height:0; }
</style></head><body>
<div class="canvas">
  <div class="noise"></div><div class="gold-line"></div>
  <div class="content">
    ${tag}
    <div class="headline">${esc(c.headline)}</div>
    <div class="swipe">Swipe to learn more →</div>
  </div>
  <div class="logo">${logo}</div>
</div>
</body></html>`;
}

export function renderCarouselContent(
  c: CarouselSlideContent, num: number, isEven: boolean,
  logoLight: string, logoDark: string
): string {
  const isDark = !isEven;
  const logo = resizeLogo(isDark ? logoLight : logoDark, 180);

  const darkStyles = `
  .canvas { background:${RADIAL_LIGHT('75%','25%','rgba(70,99,129,0.4)')},linear-gradient(155deg,#1B3E5F 0%,#10273D 60%,#081825 100%); }
  .noise { position:absolute;inset:0;background-image:${WAVE_PATTERN()};background-size:120px 24px; }
  .num { color:#B68D54; }
  .headline { color:#FEFBF6; }
  .body { color:rgba(224,232,240,0.82); }`;

  const lightStyles = `
  .canvas { background:radial-gradient(ellipse 80% 60% at 30% 60%,#E8EFF5 0%,#FEFBF6 60%); }
  .gold-accent { position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#B68D54,#CCB38E 40%,transparent); }
  .num { color:#B68D54; }
  .headline { color:#10273D; }
  .body { color:#504D49; }`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${FONTS}
${RESET}
.canvas { width:1080px;height:1080px;position:relative;overflow:hidden; }
${isDark ? darkStyles : lightStyles}
.content {
  position:absolute;inset:0;
  display:flex;flex-direction:column;justify-content:center;
  padding:80px 88px 200px;
}
.num {
  font-family:'Outfit',sans-serif;font-size:28px;font-weight:500;
  letter-spacing:0.08em;margin-bottom:32px;
  position:absolute;top:60px;left:88px;
}
.headline {
  font-family:'Crimson Pro',Georgia,serif;
  font-size:88px;font-weight:600;line-height:1.06;
  letter-spacing:-0.02em;margin-bottom:40px;
}
.body {
  font-family:'Outfit',sans-serif;font-size:38px;font-weight:300;
  line-height:1.58;max-width:900px;
}
.logo { position:absolute;bottom:52px;left:88px;width:180px;line-height:0; }
</style></head><body>
<div class="canvas">
  ${isDark ? '<div class="noise"></div>' : '<div class="gold-accent"></div>'}
  <div class="num">${String(num).padStart(2,'0')}</div>
  <div class="content">
    <div class="headline">${esc(c.headline)}</div>
    ${c.body ? `<div class="body">${esc(c.body)}</div>` : ''}
  </div>
  <div class="logo">${logo}</div>
</div>
</body></html>`;
}

export function renderCarouselCTA(c: CarouselSlideContent, logoLight: string): string {
  const logo = resizeLogo(logoLight, 280);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${FONTS}
${RESET}
.canvas {
  width:1080px;height:1080px;position:relative;overflow:hidden;
  background:
    ${RADIAL_LIGHT('50%','40%','rgba(70,99,129,0.4)')},
    linear-gradient(160deg,#10273D 0%,#081825 100%);
}
.noise { position:absolute;inset:0;background-image:${WAVE_PATTERN()};background-size:120px 24px; }
.gold-line { position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#B68D54,#CCB38E 40%,transparent); }
.content {
  position:absolute;inset:0;
  display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  text-align:center;padding:80px;gap:0;
}
.headline {
  font-family:'Crimson Pro',Georgia,serif;
  font-size:88px;font-weight:600;color:#FEFBF6;
  line-height:1.08;letter-spacing:-0.02em;margin-bottom:36px;
}
.cta {
  font-family:'Outfit',sans-serif;font-size:36px;font-weight:400;
  color:#CCB38E;margin-bottom:24px;
}
.handle {
  font-family:'Outfit',sans-serif;font-size:28px;font-weight:300;
  color:#7A99B8;margin-bottom:56px;
}
.logo { line-height:0; }
</style></head><body>
<div class="canvas">
  <div class="noise"></div><div class="gold-line"></div>
  <div class="content">
    <div class="headline">${esc(c.headline)}</div>
    <div class="cta">${esc(c.ctaLine ?? 'Save this for later')}</div>
    <div class="handle">@borderpass.ca</div>
    <div class="logo">${logo}</div>
  </div>
</div>
</body></html>`;
}

// ── Dispatcher ──────────────────────────────────────────────────────────────

export function renderImage(content: ImageContent, logoLight: string, logoDark: string): string {
  switch (content.layout) {
    case 'stat_cards':      return renderStatCards(content, logoLight);
    case 'editorial_warm':  return renderEditorialWarm(content, logoDark);
    case 'textured_dark':   return renderTexturedDark(content, logoLight);
    case 'checklist':       return renderChecklist(content, logoLight);
    default:                return renderGradientNews(content, logoLight);
  }
}

