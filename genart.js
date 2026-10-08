const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function svgCard(title, subtitle, accent, x = 0) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
      <defs>
        <linearGradient id="bg-${x}" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#1a0f14"/>
          <stop offset="100%" stop-color="#09070a"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="720" fill="url(#bg-${x})"/>
      <g opacity="0.8">
        <circle cx="120" cy="650" r="180" fill="#ff2bd6" opacity="0.18"/>
        <circle cx="1000" cy="120" r="200" fill="#00f0ff" opacity="0.16"/>
        <circle cx="1080" cy="540" r="150" fill="#b6ff00" opacity="0.12"/>
      </g>
      <g stroke="#000" stroke-width="12" fill="none" opacity="0.9">
        <path d="M90 74 L1110 74 L1110 670 L90 670 Z"/>
      </g>
      <g fill="#${accent}">
        <path d="M110 104 L1090 104 L1090 166 L110 166 Z"/>
        <path d="M150 594 L1020 594 L1020 642 L150 642 Z"/>
      </g>
      <g font-family="Arial Black, Impact, sans-serif" fill="#f5f7ff">
        <text x="112" y="310" font-size="104" letter-spacing="4">${title}</text>
        <text x="112" y="408" font-size="44" fill="#${accent}">${subtitle}</text>
      </g>
      <g font-family="Verdana, sans-serif" fill="#d9f5ff" font-size="24">
        <text x="112" y="520">21+ ONLY • WARPED • BRICK-HAUNTED</text>
      </g>
      <g fill="#000" opacity="0.85">
        <circle cx="100" cy="100" r="18"/>
        <circle cx="1100" cy="100" r="18"/>
        <circle cx="100" cy="620" r="18"/>
        <circle cx="1100" cy="620" r="18"/>
      </g>
    </svg>
  `;
}

function createTileSvg(name, hue) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">
      <rect width="640" height="640" fill="#120d10"/>
      <rect x="20" y="20" width="600" height="600" fill="#1d1218" stroke="#000" stroke-width="12"/>
      <circle cx="160" cy="120" r="110" fill="#${hue}" opacity="0.44"/>
      <circle cx="420" cy="200" r="130" fill="#00f0ff" opacity="0.25"/>
      <circle cx="360" cy="460" r="150" fill="#ff2bd6" opacity="0.22"/>
      <path d="M80 130 L560 130 L560 200 L80 200 Z" fill="#${hue}"/>
      <path d="M80 440 L560 440 L560 510 L80 510 Z" fill="#b6ff00"/>
      <g font-family="Arial Black, sans-serif" fill="#f9f6ff">
        <text x="76" y="300" font-size="70" letter-spacing="3">${name}</text>
      </g>
      <g font-family="Verdana, sans-serif" fill="#d9f5ff" font-size="22">
        <text x="76" y="550">21+ • product frame</text>
      </g>
    </svg>
  `;
}

