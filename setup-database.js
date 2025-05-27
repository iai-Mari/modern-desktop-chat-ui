const config = require('./config');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_KEY);

async function setupDatabase() {
  console.log('Setting up database table...');
  
  try {
    // Try to create the table
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS memory (
          id BIGSERIAL PRIMARY KEY,
          user_message TEXT,
          ai_response TEXT,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_memory_created_at ON memory(created_at);
      `
    });

    if (error) {
      console.log('❌ Error creating table:', error.message);
      console.log('Please create the table manually in Supabase SQL editor');
    } else {
      console.log('✅ Database table created successfully!');
    }

  } catch (error) {
    console.log('❌ Setup failed:', error.message);
    console.log('\n📝 Please go to your Supabase dashboard and create the table manually:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Run the SQL provided above');
  }
}

setupDatabase();
