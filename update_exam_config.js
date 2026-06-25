require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL; 
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY; 

async function updateConfig() { 
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/exam_config?course=in.(M.Sc.%20Computer%20Science,M.Sc.%20Computer%20Application,All%20Courses)`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        exam_date: '2026-06-25',
        start_time: '09:30',
        duration_minutes: 90
      })
    });
    
    if (res.ok) {
        console.log('Successfully updated main courses to 25 June, 09:30, 90 mins');
        const data = await res.json();
        console.log('Updated rows:', data);
    } else {
        console.error('Update failed', await res.text());
    }

    // Insert if they don't exist
    const fetchRes = await fetch(`${supabaseUrl}/rest/v1/exam_config?select=course`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const existing = await fetchRes.json();
    const courses = existing.map(r => r.course);
    
    const required = ['M.Sc. Computer Science', 'M.Sc. Computer Application'];
    for (let c of required) {
        if (!courses.includes(c)) {
             await fetch(`${supabaseUrl}/rest/v1/exam_config`, {
              method: 'POST',
              headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                course: c,
                exam_date: '2026-06-25',
                start_time: '09:30',
                duration_minutes: 90,
                is_active: true
              })
            });
            console.log('Inserted missing config for', c);
        }
    }
  } catch (e) {
    console.error(e);
  }
} 
updateConfig();
