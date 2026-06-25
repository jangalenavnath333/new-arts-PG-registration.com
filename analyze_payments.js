const xlsx = require('xlsx');

function analyze() {
  const wb = xlsx.readFile('payments - 01 Jun 26 - 24 Jun 26.xlsx');
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);

  // Filter only 'captured' payments
  const captured = data.filter(r => r.status === 'captured');

  let totalAmount = 0;
  const userMap = {};

  captured.forEach(r => {
    // some amounts might be strings or numbers. Usually amount is in rupees in Razorpay export, or sometimes paise.
    // Razorpay export usually has "amount" in rupees. Let's parse it as float.
    const amt = parseFloat(r.amount);
    totalAmount += amt;

    const email = (r.email || '').trim().toLowerCase();
    const contact = (r.contact || '').trim();
    
    // Use email as key. If no email, use contact.
    const key = email || contact || 'unknown';
    
    if (!userMap[key]) {
      userMap[key] = {
        email: email,
        contact: contact,
        transactions: [],
        totalPaid: 0
      };
    }
    
    userMap[key].transactions.push({
      id: r.id,
      amount: amt,
      date: r.created_at
    });
    userMap[key].totalPaid += amt;
  });

  const duplicates = [];
  let uniqueStudentsCount = Object.keys(userMap).length;

  for (const key in userMap) {
    if (userMap[key].transactions.length > 1) {
      duplicates.push(userMap[key]);
    }
  }

  console.log(`--- PAYMENT ANALYSIS ---`);
  console.log(`Total Successful (Captured) Transactions: ${captured.length}`);
  console.log(`Total Unique Students: ${uniqueStudentsCount}`);
  console.log(`Total Rupees Received: ₹${totalAmount.toFixed(2)}`);
  
  console.log(`\n--- DUPLICATE PAYMENTS (${duplicates.length} students paid more than once) ---`);
  duplicates.forEach((d, i) => {
    console.log(`${i+1}. Email: ${d.email} | Contact: ${d.contact} | Total Paid: ₹${d.totalPaid} | Transactions: ${d.transactions.length}`);
    d.transactions.forEach((t, j) => {
        console.log(`   -> [${j+1}] ID: ${t.id}, Date: ${t.date}, Amount: ₹${t.amount}`);
    });
  });
}

analyze();
