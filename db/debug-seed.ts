// Create this file as db/debug-seed.ts to test step by step

import 'dotenv/config';
import { Pool } from 'pg';

async function debugSeed() {
  console.log('🔍 Starting seed debugging...');
  
  // 1. Check environment variables
  console.log('📋 Environment check:');
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set in .env file');
    return;
  }
  
  // 2. Test database connection
  console.log('\n🔌 Testing database connection...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // 3. Check if pgvector extension exists
    console.log('\n🧮 Checking pgvector extension...');
    try {
      const vectorCheck = await client.query("SELECT extname FROM pg_extension WHERE extname = 'vector'");
      if (vectorCheck.rows.length > 0) {
        console.log('✅ pgvector extension is installed');
        
        // Test vector type
        await client.query("SELECT '[1,2,3]'::vector(3)");
        console.log('✅ vector type works');
      } else {
        console.log('❌ pgvector extension not found');
        console.log('📝 Attempting to install pgvector...');
        try {
          await client.query("CREATE EXTENSION IF NOT EXISTS vector");
          console.log('✅ pgvector extension created');
        } catch (vectorError) {
          console.error('❌ Failed to create pgvector extension:', vectorError.message);
          console.log('💡 You need to install pgvector on your PostgreSQL server');
        }
      }
    } catch (error) {
      console.error('❌ Error checking pgvector:', error.message);
    }
    
    // 4. Check existing tables
    console.log('\n📋 Checking existing tables...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('Existing tables:', tablesResult.rows.map(r => r.table_name));
    
    // 5. If tables exist, check data
    if (tablesResult.rows.length > 0) {
      try {
        const candidatesCount = await client.query('SELECT COUNT(*) FROM candidates');
        const jobsCount = await client.query('SELECT COUNT(*) FROM job_descriptions');
        const gradesCount = await client.query('SELECT COUNT(*) FROM internal_grades');
        
        console.log('\n📊 Current data:');
        console.log('Candidates:', candidatesCount.rows[0].count);
        console.log('Jobs:', jobsCount.rows[0].count);
        console.log('Grades:', gradesCount.rows[0].count);
      } catch (error) {
        console.log('❌ Error checking data:', error.message);
      }
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await pool.end();
  }
  
  // 6. Check if required files exist
  console.log('\n📁 Checking required files...');
  const fs = await import('fs');
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  const requiredFiles = [
    'reset.sql',
    'queries.ts',
    '../src/utils/vector-utils.ts'
  ];
  
  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      console.log('✅', file);
    } else {
      console.log('❌', file, 'not found');
    }
  }
  
  // 7. Test imports
  console.log('\n📦 Testing imports...');
  try {
    const queries = await import('./queries.js');
    console.log('✅ queries.ts import successful');
  } catch (error) {
    console.log('❌ queries.ts import failed:', error.message);
  }
  
  try {
    const vectorUtils = await import('../src/utils/vector-utils.js');
    console.log('✅ vector-utils.ts import successful');
  } catch (error) {
    console.log('❌ vector-utils.ts import failed:', error.message);
  }
  
  console.log('\n🎉 Debug complete!');
}

debugSeed().catch(console.error);