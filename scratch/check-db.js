require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

async function inspectSchema() {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseAnonKey}`);
    const data = await response.json();
    console.log('Response content:', data);
  } catch (error) {
    console.error('Error fetching schema:', error);
  }
}

inspectSchema();
