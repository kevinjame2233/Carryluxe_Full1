// CarryLuxe - Luxury Handbag E-commerce Platform
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
const helmet = require('helmet');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiter
const limiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, 
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter); // Apply rate limiting to API routes only

const DATA_DIR = path.join(__dirname, "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const ADMIN_FILE = path.join(DATA_DIR, "admin.json");
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

// ensure uploads dir exists
if (!fsSync.existsSync(UPLOADS_DIR)) fsSync.mkdirSync(UPLOADS_DIR, { recursive: true });

// File upload configuration: prefer memory uploads so we can forward to Cloudinary if configured
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
  cb(new Error('Only image files are allowed!'), false);
};
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024, files: 1 }, fileFilter });

// configure cloudinary if env provided
if (process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME) {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config({ secure: true });
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
  }
  console.log('Cloudinary configured');
}

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

// --- Optional MongoDB setup (falls back to JSON files) ---
let useDb = false;
const productSchema = new mongoose.Schema({ id: Number, brand: String, name: String, price: Number, currency: { type: String, default: 'USD' }, images: [String], description: String }, { timestamps: true });
const orderSchema = new mongoose.Schema({ id: Number, product: Object, name: String, phone: String, email: String, address: String, date: Date, status: String }, { timestamps: true });

let Product, Order;
async function initDb() {
  if (!process.env.MONGODB_URI) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    Product = mongoose.model('Product', productSchema);
    Order = mongoose.model('Order', orderSchema);
    useDb = true;
    console.log('Connected to MongoDB');
  } catch (e) {
    console.error('MongoDB connection failed, falling back to JSON files', e && e.message ? e.message : e);
  }
}
initDb();

// helper: upload buffer to Cloudinary (returns url)
async function uploadBufferToCloudinary(buffer, filename) {
  if (!cloudinary || !cloudinary.uploader || !(process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME)) {
    throw new Error('Cloudinary not configured');
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: 'carryluxe' }, (error, result) => {
      if (error) return reject(error);
      resolve(result.secure_url || result.url);
    });
    stream.end(buffer);
  });
}

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? [
    'https://carryluxe.vercel.app',
    'https://www.carryluxe.vercel.app'
  ] : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Static files
