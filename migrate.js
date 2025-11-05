#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

const DATA_DIR = path.join(__dirname, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI not set in environment. Aborting migration.');
    process.exit(1);
  }

  if (process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME) {
    if (process.env.CLOUDINARY_URL) cloudinary.config({ secure: true });
    else cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
    console.log('Cloudinary configured for migration');
  }

  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  const productSchema = new mongoose.Schema({ id: Number, brand: String, name: String, price: Number, currency: { type: String, default: 'USD' }, images: [String], description: String }, { timestamps: true });
  const orderSchema = new mongoose.Schema({ id: Number, product: Object, name: String, phone: String, email: String, address: String, date: Date, status: String }, { timestamps: true });

  const Product = mongoose.model('Product', productSchema);
  const Order = mongoose.model('Order', orderSchema);

  // read files
  let products = [];
  let orders = [];
  try { products = JSON.parse(await fs.readFile(PRODUCTS_FILE, 'utf8') || '[]'); } catch (e) { console.warn('Could not read products.json', e.message); }
  try { orders = JSON.parse(await fs.readFile(ORDERS_FILE, 'utf8') || '[]'); } catch (e) { console.warn('Could not read orders.json', e.message); }

  // upload images to cloudinary if configured
  async function maybeUploadImage(imgPath) {
    if (!imgPath) return imgPath;
    if (!(process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME)) return imgPath;
    // only try to upload local uploads
    if (imgPath.startsWith('/uploads/') || imgPath.startsWith('uploads/') || imgPath.includes('public/uploads')) {
      const local = imgPath.startsWith('/') ? path.join(__dirname, 'public', imgPath) : path.join(__dirname, imgPath);
      if (!fsSync.existsSync(local)) return imgPath;
      try {
        const res = await cloudinary.uploader.upload(local, { folder: 'carryluxe' });
        return res.secure_url || res.url || imgPath;
      } catch (e) {
        console.warn('Cloudinary upload failed for', local, e.message || e);
        return imgPath;
      }
    }
    return imgPath;
  }

  // migrate products
  let migratedProducts = 0;
  for (const p of products) {
    // migrate images
    if (Array.isArray(p.images) && p.images.length) {
      const newImgs = [];
      for (const img of p.images) {
        const url = await maybeUploadImage(img);
        newImgs.push(url);
      }
      p.images = newImgs;
    }
    try {
      await Product.updateOne({ id: p.id }, { $set: p }, { upsert: true });
      migratedProducts++;
    } catch (e) {
      console.warn('Failed to upsert product', p.id, e.message || e);
    }
  }

  // migrate orders
  let migratedOrders = 0;
  for (const o of orders) {
    try {
      // normalize date
      if (o.date && typeof o.date === 'string') o.date = new Date(o.date);
      await Order.updateOne({ id: o.id }, { $set: o }, { upsert: true });
      migratedOrders++;
    } catch (e) {
      console.warn('Failed to upsert order', o.id, e.message || e);
    }
  }

  console.log(`Migration complete — products: ${migratedProducts}, orders: ${migratedOrders}`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Migration failed', err && err.message ? err.message : err);
  process.exit(1);
});
// migrate.js
// Simple migration script to import existing JSON `data/*.json` into MongoDB collections
require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');

const DATA_DIR = path.join(__dirname, 'data');

const productSchema = new mongoose.Schema({
  id: Number,
  brand: String,
  name: String,
  price: Number,
  currency: String,
  images: [String],
  description: String
});
const orderSchema = new mongoose.Schema({
  id: Number,
  product: Object,
  name: String,
  phone: String,
  email: String,
  address: String,
  date: Date,
  status: String
});

const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);

async function readJSON(file) {
  try { const txt = await fs.readFile(file, 'utf8'); return JSON.parse(txt || '[]'); } catch (e) { return []; }
}

async function main(){
  const uri = process.env.MONGODB_URI;
  if (!uri) return console.error('MONGODB_URI not set in .env');
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  const productsFile = path.join(DATA_DIR, 'products.json');
  const ordersFile = path.join(DATA_DIR, 'orders.json');

  const products = await readJSON(productsFile);
  const orders = await readJSON(ordersFile);

  if (products && products.length) {
    console.log('Importing products:', products.length);
    for (const p of products) {
      await Product.updateOne({ id: p.id }, { $set: p }, { upsert: true });
    }
  }
  if (orders && orders.length) {
    console.log('Importing orders:', orders.length);
    for (const o of orders) {
      // ensure date is Date
      if (o.date && typeof o.date === 'string') o.date = new Date(o.date);
      await Order.updateOne({ id: o.id }, { $set: o }, { upsert: true });
    }
  }

  console.log('Migration complete');
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
