const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

async function createAdminUser() {
  console.log('🔑 Creating admin user with proper password hash...');
  
  const pool = new Pool({
    connectionString: process.env.NEON_DB_URL,
  });

  try {
    const client = await pool.connect();
    
    // Create proper password hash for "admin123"
    const password = 'admin123';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Update or insert admin user
    const adminEmail = 'admin@blockverify.com';
    
    await client.query(`
      INSERT INTO users (email, password_hash, name, role) 
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE SET 
        password_hash = EXCLUDED.password_hash,
        updated_at = NOW()
    `, [adminEmail, passwordHash, 'System Admin', 'super_admin']);
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@blockverify.com');
    console.log('🔒 Password: admin123');
    
    client.release();
    
  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

createAdminUser().catch(console.error);