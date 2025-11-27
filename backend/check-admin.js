const { Pool } = require('pg');
require('dotenv').config();

async function checkAdminUser() {
  const pool = new Pool({
    connectionString: process.env.NEON_DB_URL,
  });

  try {
    const client = await pool.connect();
    
    console.log('🔍 Checking admin user in database...');
    
    const result = await client.query('SELECT email, password_hash, name, role, is_active FROM users WHERE email = $1', ['admin@blockverify.com']);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('✅ Admin user found:');
      console.log('  Email:', user.email);
      console.log('  Role:', user.role);
      console.log('  Active:', user.is_active);
      console.log('  Password Hash:', user.password_hash.substring(0, 20) + '...');
      
      // Test password verification
      const bcrypt = require('bcryptjs');
      const isValid = await bcrypt.compare('admin123', user.password_hash);
      console.log('  Password "admin123" valid:', isValid);
      
    } else {
      console.log('❌ No admin user found');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  } finally {
    await pool.end();
  }
}

checkAdminUser().catch(console.error);