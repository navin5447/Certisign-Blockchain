const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function checkInstitutions() {
  const sql = neon(process.env.NEON_DB_URL);
  
  try {
    console.log('🏛️ Checking institutions in database...');
    
    const institutions = await sql`SELECT * FROM institutions`;
    
    if (institutions.length === 0) {
      console.log('❌ No institutions found. Creating a default institution...');
      
      // Create a default institution
      const newInstitution = await sql`
        INSERT INTO institutions (id, name, address, contact_email, contact_phone, verified, created_at, updated_at)
        VALUES (
          gen_random_uuid(),
          'Default University',
          '123 Education Street, Learning City',
          'admin@defaultuni.edu',
          '+1-555-0123',
          true,
          NOW(),
          NOW()
        )
        RETURNING *
      `;
      
      console.log('✅ Created default institution:');
      console.log(newInstitution[0]);
    } else {
      console.log(`✅ Found ${institutions.length} institution(s):`);
      institutions.forEach(inst => {
        console.log(`- ID: ${inst.id}`);
        console.log(`  Name: ${inst.name}`);
        console.log(`  Email: ${inst.contact_email}`);
        console.log(`  Verified: ${inst.verified}`);
        console.log('---');
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkInstitutions();