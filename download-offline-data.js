require('dotenv').config();
const fs = require('fs');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

async function downloadData() {
  console.log("Fetching data from Supabase...");
  
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };
  
  // 1. Fetch Students
  const resStudents = await fetch(`${supabaseUrl}/rest/v1/students?select=*`, { headers });
  const students = await resStudents.json();
  
  // 2. Fetch Exam Config
  const resConfig = await fetch(`${supabaseUrl}/rest/v1/exam_config?select=*`, { headers });
  const examConfig = await resConfig.json();
  
  // 3. Fetch Question Sets
  const resQuestions = await fetch(`${supabaseUrl}/rest/v1/question_sets?select=*`, { headers });
  const questionSets = await resQuestions.json();
  
  const data = {
    students,
    exam_config: examConfig,
    question_sets: questionSets,
    exam_attempts: [],
    exam_results: [],
    security_logs: []
  };
  
  fs.writeFileSync('offline_data.json', JSON.stringify(data, null, 2));
  console.log(`✅ Success! Downloaded ${students.length} students, ${examConfig.length} configs, ${questionSets.length} question sets.`);
  console.log("Data saved to offline_data.json");
}

downloadData().catch(console.error);
