const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Debug: Show environment variables (hide password)
console.log('=== DATABASE CONFIG ===');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PASSWORD length:', process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 'undefined');
console.log('DB_PASSWORD type:', typeof process.env.DB_PASSWORD);
console.log('=====================');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'ecommerce_user',
    password: String(process.env.DB_PASSWORD || 'admin123'), // Force string
    database: process.env.DB_NAME || 'ecommerce_db',
});

// Simple connection test
pool.connect()
    .then(client => {
        console.log('✅ Connected to PostgreSQL database');
        return client.query('SELECT version()');
    })
    .then(result => {
        console.log('PostgreSQL Version:', result.rows[0].version);
        pool.end();
        // Create new pool for actual use
        initApp();
    })
    .catch(err => {
        console.error('❌ FATAL: Cannot connect to database:', err.message);
        console.log('💡 TROUBLESHOOTING:');
        console.log('1. Check if PostgreSQL is running: docker ps | grep postgres');
        console.log('2. Test manually: PGPASSWORD=admin123 psql -h localhost -U ecommerce_user -d ecommerce_db -p 5432');
        console.log('3. Check .env file');
        console.log('4. Try: docker exec postgres-ecommerce psql -U ecommerce_user -d ecommerce_db -c "SELECT 1;"');
        process.exit(1);
    });

function initApp() {
    const appPool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: String(process.env.DB_PASSWORD),
        database: process.env.DB_NAME,
    });

    // Routes
    app.get('/', async (req, res) => {
        try {
            const statsQuery = await appPool.query(`
                SELECT 
                    (SELECT COUNT(*) FROM produk) as total_products,
                    (SELECT COUNT(*) FROM pembelian WHERE status = 'completed') as completed_orders,
                    (SELECT COUNT(*) FROM pembelian WHERE status = 'cancelled') as cancelled_orders,
                    (SELECT SUM(total_harga) FROM pembelian WHERE status = 'completed') as total_revenue
            `);
            
            const recentPurchases = await appPool.query(`
                SELECT pb.*, p.nama_produk 
                FROM pembelian pb 
                JOIN produk p ON pb.produk_id = p.id 
                ORDER BY pb.tanggal_pembelian DESC 
                LIMIT 5
            `);
            
            res.render('dashboard', { 
                stats: statsQuery.rows[0],
                recentPurchases: recentPurchases.rows
            });
        } catch (error) {
            console.error('Dashboard error:', error);
            res.status(500).send('Error loading dashboard');
        }
    });

    // ... [REST OF YOUR ROUTES - SAME AS BEFORE] ...

    app.get('/products', async (req, res) => {
        try {
            const result = await appPool.query(`
                SELECT p.*, s.stok 
                FROM produk p 
                LEFT JOIN stock_produk s ON p.id = s.produk_id
                ORDER BY p.id
            `);
            res.render('products', { products: result.rows });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error fetching products');
        }
    });

    app.get('/purchases', async (req, res) => {
        try {
            const result = await appPool.query(`
                SELECT pb.*, p.nama_produk, p.harga 
                FROM pembelian pb 
                JOIN produk p ON pb.produk_id = p.id 
                ORDER BY pb.tanggal_pembelian DESC
            `);
            res.render('purchases', { purchases: result.rows });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error fetching purchases');
        }
    });

    app.get('/add-purchase', async (req, res) => {
        try {
            const result = await appPool.query('SELECT * FROM produk ORDER BY id');
            res.render('add-purchase', { products: result.rows });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error loading form');
        }
    });

    // ... [ADD OTHER ROUTES HERE] ...

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}
