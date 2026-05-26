$file = "c:\CET EXAM ONLINE\student\apply.html"
$content = [System.IO.File]::ReadAllText($file)

# Backup
[System.IO.File]::WriteAllText("c:\CET EXAM ONLINE\student\apply.html.bak", $content)

# 1. Change grid from 4 to 3 columns
$content = $content.Replace("grid-template-columns: repeat(4, 1fr);", "grid-template-columns: repeat(3, 1fr);")

# 2. Replace step tabs (4 -> 3)
$oldTabs = @"
      <div class="steps">
        <div class="step active" id="stepTab1" onclick="window.showStep(1)">
          1. Personal Info
        </div>
        <div class="step" id="stepTab2" onclick="if(validateStep(1)) window.showStep(2)">
          2. Academic Details
        </div>
        <div class="step" id="stepTab3" onclick="if(validateStep(1) && validateStep(2)) window.showStep(3)">
          3. Documents
        </div>
        <div class="step" id="stepTab4" onclick="if(validateStep(1) && validateStep(2) && validateStep(3)) window.showStep(4)">
          4. Payment
        </div>
      </div>
"@

$newTabs = @"
      <div class="steps">
        <div class="step active" id="stepTab1" onclick="window.showStep(1)">
          1. Personal Info
        </div>
        <div class="step" id="stepTab2" onclick="if(validateStep(1)) window.showStep(2)">
          2. Academic Details
        </div>
        <div class="step" id="stepTab3" onclick="if(validateStep(1) && validateStep(2)) window.showStep(3)">
          3. Documents & Payment
        </div>
      </div>
"@

$content = $content.Replace($oldTabs, $newTabs)

# 3. Replace address textarea with structured fields in Step 1
$oldAddress = @"
            <div class="form-group full-width">
              <label class="form-label" for="address">Address</label>
              <textarea id="address" class="form-textarea" placeholder="Full address with city and state" style="min-height:80px;"></textarea>
            </div>
"@

$newAddress = @"
            <div class="form-group">
              <label class="form-label" for="addressLine1">Address Line 1 <span>*</span></label>
              <input type="text" id="addressLine1" class="form-input" placeholder="House No, Street Name" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="addressLine2">Address Line 2</label>
              <input type="text" id="addressLine2" class="form-input" placeholder="Landmark, Area (optional)" />
            </div>
            <div class="form-group">
              <label class="form-label" for="village">Village / City <span>*</span></label>
              <input type="text" id="village" class="form-input" placeholder="Enter village or city" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="taluka">Taluka <span>*</span></label>
              <input type="text" id="taluka" class="form-input" placeholder="Enter taluka" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="district">District <span>*</span></label>
              <input type="text" id="district" class="form-input" placeholder="Enter district" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="state">State <span>*</span></label>
              <input type="text" id="state" class="form-input" placeholder="Enter state" value="Maharashtra" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="pinCode">PIN Code <span>*</span></label>
              <input type="text" id="pinCode" class="form-input" placeholder="6-digit PIN code" maxlength="6" required />
            </div>
"@

$content = $content.Replace($oldAddress, $newAddress)

# 4. Remove 10th marksheet upload from Step 2 (Academic Details)
$oldTenthUpload = @"
            <div class="form-group">
                <label class="form-label">Upload 10th Marksheet <span>*</span></label>
                <input type="file" id="tenthFile" class="form-input" accept="image/*,.pdf" onchange="handleFileUpload('tenthFile','tenthPreview','tenthName')" required />
                <p id="tenthName" style="font-size:11px; color:var(--success); margin-top:4px;"></p>
                <div id="tenthPreview" class="upload-preview" style="display:none; height:40px; margin-top:5px;"></div>
            </div>
"@

$content = $content.Replace($oldTenthUpload, "")

# 5. Remove old Step 3 (Documents) and Step 4 (Payment), replace with merged Step 3
$oldStep3Start = "        <!-- Step 3: Documents -->"
$oldStep4End = "        </div>`r`n      </form>"

