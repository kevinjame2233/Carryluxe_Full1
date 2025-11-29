document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('productId');

    const checkoutView = document.getElementById('checkout-view');
    const successModal = document.getElementById('success-modal');
    const productSummary = document.getElementById('product-details');
    const paymentForm = document.getElementById('payment-form');
    const loadingEl = document.getElementById('product-loading');
    const loaderOverlay = document.getElementById('loader');

    if (!productId) {
        loadingEl.innerText = 'No product selected. Please return to shop.';
        return;
    }

    // Fetch product details
    try {
        const res = await fetch(`/api/products/${productId}`);
        if (!res.ok) throw new Error('Product not found');

        const product = await res.json();

        // Populate summary
        document.getElementById('p-img').src = (product.images && product.images[0]) ? product.images[0] : '/assets/images/placeholder.jpg';
        document.getElementById('p-name').innerText = product.name;
        document.getElementById('p-brand').innerText = product.brand;
        document.getElementById('p-price').innerText = `$${product.price.toLocaleString()} ${product.currency || 'USD'}`;
        document.getElementById('productId').value = product.id;

        loadingEl.classList.add('hidden');
        productSummary.classList.remove('hidden');
    } catch (e) {
        loadingEl.innerText = 'Error loading product details.';
        console.error(e);
    }

    // Handle form submission
    paymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Show loader
        loaderOverlay.classList.add('show');

        const fd = new FormData(paymentForm);
        const payload = {
            productId: fd.get('productId'),
            name: fd.get('name'),
            email: fd.get('email'),
            phone: fd.get('phone'),
            address: fd.get('address'),
            note: fd.get('note')
        };

        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            // Hide loader
            loaderOverlay.classList.remove('show');

            if (data.success) {
                // Show success modal
                successModal.classList.add('show');

                // Construct WhatsApp Link
                const orderId = data.order.id;
                const productName = document.getElementById('p-name').innerText;
                const waNumber = '16188509790'; // From .env or default
                const text = `Hi, I just placed Order #${orderId} for ${productName}. Please confirm details.`;
                const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;

                document.getElementById('whatsapp-link').href = waLink;
            } else {
                alert('Order failed: ' + (data.error || 'Unknown error'));
            }
        } catch (e) {
            loaderOverlay.classList.remove('show');
            console.error(e);
            alert('Network error. Please try again.');
        }
    });
});
