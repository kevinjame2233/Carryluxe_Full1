document.addEventListener('DOMContentLoaded', ()=>{
	const loginForm=document.getElementById('login-form');
	const adminArea=document.getElementById('admin-area');
	const productForm=document.getElementById('product-form');
	const adminProducts=document.getElementById('admin-products');
	const adminOrders=document.getElementById('admin-orders');
	const logoutBtn=document.getElementById('logout');

	async function showToast(msg){
		const c=document.getElementById('popup-container');
		const el=document.createElement('div');el.className='toast';el.innerText=msg;c.appendChild(el);setTimeout(()=>el.classList.add('show'),20);setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),500);},3000);
	}

	loginForm?.addEventListener('submit',async (e)=>{
		e.preventDefault();
		const fd=new FormData(loginForm);
		const res=await fetch('/api/admin/login',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({ email: fd.get('email'), password: fd.get('password') })});
		const data=await res.json();
		if(data.success){showToast('Logged in');loginForm.classList.add('hidden');adminArea.classList.remove('hidden');loadAdminProducts();loadOrders();} else {showToast('Login failed');}
	});

	productForm?.addEventListener('submit',async (e)=>{
		e.preventDefault();
		const fd=new FormData(productForm);
		// append optional additional image URLs as JSON string
		const extra = fd.get('images');
		if (extra) fd.set('images', JSON.stringify(extra.split(',').map(s=>s.trim()).filter(Boolean).slice(0,10)));

		const res = await fetch('/api/admin/products',{ method:'POST', credentials:'same-origin', body: fd });
		const data = await res.json();
		if(data.success){ showToast('Product saved'); productForm.reset(); loadAdminProducts(); } else { showToast('Failed: '+(data.error||'unknown')); }
	});

	async function loadAdminProducts(){
		const res=await fetch('/api/admin/products', { credentials: 'same-origin' });
		if(res.status===401) return;
		const products=await res.json();
		adminProducts.innerHTML='';
		products.forEach(p=>{
			const div=document.createElement('div');
			div.className='admin-product-item';
			div.innerHTML=`<strong>${p.name}</strong> - ${p.brand} - $${p.price} <button data-id="${p.id}" class="edit">Edit</button> <button data-id="${p.id}" class="del">Delete</button>`;
			adminProducts.appendChild(div);
		});
		adminProducts.querySelectorAll('.del').forEach(b=>b.addEventListener('click',async (e)=>{const id=e.target.dataset.id;await fetch('/api/admin/products/'+id,{method:'DELETE',credentials:'same-origin'});loadAdminProducts();}));
	}

	async function loadOrders(){
		const res=await fetch('/api/admin/orders', { credentials: 'same-origin' });
		if(res.status===401) return;
		const orders=await res.json();
		adminOrders.innerHTML=orders.map(o=>`<div><b>${o.product.name}</b> - ${o.name} - ${o.phone} - ${o.address} - ${o.date}</div>`).join('');
	}

	logoutBtn?.addEventListener('click',async ()=>{await fetch('/api/admin/logout',{method:'POST',credentials:'same-origin'});location.reload();});
});