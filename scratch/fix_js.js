const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'student', 'apply.html');
let content = fs.readFileSync(file, 'utf8');

// Normalize line endings to \n for matching, then restore at end
const hadCRLF = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

// 1. Fix Step 1 validation - add address field validation
const oldV1 = `const dob = document.getElementById('dob').value.trim();

        if (!name || !email || !mobile || !dob) {`;
const newV1 = `const dob = document.getElementById('dob').value.trim();
        const addr1 = document.getElementById('addressLine1').value.trim();
        const villageCity = document.getElementById('village').value.trim();
        const talukaVal = document.getElementById('taluka').value.trim();
        const districtVal = document.getElementById('district').value.trim();
        const stateVal = document.getElementById('state').value.trim();
        const pinVal = document.getElementById('pinCode').value.trim();

        if (!name || !email || !mobile || !dob || !addr1 || !villageCity || !talukaVal || !districtVal || !stateVal || !pinVal) {`;

if (content.includes(oldV1)) {
  content = content.replace(oldV1, newV1);
  console.log('✅ Step 1 validation: address fields added');
} else {
  console.log('❌ Step 1 validation pattern not found');
}

// 2. Add PIN validation after mobile check
const oldMobile = `if (!/^\\d{10}$/.test(mobile)) { 
          showAlert('⚠ Mobile number must be 10 digits.', 'warning'); 
          return false; 
        }
      }
      if (step === 2) {`;
const newMobile = `if (!/^\\d{10}$/.test(mobile)) { 
          showAlert('⚠ Mobile number must be 10 digits.', 'warning'); 
          return false; 
        }
        if (!/^\\d{6}$/.test(pinVal)) {
          showAlert('⚠ PIN Code must be 6 digits.', 'warning');
          return false;
        }
      }
      if (step === 2) {`;

if (content.includes(oldMobile)) {
  content = content.replace(oldMobile, newMobile);
  console.log('✅ PIN validation added');
} else {
  console.log('❌ Mobile validation pattern not found');
}

// 3. Fix Step 2 validation - remove tenthFile requirement
const oldTenth = `if (!tenthPct || !fileDataMap['tenthFile']) { 
          showAlert('⚠ Please provide 10th details and upload marksheet.', 'warning'); 
          return false; 
        }`;
const newTenth = `if (!tenthPct) { 
          showAlert('⚠ Please provide 10th percentage.', 'warning'); 
          return false; 
        }`;

if (content.includes(oldTenth)) {
  content = content.replace(oldTenth, newTenth);
  console.log('✅ Step 2: tenthFile check removed');
} else {
  console.log('❌ tenthFile validation pattern not found');
}

// 4. Fix Step 3 validation - add document upload checks before terms
const oldV3 = `if (step === 3) {
        if (!document.getElementById('termsCheck').checked) {`;
const newV3 = `if (step === 3) {
        if (!fileDataMap['tenthFile']) { 
          showAlert('⚠ Please upload your 10th Marksheet.', 'warning'); 
          return false; 
        }
        if (!fileDataMap['twelfthFile']) { 
          showAlert('⚠ Please upload your 12th Marksheet.', 'warning'); 
          return false; 
        }
        if (!fileDataMap['signatureFile']) { 
          showAlert('⚠ Please upload your signature.', 'warning'); 
          return false; 
        }
        if (!fileDataMap['photoFile']) { 
          showAlert('⚠ Please upload your passport photo.', 'warning'); 
          return false; 
        }
        if (!document.getElementById('termsCheck').checked) {`;

if (content.includes(oldV3)) {
  content = content.replace(oldV3, newV3);
  console.log('✅ Step 3: document upload checks added');
} else {
  console.log('❌ Step 3 validation pattern not found');
}

// 5. Fix fail() step 4 -> 3
content = content.replace(
  "fail(4, '⚠ Please enter a valid UTR / Transaction ID (minimum 8 characters).');",
  "fail(3, '⚠ Please enter a valid UTR / Transaction ID (minimum 8 characters).');"
);
content = content.replace(
  "fail(4, '⚠ Please upload your payment screenshot.');",
  "fail(3, '⚠ Please upload your payment screenshot.');"
);
content = content.replace(
  "fail(4, '⚠ Please check the confirmation box before submitting.');",
  "fail(3, '⚠ Please check the confirmation box before submitting.');"
);
console.log('✅ fail() calls updated (4->3)');

// 6. Fix address in applicationData
const oldAddr = "address:   document.getElementById('address').value.trim(),";
const newAddr = `address:   [
            document.getElementById('addressLine1').value.trim(),
            document.getElementById('addressLine2').value.trim(),
            document.getElementById('village').value.trim(),
            'Taluka: ' + document.getElementById('taluka').value.trim(),
            'District: ' + document.getElementById('district').value.trim(),
            document.getElementById('state').value.trim(),
            'PIN: ' + document.getElementById('pinCode').value.trim()
          ].filter(Boolean).join(', '),`;

if (content.includes(oldAddr)) {
  content = content.replace(oldAddr, newAddr);
  console.log('✅ Address in applicationData updated');
} else {
  console.log('❌ Address in applicationData pattern not found');
}

// 7. Fix step range
content = content.replace('stepParam >= 1 && stepParam <= 4', 'stepParam >= 1 && stepParam <= 3');
content = content.replace('if (stepParam === 4) startPaymentCountdown();', 'if (stepParam === 3) startPaymentCountdown();');
content = content.replace('if (step === 4) startPaymentCountdown();', 'if (step === 3) startPaymentCountdown();');
console.log('✅ Step range and timer updated');

// 8. Add tracking for new upload fields
const oldTrack = "if (fileDataMap['tenthFile'])  uploadedDocs.push('10th Marksheet');";
const newTrack = `if (fileDataMap['tenthFile'])  uploadedDocs.push('10th Marksheet');
        if (fileDataMap['twelfthFile'])  uploadedDocs.push('12th Marksheet');
        if (fileDataMap['signatureFile'])  uploadedDocs.push('Signature');`;

if (content.includes(oldTrack)) {
  content = content.replace(oldTrack, newTrack);
  console.log('✅ Upload tracking updated');
} else {
  console.log('❌ Upload tracking pattern not found');
}

// Restore line endings
if (hadCRLF) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(file, content, 'utf8');
console.log('\n🎉 All JS fixes applied successfully!');
