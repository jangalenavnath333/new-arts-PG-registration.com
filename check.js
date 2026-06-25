require('dotenv').config();
async function run() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const res = await fetch(`${url}/rest/v1/student_applications?select=*`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  console.log("Status:", res.status);
  console.log("Data:", await res.json());
}
run();
