import * as fs from 'node:fs';
import * as path from 'node:path';
import { Pool } from 'pg';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Your database connection string
const DATABASE_URL='postgresql://admin:password123@localhost:5432/job_matching'

async function resetDatabase() {
  console.log('🔄 Starting database reset process...');

  // Create a connection pool using the connection string
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  try {
    // Read SQL script for resetting the database
    const sqlPath = path.join(__dirname, 'reset.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split SQL into statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`📜 Found ${statements.length} SQL statements to execute`);

    // Get a client from the pool
    const client = await pool.connect();

    try {
      // Execute each statement
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        console.log(`⚙️ Executing statement ${i + 1}/${statements.length}`);
        try {
          // Actually execute the SQL statement
          await client.query(statement);
          console.log(`✓ Statement ${i + 1} executed successfully`);
        } catch (error) {
          console.error(`❌ Error executing statement: ${statement}`);
          console.error(error);
          // Continue with other statements even if one fails
        }
      }

      console.log('✅ Database reset completed successfully!');
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  } finally {
    // Close the pool
    await pool.end();
    console.log('🔄 Database reset process completed');
  }
}

// Execute the reset function
resetDatabase().catch(console.error);
