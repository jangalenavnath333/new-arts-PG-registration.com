require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL; 
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY; 

async function checkApplications() { 
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/cet_students?select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'count=exact'
      }
    });
    
    const count = res.headers.get('content-range');
    const data = await res.json();
    
    if (!res.ok) {
      console.error('Error:', data);
    } else {
      console.log('Total students based on headers:', count);
      console.log('Total students downloaded:', data.length);
      data.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,5).forEach(d=>console.log(`ID: ${d.id}, Name: ${d.full_name}, Phone: ${d.mobile}, Email: ${d.email}, Payment: ${d.payment_status}, Created: ${d.created_at}`));
    }
  } catch (e) {
    console.error(e);
  }
} 
checkApplications();
