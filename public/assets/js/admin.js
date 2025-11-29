document.addEventListener('DOMContentLoaded', () => {
	const loginForm = document.getElementById('login-form');
	const adminArea = document.getElementById('admin-area');
	const productForm = document.getElementById('product-form');
	const adminProducts = document.getElementById('admin-products');
	const adminOrders = document.getElementById('admin-orders');
	const logoutBtn = document.getElementById('logout');
	const cancelEditBtn = document.getElementById('cancel-edit');
	const saveBtn = document.getElementById('save-btn');
	const productIdInput = document.getElementById('product-id');

	async function showToast(msg) {
		const c = document.getElementById('popup-container');
		if (!c) return alert(msg);
		const el = document.createElement('div'); el.className = 'toast'; el.innerText = msg; c.appendChild(el); setTimeout(() => el.classList.add('show'), 20); setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 500); }, 3000);
	}

	loginForm?.addEventListener('submit', async (e) => {
		e.preventDefault();
		const fd = new FormData(loginForm);
		const res = await fetch('/api/admin/login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') }) });
		const data = await res.json();
		if (data.success) { showToast('Logged in'); loginForm.classList.add('hidden'); adminArea.classList.remove('hidden'); loadAdminProducts(); loadOrders(); } else { showToast('Login failed'); }
	});

	productForm?.addEventListener('submit', async (e) => {
		e.preventDefault();
		const fd = new FormData(productForm);
		const id = productIdInput.value;
		const method = id ? 'PUT' : 'POST';
		const url = id ? '/api/admin/products/' + id : '/api/admin/products';

		const res = await fetch(url, { method: method, credentials: 'same-origin', body: fd });
		const data = await res.json();
		if (data.success) {
			showToast(id ? 'Product updated' : 'Product saved');
			resetForm();
			loadAdminProducts();
		} else {
			showToast('Failed: ' + (data.error || 'unknown'));
		}
	});

	cancelEditBtn?.addEventListener('click', resetForm);

	function resetForm() {
		productForm.reset();
		productIdInput.value = '';
		document.getElementById('existing-images').value = '';
		saveBtn.innerText = 'Save Product';
		cancelEditBtn.classList.add('hidden');
	}

	async function loadAdminProducts() {
		const res = await fetch('/api/admin/products', { credentials: 'same-origin' });
		if (res.status === 401) return;
		const products = await res.json();
		adminProducts.innerHTML = '';
		products.forEach(p => {
			const div = document.createElement('div');
			div.className = 'admin-product-item';
			const img = p.images && p.images[0] ? `<img src="${p.images[0]}" style="width:50px;height:50px;object-fit:cover;margin-right:10px">` : '';
			const statusBadge = p.status === 'safe' ? '<span style="color:red">[SAFE/HIDDEN]</span>' : '<span style="color:green">[ACTIVE]</span>';
			div.innerHTML = `<div style="display:flex;align-items:center">${img} <div><strong>${p.name}</strong> (${p.brand}) - $${p.price} (Stock: ${p.stock || 1}) <br> ${statusBadge}</div></div> <div><button data-id="${p.id}" class="edit btn small">Edit</button> <button data-id="${p.id}" class="del btn small danger">Delete</button></div>`;
			adminProducts.appendChild(div);
		});

		// Attach listeners
		adminProducts.querySelectorAll('.del').forEach(b => b.addEventListener('click', async (e) => {
			if (!confirm('Delete this product?')) return;
			const id = e.target.dataset.id;
			await fetch('/api/admin/products/' + id, { method: 'DELETE', credentials: 'same-origin' });
			loadAdminProducts();
		}));

		adminProducts.querySelectorAll('.edit').forEach(b => b.addEventListener('click', async (e) => {
			const id = e.target.dataset.id;
			const p = products.find(x => x.id == id);
			if (!p) return;

			productIdInput.value = p.id;
			productForm.brand.value = p.brand;
			productForm.name.value = p.name;
			productForm.price.value = p.price;
			productForm.stock.value = p.stock || 1;
			productForm.description.value = p.description || '';
			productForm.status.value = p.status || 'active';

			// Handle existing images
			document.getElementById('existing-images').value = JSON.stringify(p.images || []);

			// If there are extra URLs that were not uploaded files, we could try to put them in imageUrls, 
			// but for simplicity we just keep them in existingImages hidden field.
			// We clear the imageUrls input to avoid duplication if they save again.
			productForm.imageUrls.value = '';

			saveBtn.innerText = 'Update Product';
			cancelEditBtn.classList.remove('hidden');
			productForm.scrollIntoView({ behavior: 'smooth' });
		}));
	}

	async function loadOrders() {
		const res = await fetch('/api/admin/orders', { credentials: 'same-origin' });
		if (res.status === 401) return;
		const orders = await res.json();
		adminOrders.innerHTML = orders.map(o => `<div class="order-item"><b>#${o.id}</b> - ${o.product.name} ($${o.product.price})<br>Customer: ${o.name} (${o.email}, ${o.phone})<br>Address: ${o.address}<br>Date: ${new Date(o.date).toLocaleString()}</div>`).join('');
	}

	logoutBtn?.addEventListener('click', async () => { await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' }); location.reload(); });
});