app.use(express.static(path.join(__dirname, "public"), {
  maxAge: '1d',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || "jK93uQf7xLzPz2FhG8rWs0aTnE5qYp9v",
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  name: 'carryluxe.sid'
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
    try {
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
    } catch (e) {
      console.warn('Could not create Ethereal test account (network?), falling back to no-op transporter', e && e.message ? e.message : e);
      transporter = {
        sendMail: async (opts) => {
          console.log('No SMTP available — email skipped. Subject:', opts.subject);
          return { messageId: 'skipped' };
        }
      };
    }
  }
}
initMailer();

// ---------- API ---------- //
// products
app.get("/api/products", async (req, res) => {
  const brand = req.query.brand;
  try {
    if (useDb) {
      const q = {};
      if (brand) q.brand = new RegExp('^' + brand + '$', 'i');
      const products = await Product.find(q).sort({ createdAt: -1 }).lean();
      return res.json(products);
    }
    const products = await readJSON(PRODUCTS_FILE) || [];
    if (brand) return res.json(products.filter(p => p.brand && p.brand.toLowerCase() === brand.toLowerCase()));
    return res.json(products);
  } catch (e) {
    console.error('Error fetching products', e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get("/api/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    if (useDb) {
      const p = await Product.findOne({ id: id }).lean();
      if (!p) return res.status(404).json({ error: 'Not found' });
      return res.json(p);
    }
    const products = await readJSON(PRODUCTS_FILE) || [];
    const p = products.find(x => x.id === id);
    if (!p) return res.status(404).json({ error: "Not found" });
    res.json(p);
  } catch (e) {
    console.error('Error fetching product', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// orders
app.post("/api/orders", async (req, res) => {
  const { name, phone, address, email, productId } = req.body;
  if (!name || !phone || !address || !productId) return res.status(400).json({ error: "Missing fields" });
  try {
    let product = { id: productId, name: 'Unknown' };
    if (useDb) {
      product = await Product.findOne({ id: Number(productId) }).lean() || product;
      const orderDoc = {
        id: Date.now(),
        product: { id: product.id, name: product.name, price: product.price },
        name, phone, email: email || "", address, date: new Date(), status: "Pending"
      };
      await Order.create(orderDoc);
      var order = orderDoc;
    } else {
      const products = await readJSON(PRODUCTS_FILE) || [];
      product = products.find(p => p.id === Number(productId)) || product;
      const orders = await readJSON(ORDERS_FILE) || [];
      const orderObj = {
        id: Date.now(),
        product: { id: product.id, name: product.name, price: product.price },
        name, phone, email: email || "", address, date: new Date().toISOString(), status: "Pending"
      };
      orders.unshift(orderObj);
      await writeJSON(ORDERS_FILE, orders);
      var order = orderObj;
    }

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
  } catch (e) {
    console.error('Order creation failed', e);
    res.status(500).json({ error: 'Server error' });
  }
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
  try {
    if (useDb) {
      const products = await Product.find().sort({ createdAt: -1 }).lean();
      return res.json(products);
    }
    const products = await readJSON(PRODUCTS_FILE) || [];
    res.json(products);
  } catch (e) {
    console.error('Error fetching admin products', e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post("/api/admin/products", ensureAdmin, upload.single('image'), async (req, res) => {
  try {
    const { brand, name, price, description } = req.body;
    const images = [];
    // handle uploaded image: Cloudinary if configured, else write to local uploads dir
    if (req.file) {
      try {
        if (process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME) {
          const url = await uploadBufferToCloudinary(req.file.buffer, req.file.originalname);
          images.push(url);
        } else {
          const ext = path.extname(req.file.originalname).toLowerCase() || '';
          const safeName = path.basename(req.file.originalname, ext).replace(/[^a-z0-9]/gi, '-').toLowerCase();
          const filename = `${safeName}-${Date.now()}${ext}`;
          await fs.writeFile(path.join(UPLOADS_DIR, filename), req.file.buffer);
          images.push('/uploads/' + filename);
        }
      } catch (e) {
        console.error('Image upload failed', e);
      }
    }
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
    if (useDb) {
      // use timestamp id for uniqueness
      const id = Date.now();
      if (!brand || !name) return res.status(400).json({ error: 'Missing fields' });
      const product = await Product.create({ id, brand, name, price: Number(price || 0), description: description || '', images });
      return res.json({ success: true, product });
    } else {
      const products = await readJSON(PRODUCTS_FILE) || [];
      if (products.length >= 50) return res.status(400).json({ error: "Product limit reached (50)" });
      const id = products.length ? Math.max(...products.map(p => p.id)) + 1 : 1;
      const product = { id, brand, name, price: Number(price), description: description || "", images };
      products.unshift(product);
      await writeJSON(PRODUCTS_FILE, products);
      return res.json({ success: true, product });
    }
  } catch (e) {
    console.error('Error saving product', e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put("/api/admin/products/:id", ensureAdmin, async (req, res) => {
  const id = Number(req.params.id);
  try {
    if (useDb) {
      const updated = await Product.findOneAndUpdate({ id }, { $set: req.body }, { new: true }).lean();
      if (!updated) return res.status(404).json({ error: 'Not found' });
      return res.json({ success: true, product: updated });
    }
    const products = await readJSON(PRODUCTS_FILE) || [];
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    const updated = { ...products[idx], ...req.body };
    products[idx] = updated;
    await writeJSON(PRODUCTS_FILE, products);
    res.json({ success: true, product: updated });
  } catch (e) {
    console.error('Error updating product', e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete("/api/admin/products/:id", ensureAdmin, async (req, res) => {
  const id = Number(req.params.id);
  try {
    if (useDb) {
      await Product.deleteOne({ id });
      return res.json({ success: true });
    }
    let products = await readJSON(PRODUCTS_FILE) || [];
    products = products.filter(p => p.id !== id);
    await writeJSON(PRODUCTS_FILE, products);
    res.json({ success: true });
  } catch (e) {
    console.error('Error deleting product', e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get("/api/admin/orders", ensureAdmin, async (req, res) => {
  try {
    if (useDb) {
      const orders = await Order.find().sort({ createdAt: -1 }).lean();
      return res.json(orders);
    }
    const orders = await readJSON(ORDERS_FILE) || [];
    res.json(orders);
  } catch (e) {
    console.error('Error fetching orders', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// fallback to index.html for SPA behavior
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`CarryLuxe server started on port ${PORT}`);
});