require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function syncResults() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !anonKey) {
    console.error('❌ Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be in .env file!');
    process.exit(1);
  }

  const DB_FILE = path.join(__dirname, 'offline_data.json');
  if (!fs.existsSync(DB_FILE)) {
    console.error('❌ Error: offline_data.json not found!');
    process.exit(1);
  }

  console.log('=============================================');
  console.log('🚀 CET OFFLINE RESULT SYNC UTILITY');
  console.log('=============================================');

  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  const results = db.exam_results || [];
  
  if (results.length === 0) {
    console.log('✅ No new results found in offline_data.json to sync. Everything is up to date.');
    return;
  }

  console.log(`Found ${results.length} offline exam results. Uploading to main online database...\n`);
  
  let successCount = 0;
  let failCount = 0;

  for (const res of results) {
    let attemptUUID = null;
    
    try {
      // 1. Create the exam attempt in the cloud first so the foreign key constraint passes
      const attemptPayload = {
        p_student_uuid: res.student_id || res.p_student_uuid,
        p_cet_student_id: res.cet_student_id || '',
        p_total_questions: res.total || 0
      };

      const attemptRes = await fetch(`${supabaseUrl}/rest/v1/rpc/start_exam_attempt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`
        },
        body: JSON.stringify(attemptPayload)
      });

      if (!attemptRes.ok) {
         console.error(`  ❌ Failed to create attempt in cloud:`, await attemptRes.text());
         failCount++;
         continue; // Skip syncing result if attempt creation failed
      }
      
      const attemptData = await attemptRes.json();
      attemptUUID = attemptData; // RPC returns the new UUID string directly

      // 2. Now submit the final exam result
      const payload = {
        p_student_uuid: res.student_id || res.p_student_uuid,
        p_attempt_id: attemptUUID,
        p_cet_student_id: res.cet_student_id || '',
        p_name: res.student_name || 'Unknown Student',
        p_score: res.score !== undefined ? res.score : res.p_score,
        p_total: res.total || 0,
        p_correct: res.correct_answers || 0,
        p_wrong: res.wrong_answers || 0,
        p_unanswered: res.unanswered || 0,
        p_violations: res.violations !== undefined ? res.violations : (res.p_violations || 0),
        p_time_used: res.time_used_secs !== undefined ? res.time_used_secs : (res.p_time_taken || 0),
        p_course: res.course || '',
        p_category: res.category || '',
        p_submit_status: 'COMPLETED',
        p_is_auto: false,
        p_answers: res.answers || res.p_answers || {}
      };
      
      // Find student name for logging
      const student = db.students.find(s => s.id === payload.p_student_uuid);
      const studentName = student ? `${student.full_name} (${student.student_id})` : `UUID: ${payload.p_student_uuid}`;
      
      console.log(`Syncing result for: ${studentName} | Score: ${payload.p_score}`);

      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/submit_final_exam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
         console.error(`  ❌ Failed to sync result:`, await response.text());
         failCount++;
      } else {
         console.log(`  ✅ Successfully synced to cloud!`);
         successCount++;
      }
    } catch (e) {
      console.error(`  ❌ Network error:`, e.message);
      failCount++;
    }
  }
  
  console.log('\n=============================================');
  console.log(`🏁 SYNC COMPLETE!`);
  console.log(`✅ Uploaded Successfully: ${successCount}`);
  if (failCount > 0) {
    console.log(`❌ Failed to Upload: ${failCount}`);
  }
  console.log('=============================================');
  console.log('You can now log in to the Online Admin Dashboard to view all results!');
}

syncResults();
