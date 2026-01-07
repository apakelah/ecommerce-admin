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
