// CarryLuxe - Simple full functional server (JSON storage + email orders + admin)
require('dotenv').config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs").promises;
const fsSync = require("fs");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const multer = require('multer');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// rate limiter
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: "Too many requests, try again later." });
app.use(limiter);

const DATA_DIR = path.join(__dirname, "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const ADMIN_FILE = path.join(DATA_DIR, "admin.json");
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

// ensure uploads dir exists
if (!fsSync.existsSync(UPLOADS_DIR)) fsSync.mkdirSync(UPLOADS_DIR, { recursive: true });

// multer setup for admin image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '';
    cb(null, Date.now() + ext);
  }
});
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } });

async function ensureData() {
  if (!fsSync.existsSync(DATA_DIR)) fsSync.mkdirSync(DATA_DIR);
  if (!fsSync.existsSync(PRODUCTS_FILE)) {
    const sample = [
      {
        "id": 1,
        "brand": "Hermès",
        "name": "Birkin 30",
        "price": 9500,
        "currency": "USD",
        "images": ["/assets/images/hermes-birkin.jpg"],
        "description": "Classic Hermès Birkin 30"
      },
      {
        "id": 2,
        "brand": "Louis Vuitton",
        "name": "Capucines MM",
        "price": 6800,
        "currency": "USD",
        "images": ["/assets/images/lv-capucines.jpg"],
        "description": "Elegant Louis Vuitton Capucines"
      }
    ];
    await fs.writeFile(PRODUCTS_FILE, JSON.stringify(sample, null, 2));
  }
  if (!fsSync.existsSync(ORDERS_FILE)) {
    await fs.writeFile(ORDERS_FILE, "[]");
  }
  if (!fsSync.existsSync(ADMIN_FILE)) {
    await fs.writeFile(ADMIN_FILE, "{}");
  }
}
ensureData();

// create admin from env if provided and admin not set
(async function ensureAdminFromEnv(){
  try{
    const a = await readJSON(ADMIN_FILE) || {};
    if ((!a || !a.email) && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
      await writeJSON(ADMIN_FILE, { email: process.env.ADMIN_EMAIL, hash });
      console.log('Admin created from .env');
    }
  }catch(e){ console.error('Error ensuring admin from env', e); }
})();

async function readJSON(file) {
  try {
    const text = await fs.readFile(file, "utf8");
    return JSON.parse(text || "{}");
  } catch (e) {
    return {};
  }
}
async function writeJSON(file, data) {
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(session({
  secret: process.env.SESSION_SECRET || "dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Configure mailer: uses SMTP env vars if provided, else Ethereal test account
let transporter;
async function initMailer() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    console.log("Using provided SMTP transport.");
  } else {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    console.log("Using Ethereal test account for email preview. Check console for preview URL after sending.");
  }
}
initMailer();

// ---------- API ---------- //
// products
app.get("/api/products", async (req, res) => {
  const brand = req.query.brand;
  const products = await readJSON(PRODUCTS_FILE) || [];
  if (brand) {
    return res.json(products.filter(p => p.brand.toLowerCase() === brand.toLowerCase()));
  }
  res.json(products);
});

app.get("/api/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  const products = await readJSON(PRODUCTS_FILE) || [];
  const p = products.find(x => x.id === id);
  if (!p) return res.status(404).json({ error: "Not found" });
  res.json(p);
});

// orders
app.post("/api/orders", async (req, res) => {
  const { name, phone, address, email, productId } = req.body;
  if (!name || !phone || !address || !productId) return res.status(400).json({ error: "Missing fields" });
  const products = await readJSON(PRODUCTS_FILE) || [];
  const product = products.find(p => p.id === Number(productId)) || { id: productId, name: "Unknown" };
  const orders = await readJSON(ORDERS_FILE) || [];
  const order = {
    id: Date.now(),
    product: { id: product.id, name: product.name, price: product.price },
    name, phone, email: email || "", address, date: new Date().toISOString(), status: "Pending"
  };
  orders.unshift(order);
  await writeJSON(ORDERS_FILE, orders);

  // send email to admin
  const adminEmail = process.env.ADMIN_EMAIL || "carryluxe3@gmail.com";
  const mailOptions = {
    from: process.env.SMTP_FROM || `CarryLuxe <no-reply@carryluxe.local>`,
    to: adminEmail,
    subject: `CarryLuxe - New Order #${order.id}`,
    text: `New order received:\\n\\nOrder ID: ${order.id}\\nProduct: ${order.product.name}\\nPrice: ${order.product.price}\\nName: ${order.name}\\nEmail: ${order.email}\\nPhone: ${order.phone}\\nAddress: ${order.address}\\nDate: ${order.date}`
  };
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Order email sent:", info.messageId);
    if (nodemailer.getTestMessageUrl(info)) console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
  } catch (e) {
    console.error("Email error:", e);
  }

  res.json({ success: true, order });
});

