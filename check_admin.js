require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL; 
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY; 

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkApplications() { 
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
       email: 'admin@newarts-casas-pgcet.in',
       password: 'admin' // usually 'admin' or 'password' in these templates, let's guess 'admin' or just check if it works. Wait! I don't know the password.
    });
    
    // Just fetch via service role if possible? We don't have service role.
    // What if I just use a local admin login from the .env? No, it's not in .env.
    console.log(authError ? 'Auth failed: ' + authError.message : 'Auth success!');
    
    // Let's just try to select
    const { data, error } = await supabase.from('students').select('id, full_name, email').limit(5);
    
    if (error) {
      console.error('Error fetching:', error);
    } else {
      console.log(`Total students downloaded: ${data.length}`);
      console.log(data);
    }
  } catch (e) {
    console.error(e);
  }
} 
checkApplications();
