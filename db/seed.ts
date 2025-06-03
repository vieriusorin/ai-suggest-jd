import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function seedDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Starting database seeding...');
    
    // Read and execute complete reset/setup
    const resetSQL = fs.readFileSync(path.join(__dirname, 'reset.sql'), 'utf8');
    await client.query(resetSQL);
    console.log('✅ Database reset and seeded successfully');
    
    // Verify the seeding
    const result = await client.query('SELECT COUNT(*) FROM candidates');
    console.log(`📊 Total candidates: ${result.rows[0].count}`);
    
    const gradesResult = await client.query('SELECT COUNT(*) FROM internal_grades');
    console.log(`📊 Total grades: ${gradesResult.rows[0].count}`);
    
    console.log('🎉 Database seeding completed!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase();