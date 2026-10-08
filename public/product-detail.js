// Product detail page with 3D card flip effects
(function() {
  class ProductDetail {
    constructor(productId) {
      this.productId = productId;
      this.init();
    }

    init() {
      const card = document.querySelector(`[data-product-id="${this.productId}"]`);
      if (!card) return;

      card.addEventListener('click', (e) => {
        if (e.target.closest('form')) return;
        this.flip(card);
      });

      card.style.cursor = 'pointer';
      card.addEventListener('mouseenter', () => {
        card.style.perspective = '1000px';
      });
    }

    flip(card) {
      const isFlipped = card.dataset.flipped === 'true';
      card.dataset.flipped = !isFlipped;
      card.style.transform = isFlipped ? 'rotateY(0deg)' : 'rotateY(180deg)';
      card.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
    }
  }

  window.ProductDetail = ProductDetail;
})();
