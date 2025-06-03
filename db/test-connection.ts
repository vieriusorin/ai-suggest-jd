// test-connection.js
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testConnection() {
  console.log('🔍 Testing database connection...');
  console.log('📄 Using connection string:', process.env.DATABASE_URL);
  
  try {
    const client = await pool.connect();
    console.log('✅ Successfully connected to PostgreSQL!');
    
    // Test a simple query
    const result = await client.query('SELECT version()');
    console.log('📊 PostgreSQL version:', result.rows[0].version);
    
    // Check if we can list tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('📋 Tables in database:', tables.rows.map(r => r.table_name));
    
    client.release();
    console.log('🎉 Database connection test successful!');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('🔧 Error details:', {
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
  } finally {
    await pool.end();
  }
}

testConnection();