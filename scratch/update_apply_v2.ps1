$file = "c:\CET EXAM ONLINE\student\apply.html"
$content = [System.IO.File]::ReadAllText($file)

# Check what we need to fix - the first script already changed grid to 3
# But tabs and address and step 3/4 merging didn't work

# Let's work line by line for precision
$lines = $content -split "`r`n"

$output = @()
$skip = $false
$skipUntil = ""
$step3Written = $false

for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    
    # --- FIX 1: Replace step tabs ---
    # Remove stepTab3 old (Documents) and stepTab4 (Payment), replace with merged
    if ($line -match 'id="stepTab3".*3\. Documents') {
        $output += '        <div class="step" id="stepTab3" onclick="if(validateStep(1) && validateStep(2)) window.showStep(3)">'
        $output += '          3. Documents & Payment'
        $output += '        </div>'
        # Skip next 5 lines (closing div, stepTab4 open, text, close, </div> for steps)
        $i += 2  # skip "3. Documents" and "</div>"
        # Now skip stepTab4 block
        $i++ # skip stepTab4 opening div
        $i++ # skip "4. Payment"  
        $i++ # skip </div>
        continue
    }
    
    # --- FIX 2: Replace address textarea with structured fields ---
    if ($line -match 'class="form-group full-width"' -and $lines[$i+1] -match 'for="address"') {
        $output += '            <div class="form-group">'
        $output += '              <label class="form-label" for="addressLine1">Address Line 1 <span>*</span></label>'
        $output += '              <input type="text" id="addressLine1" class="form-input" placeholder="House No, Street Name" required />'
        $output += '            </div>'
        $output += '            <div class="form-group">'
        $output += '              <label class="form-label" for="addressLine2">Address Line 2</label>'
        $output += '              <input type="text" id="addressLine2" class="form-input" placeholder="Landmark, Area (optional)" />'
        $output += '            </div>'
        $output += '            <div class="form-group">'
        $output += '              <label class="form-label" for="village">Village / City <span>*</span></label>'
        $output += '              <input type="text" id="village" class="form-input" placeholder="Enter village or city" required />'
        $output += '            </div>'
        $output += '            <div class="form-group">'
        $output += '              <label class="form-label" for="taluka">Taluka <span>*</span></label>'
        $output += '              <input type="text" id="taluka" class="form-input" placeholder="Enter taluka" required />'
        $output += '            </div>'
        $output += '            <div class="form-group">'
        $output += '              <label class="form-label" for="district">District <span>*</span></label>'
        $output += '              <input type="text" id="district" class="form-input" placeholder="Enter district" required />'
        $output += '            </div>'
        $output += '            <div class="form-group">'
        $output += '              <label class="form-label" for="state">State <span>*</span></label>'
        $output += '              <input type="text" id="state" class="form-input" placeholder="Enter state" value="Maharashtra" required />'
        $output += '            </div>'
        $output += '            <div class="form-group">'
        $output += '              <label class="form-label" for="pinCode">PIN Code <span>*</span></label>'
        $output += '              <input type="text" id="pinCode" class="form-input" placeholder="6-digit PIN code" maxlength="6" required />'
        $output += '            </div>'
        $i += 3  # skip the 4 lines of old address (div, label, textarea, /div)
        continue
    }
    
    # --- FIX 3: Remove 10th marksheet upload from Step 2 ---
    if ($line -match 'Upload 10th Marksheet' -and $i -lt 250) {
        # This is in Step 2 area - skip the whole form-group (go back 1 for the opening div)
        # Current line is label, previous was opening div
        # Remove from output the last added line (opening div)
        $output = $output[0..($output.Count - 2)]
        # Skip: label, input, p, div preview, closing div
        $i += 3  # skip input, p, div, closing div
        continue
    }
    
    # --- FIX 4: Replace old Step 3 + Step 4 with merged Step 3 ---
    if ($line -match '<!-- Step 3: Documents -->') {
        $skip = $true
        # Write the new merged step 3
        $output += '        <!-- Step 3: Documents & Payment -->'
        $output += '        <div class="form-step" id="step3">'
        $output += '          <!-- 10th Marksheet Upload -->'
        $output += '          <div class="form-grid" style="margin-bottom:20px;">'
        $output += '            <div class="form-group">'
        $output += '                <label class="form-label">Upload 10th Marksheet <span>*</span></label>'
        $output += '                <div class="upload-area" id="tenthUpload">'
        $output += '                  <input type="file" id="tenthFile" accept="image/*,.pdf" onchange="handleFileUpload(''tenthFile'',''tenthPreview'',''tenthName'')" />'
        $output += '                  <div class="upload-icon">📄</div>'
        $output += '                  <div class="upload-text">Upload 10th Marksheet<br><strong>JPG, PNG, PDF</strong> • Max 5MB</div>'
        $output += '                  <div id="tenthPreview" class="upload-preview"></div>'
        $output += '                </div>'
        $output += '                <p id="tenthName" style="font-size:12px; color:var(--success); margin-top:4px;"></p>'
        $output += '            </div>'
        $output += '            <div class="form-group">'
        $output += '              <label class="form-label">Upload 12th Marksheet <span>*</span></label>'
        $output += '              <div class="upload-area" id="twelfthUpload">'
        $output += '                <input type="file" id="twelfthFile" accept="image/*,.pdf" onchange="handleFileUpload(''twelfthFile'',''twelfthPreview'',''twelfthName'')" />'
        $output += '                <div class="upload-icon">📄</div>'
        $output += '                <div class="upload-text">Upload 12th Marksheet<br><strong>JPG, PNG, PDF</strong> • Max 5MB</div>'
        $output += '                <div id="twelfthPreview" class="upload-preview"></div>'
        $output += '              </div>'
        $output += '              <p id="twelfthName" style="font-size:12px; color:var(--success); margin-top:4px;"></p>'
        $output += '            </div>'
        $output += '          </div>'
        $output += ''
        $output += '          <!-- Passport Photo -->'
        $output += '          <div class="form-group mb-6">'
        $output += '            <label class="form-label">Passport Photo <span>*</span></label>'
        $output += '            <div class="upload-area" id="photoUpload">'
        $output += '                <input type="file" id="photoFile" accept="image/*" onchange="handleFileUpload(''photoFile'',''photoPreview'',''photoName'')" />'
        $output += '                <div class="upload-icon">📸</div>'
        $output += '                <div class="upload-text">Click to upload photo<br><strong>JPG, PNG</strong> • Max 2MB</div>'
        $output += '                <div id="photoPreview" class="upload-preview"></div>'
        $output += '            </div>'
        $output += '            <p id="photoName" style="font-size:12px; color:var(--success); margin-top:4px;"></p>'
        $output += '          </div>'
        $output += ''
        $output += '          <!-- Signature Upload -->'
        $output += '          <div class="form-grid" style="margin-bottom:20px;">'
        $output += '            <div class="form-group">'
        $output += '              <label class="form-label">Signature Upload <span>*</span></label>'
        $output += '              <div class="upload-area" id="signatureUpload">'
        $output += '                <input type="file" id="signatureFile" accept="image/*" onchange="handleFileUpload(''signatureFile'',''signaturePreview'',''signatureName'')" />'
        $output += '                <div class="upload-icon">✍️</div>'
        $output += '                <div class="upload-text">Upload Signature<br><strong>JPG, PNG</strong> • Max 2MB</div>'
        $output += '                <div id="signaturePreview" class="upload-preview"></div>'
        $output += '              </div>'
        $output += '              <p id="signatureName" style="font-size:12px; color:var(--success); margin-top:4px;"></p>'
        $output += '            </div>'
        $output += '          </div>'
        $output += ''
        $output += '          <!-- Dynamic caste-based documents -->'
        $output += '          <div id="dynamicDocContainer" class="form-grid">'
        $output += '             <!-- Dynamically injected document fields will appear here -->'
        $output += '          </div>'
        $output += ''
        $output += '          <div style="background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); border-radius:12px; padding:16px; margin:16px 0;">'
        $output += '            <p style="font-size:13px; color:#fcd34d; margin-bottom:8px;"><strong>⚠ Important Information:</strong></p>'
        $output += '            <ul style="font-size:13px; color:var(--light); padding-left:16px;">'
        $output += '              <li>Your mobile number will be your login password</li>'
        $output += '              <li>Application status will be updated within 2-3 business days</li>'
        $output += '              <li>You will receive your Student ID upon approval</li>'
        $output += '              <li>Exam schedule will be shared after approval</li>'
        $output += '            </ul>'
        $output += '          </div>'
        $output += ''
        $output += '          <div class="form-group">'
        $output += '            <label style="display:flex; align-items:flex-start; gap:10px; cursor:pointer;">'
        $output += '              <input type="checkbox" id="termsCheck" style="margin-top:3px; accent-color:var(--primary);" />'
        $output += '              <span style="font-size:13px; color:var(--light);">I confirm that all information provided is accurate and I agree to the <a href="#" style="color:var(--primary-light);">terms and conditions</a>.</span>'
        $output += '            </label>'
        $output += '          </div>'
        $step3Written = $true
        continue
    }
    
    # Skip old step 3 and step 4 content until we reach </form>
    if ($skip) {
        if ($line.Trim() -eq '</form>') {
            $skip = $false
            # Before closing form, insert the payment section
            $output += ''
            $output += '          <!-- Payment Section -->'
            $output += '          <div style="background:rgba(99,102,241,0.05); border:1px solid var(--card-border); border-radius:16px; padding:28px; margin:20px 0;">'
            $output += '            <div style="text-align:center; margin-bottom:24px;">'
            $output += '              <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:24px;padding:6px 16px;margin-bottom:12px;">'
            $output += '                <span style="font-size:12px;font-weight:700;color:#34d399;letter-spacing:1px;">DEMO PAYMENT</span>'
            $output += '              </div>'
            $output += '              <p style="font-size:22px; font-weight:800; color:#fff; margin:0 0 4px;">Application Fee: <span style="color:#34d399;">₹1</span></p>'
            $output += '              <p style="font-size:13px; color:var(--mid); margin:0;">Scan QR with any UPI app — PhonePe, GPay, Paytm</p>'
            $output += '            </div>'
            $output += '            <div style="display:flex; gap:28px; align-items:flex-start; flex-wrap:wrap; justify-content:center;">'
            $output += '              <div style="text-align:center; min-width:200px;">'
            $output += '                <div style="background:#fff; padding:12px; border-radius:12px; display:inline-block; margin-bottom:12px; box-shadow:0 4px 20px rgba(0,0,0,0.3);">'
            $output += "                  <img src=""../images/upi_qr.png"" alt=""UPI Payment QR"" id=""paymentQrImg"" style=""width:180px; height:180px; object-fit:contain; display:block;"" onerror=""this.src='https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi://pay?pa=9730011724@pthdfc&pn=Master+Navnath+Babasaheb+Jangale&am=1&cu=INR'"" />"
            $output += '                </div>'
            $output += '                <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:12px 16px;text-align:left;">'
            $output += '                  <p style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin:0 0 2px;">UPI ID</p>'
            $output += '                  <p style="font-size:14px;font-weight:700;color:#e2e8f0;margin:0 0 8px;font-family:monospace;">9730011724@pthdfc</p>'
            $output += '                  <p style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin:0 0 2px;">Payee Name</p>'
            $output += '                  <p style="font-size:13px;font-weight:600;color:#c4b5fd;margin:0 0 8px;">Master Navnath Babasaheb Jangale</p>'
            $output += '                  <p style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin:0 0 2px;">Amount</p>'
            $output += '                  <p style="font-size:16px;font-weight:800;color:#34d399;margin:0;">₹1.00</p>'
            $output += '                </div>'
            $output += '                <div style="margin-top:12px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:10px;padding:10px;text-align:center;">'
            $output += '                  <p style="font-size:10px;color:#fcd34d;margin:0 0 4px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Session expires in</p>'
            $output += '                  <p id="paymentCountdown" style="font-size:24px;font-weight:800;color:#f59e0b;margin:0;font-family:monospace;">10:00</p>'
            $output += '                </div>'
            $output += '              </div>'
            $output += '              <div style="flex:1; min-width:280px; max-width:380px;">'
            $output += '                <div style="margin-bottom:16px;">'
            $output += '                  <label class="form-label" for="transactionId">Transaction ID / UTR Number <span>*</span></label>'
            $output += '                  <input type="text" id="transactionId" class="form-input" placeholder="Enter UTR / Transaction ID (min 8 chars)" minlength="8" required style="font-family:monospace; letter-spacing:1px;" />'
            $output += '                  <p style="font-size:11px;color:#64748b;margin:4px 0 0;">Find UTR in your UPI app under payment history</p>'
            $output += '                </div>'
            $output += '                <div style="margin-bottom:16px;">'
            $output += '                  <label class="form-label">Payment Screenshot <span>*</span></label>'
            $output += '                  <input type="file" id="paymentScreenshot" class="form-input" accept="image/*" onchange="handleFileUpload(''paymentScreenshot'',''paymentPreview'',''paymentName'')" required />'
            $output += '                  <p id="paymentName" style="font-size:11px; color:var(--success); margin-top:4px;"></p>'
            $output += '                  <div id="paymentPreview" class="upload-preview" style="display:none; height:80px; margin-top:5px;"></div>'
            $output += '                </div>'
            $output += '                <div style="margin-bottom:20px;">'
            $output += '                  <label style="display:flex; align-items:flex-start; gap:10px; cursor:pointer;">'
            $output += '                    <input type="checkbox" id="finalTermsCheck" style="margin-top:3px; accent-color:var(--primary);" />'
            $output += '                    <span style="font-size:13px; color:var(--light);">I confirm payment of ₹1 is successful and the UTR entered is correct.</span>'
            $output += '                  </label>'
            $output += '                </div>'
            $output += '                <div id="paymentStatusBanner" style="display:none; padding:16px; border-radius:12px; text-align:center; margin-bottom:16px;"></div>'
            $output += '              </div>'
            $output += '            </div>'
            $output += '            <div style="margin-top:8px; padding:12px 16px; background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.2); border-radius:10px;">'
            $output += '              <p style="font-size:11px;color:#fcd34d;margin:0;">⚠ <strong>Demo Mode:</strong> Payment is auto-verified instantly. No real money is deducted beyond ₹1 test amount.</p>'
            $output += '            </div>'
            $output += '          </div>'
            $output += ''
            $output += '          <div class="form-actions">'
            $output += '            <button type="button" class="btn btn-outline-sm btn-lg" onclick="prevStep(2)">&larr; Back</button>'
            $output += '            <button type="submit" class="btn btn-solid btn-lg" id="submitBtn">'
            $output += '              💳 Submit Payment & Apply'
            $output += '            </button>'
            $output += '          </div>'
            $output += '        </div>'
            $output += '      </form>'
        }
        continue
    }
    
    $output += $line
}

