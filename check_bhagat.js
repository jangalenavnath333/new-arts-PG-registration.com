const fs = require('fs');
const xlsx = require('xlsx');

const email = 'bhagatajay359@gmail.com';

console.log('--- Checking offline_data.json ---');
try {
  const d = require('./offline_data.json');
  const students = d.students || d;
  const s = students.find(x => x.email === email);
  console.log(s ? 'Found in offline_data: \n' + JSON.stringify(s, null, 2) : 'Not found in offline_data.json');
} catch(e) {
  console.error(e);
}

console.log('\n--- Checking missing_payments_temp.json ---');
try {
  const md = require('./missing_payments_temp.json');
  const m = md.find(x => x.email === email);
  console.log(m ? 'Found in missing_payments_temp: \n' + JSON.stringify(m, null, 2) : 'Not found in missing_payments_temp.json');
} catch(e) {
  console.error(e);
}

console.log('\n--- Checking Excel payments ---');
try {
  const wb = xlsx.readFile('payments - 01 Jun 26 - 24 Jun 26.xlsx');
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);
  const p = data.filter(x => x.email === email);
  console.log('Found ' + p.length + ' records in Excel for ' + email + ':');
  p.forEach(x => {
    console.log(`ID: ${x.id}, Status: ${x.status}, Amount: ${x.amount}, Date: ${x.created_at}, Error: ${x.error_description || 'None'}`);
  });
} catch(e) {
  console.error(e);
}
