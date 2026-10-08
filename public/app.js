// CIGgiECIG — Graffiti Street Art Energy
// Neon effects, glitch animations, visceral interactions

(function() {
  const config = {
    neonColors: ['#ff2bd6', '#00f0ff', '#b6ff00', '#ff8a1c', '#7f5af0', '#ff4d6d'],
    glitchIntensity: 0.05,
    particleCount: 120,
    scanlineOpacity: 0.15
  };

  // ============ PARTICLE SYSTEM ============
  class ParticleSystem {
    constructor() {
      this.particles = [];
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'particle-layer';
      this.canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:999;';
      document.body.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.animate();
    }

    resize() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }

    spawn(x, y, color = config.neonColors[Math.floor(Math.random() * config.neonColors.length)]) {
      for (let i = 0; i < 5; i++) {
        this.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8 - 2,
          life: 1,
          color,
          size: Math.random() * 3 + 1,
          decay: Math.random() * 0.02 + 0.015
        });
      }
    }

    animate() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.globalCompositeOperation = 'lighter';

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        p.vy += 0.15;

        if (p.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }

        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = p.life * 0.7;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.globalAlpha = 1;
      requestAnimationFrame(() => this.animate());
    }
  }

  // ============ GLITCH EFFECT ============
  class GlitchOverlay {
    constructor() {
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'glitch-layer';
      this.canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:998;opacity:0.03;';
      document.body.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.generateGlitch();
    }

    resize() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }

    generateGlitch() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      for (let i = 0; i < 20; i++) {
        const y = Math.random() * this.canvas.height;
        const h = Math.random() * 10 + 2;
        this.ctx.fillStyle = `rgba(255, 43, 214, ${Math.random() * 0.3})`;
        this.ctx.fillRect(0, y, this.canvas.width, h);
      }
      
      setTimeout(() => this.generateGlitch(), Math.random() * 500 + 200);
    }
  }

  // ============ EDGE LIGHTING ============
  class EdgeLighting {
    constructor() {
      this.createStyle();
    }

    createStyle() {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes edge-glow {
          0%, 100% { text-shadow: 0 0 10px #ff2bd6, 0 0 20px #ff2bd6, 0 0 30px #ff2bd6; }
          50% { text-shadow: 0 0 20px #00f0ff, 0 0 40px #00f0ff, 0 0 60px #00f0ff; }
        }
        
        @keyframes neon-pulse {
          0%, 100% { box-shadow: inset 0 0 20px #ff2bd6, 0 0 30px #ff2bd6; }
          50% { box-shadow: inset 0 0 40px #00f0ff, 0 0 60px #00f0ff; }
        }
        
        @keyframes scan-lines {
          0% { transform: translateY(0); }
          100% { transform: translateY(10px); }
        }
        
        .neon-text {
          animation: edge-glow 2s ease-in-out infinite;
          color: #f5f7ff;
          font-weight: 900;
          letter-spacing: 2px;
        }
        
        .neon-box {
          animation: neon-pulse 3s ease-in-out infinite;
          border: 3px solid #ff2bd6;
        }
        
        .glitch-text {
          position: relative;
          color: #00f0ff;
        }
        
        .glitch-text::before,
        .glitch-text::after {
          content: attr(data-text);
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
        }
        
        .glitch-text::before {
          animation: glitch-1 0.3s ease-in-out infinite;
          color: #ff2bd6;
          z-index: -1;
        }
        
        .glitch-text::after {
          animation: glitch-2 0.3s ease-in-out infinite;
          color: #b6ff00;
          z-index: -2;
        }
        
        @keyframes glitch-1 {
          0% { clip-path: inset(40% 0 61% 0); transform: translate(-2px, -2px); }
          20% { clip-path: inset(92% 0 1% 0); transform: translate(2px, 2px); }
          40% { clip-path: inset(43% 0 1% 0); transform: translate(-2px, 2px); }
          60% { clip-path: inset(25% 0 58% 0); transform: translate(2px, -2px); }
          80% { clip-path: inset(54% 0 7% 0); transform: translate(-2px, -2px); }
          100% { clip-path: inset(58% 0 43% 0); transform: translate(2px, 2px); }
        }
        
        @keyframes glitch-2 {
          0% { clip-path: inset(27% 0 58% 0); transform: translate(2px, -2px); }
          20% { clip-path: inset(50% 0 30% 0); transform: translate(-2px, 2px); }
          40% { clip-path: inset(1% 0 58% 0); transform: translate(2px, 2px); }
          60% { clip-path: inset(73% 0 58% 0); transform: translate(-2px, -2px); }
          80% { clip-path: inset(63% 0 12% 0); transform: translate(2px, -2px); }
          100% { clip-path: inset(41% 0 53% 0); transform: translate(-2px, 2px); }
        }
        
        body::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background:
            repeating-linear-gradient(
              0deg,
              rgba(255, 255, 255, 0.03),
              rgba(255, 255, 255, 0.03) 1px,
              transparent 1px,
              transparent 2px
            );
          pointer-events: none;
          z-index: 997;
          animation: scan-lines 8s linear infinite;
        }
      `;
      document.head.appendChild(style);
    }
  }

  // ============ BUTTON EFFECTS ============
  class ButtonEffects {
    constructor(particles) {
      this.particles = particles;
      this.initButtons();
    }

    initButtons() {
      document.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') {
          for (let i = 0; i < 10; i++) {
            this.particles.spawn(e.clientX, e.clientY);
          }
        }
      });

      document.querySelectorAll('button, a').forEach((btn) => {
        btn.addEventListener('mouseenter', () => {
          btn.style.transform = 'scale(1.05) rotate(1deg)';
          btn.style.transition = 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.transform = 'scale(1) rotate(0deg)';
        });
      });
    }
  }

  // ============ TEXT ANIMATION ============
  class TextAnimator {
    constructor() {
      this.initGlitchText();
      this.initNeonText();
    }

    initGlitchText() {
      document.querySelectorAll('[data-glitch]').forEach((el) => {
        const text = el.textContent;
        el.setAttribute('data-text', text);
        el.classList.add('glitch-text');
      });
    }

    initNeonText() {
      document.querySelectorAll('.brand').forEach((el) => {
        el.classList.add('neon-text');
      });
    }
  }

  // ============ SCROLL EFFECTS ============
  class ScrollEffects {
    constructor(particles) {
      this.particles = particles;
      this.lastY = 0;
      window.addEventListener('scroll', () => this.onScroll());
    }

    onScroll() {
      const scrollY = window.scrollY;
      const delta = Math.abs(scrollY - this.lastY);
      if (delta > 100) {
        this.particles.spawn(
          window.innerWidth / 2,
          window.innerHeight / 2,
          config.neonColors[Math.floor(Math.random() * config.neonColors.length)]
        );
      }
      this.lastY = scrollY;
    }
  }

  // ============ INIT ============
  window.addEventListener('DOMContentLoaded', () => {
    const particles = new ParticleSystem();
    new GlitchOverlay();
    new EdgeLighting();
    new ButtonEffects(particles);
    new TextAnimator();
    new ScrollEffects(particles);

    console.log('%c🎨 CIGgiECIG Graffiti Engine Loaded 🎨', 'font-size: 16px; color: #ff2bd6; font-weight: bold; text-shadow: 0 0 10px #00f0ff;');
  });
})();