$result = $output -join "`r`n"

# --- FIX JS: Update validation and submission logic ---

# Fix Step 1 validation to include address fields
$oldV1 = @"
        const dob = document.getElementById('dob').value.trim();

        if (!name || !email || !mobile || !dob) {
"@
$newV1 = @"
        const dob = document.getElementById('dob').value.trim();
        const addr1 = document.getElementById('addressLine1').value.trim();
        const villageCity = document.getElementById('village').value.trim();
        const talukaVal = document.getElementById('taluka').value.trim();
        const districtVal = document.getElementById('district').value.trim();
        const stateVal = document.getElementById('state').value.trim();
        const pinVal = document.getElementById('pinCode').value.trim();

        if (!name || !email || !mobile || !dob || !addr1 || !villageCity || !talukaVal || !districtVal || !stateVal || !pinVal) {
"@
$result = $result.Replace($oldV1, $newV1)

# Add PIN validation after mobile validation
$oldMobileV = @"
        if (!/^\d{10}$/.test(mobile)) { 
          showAlert('⚠ Mobile number must be 10 digits.', 'warning'); 
          return false; 
        }
      }
      if (step === 2) {
"@
$newMobileV = @"
        if (!/^\d{10}$/.test(mobile)) { 
          showAlert('⚠ Mobile number must be 10 digits.', 'warning'); 
          return false; 
        }
        if (!/^\d{6}$/.test(pinVal)) {
          showAlert('⚠ PIN Code must be 6 digits.', 'warning');
          return false;
        }
      }
      if (step === 2) {
"@
$result = $result.Replace($oldMobileV, $newMobileV)

# Fix Step 2 validation - remove tenthFile requirement
$result = $result.Replace(
    "if (!tenthPct || !fileDataMap['tenthFile']) {`r`n          showAlert('⚠ Please provide 10th details and upload marksheet.', 'warning');",
    "if (!tenthPct) {`r`n          showAlert('⚠ Please provide 10th percentage.', 'warning');"
)

# Fix Step 3 validation - add document checks
$oldV3 = "      if (step === 3) {`r`n        if (!document.getElementById('termsCheck').checked) {"
$newV3 = @"
      if (step === 3) {
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
        if (!document.getElementById('termsCheck').checked) {
"@
$result = $result.Replace($oldV3, $newV3)

# Fix fail() calls - change step 4 to step 3
$result = $result.Replace(
    "fail(4, '⚠ Please enter a valid UTR / Transaction ID (minimum 8 characters).');",
    "fail(3, '⚠ Please enter a valid UTR / Transaction ID (minimum 8 characters).');"
)
$result = $result.Replace(
    "fail(4, '⚠ Please upload your payment screenshot.');",
    "fail(3, '⚠ Please upload your payment screenshot.');"
)
$result = $result.Replace(
    "fail(4, '⚠ Please check the confirmation box before submitting.');",
    "fail(3, '⚠ Please check the confirmation box before submitting.');"
)

# Fix address in applicationData
$result = $result.Replace(
    "address:   document.getElementById('address').value.trim(),",
    @"
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
)

# Fix step range in DOMContentLoaded
$result = $result.Replace("stepParam >= 1 && stepParam <= 4", "stepParam >= 1 && stepParam <= 3")
$result = $result.Replace("if (stepParam === 4) startPaymentCountdown();", "if (stepParam === 3) startPaymentCountdown();")
$result = $result.Replace("if (step === 4) startPaymentCountdown();", "if (step === 3) startPaymentCountdown();")

# Add tracking for new upload fields
$result = $result.Replace(
    "if (fileDataMap['tenthFile'])  uploadedDocs.push('10th Marksheet');",
    @"
if (fileDataMap['tenthFile'])  uploadedDocs.push('10th Marksheet');
        if (fileDataMap['twelfthFile'])  uploadedDocs.push('12th Marksheet');
        if (fileDataMap['signatureFile'])  uploadedDocs.push('Signature');
"@
)

[System.IO.File]::WriteAllText($file, $result)
Write-Host "SUCCESS: apply.html fully updated with all changes."
