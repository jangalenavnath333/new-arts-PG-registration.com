require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

async function fetchFromSupabase(table, queryParams) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      url.searchParams.append(key, value);
    }
  }

  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (response.status !== 200) {
     return { error: true, status: response.status, body: await response.text() };
  }
  return response.json();
}

async function run() {
  console.log("\nChecking payments table by email...");
  const paymentsByEmail = await fetchFromSupabase('payments', {
    'email': 'ilike.%sarthaksatre1@gmail.com%'
  });
  console.log("Payments by email:", paymentsByEmail);
  
  // also get 1 record from payments to see schema
  const onePayment = await fetchFromSupabase('payments', {
    'limit': '1'
  });
  console.log("\nOne payment record:", onePayment);
  
  // check if there's an applications table
  const applications = await fetchFromSupabase('applications', {
    'limit': '1'
  });
  console.log("\nOne application record:", applications);
}

run();
