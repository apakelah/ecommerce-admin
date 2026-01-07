CREATE TABLE IF NOT EXISTS produk (
    id SERIAL PRIMARY KEY,
    nama_produk VARCHAR(100) NOT NULL,
    kategori VARCHAR(50),
    harga DECIMAL(10,2) NOT NULL,
    deskripsi TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_produk (
    id SERIAL PRIMARY KEY,
    produk_id INT NOT NULL REFERENCES produk(id) ON DELETE CASCADE,
    stok INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pembelian (
    id SERIAL PRIMARY KEY,
    kode_transaksi VARCHAR(20) UNIQUE NOT NULL,
    produk_id INT NOT NULL REFERENCES produk(id),
    jumlah INT NOT NULL CHECK (jumlah > 0),
    total_harga DECIMAL(10,2) NOT NULL,
    nama_pembeli VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    tanggal_pembelian TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tanggal_cancel TIMESTAMP NULL,
    alasan_cancel TEXT
);

INSERT INTO produk (nama_produk, kategori, harga, deskripsi) VALUES
('Laptop ASUS ROG', 'Elektronik', 15000000, 'Laptop gaming dengan processor i7'),
('iPhone 15 Pro', 'Smartphone', 20000000, 'Smartphone flagship Apple'),
('Samsung Galaxy S23', 'Smartphone', 12000000, 'Smartphone Android terbaru'),
('Mouse Logitech G502', 'Aksesoris', 800000, 'Mouse gaming dengan 11 tombol'),
('Keyboard Mechanical', 'Aksesoris', 1200000, 'Keyboard mechanical RGB'),
('Monitor 27" 4K', 'Elektronik', 5000000, 'Monitor gaming 144Hz'),
('Headphone Sony', 'Audio', 2500000, 'Headphone noise cancelling'),
('Smart TV 55"', 'Elektronik', 8000000, 'TV LED 4K Smart TV'),
('Tablet iPad Air', 'Tablet', 9000000, 'Tablet Apple dengan chip M1'),
('Power Bank 20000mAh', 'Aksesoris', 500000, 'Power bank fast charging');

INSERT INTO stock_produk (produk_id, stok) VALUES
(1, 50), (2, 30), (3, 40), (4, 100), (5, 80),
(6, 25), (7, 60), (8, 20), (9, 35), (10, 150);

CREATE INDEX IF NOT EXISTS idx_pembelian_status ON pembelian(status);
CREATE INDEX IF NOT EXISTS idx_pembelian_tanggal ON pembelian(tanggal_pembelian DESC);
CREATE INDEX IF NOT EXISTS idx_stock_produk_id ON stock_produk(produk_id);