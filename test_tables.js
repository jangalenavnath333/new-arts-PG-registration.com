require('dotenv').config();
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://zyzigmlqzzqxhhwplkdf.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5emlnbWxxenpxeGhod3Bsa2RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODE2MjMsImV4cCI6MjA5NTM1NzYyM30.6X_JC5GVVzZGsI1sG5hhmIE5ezA_yLbxjx57EsDG-U0';

async function check() {
  const tables = ['students', 'student_applications', 'student_documents', 'payments', 'cet_users'];
  for (const table of tables) {
     const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*&limit=1`, {
         headers: {
             'apikey': supabaseKey,
             'Authorization': `Bearer ${supabaseKey}`,
             'Prefer': 'count=exact'
         }
     });
     
     if (!res.ok) {
         console.log(`Table ${table} error:`, await res.text());
     } else {
         const count = res.headers.get('content-range');
         console.log(`Table ${table} count:`, count);
     }
  }
}
check();
