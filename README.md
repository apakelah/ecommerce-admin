cat > README.md << 'EOF'
# 🛒 E-Commerce Admin System

**Pre-Interview Test Solution for Web Developer & IT Support Position**

## 📋 Project Overview
A fully functional admin panel for managing purchases, products, and inventory with real-time stock validation and cancellation system.

## ✅ Requirements Fulfilled

### Technical Stack
- **Backend:** Node.js, Express.js
- **Template Engine:** EJS (Embedded JavaScript)
- **Database:** PostgreSQL
- **Frontend:** Bootstrap 5, Vanilla JavaScript
- **Styling:** Custom CSS3

### Core Features Implemented
1. **✅ Admin Dashboard** - Real-time statistics and analytics
2. **✅ Product Management** - View all products with stock levels
3. **✅ Purchase System** - Add new purchases with stock validation
4. **✅ Cancellation System** - Cancel purchases with automatic stock return
5. **✅ Database Operations** - Three required tables with sample data
6. **✅ Real-time Validation** - Stock checking before purchase

### Database Schema
| Table | Description | Fields |
|-------|-------------|--------|
| `produk` | Product information | id, nama_produk, kategori, harga, deskripsi, created_at |
| `stock_produk` | Stock management | id, produk_id, stok, last_updated |
| `pembelian` | Purchase transactions | id, kode_transaksi, produk_id, jumlah, total_harga, nama_pembeli, status, tanggal_pembelian, tanggal_cancel, alasan_cancel |

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (or Docker for PostgreSQL)
- npm or yarn

### Step-by-Step Setup

```bash
# 1. Clone the repository
git clone https://github.com/[your-username]/ecommerce-admin.git
cd ecommerce-admin

# 2. Install dependencies
npm install

# 3. Setup PostgreSQL database
# Option A: Using Docker (Recommended)
docker run -d --name postgres-ecommerce \\
  -e POSTGRES_USER=ecommerce_user \\
  -e POSTGRES_PASSWORD=admin123 \\
  -e POSTGRES_DB=ecommerce_db \\
  -p 5432:5432 \\
  postgres:16-alpine

# 4. Configure environment variables
cp .env.example .env
# Edit .env file with your database credentials

# 5. Initialize database with sample data
npm run db:setup

# 6. Start the application
npm start

# 7. Access the application
# Open browser: http://localhost:3000