const xlsx = require('xlsx');

function findExtras() {
  const wb = xlsx.readFile('payments - 01 Jun 26 - 24 Jun 26.xlsx');
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rzpData = xlsx.utils.sheet_to_json(sheet);
  const rzpCaptured = rzpData.filter(r => r.status === 'captured');
  
  const rzpEmails = new Set(rzpCaptured.map(r => (r.email || '').toLowerCase().trim()));
  const rzpPhones = new Set(rzpCaptured.map(r => {
    let phone = (r.contact || '').trim();
    if(phone.startsWith('+91')) phone = phone.substring(3);
    return phone;
  }));

  const d = require('./offline_data.json');
  const apps = d.students || d;
  
  const localPaid = apps.filter(a => ['PAID', 'SUCCESS', 'Payment Done', 'PAID_DEMO'].includes(a.payment_status));
  
  const paidNotInRazorpay = localPaid.filter(a => {
      const email = (a.email || '').toLowerCase().trim();
      const phone = (a.mobile || '').trim();
      return !rzpEmails.has(email) && !rzpPhones.has(phone);
  });
  
  console.log(`--- STUDENTS MARKED PAID IN SYSTEM BUT NOT IN RAZORPAY ---`);
  console.log(`Total: ${paidNotInRazorpay.length}`);
  paidNotInRazorpay.forEach((a, i) => {
      console.log(`${i+1}. Name: ${a.full_name || a.fullName}, Email: ${a.email}, Phone: ${a.mobile}, Status: ${a.payment_status}`);
  });

}
findExtras();