# Find indices
$step3Idx = $content.IndexOf("        <!-- Step 3: Documents -->")
$formEndTag = "</form>"
$formEndIdx = $content.IndexOf($formEndTag, $step3Idx)

$beforeStep3 = $content.Substring(0, $step3Idx)
$afterForm = $content.Substring($formEndIdx + $formEndTag.Length)

$newStep3 = @"
        <!-- Step 3: Documents & Payment -->
        <div class="form-step" id="step3">
          <!-- 10th Marksheet Upload -->
          <div class="form-grid" style="margin-bottom:20px;">
            <div class="form-group">
                <label class="form-label">Upload 10th Marksheet <span>*</span></label>
                <div class="upload-area" id="tenthUpload">
                  <input type="file" id="tenthFile" accept="image/*,.pdf" onchange="handleFileUpload('tenthFile','tenthPreview','tenthName')" />
                  <div class="upload-icon">📄</div>
                  <div class="upload-text">Upload 10th Marksheet<br><strong>JPG, PNG, PDF</strong> • Max 5MB</div>
                  <div id="tenthPreview" class="upload-preview"></div>
                </div>
                <p id="tenthName" style="font-size:12px; color:var(--success); margin-top:4px;"></p>
            </div>
            <div class="form-group">
              <label class="form-label">Upload 12th Marksheet <span>*</span></label>
              <div class="upload-area" id="twelfthUpload">
                <input type="file" id="twelfthFile" accept="image/*,.pdf" onchange="handleFileUpload('twelfthFile','twelfthPreview','twelfthName')" />
                <div class="upload-icon">📄</div>
                <div class="upload-text">Upload 12th Marksheet<br><strong>JPG, PNG, PDF</strong> • Max 5MB</div>
                <div id="twelfthPreview" class="upload-preview"></div>
              </div>
              <p id="twelfthName" style="font-size:12px; color:var(--success); margin-top:4px;"></p>
            </div>
          </div>

          <!-- Passport Photo -->
          <div class="form-group mb-6">
            <label class="form-label">Passport Photo <span>*</span></label>
            <div class="upload-area" id="photoUpload">
                <input type="file" id="photoFile" accept="image/*" onchange="handleFileUpload('photoFile','photoPreview','photoName')" />
                <div class="upload-icon">📸</div>
                <div class="upload-text">Click to upload photo<br><strong>JPG, PNG</strong> • Max 2MB</div>
                <div id="photoPreview" class="upload-preview"></div>
            </div>
            <p id="photoName" style="font-size:12px; color:var(--success); margin-top:4px;"></p>
          </div>

          <!-- Signature Upload -->
          <div class="form-grid" style="margin-bottom:20px;">
            <div class="form-group">
              <label class="form-label">Signature Upload <span>*</span></label>
              <div class="upload-area" id="signatureUpload">
                <input type="file" id="signatureFile" accept="image/*" onchange="handleFileUpload('signatureFile','signaturePreview','signatureName')" />
                <div class="upload-icon">✍️</div>
                <div class="upload-text">Upload Signature<br><strong>JPG, PNG</strong> • Max 2MB</div>
                <div id="signaturePreview" class="upload-preview"></div>
              </div>
              <p id="signatureName" style="font-size:12px; color:var(--success); margin-top:4px;"></p>
            </div>
          </div>

          <!-- Dynamic caste-based documents -->
          <div id="dynamicDocContainer" class="form-grid">
             <!-- Dynamically injected document fields will appear here -->
          </div>

          <div style="background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); border-radius:12px; padding:16px; margin:16px 0;">
            <p style="font-size:13px; color:#fcd34d; margin-bottom:8px;"><strong>⚠ Important Information:</strong></p>
            <ul style="font-size:13px; color:var(--light); padding-left:16px;">
              <li>Your mobile number will be your login password</li>
              <li>Application status will be updated within 2-3 business days</li>
              <li>You will receive your Student ID upon approval</li>
              <li>Exam schedule will be shared after approval</li>
            </ul>
          </div>

          <div class="form-group">
            <label style="display:flex; align-items:flex-start; gap:10px; cursor:pointer;">
              <input type="checkbox" id="termsCheck" style="margin-top:3px; accent-color:var(--primary);" />
              <span style="font-size:13px; color:var(--light);">I confirm that all information provided is accurate and I agree to the <a href="#" style="color:var(--primary-light);">terms and conditions</a>.</span>
            </label>
          </div>

          <!-- Payment Section -->
          <div style="background:rgba(99,102,241,0.05); border:1px solid var(--card-border); border-radius:16px; padding:28px; margin:20px 0;">
            
            <!-- Payment Header -->
            <div style="text-align:center; margin-bottom:24px;">
              <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:24px;padding:6px 16px;margin-bottom:12px;">
                <span style="font-size:12px;font-weight:700;color:#34d399;letter-spacing:1px;">DEMO PAYMENT</span>
              </div>
              <p style="font-size:22px; font-weight:800; color:#fff; margin:0 0 4px;">Application Fee: <span style="color:#34d399;">₹1</span></p>
              <p style="font-size:13px; color:var(--mid); margin:0;">Scan QR with any UPI app — PhonePe, GPay, Paytm</p>
            </div>

            <div style="display:flex; gap:28px; align-items:flex-start; flex-wrap:wrap; justify-content:center;">
              
              <!-- QR + UPI Info -->
              <div style="text-align:center; min-width:200px;">
                <div style="background:#fff; padding:12px; border-radius:12px; display:inline-block; margin-bottom:12px; box-shadow:0 4px 20px rgba(0,0,0,0.3);">
                  <img src="../images/upi_qr.png" alt="UPI Payment QR" id="paymentQrImg"
                    style="width:180px; height:180px; object-fit:contain; display:block;"
                    onerror="this.src='https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi://pay?pa=9730011724@pthdfc&pn=Master+Navnath+Babasaheb+Jangale&am=1&cu=INR'" />
                </div>
                <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:12px 16px;text-align:left;">
                  <p style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin:0 0 2px;">UPI ID</p>
                  <p style="font-size:14px;font-weight:700;color:#e2e8f0;margin:0 0 8px;font-family:monospace;">9730011724@pthdfc</p>
                  <p style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin:0 0 2px;">Payee Name</p>
                  <p style="font-size:13px;font-weight:600;color:#c4b5fd;margin:0 0 8px;">Master Navnath Babasaheb Jangale</p>
                  <p style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin:0 0 2px;">Amount</p>
                  <p style="font-size:16px;font-weight:800;color:#34d399;margin:0;">₹1.00</p>
                </div>
                <!-- Countdown Timer -->
                <div style="margin-top:12px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:10px;padding:10px;text-align:center;">
                  <p style="font-size:10px;color:#fcd34d;margin:0 0 4px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Session expires in</p>
                  <p id="paymentCountdown" style="font-size:24px;font-weight:800;color:#f59e0b;margin:0;font-family:monospace;">10:00</p>
                </div>
              </div>

              <!-- Payment Form -->
              <div style="flex:1; min-width:280px; max-width:380px;">
                <div style="margin-bottom:16px;">
                  <label class="form-label" for="transactionId">Transaction ID / UTR Number <span>*</span></label>
                  <input type="text" id="transactionId" class="form-input"
                    placeholder="Enter UTR / Transaction ID (min 8 chars)"
                    minlength="8" required
                    style="font-family:monospace; letter-spacing:1px;" />
                  <p style="font-size:11px;color:#64748b;margin:4px 0 0;">Find UTR in your UPI app under payment history</p>
                </div>

                <div style="margin-bottom:16px;">
                  <label class="form-label">Payment Screenshot <span>*</span></label>
                  <input type="file" id="paymentScreenshot" class="form-input" accept="image/*"
                    onchange="handleFileUpload('paymentScreenshot','paymentPreview','paymentName')" required />
                  <p id="paymentName" style="font-size:11px; color:var(--success); margin-top:4px;"></p>
                  <div id="paymentPreview" class="upload-preview" style="display:none; height:80px; margin-top:5px;"></div>
                </div>

                <div style="margin-bottom:20px;">
                  <label style="display:flex; align-items:flex-start; gap:10px; cursor:pointer;">
                    <input type="checkbox" id="finalTermsCheck" style="margin-top:3px; accent-color:var(--primary);" />
                    <span style="font-size:13px; color:var(--light);">I confirm payment of ₹1 is successful and the UTR entered is correct.</span>
                  </label>
                </div>

                <!-- Payment Status Banner (hidden initially) -->
                <div id="paymentStatusBanner" style="display:none; padding:16px; border-radius:12px; text-align:center; margin-bottom:16px;"></div>

              </div>
            </div>

            <div style="margin-top:8px; padding:12px 16px; background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.2); border-radius:10px;">
              <p style="font-size:11px;color:#fcd34d;margin:0;">⚠ <strong>Demo Mode:</strong> Payment is auto-verified instantly. No real money is deducted beyond ₹1 test amount.</p>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-outline-sm btn-lg" onclick="prevStep(2)">&larr; Back</button>
            <button type="submit" class="btn btn-solid btn-lg" id="submitBtn">
              💳 Submit Payment & Apply
            </button>
          </div>
        </div>
      </form>
