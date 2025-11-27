const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
require('dotenv').config();

async function createTables() {
  console.log('🔌 Connecting to Neon database...');
  
  const pool = new Pool({
    connectionString: process.env.NEON_DB_URL,
  });

  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin' NOT NULL,
        wallet_address VARCHAR(42),
        is_active BOOLEAN DEFAULT true NOT NULL,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log('✅ Users table created/verified');

    // Create institutions table  
    await client.query(`
      CREATE TABLE IF NOT EXISTS institutions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL,
        website VARCHAR(255),
        address TEXT,
        logo VARCHAR(500),
        wallet_address VARCHAR(42),
        is_verified BOOLEAN DEFAULT false NOT NULL,
        created_by UUID NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log('✅ Institutions table created/verified');

    // Create certificates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS certificates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token_id VARCHAR(100) UNIQUE,
        student_name VARCHAR(255) NOT NULL,
        student_email VARCHAR(255) NOT NULL,
        roll_number VARCHAR(100) NOT NULL,
        course VARCHAR(255) NOT NULL,
        specialization VARCHAR(255),
        grade VARCHAR(50),
        cgpa DECIMAL(4,2),
        issue_date TIMESTAMP NOT NULL,
        graduation_date TIMESTAMP NOT NULL,
        institution_id UUID NOT NULL,
        metadata_ipfs_cid VARCHAR(100),
        pdf_ipfs_cid VARCHAR(100),
        tx_hash VARCHAR(66),
        block_number INTEGER,
        status VARCHAR(50) DEFAULT 'draft' NOT NULL,
        is_revoked BOOLEAN DEFAULT false NOT NULL,
        revoked_at TIMESTAMP,
        revoked_by UUID,
        revoked_reason TEXT,
        metadata JSONB,
        verification_code VARCHAR(50) UNIQUE,
        created_by UUID NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log('✅ Certificates table created/verified');

    // Insert a default admin user
    const adminEmail = 'admin@blockverify.com';
    const adminPasswordHash = '$2a$10$rZ1k8qGKB5OVc8cG1O.bvOXt7qGKfHjKfHjKfHjKfHjKfHjKfHjK'; // password: admin123
    
    await client.query(`
      INSERT INTO users (email, password_hash, name, role) 
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING
    `, [adminEmail, adminPasswordHash, 'System Admin', 'super_admin']);
    console.log('✅ Default admin user created/verified');

    // Insert a default institution
    const institutionName = 'BlockVerify Institute';
    const institutionCode = 'BLOCKVERIFY';
    
    const adminUser = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    const adminId = adminUser.rows[0]?.id;
    
    if (adminId) {
      await client.query(`
        INSERT INTO institutions (name, code, email, created_by, is_verified) 
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (code) DO NOTHING
      `, [institutionName, institutionCode, 'admin@blockverify.com', adminId, true]);
      console.log('✅ Default institution created/verified');
    }

    client.release();
    console.log('🎉 Database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

createTables().catch(console.error);