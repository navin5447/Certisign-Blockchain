const { Pool } = require('pg');
require('dotenv').config();

async function createMissingTables() {
  console.log('🔧 Creating missing database tables...');
  
  const pool = new Pool({
    connectionString: process.env.NEON_DB_URL,
  });

  try {
    const client = await pool.connect();
    
    // Create events table for audit logging
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        user_id UUID,
        data JSONB,
        description TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Events table created/verified');

    // Create ipfs_pins table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ipfs_pins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cid VARCHAR(100) NOT NULL UNIQUE,
        type VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        status VARCHAR(50) DEFAULT 'pending' NOT NULL,
        pinata_response JSONB,
        retry_count INTEGER DEFAULT 0 NOT NULL,
        last_retry_at TIMESTAMP,
        error_message TEXT,
        file_name VARCHAR(255),
        file_size INTEGER,
        mime_type VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log('✅ IPFS pins table created/verified');

    // Create batch_operations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS batch_operations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending' NOT NULL,
        total_records INTEGER DEFAULT 0 NOT NULL,
        processed_records INTEGER DEFAULT 0 NOT NULL,
        successful_records INTEGER DEFAULT 0 NOT NULL,
        failed_records INTEGER DEFAULT 0 NOT NULL,
        input_data JSONB,
        results JSONB,
        error_log JSONB,
        created_by UUID NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    console.log('✅ Batch operations table created/verified');

    client.release();
    console.log('🎉 All missing tables created successfully!');
    
  } catch (error) {
    console.error('❌ Failed to create tables:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

createMissingTables().catch(console.error);