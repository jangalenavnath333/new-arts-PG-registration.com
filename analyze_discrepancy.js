const xlsx = require('xlsx');

function analyze() {
  // 1. Get Razorpay Successful Payments
  const wb = xlsx.readFile('payments - 01 Jun 26 - 24 Jun 26.xlsx');
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rzpData = xlsx.utils.sheet_to_json(sheet);
  const rzpCaptured = rzpData.filter(r => r.status === 'captured');
  
  // Create a normalized list of emails and phones from Razorpay
  const rzpEmails = new Set(rzpCaptured.map(r => (r.email || '').toLowerCase().trim()));
  const rzpPhones = new Set(rzpCaptured.map(r => {
    let phone = (r.contact || '').trim();
    if(phone.startsWith('+91')) phone = phone.substring(3);
    return phone;
  }));

  // 2. Get Applications
  const d = require('./offline_data.json');
  const apps = d.students || d;
  
  console.log(`--- DASHBOARD COUNT EXPLANATION ---`);
  console.log(`Total Applications in offline_data.json: ${apps.length}`);
  console.log(`Total Captured Payments in Razorpay Excel: ${rzpCaptured.length}`);
  
  // Create a normalized list of emails and phones from Applications
  const appEmails = new Set(apps.map(a => (a.email || '').toLowerCase().trim()));
  const appPhones = new Set(apps.map(a => (a.mobile || '').trim()));

  // 3. Find students in Razorpay but NOT in Applications
  const paidButNoForm = rzpCaptured.filter(r => {
    const email = (r.email || '').toLowerCase().trim();
    let phone = (r.contact || '').trim();
    if(phone.startsWith('+91')) phone = phone.substring(3);
    return !appEmails.has(email) && !appPhones.has(phone);
  });
  
  // Deduplicate paidButNoForm by email just to give a clean list
  const missingFormMap = {};
  paidButNoForm.forEach(r => {
     missingFormMap[(r.email || '').toLowerCase().trim()] = r;
  });

  console.log(`\n--- 1. PAID IN RAZORPAY BUT NO FORM SUBMITTED ---`);
  const missingFormList = Object.values(missingFormMap);
  console.log(`Count: ${missingFormList.length} students`);
  missingFormList.forEach((r, i) => {
    console.log(`${i+1}. Email: ${r.email} | Phone: ${r.contact} | Date: ${r.created_at} | Amount: ₹${r.amount}`);
  });

  // 4. Find students in Applications but NOT in Razorpay (Pending / Failed)
  const formButNoPayment = apps.filter(a => {
    const email = (a.email || '').toLowerCase().trim();
    const phone = (a.mobile || '').trim();
    return !rzpEmails.has(email) && !rzpPhones.has(phone);
  });

  console.log(`\n--- 2. FORM SUBMITTED BUT PAYMENT PENDING / NOT FOUND IN RAZORPAY ---`);
  console.log(`Count: ${formButNoPayment.length} students`);
  formButNoPayment.forEach((a, i) => {
    console.log(`${i+1}. Name: ${a.full_name || a.fullName} | Email: ${a.email} | Phone: ${a.mobile} | Local Status: ${a.payment_status}`);
  });
}

analyze();
