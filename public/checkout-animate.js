// Checkout page animations and form effects
(function() {
  class CheckoutAnimator {
    constructor() {
      this.init();
    }

    init() {
      const form = document.querySelector('form[action="/checkout"]');
      if (!form) return;

      const inputs = form.querySelectorAll('input, select');
      inputs.forEach((input, i) => {
        input.style.animation = `slideInUp 0.5s ease-out ${i * 0.1}s both`;
      });

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.addEventListener('click', (e) => {
          if (!form.checkValidity()) {
            e.preventDefault();
            inputs.forEach((input) => {
              if (!input.checkValidity()) {
                input.style.animation = 'shake 0.3s ease-in-out';
              }
            });
          }
        });
      }
    }
  }

  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-10px); }
      75% { transform: translateX(10px); }
    }
  `;
  document.head.appendChild(style);

  window.addEventListener('DOMContentLoaded', () => {
    new CheckoutAnimator();
  });
})();
