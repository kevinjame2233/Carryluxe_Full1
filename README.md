# CarryLuxe - Luxury Handbag E-commerce

A minimalist e-commerce platform for luxury handbags, built with Node.js and Express.

## Features

- 🛍️ Product catalog with Hermès and Louis Vuitton collections
- 📸 Admin dashboard with image upload capability (up to 50 products)
- 💬 WhatsApp integration for customer support
- 📧 Email notifications for new orders
- 🔒 Secure admin authentication
- 📱 Fully responsive design

## Quick Start

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with required variables:
   ```
   PORT=3000
   SESSION_SECRET=jK93uQf7xLzPz2FhG8rWs0aTnE5qYp9v
   ADMIN_EMAIL=carryluxe3@gmail.com
   ADMIN_PASSWORD=C@rryLuxe_2025#
   SETUP_TOKEN=CarryLuxeSetupToken2025
   WHATSAPP_NUMBER=16188509790
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. Visit http://localhost:3000

## Project Structure

```
carryluxe/
├── data/               # JSON storage (products, orders)
├── public/            
│   ├── assets/        # Static assets (CSS, JS, images)
│   ├── uploads/       # Uploaded product images
│   └── *.html         # Frontend pages
├── .env               # Environment variables
├── package.json       # Dependencies and scripts
├── server.js          # Express server
└── vercel.json        # Vercel deployment config
```

## Development

- Frontend: Pure HTML/CSS/JS with a minimalist black-and-white theme
- Backend: Node.js + Express with JSON file storage
- Image uploads: Multer middleware (max 5MB per file)
- Security: Helmet, rate limiting, and secure sessions
- WhatsApp Integration: Direct customer chat via wa.me links

## Deployment

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

## Security Features

- Rate limiting (100 requests per 15 minutes)
- Secure session handling
- HTTP security headers (Helmet)
- CORS protection
- File upload restrictions
- Environment variable protection

## Admin Features

- Secure login system
- Product management (up to 50 items)
- Image upload capability
- Order tracking
- Email notifications

## License

MIT

## Author

CarryLuxe Team