function generateArt() {
  const outDir = path.join(__dirname, 'public');
  ensureDir(outDir);
  ensureDir(path.join(outDir, 'tiles'));

  const heroSvg = svgCard('CIGgiECIG', 'WALL MEAT / 21+ ONLY', 'ff2bd6', 0);
  fs.writeFileSync(path.join(outDir, 'hero.svg'), heroSvg.trim());

  const muralSvg = svgCard('3AM CYPHER', 'NEON CRATE / 21+ ONLY', '00f0ff', 1);
  fs.writeFileSync(path.join(outDir, 'mural.svg'), muralSvg.trim());

  for (let i = 1; i <= 6; i += 1) {
    const colors = ['ff2bd6', '00f0ff', 'b6ff00', 'ff8a1c', '7f5af0', 'ff4d6d'];
    const labels = ['AURORA', 'MIDNIGHT', 'CINDER', 'VOLT', 'NOIR', 'PULSE'];
    fs.writeFileSync(path.join(outDir, 'tiles', `tile-${i}.svg`), createTileSvg(labels[i - 1], colors[i - 1]).trim());
  }

  const css = `
    :root {
      --bg: #09070a;
      --panel: #140e13;
      --brick: #2c171b;
      --pink: #ff2bd6;
      --cyan: #00f0ff;
      --lime: #b6ff00;
      --orange: #ff8a1c;
      --purple: #7f5af0;
      --white: #f5f7ff;
      --grid: #111111;
      --muted: #c2d7df;
    }

    * { box-sizing: border-box; }
    html, body { margin: 0; background: var(--bg); color: var(--white); font-family: Arial, sans-serif; }
    body {
      background-image:
        linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px),
        radial-gradient(circle at top, rgba(255,43,214,0.10), transparent 38%),
        linear-gradient(180deg, #09070a, #120f13);
      background-size: 28px 28px, 28px 28px, 100% 100%, 100% 100%;
    }
    .shell { max-width: 1280px; margin: 0 auto; padding: 20px 20px 60px; }
    .topbar { display: flex; justify-content: space-between; align-items: center; padding: 20px 0 26px; }
    .brand {
      font-weight: 900; letter-spacing: 3px; font-size: 2.2rem; text-transform: uppercase;
      background: linear-gradient(135deg, var(--pink), var(--cyan), var(--lime));
      -webkit-background-clip: text; background-clip: text; color: transparent; text-shadow: 4px 4px 0 #000;
    }
    .nav { display: flex; gap: 18px; align-items: center; }
    .nav a { color: var(--white); text-decoration: none; font-weight: 700; }
    .hero { position: relative; margin: 10px 0 28px; border: 10px solid #000; background: #0f0b0f; } 
    .hero img { width: 100%; display: block; border: 6px solid #000; }
    .cta-row { display: flex; gap: 12px; margin-top: 18px; }
    .cta, .ghost { padding: 14px 18px; font-weight: 900; border: 5px solid #000; text-decoration: none; display: inline-block; }
    .cta { background: var(--pink); color: #08070a; }
    .ghost { background: var(--cyan); color: #0b0c0a; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 22px; }
    .card { border: 8px solid #000; background: rgba(20,14,19,0.96); padding: 0; overflow: hidden; }
    .card img { width: 100%; display: block; background: #0a0a0a; }
    .card-body { padding: 16px; }
    .card h3 { margin:0 0 8px; font-size: 1.2rem; }
    .tag { display: inline-block; padding: 6px 8px; background: var(--lime); color: #090909; border: 3px solid #000; font-weight: 800; margin-bottom: 10px; }
    .price { font-size: 1.5rem; font-weight: 900; color: var(--cyan); }
    .muted { color: var(--muted); }
    .section { margin-top: 34px; }
    .status { display: inline-block; padding: 8px 12px; background: var(--pink); color: #1c0d1a; margin-bottom: 12px; border: 5px solid #000; font-weight: 900; }
    form { display: grid; gap: 10px; }
    input, select, button { font: inherit; }
    input, select { padding: 12px; border: 4px solid #000; background: #111; color: white; }
    button { padding: 12px 18px; border: 4px solid #000; background: var(--lime); color: #111; font-weight: 900; }
    .spotlight { background: linear-gradient(180deg, rgba(255,43,214,0.12), rgba(0,240,255,0.06)); border: 8px solid #000; padding: 20px; }
    .admin-panel { display: grid; grid-template-columns: 240px 1fr; gap: 16px; }
    .admin-card { border: 6px solid #000; background: #100b12; padding: 14px; }
    .pill { display: inline-block; padding: 6px 8px; border: 3px solid #000; background: var(--orange); color: #0d0d0d; font-weight: 800; margin: 4px; }
    .warn { color: #ffd36d; }
    .ok { color: var(--lime); }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 8px 10px; border-bottom: 2px solid rgba(255,255,255,0.10); }
    .small { font-size: 0.82rem; }
    @media (max-width: 680px) { .topbar { display: block; } .nav { margin-top: 12px; flex-wrap: wrap; } }
  `;
  fs.writeFileSync(path.join(outDir, 'styles.css'), css.trim());
}

if (require.main === module) {
  generateArt();
  console.log('Generated art assets and CSS into public/');
}

module.exports = { generateArt, svgCard, createTileSvg };
