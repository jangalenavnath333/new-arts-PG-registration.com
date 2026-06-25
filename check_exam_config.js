require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL; 
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY; 

async function checkConfig() { 
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/exam_config?select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    const data = await res.json();
    console.log('Current Exam Configs:', data);
  } catch (e) {
    console.error(e);
  }
} 
checkConfig();
