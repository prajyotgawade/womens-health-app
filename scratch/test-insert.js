const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  console.log('Testing column insertion on profiles...');
  const testId = '00000000-0000-0000-0000-000000000000'; // placeholder uuid
  
  // Try inserting with standard + extra columns to see what fails
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: testId,
      full_name: 'Test User',
      avatar_url: 'http://test.com',
      dob: '1990-01-01',
      // extra onboarding columns:
      nickname: 'tester',
      age: 30,
      height: 170,
      weight: 60,
      pregnancy_status: 'none',
      pcos: false,
      health_conditions: 'none',
      water_goal: 2000,
    });

  if (error) {
    console.log('Insert failed with error code:', error.code);
    console.log('Message:', error.message);
  } else {
    console.log('Insert succeeded! All columns exist!');
  }
}

testInsert();
