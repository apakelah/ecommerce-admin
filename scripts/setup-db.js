const { Client } = require('pg');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: 'postgres'
    });

    try {
        await client.connect();
        console.log('Connected to PostgreSQL server');

        try {
            await client.query(`CREATE DATABASE ${process.env.DB_NAME}`);
            console.log(`Database ${process.env.DB_NAME} created`);
        } catch (err) {
            if (err.code === '42P04') {
                console.log(`Database ${process.env.DB_NAME} already exists`);
            } else {
                throw err;
            }
        }

        await client.end();

        const dbClient = new Client({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        await dbClient.connect();
        console.log(`Connected to database ${process.env.DB_NAME}`);

        const sqlPath = path.join(__dirname, '../database/ecommerce_postgres.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        await dbClient.query(sql);
        console.log('Database schema created successfully');

        const productsCount = await dbClient.query('SELECT COUNT(*) FROM produk');
        const stockCount = await dbClient.query('SELECT COUNT(*) FROM stock_produk');
        
        console.log(`Products inserted: ${productsCount.rows[0].count}`);
        console.log(`Stock records: ${stockCount.rows[0].count}`);

        await dbClient.end();
        console.log('Database setup completed!');
        
    } catch (err) {
        console.error('Database setup error:', err.message);
        process.exit(1);
    }
}

setupDatabase();