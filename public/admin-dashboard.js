// Admin dashboard with real-time updates
(function() {
  class AdminDashboard {
    constructor() {
      this.init();
      this.setupAutoRefresh();
    }

    init() {
      const tables = document.querySelectorAll('table');
      tables.forEach((table) => {
        table.style.borderCollapse = 'separate';
        table.style.borderSpacing = '0 8px';

        const rows = table.querySelectorAll('tbody tr');
        rows.forEach((row, i) => {
          row.style.animation = `fadeIn 0.3s ease-out ${i * 0.05}s both`;
          row.addEventListener('mouseenter', () => {
            row.style.boxShadow = '0 0 20px #ff2bd6, inset 0 0 10px rgba(0, 240, 255, 0.2)';
            row.style.transform = 'translateX(5px)';
          });
          row.addEventListener('mouseleave', () => {
            row.style.boxShadow = 'none';
            row.style.transform = 'translateX(0)';
          });
        });
      });
    }

    setupAutoRefresh() {
      setInterval(() => {
        fetch('/api/adapters/status')
          .then((res) => res.json())
          .then((data) => {
            // Update UI with new data
            console.log('Adapter status:', data);
          })
          .catch((err) => console.error('Auto-refresh error:', err));
      }, 30000); // Refresh every 30 seconds
    }
  }

  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(style);

  window.addEventListener('DOMContentLoaded', () => {
    new AdminDashboard();
  });
})();
