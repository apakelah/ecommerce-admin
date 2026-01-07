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

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

pool.connect()
    .then(client => {
        console.log('Connected to PostgreSQL database');
        client.release();
    })
    .catch(err => {
        console.error('Error connecting to PostgreSQL:', err.message);
    });

app.get('/', async (req, res) => {
    try {
        const statsQuery = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM produk) as total_products,
                (SELECT COUNT(*) FROM pembelian WHERE status = 'completed') as completed_orders,
                (SELECT COUNT(*) FROM pembelian WHERE status = 'cancelled') as cancelled_orders,
                (SELECT SUM(total_harga) FROM pembelian WHERE status = 'completed') as total_revenue
        `);
        
        const recentPurchases = await pool.query(`
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

app.get('/products', async (req, res) => {
    try {
        const result = await pool.query(`
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
        const result = await pool.query(`
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
        const result = await pool.query('SELECT * FROM produk ORDER BY id');
        res.render('add-purchase', { products: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading form');
    }
});

app.post('/add-purchase', async (req, res) => {
    const { produk_id, jumlah, nama_pembeli } = req.body;
    
    try {
        const productResult = await pool.query(
            'SELECT p.harga, s.stok FROM produk p LEFT JOIN stock_produk s ON p.id = s.produk_id WHERE p.id = $1',
            [produk_id]
        );
        
        if (productResult.rows.length === 0) {
            return res.status(400).send('Product not found');
        }
        
        const harga = parseFloat(productResult.rows[0].harga);
        const stok = parseInt(productResult.rows[0].stok || 0);
        const jumlahInt = parseInt(jumlah);
        
        if (jumlahInt > stok) {
            return res.status(400).send(`Insufficient stock. Available: ${stok}, Requested: ${jumlahInt}`);
        }
        
        const total_harga = harga * jumlahInt;
        const kode_transaksi = 'TRX-' + Date.now();
        
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            await client.query(
                `INSERT INTO pembelian (kode_transaksi, produk_id, jumlah, total_harga, nama_pembeli, status) 
                VALUES ($1, $2, $3, $4, $5, 'completed')`,
                [kode_transaksi, produk_id, jumlahInt, total_harga, nama_pembeli]
            );
            
            await client.query(
                'UPDATE stock_produk SET stok = stok - $1, last_updated = CURRENT_TIMESTAMP WHERE produk_id = $2',
                [jumlahInt, produk_id]
            );
            
            await client.query('COMMIT');
            res.redirect('/purchases');
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('Add purchase error:', error);
        res.status(500).send('Error adding purchase');
    }
});

app.get('/cancel-purchase/:id', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT pb.*, p.nama_produk 
            FROM pembelian pb 
            JOIN produk p ON pb.produk_id = p.id 
            WHERE pb.id = $1 AND pb.status = 'completed'`,
            [req.params.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).send('Purchase not found or already cancelled');
        }
        
        res.render('cancel-purchase', { purchase: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading cancel form');
    }
});

app.post('/cancel-purchase/:id', async (req, res) => {
    const { alasan_cancel } = req.body;
    
    try {
        const purchaseResult = await pool.query(
            'SELECT produk_id, jumlah FROM pembelian WHERE id = $1 AND status = $2',
            [req.params.id, 'completed']
        );
        
        if (purchaseResult.rows.length === 0) {
            return res.status(404).send('Purchase not found or already cancelled');
        }
        
        const { produk_id, jumlah } = purchaseResult.rows[0];
        
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            await client.query(
                `UPDATE pembelian 
                SET status = 'cancelled', 
                    tanggal_cancel = CURRENT_TIMESTAMP, 
                    alasan_cancel = $1 
                WHERE id = $2`,
                [alasan_cancel, req.params.id]
            );
            
            await client.query(
                'UPDATE stock_produk SET stok = stok + $1, last_updated = CURRENT_TIMESTAMP WHERE produk_id = $2',
                [jumlah, produk_id]
            );
            
            await client.query('COMMIT');
            res.redirect('/purchases');
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('Cancel purchase error:', error);
        res.status(500).send('Error cancelling purchase');
    }
});

app.get('/api/stock/:productId', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT stok FROM stock_produk WHERE produk_id = $1',
            [req.params.productId]
        );
        
        res.json({ stock: result.rows[0]?.stok || 0 });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/add-purchase', async (req, res) => {
    const { produk_id, jumlah, nama_pembeli } = req.body;
    
    console.log('=== ADD PURCHASE REQUEST ===');
    console.log('produk_id:', produk_id, 'type:', typeof produk_id);
    console.log('jumlah:', jumlah, 'type:', typeof jumlah);
    console.log('nama_pembeli:', nama_pembeli);
    
    try {
        // Query yang lebih sederhana untuk debugging
        console.log('Querying product with ID:', produk_id);
        
        const productResult = await pool.query(
            'SELECT harga, id FROM produk WHERE id = $1',
            [parseInt(produk_id)]
        );
        
        console.log('Product query result:', productResult.rows);
        
        if (productResult.rows.length === 0) {
            console.log('Product not found for ID:', produk_id);
            return res.status(400).send('Product not found. ID: ' + produk_id);
        }
        
        const harga = parseFloat(productResult.rows[0].harga);
        console.log('Product price:', harga);
        
        // Cek stock
        const stockResult = await pool.query(
            'SELECT stok FROM stock_produk WHERE produk_id = $1',
            [parseInt(produk_id)]
        );
        
        const stok = parseInt(stockResult.rows[0]?.stok || 0);
        console.log('Available stock:', stok);
        
        const jumlahInt = parseInt(jumlah);
        console.log('Requested quantity:', jumlahInt);
        
        if (jumlahInt > stok) {
            console.log('Insufficient stock');
            return res.status(400).send(`Insufficient stock. Available: ${stok}, Requested: ${jumlahInt}`);
        }
        
        const total_harga = harga * jumlahInt;
        const kode_transaksi = 'TRX-' + Date.now();
        console.log('Total price:', total_harga);
        console.log('Transaction code:', kode_transaksi);
        
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            console.log('Inserting purchase...');
            await client.query(
                `INSERT INTO pembelian (kode_transaksi, produk_id, jumlah, total_harga, nama_pembeli, status) 
                VALUES ($1, $2, $3, $4, $5, 'completed')`,
                [kode_transaksi, parseInt(produk_id), jumlahInt, total_harga, nama_pembeli]
            );
            
            console.log('Updating stock...');
            await client.query(
                'UPDATE stock_produk SET stok = stok - $1, last_updated = CURRENT_TIMESTAMP WHERE produk_id = $2',
                [jumlahInt, parseInt(produk_id)]
            );
            
            await client.query('COMMIT');
            console.log('Transaction committed successfully');
            
            res.redirect('/purchases');
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Transaction error:', error);
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('Add purchase error:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).send('Error adding purchase: ' + error.message);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});