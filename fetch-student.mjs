import dotenv from 'dotenv';
dotenv.config();
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
fetch(`${url}/rest/v1/students?select=student_id,full_name,email`, {
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json'
  }
}).then(r => r.json()).then(data => console.log('Data:', data)).catch(e => console.error(e));
