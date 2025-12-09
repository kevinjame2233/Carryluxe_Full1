document.addEventListener('DOMContentLoaded', () => {
    // Hero Slideshow
    const heroSlides = [
        '/mnt/data/A_digital_graphic_slide_features_a_dark,_textured_.png',
        '/assets/images/hero1.jpg',
        '/assets/images/hero2.jpg'
    ];
    // Preload images
    heroSlides.forEach(src => { const img = new Image(); img.src = src; });

    let currentSlide = 0;
    const heroSection = document.querySelector('.hero');

    // Create slides
    if (heroSection) {
        heroSection.innerHTML = ''; // Clear existing
        heroSlides.forEach((src, index) => {
            const slide = document.createElement('div');
            slide.className = `hero-slide ${index === 0 ? 'active' : ''}`;
            slide.innerHTML = `<img src="${src}" alt="Hero Slide ${index + 1}">`;
            heroSection.appendChild(slide);
        });

        // Add overlay back
        const overlay = document.createElement('div');
        overlay.className = 'hero-overlay';
        overlay.innerHTML = `
            <h1>Curated Luxury, Carried with Elegance</h1>
            <p>Discover our exclusive collection of authentic vintage handbags.</p>
            <a href="#product-grid" class="cta-btn">Shop Collection</a>
        `;
        heroSection.appendChild(overlay);

        // Auto rotate
        setInterval(() => {
            const slides = document.querySelectorAll('.hero-slide');
            slides[currentSlide].classList.remove('active');
            currentSlide = (currentSlide + 1) % slides.length;
            slides[currentSlide].classList.add('active');
        }, 5000);
    }

    // Product Grid & Quick View
    const productGrid = document.getElementById('product-grid');
    const qvModal = document.getElementById('quick-view-modal');
    const qvClose = qvModal?.querySelector('.modal-close');

    if (qvClose) qvClose.onclick = () => qvModal.classList.remove('show');
    window.onclick = (e) => { if (e.target === qvModal) qvModal.classList.remove('show'); };

    let allProducts = [];

    async function loadProducts() {
        try {
            const res = await fetch('/api/products');
            allProducts = await res.json();
            document.addEventListener('DOMContentLoaded', () => {
                // Hero Slideshow
                const heroSlides = [
                    '/mnt/data/A_digital_graphic_slide_features_a_dark,_textured_.png',
                    '/assets/images/hero1.jpg',
                    '/assets/images/hero2.jpg'
                ];
                // Preload images
                heroSlides.forEach(src => { const img = new Image(); img.src = src; });

                let currentSlide = 0;
                const heroSection = document.querySelector('.hero');

                // Create slides
                if (heroSection) {
                    heroSection.innerHTML = ''; // Clear existing
                    heroSlides.forEach((src, index) => {
                        const slide = document.createElement('div');
                        slide.className = `hero-slide ${index === 0 ? 'active' : ''}`;
                        slide.innerHTML = `<img src="${src}" alt="Hero Slide ${index + 1}">`;
                        heroSection.appendChild(slide);
                    });

                    // Add overlay back
                    const overlay = document.createElement('div');
                    overlay.className = 'hero-overlay';
                    overlay.innerHTML = `
            <h1>Curated Luxury, Carried with Elegance</h1>
            <p>Discover our exclusive collection of authentic vintage handbags.</p>
            <a href="#product-grid" class="cta-btn">Shop Collection</a>
        `;
                    heroSection.appendChild(overlay);

                    // Auto rotate
                    setInterval(() => {
                        const slides = document.querySelectorAll('.hero-slide');
                        slides[currentSlide].classList.remove('active');
                        currentSlide = (currentSlide + 1) % slides.length;
                        slides[currentSlide].classList.add('active');
                    }, 5000);
                }

                // Product Grid & Quick View
                const productGrid = document.getElementById('product-grid');
                const qvModal = document.getElementById('quick-view-modal');
                const qvClose = qvModal?.querySelector('.modal-close');

                if (qvClose) qvClose.onclick = () => qvModal.classList.remove('show');
                window.onclick = (e) => { if (e.target === qvModal) qvModal.classList.remove('show'); };

                let allProducts = [];

                async function loadProducts() {
                    try {
                        const res = await fetch('/api/products');
                        allProducts = await res.json();
                        renderProducts(allProducts);
                    } catch (e) {
                        console.error('Error loading products', e);
                    }
                }

                function renderProducts(products) {
                    productGrid.innerHTML = '';
                    if (products.length === 0) {
                        productGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#777">No products found.</p>';
                        return;
                    }
                    products.forEach(p => {
                        const card = document.createElement('div');
                        card.className = 'card';
                        const imgUrl = p.images && p.images[0] ? p.images[0] : '/assets/images/placeholder.jpg';

                        card.innerHTML = `
                <img src="${imgUrl}" alt="${p.name}">
                <div class="card-content">
                    <div class="auth-badge">
                        <span class="icon">✓</span> ${p.authenticity || 'Verified Authentic'}
                    </div>
                    <span class="brand">${p.brand}</span>
                    <h3>${p.name}</h3>
                    <div class="price">$${p.price.toLocaleString()}</div>
                </div>
            `;

                        // Click to open Quick View
                        card.addEventListener('click', () => openQuickView(p));
                        productGrid.appendChild(card);
                    });
                }

                function openQuickView(p) {
                    if (!qvModal) return;

                    document.getElementById('qv-img').src = p.images && p.images[0] ? p.images[0] : '/assets/images/placeholder.jpg';
                    document.getElementById('qv-brand').innerText = p.brand;
                    document.getElementById('qv-name').innerText = p.name;
                    document.getElementById('qv-price').innerText = `$${p.price.toLocaleString()}`;
                    document.getElementById('qv-desc').innerText = p.description || 'No description available.';

                    const buyBtn = document.getElementById('qv-buy');
                    buyBtn.href = `/payment.html?productId=${p.id}`;

                    qvModal.classList.add('show');
                }

                // Filtering Logic
                const searchInput = document.getElementById('search-input');
                const brandFilter = document.getElementById('brand-filter');
                const priceFilter = document.getElementById('price-filter');

                function filterProducts() {
                    const term = searchInput.value.toLowerCase();
                    const brand = brandFilter.value;
                    const priceRange = priceFilter.value;

                    const filtered = allProducts.filter(p => {
                        const matchesName = p.name.toLowerCase().includes(term) || p.brand.toLowerCase().includes(term);
                        const matchesBrand = !brand || p.brand === brand;
                        let matchesPrice = true;
                        if (priceRange) {
                            const [min, max] = priceRange.split('-').map(Number);
                            if (priceRange === '10000+') matchesPrice = p.price >= 10000;
                            else matchesPrice = p.price >= min && p.price <= max;
                        }
                        return matchesName && matchesBrand && matchesPrice;
                    });
                    renderProducts(filtered);
                }

                searchInput?.addEventListener('input', filterProducts);
                brandFilter?.addEventListener('change', filterProducts);
                priceFilter?.addEventListener('change', filterProducts);

                // Initial Load
                loadProducts();

                // Social Proof Popup
                const messages = [
                    "Someone from New York just purchased a Louis Vuitton Alma BB",
                    "A customer in Los Angeles added a Hermès Birkin 30 to cart",
                    "A shopper from Chicago viewed the LV Spring Collection",
                    "San Francisco buyer just sent payment for Capucines MM",
                    "Someone from Miami just purchased a Hermès Kelly",
                    "A customer from Boston is viewing the Hermès Constance"
                ];
                function showPopup() {
                    const txt = messages[Math.floor(Math.random() * messages.length)];
                    const el = document.createElement('div');
                    el.className = 'popup-message';
                    el.innerText = txt;
                    document.body.appendChild(el);
                    setTimeout(() => el.classList.add('show'), 50);
                    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 600); }, 6000);
                }
                setInterval(showPopup, 15000);
            });