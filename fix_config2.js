require('dotenv').config();
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL; 
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY; 

async function fix() {
  try {
     const fetchRes = await fetch(`${supabaseUrl}/rest/v1/exam_config`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
     });
     const existing = await fetchRes.json();
     for (let row of existing) {
         if (row.course === 'M.Sc. Computer Science' || row.course === 'M.Sc. Computer Application') {
             await fetch(`${supabaseUrl}/rest/v1/exam_config?id=eq.${row.id}`, {
              method: 'PATCH',
              headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                exam_date: '2026-06-25',
                start_time: '09:30',
                duration_minutes: 90
              })
             });
             console.log('Updated row', row.course);
         }
     }
  } catch (e) { console.error(e); }
}
fix();
