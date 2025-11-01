# CarryLuxe - Full

This is a full demo of CarryLuxe (Luxury Bags site).
Features:
- Node.js + Express backend
- JSON file storage (data/products.json and data/orders.json)
- Admin setup using SETUP_TOKEN (create admin via /api/admin/setup)
- Admin login (session-based)
- Order emails (Nodemailer) and saved orders

## Quick start
1. Install dependencies:
   npm install
2. Set environment variables (recommended):
   SETUP_TOKEN=yourtoken
   ADMIN_EMAIL=carryluxe3@gmail.com
   ADMIN_PASSWORD=Lux@Elite2025#
   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (optional for real email)
3. Run:
   npm start
4. Visit http://localhost:3000/