"@

$content = $beforeStep3 + $newStep3 + $afterForm

# 6. Update Step 2 back button and continue button
$content = $content.Replace('onclick="prevStep(1)"', 'onclick="prevStep(1)"')
# Step 2 continue should go to step 3 (already correct: nextStep(2) -> shows step 3)

# 7. Update validation - Step 1 must validate address fields
$oldStep1Validate = @"
      if (step === 1) {
        const name = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const mobile = document.getElementById('mobileNumber').value.trim();
        const dob = document.getElementById('dob').value.trim();

        if (!name || !email || !mobile || !dob) { 
          showAlert('⚠ Please fill all required fields.', 'warning'); 
          return false; 
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) { 
          showAlert('⚠ Please enter a valid email.', 'warning'); 
          return false; 
        }
        if (!/^\d{10}$/.test(mobile)) { 
          showAlert('⚠ Mobile number must be 10 digits.', 'warning'); 
          return false; 
        }
      }
"@

$newStep1Validate = @"
      if (step === 1) {
        const name = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const mobile = document.getElementById('mobileNumber').value.trim();
        const dob = document.getElementById('dob').value.trim();
        const addr1 = document.getElementById('addressLine1').value.trim();
        const villageCity = document.getElementById('village').value.trim();
        const taluka = document.getElementById('taluka').value.trim();
        const districtVal = document.getElementById('district').value.trim();
        const stateVal = document.getElementById('state').value.trim();
        const pin = document.getElementById('pinCode').value.trim();

        if (!name || !email || !mobile || !dob) { 
          showAlert('⚠ Please fill all required fields.', 'warning'); 
          return false; 
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) { 
          showAlert('⚠ Please enter a valid email.', 'warning'); 
          return false; 
        }
        if (!/^\d{10}$/.test(mobile)) { 
          showAlert('⚠ Mobile number must be 10 digits.', 'warning'); 
          return false; 
        }
        if (!addr1 || !villageCity || !taluka || !districtVal || !stateVal || !pin) {
          showAlert('⚠ Please fill all required address fields.', 'warning');
          return false;
        }
        if (!/^\d{6}$/.test(pin)) {
          showAlert('⚠ PIN Code must be 6 digits.', 'warning');
          return false;
        }
      }
