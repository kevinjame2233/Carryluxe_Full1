document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const container = document.querySelector('.product-container') || document.getElementById('product-detail') || document.body;

    if (!id) {
        if (document.getElementById('product-detail')) document.getElementById('product-detail').innerText = 'Product not found';
        return;
    }

    try {
        const res = await fetch('/api/products/' + id);
        if (!res.ok) throw new Error('Product not found');
        const p = await res.json();

        document.title = `${p.name} - CarryLuxe`;

        // Update elements if they exist (product.html structure)
        const brandEl = document.getElementById('p-brand');
        if (brandEl) brandEl.innerText = p.brand;

        const nameEl = document.getElementById('p-name');
        if (nameEl) nameEl.innerText = p.name;

        const priceEl = document.getElementById('p-price');
        if (priceEl) priceEl.innerText = `$${p.price.toLocaleString()} ${p.currency || 'USD'}`;

        const descEl = document.getElementById('p-desc');
        if (descEl) descEl.innerText = p.description;

        const mainImg = document.getElementById('main-image');
        const thumbsContainer = document.getElementById('thumbnails');

        if (mainImg && thumbsContainer) {
            if (p.images && p.images.length > 0) {
                mainImg.src = p.images[0];
                thumbsContainer.innerHTML = '';
                p.images.forEach((img, idx) => {
                    const thumb = document.createElement('img');
                    thumb.src = img;
                    thumb.className = `thumb ${idx === 0 ? 'active' : ''}`;
                    thumb.onclick = () => window.changeImage(img, thumb);
                    thumbsContainer.appendChild(thumb);
                });
            } else {
                mainImg.src = '/assets/images/placeholder.jpg';
                thumbsContainer.innerHTML = '';
            }
        }

        const buyBtn = document.getElementById('buy-btn');
        if (buyBtn) {
            buyBtn.onclick = () => {
                window.location.href = `/payment.html?productId=${p.id}`;
            };
        }

        window.changeImage = function (src, thumb) {
            const main = document.getElementById('main-image');
            if (main) main.src = src;
            document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
            if (thumb) thumb.classList.add('active');
        };

    } catch (e) {
        console.error(e);
        if (document.getElementById('product-detail')) document.getElementById('product-detail').innerText = 'Error loading product.';
    }
});