require('dotenv').config();
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

async function testLogin() {
  const email = 'sarthaksatre1@gmail.com'; 
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/student_login`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_email: email })
  });

  console.log("Login Status:", res.status);
  console.log("Login Body:", await res.text());
}
testLogin();