"@

$content = $content.Replace($oldStep1Validate, $newStep1Validate)

# 8. Update Step 2 validation - remove tenthFile requirement
$oldStep2Validate = @"
        if (!tenthPct || !fileDataMap['tenthFile']) { 
          showAlert('⚠ Please provide 10th details and upload marksheet.', 'warning'); 
          return false; 
        }
"@

$newStep2Validate = @"
        if (!tenthPct) { 
          showAlert('⚠ Please provide 10th percentage.', 'warning'); 
          return false; 
        }
"@

$content = $content.Replace($oldStep2Validate, $newStep2Validate)

# 9. Update Step 3 validation - add tenthFile and signatureFile check
$oldStep3Validate = @"
      if (step === 3) {
        if (!document.getElementById('termsCheck').checked) {
          showAlert('⚠ Please agree to terms and conditions.', 'warning');
          return false;
        }

        if (!fileDataMap['photoFile']) { 
          showAlert('⚠ Please upload your passport photo.', 'warning'); 
          return false; 
        }
"@

$newStep3Validate = @"
      if (step === 3) {
        if (!fileDataMap['tenthFile']) { 
          showAlert('⚠ Please upload your 10th Marksheet.', 'warning'); 
          return false; 
        }
        if (!fileDataMap['twelfthFile']) { 
          showAlert('⚠ Please upload your 12th Marksheet.', 'warning'); 
          return false; 
        }
        if (!fileDataMap['photoFile']) { 
          showAlert('⚠ Please upload your passport photo.', 'warning'); 
          return false; 
        }
        if (!fileDataMap['signatureFile']) { 
          showAlert('⚠ Please upload your signature.', 'warning'); 
          return false; 
        }
        if (!document.getElementById('termsCheck').checked) {
          showAlert('⚠ Please agree to terms and conditions.', 'warning');
          return false;
        }
"@

$content = $content.Replace($oldStep3Validate, $newStep3Validate)

# 10. Update submit handler - change fail(4,...) to fail(3,...) and remove step 3 doc validation from submit
$content = $content.Replace("if (!validateStep(3)) { fail(3, '⚠ Please complete Documents step.'); return; }", "if (!validateStep(3)) { fail(3, '⚠ Please complete Documents & Payment step.'); return; }")

# Remove the separate payment validation block since it's now part of step 3
# Change fail(4, ...) to fail(3, ...)
$content = $content.Replace("fail(4, '⚠ Please enter a valid UTR / Transaction ID (minimum 8 characters).');", "fail(3, '⚠ Please enter a valid UTR / Transaction ID (minimum 8 characters).');")
$content = $content.Replace("fail(4, '⚠ Please upload your payment screenshot.');", "fail(3, '⚠ Please upload your payment screenshot.');")
$content = $content.Replace("fail(4, '⚠ Please check the confirmation box before submitting.');", "fail(3, '⚠ Please check the confirmation box before submitting.');")

# 11. Update address in applicationData to combine structured fields
$oldAddressLine = "          address:   document.getElementById('address').value.trim(),"

$newAddressLine = @"
          address:   [
            document.getElementById('addressLine1').value.trim(),
            document.getElementById('addressLine2').value.trim(),
            document.getElementById('village').value.trim(),
            'Taluka: ' + document.getElementById('taluka').value.trim(),
            'District: ' + document.getElementById('district').value.trim(),
            document.getElementById('state').value.trim(),
            'PIN: ' + document.getElementById('pinCode').value.trim()
          ].filter(Boolean).join(', '),
"@

$content = $content.Replace($oldAddressLine, $newAddressLine)

# 12. Update DOMContentLoaded step range check from 4 to 3
$content = $content.Replace("if (stepParam && stepParam >= 1 && stepParam <= 4) {", "if (stepParam && stepParam >= 1 && stepParam <= 3) {")
$content = $content.Replace("if (stepParam === 4) startPaymentCountdown();", "if (stepParam === 3) startPaymentCountdown();")
$content = $content.Replace("if (step === 4) startPaymentCountdown();", "if (step === 3) startPaymentCountdown();")

# 13. Add uploaded docs tracking for new fields
$oldUploadedDocs = "if (fileDataMap['tenthFile'])  uploadedDocs.push('10th Marksheet');"
$newUploadedDocs = @"
if (fileDataMap['tenthFile'])  uploadedDocs.push('10th Marksheet');
        if (fileDataMap['twelfthFile'])  uploadedDocs.push('12th Marksheet');
        if (fileDataMap['signatureFile'])  uploadedDocs.push('Signature');
"@
$content = $content.Replace($oldUploadedDocs, $newUploadedDocs)

# Write the file
[System.IO.File]::WriteAllText($file, $content)

Write-Host "SUCCESS: apply.html has been updated."
Write-Host "Backup saved to apply.html.bak"
