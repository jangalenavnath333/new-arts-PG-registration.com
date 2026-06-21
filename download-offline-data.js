require('dotenv').config();
const fs = require('fs');
const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');

// Fix for Node.js 20 WebSocket support in Supabase
global.WebSocket = require('ws');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function downloadData() {
  console.log("\n🔒 Database is secured. Admin login required to download student data.");
  
  const email = await question("Admin Email (e.g. admin@newarts-casas-pgcet.in): ");
  const password = await question("Admin Password: ");
  rl.close();

  console.log("\nLogging in...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: password.trim()
  });

  if (authError) {
    console.error("❌ Login failed:", authError.message);
    process.exit(1);
  }

  console.log("✅ Login successful. Fetching data from Supabase...");
  
  // Fetch Students
  const { data: students, error: errStudents } = await supabase.from('students').select('*');
  if (errStudents) console.error("Error fetching students:", errStudents.message);

  console.log("✅ Fetching Student Photos for Offline Mode... This may take a minute.");
  if (students) {
      for (let i = 0; i < students.length; i++) {
         const student = students[i];
         if (student.uploaded_files && student.uploaded_files.photoFile) {
            try {
               const res = await fetch(student.uploaded_files.photoFile);
               if (res.ok) {
                  const buffer = await res.arrayBuffer();
                  const base64 = Buffer.from(buffer).toString('base64');
                  const contentType = res.headers.get('content-type') || 'image/jpeg';
                  student.photoData = `data:${contentType};base64,${base64}`;
                  process.stdout.write('.');
               }
            } catch(e) {
               process.stdout.write('x');
            }
         }
      }
      console.log("\n✅ Photos embedded.");
  }

  // Fetch Exam Config
  const { data: examConfig, error: errConfig } = await supabase.from('exam_config').select('*');
  if (errConfig) console.error("Error fetching exam config:", errConfig.message);

  // Fetch Question Sets
  const { data: questionSets, error: errQuestions } = await supabase.from('question_sets').select('*');
  if (errQuestions) console.error("Error fetching question sets:", errQuestions.message);
  
  const data = {
    students: students || [],
    exam_config: examConfig || [],
    question_sets: questionSets || [],
    exam_attempts: [],
    exam_results: [],
    security_logs: []
  };
  
  fs.writeFileSync('offline_data.json', JSON.stringify(data, null, 2));
  console.log(`\n✅ Success! Downloaded ${data.students.length} students, ${data.exam_config.length} configs, ${data.question_sets.length} question sets.`);
  console.log("Data saved to offline_data.json");
}

downloadData().catch(console.error);