// ---------- Admin & Auth ---------- //
async function getAdmin() {
  const a = await readJSON(ADMIN_FILE) || {};
  return a;
}

app.post("/api/admin/setup", async (req, res) => {
  // create admin only if SETUP_TOKEN matches and admin not exists
  const token = req.body.token;
  const envToken = process.env.SETUP_TOKEN;
  if (!envToken || token !== envToken) return res.status(401).json({ error: "Invalid setup token" });
  const admin = await getAdmin();
  if (admin && admin.email) return res.status(400).json({ error: "Admin already created" });
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Missing" });
  const hash = await bcrypt.hash(password, 10);
  await writeJSON(ADMIN_FILE, { email, hash });
  return res.json({ success: true });
});

app.post("/api/admin/login", async (req, res) => {
  const { email, password } = req.body;
  const admin = await getAdmin();
  if (!admin || !admin.email) return res.status(400).json({ error: "Admin not set up" });
  const ok = await bcrypt.compare(password, admin.hash);
  if (!ok || email !== admin.email) return res.status(401).json({ error: "Invalid" });
  req.session.isAdmin = true;
  res.json({ success: true });
});

app.post("/api/admin/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

function ensureAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

// admin product CRUD
app.get("/api/admin/products", ensureAdmin, async (req, res) => {
  const products = await readJSON(PRODUCTS_FILE) || [];
  res.json(products);
});

app.post("/api/admin/products", ensureAdmin, upload.single('image'), async (req, res) => {
  try {
    const { brand, name, price, description } = req.body;
    const products = await readJSON(PRODUCTS_FILE) || [];
    if (products.length >= 50) return res.status(400).json({ error: "Product limit reached (50)" });
    const id = products.length ? Math.max(...products.map(p => p.id)) + 1 : 1;
    const images = [];
    if (req.file) images.push('/uploads/' + req.file.filename);
    // support images passed as JSON or comma separated string
    if (req.body.images) {
      try {
        const imgs = JSON.parse(req.body.images);
        if (Array.isArray(imgs)) images.push(...imgs.map(s => String(s)).slice(0, 10));
      } catch (e) {
        const imgs = String(req.body.images).split(',').map(s => s.trim()).filter(Boolean);
        images.push(...imgs.slice(0, 10));
      }
    }
    const product = { id, brand, name, price: Number(price), description: description || "", images };
    products.unshift(product);
    await writeJSON(PRODUCTS_FILE, products);
    res.json({ success: true, product });
  } catch (e) {
    console.error('Error saving product', e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put("/api/admin/products/:id", ensureAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const products = await readJSON(PRODUCTS_FILE) || [];
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  const updated = { ...products[idx], ...req.body };
  products[idx] = updated;
  await writeJSON(PRODUCTS_FILE, products);
  res.json({ success: true, product: updated });
});

app.delete("/api/admin/products/:id", ensureAdmin, async (req, res) => {
  const id = Number(req.params.id);
  let products = await readJSON(PRODUCTS_FILE) || [];
  products = products.filter(p => p.id !== id);
  await writeJSON(PRODUCTS_FILE, products);
  res.json({ success: true });
});

app.get("/api/admin/orders", ensureAdmin, async (req, res) => {
  const orders = await readJSON(ORDERS_FILE) || [];
  res.json(orders);
});

// fallback to index.html for SPA behavior
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`CarryLuxe server started on port ${PORT}`);
});