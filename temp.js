
    import DB, { getDefaultQuestions } from '../js/db.js';
    import SupaDB from '../js/supabase-db.js';

    // ── Supabase client (Phase 3) ──
    const supabase = SupaDB.getClient();
    let _supabaseAppsCache = null;  // in-memory cache to avoid re-fetching on every render
    let _supabaseFetched = false;

    // ============================================
    // RELIABILITY INFRASTRUCTURE
    // ============================================

    // Cache invalidation — MUST be called after every mutation
    function invalidateCache() {
      _supabaseAppsCache = null;
      _supabaseFetched = false;
      console.log('[Admin Cache] Invalidated Supabase cache');
    }

    // Improved toast notification system
    function showToast(msg, type = 'info') {
      // type: 'success' | 'error' | 'info'
      let t = document.getElementById('adminToast');
      if (t) t.remove(); // Remove any existing toast
      t = document.createElement('div');
      t.id = 'adminToast';
      t.className = `admin-toast ${type}`;
      const icons = { success: '✅', error: '❌', info: 'ℹ️' };
      t.innerHTML = `<span>${icons[type] || ''}</span><span>${msg}</span>`;
      document.body.appendChild(t);
      // Auto-hide after 4 seconds
      setTimeout(() => { t.classList.add('hide'); }, 4000);
      setTimeout(() => { if (t.parentNode) t.remove(); }, 4500);
    }

    // Button loading state helpers
    function setBtnLoading(btn, loadingText = 'Processing...') {
      if (!btn) return;
      btn._origText = btn.textContent;
      btn._origDisabled = btn.disabled;
      btn.disabled = true;
      btn.textContent = loadingText;
      btn.classList.add('admin-btn-processing');
    }
    function resetBtn(btn) {
      if (!btn) return;
      btn.disabled = btn._origDisabled || false;
      btn.textContent = btn._origText || btn.textContent;
    }
    // Reload data if edited in another tab
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && typeof fetchApplicationsFromSupabase === 'function') {
         fetchApplicationsFromSupabase().then(() => {
            if (typeof renderApplications === 'function') renderApplications();
         });
      }
    });

    // System Guard using Supabase Auth
    window.addEventListener('DOMContentLoaded', async () => {
      if (!supabase) {
         console.warn('[Security] Supabase not found');
         window.location.href = 'login.html';
         return;
      }

      // Await session recovery to prevent race conditions where fetch runs anonymously
      const { data, error } = await supabase.auth.getUser();
      if (error || !data || !data.user) {
         console.warn('[Security] Not authenticated');
         window.location.href = 'login.html';
         return;
      }

      // Strict Admin Role Verification
      if (data.user.email !== 'admin@newarts-casas-pgcet.in') {
         console.warn('[Security] Unauthorized account attempt', data.user.email);
         await supabase.auth.signOut();
         window.location.href = 'login.html';
         return;
      }

      console.log('[Security] Admin authenticated successfully');

      // Safe to load dashboard now
      await window.fetchApplicationsFromSupabase();
      window.renderOverview();
      window.loadScheduleForm();
      handleRoute(); // Initialize routing
    });

    window.adminLogout = async function() {
       if (supabase) {
         await supabase.auth.signOut();
       }
       window.location.href = 'login.html';
    };

    // Chart instances
    let statusChart = null;
    let scoresChart = null;
    let monitoringInterval = null;

    // Routing Logic
    window.addEventListener('popstate', handleRoute);

    function handleRoute() {
      let path = window.location.pathname;
      let hash = window.location.hash;
      
      let tab = 'overview'; // default
      
      if (path.includes('/applications') || hash === '#applications') tab = 'applications';
      else if (path.includes('/documents') || hash === '#documents') tab = 'documents';
      else if (path.includes('/approved-students') || hash === '#students') tab = 'students';
      else if (path.includes('/exam-settings') || hash === '#schedule') tab = 'schedule';
      else if (path.includes('/question-bank') || hash === '#questions') tab = 'questions';
      else if (path.includes('/live-monitoring') || hash === '#monitoring') tab = 'monitoring';
      else if (path.includes('/live-results') || hash === '#results') tab = 'results';
      else if (path.includes('/overview') || hash === '#overview' || path.includes('/dashboard')) tab = 'overview';

      activateTabUI(tab);
    }

    window.showTab = function(tab, updateUrl = true) {
      console.log('Sidebar clicked: Tab requested ->', tab);
      if (updateUrl) {
        const routeMap = {
          'overview': '/admin/overview',
          'applications': '/admin/applications',
          'documents': '/admin/documents',
          'students': '/admin/approved-students',
          'schedule': '/admin/exam-settings',
          'questions': '/admin/question-bank',
          'monitoring': '/admin/live-monitoring',
          'results': '/admin/live-results',
          'locked': '/admin/locked-exams'
        };
        // Use hash-based routing to prevent 404s on reload since there's no server-side React Router
        window.history.pushState({}, '', '#' + tab);
      }
      activateTabUI(tab);
    }

    function activateTabUI(tab) {
      if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
      }

      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(n => {
        n.classList.remove('bg-indigo-600', 'text-white');
        n.classList.remove('text-red-600', 'bg-red-100'); // Clean red styles just in case
        n.classList.add('text-slate-400');
      });
      
      const tabElement = document.getElementById('tab-' + tab);
      if (tabElement) tabElement.classList.add('active');
      
      const activeNav = document.getElementById('nav-' + tab);
      if (activeNav) {
        activeNav.classList.remove('text-slate-400');
        if (tab === 'locked') {
           activeNav.classList.add('bg-red-100', 'text-red-600');
        } else {
           activeNav.classList.add('bg-indigo-600', 'text-white');
        }
      }

      const titles = { overview:'Dashboard Overview', applications:'Student Applications', documents:'Document Verification', students:'Approved Students Registry', schedule:'Examination Scheduling', questions:'Secure Question Bank', results:'Live Exam Results', payments:'Payment Verification', locked:'Locked Examinations' };
      document.getElementById('pageTitle').textContent = titles[tab] || 'Dashboard';

      if (tab === 'applications') {
        // RELIABILITY FIX: Always invalidate cache on tab switch for fresh data
        invalidateCache();
        window.renderApplications(); // render immediately with local data
        if (supabase) {
          fetchApplicationsFromSupabase().then(() => { window.renderApplications(); });
        }
      }
      if (tab === 'documents') {
        invalidateCache();
        window.renderDocumentsTab();
      }
      if (tab === 'students') {
        // RELIABILITY FIX: Always invalidate and re-fetch on tab switch
        invalidateCache();
        window.renderStudents();
        if (supabase) {
          fetchApplicationsFromSupabase().then(() => { window.renderStudents(); });
          supabase.from('exam_results').select('*').then(({data}) => {
             if(data) {
                let localRes = []; try { localRes = JSON.parse(localStorage.getItem('cetExamResults')) || []; } catch(e){}
                const merged = data.map(r => ({
                  id: r.id, studentId: r.cet_student_id, name: r.student_name,
                  course: r.course, category: r.category, score: r.score, total: r.total,
                  correctAnswers: r.correct_answers, wrongAnswers: r.wrong_answers,
                  unanswered: r.unanswered, violations: r.violations,
                  status: 'Completed', submittedAt: r.submitted_at, answers: r.answers || {}
                }));
                localRes.forEach(lr => { if (!merged.find(sr => sr.studentId === lr.studentId)) merged.push(lr); });
                localStorage.setItem('cetExamResults', JSON.stringify(merged));
                window.renderStudents();
             }
          });
          supabase.from('security_logs').select('*').then(({data}) => {
             if(data) {
                const merged = data.map(l => ({
                   studentId: l.cet_student_id || l.student_id, name: l.student_name,
                   type: l.event_type, message: l.message, timestamp: l.created_at
                }));
                localStorage.setItem('cetExamSecurityLogs', JSON.stringify(merged));
                window.renderStudents();
             }
          });
        }
      }
      if (tab === 'questions') window.renderQuestions();
      if (tab === 'monitoring') {
        window.renderMonitoring();
        monitoringInterval = setInterval(window.renderMonitoring, 5000);
      }
      if (tab === 'results') {
        window.renderResults();
        // Fetch publish status
        import('../js/supabase-db.js').then(module => {
           module.default.getResultsPublished().then(isPub => {
              if (document.getElementById('btnPublish')) {
                 document.getElementById('btnPublish').classList.toggle('hidden', isPub);
                 document.getElementById('btnUnpublish').classList.toggle('hidden', !isPub);
              }
           });
        });
        // Also fetch results from Supabase
        if (supabase) {
          supabase.from('exam_results').select('*').order('submitted_at', { ascending: false })
            .then(({ data, error }) => {
              if (!error && data && data.length > 0) {
                const supaResults = data.map(r => ({
                  id: r.id, studentId: r.cet_student_id, name: r.student_name,
                  course: r.course, category: r.category, score: r.score, total: r.total,
                  correctAnswers: r.correct_answers, wrongAnswers: r.wrong_answers,
                  unanswered: r.unanswered, violations: r.violations,
                  status: 'Completed', submittedAt: r.submitted_at,
                }));
                // Merge with localStorage results
                let localRes = []; try { localRes = JSON.parse(localStorage.getItem('cetExamResults')) || []; } catch(e){}
                const merged = [...supaResults];
                localRes.forEach(lr => { if (!merged.find(sr => sr.studentId === lr.studentId)) merged.push(lr); });
                localStorage.setItem('cetExamResults', JSON.stringify(merged));
                window.renderResults();
                console.log('[Supabase] Loaded', supaResults.length, 'results from cloud');
              }
            });
        }
      }
      if (tab === 'payments') {
        window.renderPayments();
        // Fetch payments from Supabase
        if (supabase) {
          supabase.from('payments').select('*').order('submitted_at', { ascending: false })
            .then(({ data, error }) => {
              if (!error && data && data.length > 0) {
                const supaPayments = data.map(p => ({
                  applicationId: p.application_id, studentId: p.cet_student_id,
                  fullName: p.full_name, email: p.email, courseApplied: p.course_applied,
                  paymentStatus: p.payment_status, paymentAmount: p.payment_amount,
                  paymentUtr: p.payment_utr, paymentDate: p.payment_date,
                  screenshotUrl: p.screenshot_url, submittedAt: p.submitted_at,
                  supabaseId: p.student_id,
                }));
                // Merge with localStorage
                let localPay = []; try { localPay = JSON.parse(localStorage.getItem('cetPayments')) || []; } catch(e){}
                const merged = [...supaPayments];
                localPay.forEach(lp => { if (!merged.find(sp => sp.email === lp.email)) merged.push(lp); });
                localStorage.setItem('cetPayments', JSON.stringify(merged));
                window.renderPayments();
                console.log('[Supabase] Loaded', supaPayments.length, 'payments from cloud');
              }
            });
        }
      }
      if (tab === 'locked') {
        window.renderLockedExams();
        if (supabase && typeof fetchApplicationsFromSupabase === 'function') {
           fetchApplicationsFromSupabase().then(() => window.renderLockedExams());
        }
      }
    }

    // ============================================
    // FIND MISSING PAYMENTS
    // ============================================
    window.findMissingPayments = async function() {
       const btn = document.querySelector('button[onclick="findMissingPayments()"]');
       if (btn) btn.innerHTML = '<span>⏳ Searching...</span>';
       
       try {
          // 1. Fetch Razorpay payments from secure API
          const res = await fetch('/api/payment/get-razorpay-payments');
          if (!res.ok) throw new Error('Failed to fetch from Razorpay API');
          const data = await res.json();
          if (!data.success) throw new Error(data.error || 'Unknown error');
          
          const razorpayPayments = data.payments || [];
          
          // 2. Fetch active applications from local cache (already filtered for deleted)
          const activeApps = typeof window.getApplications === 'function' ? window.getApplications() : [];
          const activeEmails = new Set(activeApps.map(a => (a.email || '').toLowerCase()));
          const activePhones = new Set(activeApps.map(a => a.mobile || ''));
          
          // 3. Find missing
          const missing = [];
          for (const p of razorpayPayments) {
             const pEmail = p.email;
             const pPhone = p.contact;
             
             if (!activeEmails.has(pEmail) && !activePhones.has(pPhone)) {
                missing.push(p);
             }
          }
          
          if (missing.length === 0) {
             alert('✅ No missing payments found! All students who paid in Razorpay are present in the system.');
          } else {
             const wantDownload = prompt(`⚠️ FOUND ${missing.length} MISSING STUDENTS!\n\nType "excel" to download an Excel sheet, "pdf" for a PDF report, or leave blank to just view them here:`);
             const format = (wantDownload || '').trim().toLowerCase();
             
             if (format === 'excel') {
                if (typeof XLSX === 'undefined') {
                   // Fallback to CSV if XLSX is not loaded
                   let csv = 'Email,Phone,Amount,Transaction ID,Payment ID,Date\n';
                   missing.forEach(m => {
                      csv += `${m.email},${m.contact},${m.amount},${m.order_id},${m.id},${new Date(m.created_at * 1000).toLocaleString()}\n`;
                   });
                   const blob = new Blob([csv], { type: 'text/csv' });
                   const url = URL.createObjectURL(blob);
                   const a = document.createElement('a'); a.href = url; a.download = `Missing_Students_${new Date().toISOString().split('T')[0]}.csv`; a.click();
                   URL.revokeObjectURL(url);
                } else {
                   const wsData = [['Email', 'Phone', 'Amount', 'Order ID', 'Payment ID', 'Date']];
                   missing.forEach(m => {
                      wsData.push([m.email, m.contact, m.amount, m.order_id, m.id, new Date(m.created_at * 1000).toLocaleString('en-IN')]);
                   });
                   const wb = XLSX.utils.book_new();
                   const ws = XLSX.utils.aoa_to_sheet(wsData);
                   XLSX.utils.book_append_sheet(wb, ws, 'Missing Students');
                   XLSX.writeFile(wb, `Missing_Students_${new Date().toISOString().split('T')[0]}.xlsx`);
                }
             } else if (format === 'pdf') {
                if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') { 
                    alert('PDF library loading... please retry.'); 
                } else {
                    const { jsPDF } = window.jspdf || window;
                    const doc = new jsPDF({ orientation: 'landscape' });
                    doc.text('Missing Students Report (Paid but no Form)', 14, 15);
                    const tableRows = missing.map(m => [
                       m.email || 'N/A', 
                       m.contact || 'N/A', 
                       `Rs.${m.amount}`, 
                       m.order_id, 
                       m.id, 
                       new Date(m.created_at * 1000).toLocaleString('en-IN')
                    ]);
                    doc.autoTable({ 
                       startY: 25, 
                       head: [['Email', 'Phone', 'Amount', 'Order ID', 'Payment ID', 'Date']], 
                       body: tableRows 
                    });
                    doc.save(`Missing_Students_${new Date().toISOString().split('T')[0]}.pdf`);
                }
             } else {
                 let msg = `⚠️ FOUND ${missing.length} MISSING STUDENTS (Top 10):\n\n`;
                 missing.slice(0, 10).forEach((m, idx) => {
                    msg += `${idx+1}. Email: ${m.email}\nPhone: ${m.contact}\nAmount: ₹${m.amount}\nDate: ${new Date(m.created_at * 1000).toLocaleString()}\n\n`;
                 });
                 if(missing.length > 10) msg += `...and ${missing.length - 10} more.`;
                 alert(msg);
             }
          }
       } catch (err) {
          console.error(err);
          alert('Error finding missing payments: ' + err.message);
       } finally {
          if (btn) btn.innerHTML = '<span>⚠️ Find Missing</span>';
       }
    }

    // ============================================
    // PAYMENT VERIFICATION
    // DEMO PAYMENT ONLY. Real auto verification requires payment gateway webhook.
    // ============================================
    window.renderPayments = async function() {
      const tbody = document.getElementById('paymentsTableBody');
      if (!tbody) return;
      tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-slate-500 font-bold">Fetching secure payment records from Supabase...</td></tr>';
      
      let allPayments = [];
      if (supabase) {
        const { data, error } = await supabase.from('payments').select('*').order('submitted_at', { ascending: false });
        if (data && !error) allPayments = data;
      }
      
      // Get active applications to filter out deleted students' payments
      const activeApps = typeof window.getApplications === 'function' ? window.getApplications() : [];
      const activeEmails = new Set(activeApps.map(a => (a.email || '').toLowerCase()));
      const activeStudentIds = new Set(activeApps.map(a => a.studentId));

      // Filter logic
      const filterCourse = document.getElementById('payFilterCourse')?.value || '';
      const filterStatus = document.getElementById('payFilterStatus')?.value || '';
      
      let filtered = allPayments.filter(p => {
        const pEmail = (p.email || '').toLowerCase();
        const pCetId = p.cet_student_id || p.student_id;
        
        // Ensure the payment belongs to an active student
        if (activeApps.length > 0 && !activeEmails.has(pEmail) && (!pCetId || !activeStudentIds.has(pCetId))) {
           return false;
        }

        let matchCourse = true;
        if (filterCourse === 'Science') matchCourse = (p.course_applied || '').includes('Science');
        else if (filterCourse === 'Application') matchCourse = (p.course_applied || '').includes('Application');
        else if (filterCourse === 'Other') matchCourse = !(p.course_applied || '').includes('Science') && !(p.course_applied || '').includes('Application');
        
        let matchStatus = true;
        if (filterStatus) matchStatus = p.payment_status === filterStatus;
        
        return matchCourse && matchStatus;
      });

      // HIDE Rejected Manual transactions to remove duplicates
      filtered = filtered.filter(p => {
          const pid = (p.payment_id || p.payment_utr || '').toLowerCase();
          const isManual = pid.includes('manual') || pid.includes('bank') || pid.includes('utr') || !pid.startsWith('pay_');
          if (isManual && p.payment_status === 'REJECTED') return false; // Hide completely
          return true;
      });

      // Sort: Razorpay first, then Manual Bank UTRs
      const razorpayPayments = [];
      const manualPayments = [];
      filtered.forEach(p => {
          const pid = (p.payment_id || p.payment_utr || '').toLowerCase();
          const isRazorpay = pid.startsWith('pay_') || (p.payment_method || '').toLowerCase() === 'razorpay';
          if (isRazorpay) razorpayPayments.push(p);
          else manualPayments.push(p);
      });
      filtered = [...razorpayPayments, ...manualPayments];

      // Calculate Statistics based on filtered records
      const totalApps = filtered.length;
      const expectedCollection = totalApps * 500;
      
      const paidRecords = filtered.filter(p => ['PAID', 'VERIFIED', 'SUCCESS', 'PAID_DEMO'].includes(p.payment_status));
      const pendingRecords = filtered.filter(p => ['PENDING', 'PENDING_VERIFICATION'].includes(p.payment_status));
      const rejectedRecords = filtered.filter(p => p.payment_status === 'REJECTED');
      
      let collectedAmount = 0;
      
      paidRecords.forEach(p => {
         // Force 500 for ALL paid records
         collectedAmount += 500;
      });
      
      let pendingAmount = 0;
      pendingRecords.forEach(p => {
         pendingAmount += 500;
      });
      
      // Calculate today's collection (ALL paid records today)
      let todayCollected = 0;
      const todayDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
      paidRecords.forEach(p => {
         const dateStr = p.payment_date || p.submitted_at || p.created_at;
         if (dateStr && new Date(dateStr).toLocaleDateString('en-CA') === todayDate) {
             todayCollected += 500;
         }
      });
      
      // Update DOM
      document.getElementById('fin-total-apps').textContent = totalApps;
      document.getElementById('fin-expected').textContent = '₹' + expectedCollection.toLocaleString('en-IN');
      document.getElementById('fin-collected').textContent = '₹' + collectedAmount.toLocaleString('en-IN');
      document.getElementById('fin-pending').textContent = '₹' + pendingAmount.toLocaleString('en-IN');
      document.getElementById('fin-rejected-count').textContent = rejectedRecords.length;
      
      document.getElementById('pay-total-paid').textContent = paidRecords.length;
      document.getElementById('pay-pending-students').textContent = pendingRecords.length;
      document.getElementById('pay-today-amount').textContent = '₹' + todayCollected.toLocaleString('en-IN');
      document.getElementById('pay-verified').textContent = filtered.filter(p => p.payment_status === 'VERIFIED').length;
      
      // Update Settlement UI (For ALL Transactions since manual are Razorpay recoveries)
      const feeRate = 0.02; // 2%
      const gstRate = 0.18; // 18% on fee
      const totalFee = collectedAmount * feeRate;
      const totalGst = totalFee * gstRate;
      const totalDeduction = totalFee + totalGst;
      const finalSettlement = collectedAmount - totalDeduction;

      if (document.getElementById('set-gross')) {
         document.getElementById('set-total-count').textContent = paidRecords.length;
         
         document.getElementById('set-gross').textContent = '₹' + collectedAmount.toLocaleString('en-IN');
         document.getElementById('set-fee').textContent = '-₹' + totalFee.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
         document.getElementById('set-gst').textContent = '-₹' + totalGst.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
         document.getElementById('set-deductions').textContent = '-₹' + totalDeduction.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
         document.getElementById('set-net').textContent = '₹' + finalSettlement.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
      }
      
      const badge = document.getElementById('paymentBadge');
      if (badge) badge.textContent = pendingRecords.length > 0 ? pendingRecords.length : '';
      
      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-slate-400">No payment records found matching filters.</td></tr>';
        return;
      }
      
      window._currentPaymentsData = filtered; // For exports

      tbody.innerHTML = filtered.map((p, idx) => {
        let statusColor = 'bg-slate-100 text-slate-600 border-slate-200';
        const st = p.payment_status || 'PENDING';
        if (st === 'VERIFIED') statusColor = 'bg-emerald-100 text-emerald-700 border-emerald-200';
        else if (['PAID', 'SUCCESS', 'PAID_DEMO'].includes(st)) statusColor = 'bg-blue-100 text-blue-700 border-blue-200';
        else if (st === 'REJECTED') statusColor = 'bg-red-100 text-red-700 border-red-200';
        else if (['PENDING', 'PENDING_VERIFICATION'].includes(st)) statusColor = 'bg-amber-100 text-amber-700 border-amber-200';
        else if (st === 'REFUNDED') statusColor = 'bg-purple-100 text-purple-700 border-purple-200';
        
        const statusBadge = `<span class="${statusColor} text-[10px] font-bold px-2.5 py-1 rounded-full border">${st}</span>`;

        let screenshotBtn = '<span class="text-xs text-slate-400">No Receipt</span>';
        if (p.screenshot_url) {
           screenshotBtn = `<button onclick="window.openFullscreenImage('${p.screenshot_url}')" class="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 px-3 py-1 rounded font-bold text-xs transition">Preview</button>`;
        }

        const date = p.payment_date ? new Date(p.payment_date).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : (p.submitted_at ? new Date(p.submitted_at).toLocaleString() : '--');
        const course = p.course_applied || '--';

        const isRazorpay = (p.payment_id || p.payment_utr || '').toLowerCase().startsWith('pay_');

        // Force 500 for Paid status
        const isPaidStatus = ['PAID', 'VERIFIED', 'SUCCESS', 'PAID_DEMO'].includes(st);
        const displayAmount = isPaidStatus ? 500 : (p.payment_amount || 0);

        return `<tr class="hover:bg-slate-50 border-b border-slate-100 transition-colors">
          <td class="p-4 flex gap-3 items-center">
            <span class="text-xs font-bold text-slate-400 w-6">#${idx + 1}</span>
            <div>
              <p class="font-bold text-slate-800">${p.full_name || '--'}</p>
              <p class="text-[10px] text-slate-500 font-mono">${p.email || '--'}</p>
            </div>
          </td>
          <td class="p-4">
            <span class="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold border border-indigo-100">${course}</span>
          </td>
          <td class="p-4">
            <p class="font-bold text-slate-700">₹${displayAmount}</p>
          </td>
          <td class="p-4">
            <p class="text-xs font-mono font-bold text-slate-600">${p.payment_utr || p.payment_id || 'N/A'}</p>
            ${isRazorpay ? '<span class="text-[9px] bg-blue-100 text-blue-700 px-1 rounded">Razorpay</span>' : '<span class="text-[9px] bg-amber-100 text-amber-700 px-1 rounded">Bank UTR</span>'}
          </td>
          <td class="p-4 text-xs font-bold text-slate-500">${date}</td>
          <td class="p-4">${statusBadge}</td>
          <td class="p-4">${screenshotBtn}</td>
          <td class="p-4">
             <div class="flex gap-2 justify-end">
               <button onclick="verifyPaymentRecord('${p.id}', '${p.student_id}')" class="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white px-2 py-1 rounded text-xs font-bold transition border border-emerald-200 hover:border-emerald-600" title="Verify Payment">✓ Verify</button>
               <button onclick="rejectPaymentRecord('${p.id}', '${p.student_id}')" class="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-2 py-1 rounded text-xs font-bold transition border border-red-200 hover:border-red-600" title="Reject Payment">✗ Reject</button>
             </div>
          </td>
        </tr>`;
      }).join('');
    };
    window.verifyPaymentRecord = async function(paymentId, studentId) {
      if(!confirm('Mark this payment as VERIFIED?')) return;
      if (!supabase) return;

      try {
        // 1. Update payments table
        const { error: pErr } = await supabase.from('payments').update({ payment_status: 'VERIFIED' }).eq('id', paymentId);
        if (pErr) throw pErr;

        // 2. Optionally update applications/students table
        // We update payment_status in applications so the dashboard reflects it
        if (studentId) {
           await supabase.from('students').update({ payment_status: 'PAID', status: 'PENDING_APPROVAL' }).eq('id', studentId);
        }

        // Email Notification
        const p = window._currentPaymentsData.find(x => x.id === paymentId);
        if (p && p.email) {
          import('../js/email-service.js').then(({ default: EmailSvc }) => {
            const emailHtml = EmailSvc.EmailTemplates.paymentVerified(p.full_name, p.payment_amount, p.payment_utr).html;
            const emailSubject = EmailSvc.EmailTemplates.paymentVerified(p.full_name, p.payment_amount, p.payment_utr).subject;
            EmailSvc.sendEmail(p.email, emailSubject, emailHtml);
          }).catch(err => console.warn('Email service import failed', err));
        }

        renderPayments();
        showToast('Payment verified successfully.', 'success');
      } catch (err) {
        console.error(err);
        alert('Failed to verify payment: ' + err.message);
      }
    };

    window.rejectPaymentRecord = async function(paymentId, studentId) {
      if(!confirm('Are you sure you want to REJECT this payment?')) return;
      if (!supabase) return;

      try {
        const { error: pErr } = await supabase.from('payments').update({ payment_status: 'REJECTED' }).eq('id', paymentId);
        if (pErr) throw pErr;

        if (studentId) {
           await supabase.from('students').update({ payment_status: 'PAYMENT_PENDING' }).eq('id', studentId);
        }

        renderPayments();
        showToast('Payment rejected.', 'danger');
      } catch (err) {
        console.error(err);
        alert('Failed to reject payment: ' + err.message);
      }
    };

    window.downloadPaymentReport = function(format) {
       const data = window._currentPaymentsData || [];
       if (data.length === 0) { alert('No data to export.'); return; }
       if (format === 'excel') {
         if (typeof XLSX === 'undefined') { alert('Excel library still loading, please retry.'); return; }
         const wsData = [['Sr No.', 'Student Name', 'Email', 'Course', 'Amount', 'Transaction ID', 'Status', 'Date']];
         data.forEach((p, idx) => {
           const dateStr = p.payment_date || p.submitted_at || p.created_at;
           let date = dateStr ? new Date(dateStr).toLocaleString('en-IN') : '--';
           const isPaid = ['PAID', 'VERIFIED', 'SUCCESS', 'PAID_DEMO'].includes((p.payment_status || '').toUpperCase());
           const amt = isPaid ? 500 : (p.payment_amount||'0');
           wsData.push([idx + 1, p.full_name||'', p.email||'', p.course_applied||'', amt, p.payment_utr||p.payment_id||'', p.payment_status||'', date]);
         });
         const wb = XLSX.utils.book_new();
         const ws = XLSX.utils.aoa_to_sheet(wsData);
         XLSX.utils.book_append_sheet(wb, ws, 'Payments');
         XLSX.writeFile(wb, `Payment_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
       } else if (format === 'pdf') {
         if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') { alert('PDF library loading... please retry.'); return; }
         const { jsPDF } = window.jspdf || window;
         const doc = new jsPDF({ orientation: 'landscape' });
         doc.text('Comprehensive Payment & Settlement Report', 14, 15);
         
         let totalCollected = 0;
         let successCount = 0;
         
         const tableRows = data.map((p, idx) => {
           const dateStr = p.payment_date || p.submitted_at || p.created_at;
           const isPaid = ['PAID', 'VERIFIED', 'SUCCESS', 'PAID_DEMO'].includes((p.payment_status || '').toUpperCase());
           const amt = isPaid ? 500 : 0;
           
           if (isPaid) {
               totalCollected += amt;
               successCount++;
           }
           return [idx + 1, p.full_name||'', p.email||'', p.course_applied||'', isPaid ? `Rs.500` : '--', p.payment_utr||p.payment_id||'', p.payment_status||'', dateStr ? new Date(dateStr).toLocaleString('en-IN') : '--'];
         });
         
         doc.autoTable({ 
             startY: 25, 
             head: [['Sr No.', 'Student Name', 'Email', 'Course', 'Amount', 'Transaction ID', 'Status', 'Date']], 
             body: tableRows,
             theme: 'grid',
             headStyles: { fillColor: [79, 70, 229] }
         });
         
         // Razorpay Settlement Calculations
         const feeRate = 0.02; // 2%
         const gstRate = 0.18; // 18% on fee
         const totalFee = totalCollected * feeRate;
         const totalGst = totalFee * gstRate;
         const totalDeduction = totalFee + totalGst;
         const finalSettlement = totalCollected - totalDeduction;
         
         let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 150;
         
         if (finalY > 180) {
             doc.addPage();
             finalY = 20;
         }
         
         doc.setFontSize(12);
         doc.setTextColor(0, 0, 0);
         doc.setFont("helvetica", "bold");
         doc.text("Razorpay Settlement Summary (Estimated)", 14, finalY);
         
         doc.setFontSize(10);
         doc.setFont("helvetica", "normal");
         
         doc.text(`Total Successful Transactions: ${successCount}`, 14, finalY + 10);
         doc.text(`Total Gross Amount Collected: Rs. ${totalCollected.toFixed(2)}`, 14, finalY + 16);
         
         doc.setTextColor(220, 38, 38); // Red
         doc.text(`Razorpay Fee (2%): - Rs. ${totalFee.toFixed(2)}`, 14, finalY + 22);
         doc.text(`GST on Fee (18%): - Rs. ${totalGst.toFixed(2)}`, 14, finalY + 28);
         doc.text(`Total Tax & Deductions: - Rs. ${totalDeduction.toFixed(2)}`, 14, finalY + 34);
         
         doc.setTextColor(22, 163, 74); // Green
         doc.setFont("helvetica", "bold");
         doc.setFontSize(12);
         doc.text(`Actual Settlement Amount (Net to College Bank): Rs. ${finalSettlement.toFixed(2)}`, 14, finalY + 44);
         
         doc.save(`Payment_Report_${new Date().toISOString().split('T')[0]}.pdf`);
       } else if (format === 'word') {
         let content = 'PAYMENT REPORT\n\nSr No.\tStudent Name\tEmail\tCourse\tAmount\tTransaction ID\tStatus\tDate\n';
         data.forEach((p, idx) => {
           const dateStr = p.payment_date || p.submitted_at || p.created_at;
           let date = dateStr ? new Date(dateStr).toLocaleString('en-IN') : '--';
           const isPaid = ['PAID', 'VERIFIED', 'SUCCESS', 'PAID_DEMO'].includes((p.payment_status || '').toUpperCase());
           const amt = isPaid ? 500 : (p.payment_amount||'0');
           content += `${idx + 1}\t${p.full_name||''}\t${p.email||''}\t${p.course_applied||''}\t${amt}\t${p.payment_utr||p.payment_id||''}\t${p.payment_status||''}\t${date}\n`;
         });
         const blob = new Blob([content], { type: 'application/msword' });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a'); a.href = url; a.download = `Payment_Report_${new Date().toISOString().split('T')[0]}.doc`; a.click();
         URL.revokeObjectURL(url);
       }
    };

    window.previewPaymentScreenshot = function(appOrStudentId) {
      // Not strictly used by the new table, but kept for legacy UI if any
      alert('Use the preview button in the new table.');
    };

    // ============================================
    // APPLICATION LOGIC (Robust Fixes Implemented)
    // ============================================
    window.renderOverview = function() {
      const studs = window.getApplications() || [];
      const pending = studs.filter(s => (s.status || '').toLowerCase() === 'pending' || (s.applicationStatus || '').toLowerCase() === 'pending').length;
      const approved = studs.filter(s => (s.status || '').toLowerCase() === 'approved' || (s.applicationStatus || '').toLowerCase() === 'approved').length;
      const rejected = studs.filter(s => (s.status || '').toLowerCase() === 'rejected' || (s.applicationStatus || '').toLowerCase() === 'rejected').length;
      const attempted = studs.filter(s => s.hasAttempted || (s.examStatus || '').toLowerCase() === 'completed').length;

      document.getElementById('s-total').textContent = studs.length;
      document.getElementById('s-pending').textContent = pending;
      document.getElementById('s-approved').textContent = approved;
      document.getElementById('s-rejected').textContent = rejected;
      document.getElementById('s-attempted').textContent = attempted;
      document.getElementById('pendingBadge').textContent = pending || '';
      
      let lockedExams = [];
      try { lockedExams = JSON.parse(localStorage.getItem('cetLockedExams')) || []; } catch(e){}
      const currentLocked = lockedExams.filter(lockObj => {
         const st = studs.find(s => s.studentId === lockObj.studentId);
         return st && st.examStatus === 'LOCKED';
      });
      document.getElementById('lockedBadge').textContent = currentLocked.length || '';

      updateCharts(pending, approved, rejected);
    }

    function updateCharts(pending, approved, rejected) {
      // 1. Status Pie Chart
      const pieCtx = document.getElementById('statusPieChart').getContext('2d');
      if (statusChart) statusChart.destroy();
      statusChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
          labels: ['Pending', 'Approved', 'Rejected'],
          datasets: [{
            data: [pending, approved, rejected],
            backgroundColor: ['#f59e0b', '#10b981', '#ef4444'],
            hoverOffset: 4,
            borderWidth: 0
          }]
        },
        options: {
          cutout: '70%',
          plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20, font: { family: 'Inter', size: 11, weight: '600' } } }
          }
        }
      });

      // 2. Scores Bar Chart
      const results = DB.getResults() || [];
      const scoreBuckets = [0, 0, 0, 0, 0]; // 0-20, 21-40, 41-60, 61-80, 81-100
      
      results.forEach(r => {
        const percent = (r.score / r.total) * 100;
        if (percent <= 20) scoreBuckets[0]++;
        else if (percent <= 40) scoreBuckets[1]++;
        else if (percent <= 60) scoreBuckets[2]++;
        else if (percent <= 80) scoreBuckets[3]++;
        else scoreBuckets[4]++;
      });

      const barCtx = document.getElementById('scoresBarChart').getContext('2d');
      if (scoresChart) scoresChart.destroy();
      scoresChart = new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'],
          datasets: [{
            label: 'Students',
            data: scoreBuckets,
            backgroundColor: 'rgba(99, 102, 241, 0.8)',
            borderRadius: 8,
            barThickness: 40
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { display: false }, ticks: { stepSize: 1 } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // --- DATA SOURCE: Supabase-first, localStorage fallback ---
    window.getApplications = function() {
      // Return cached Supabase data if available
      if (_supabaseFetched && _supabaseAppsCache) {
          return _supabaseAppsCache.filter(a => a.applicationStatus !== 'DELETED');
      }

      // Fallback: localStorage
      let apps = [];
      try { apps = JSON.parse(localStorage.getItem('cetApplications')) || []; } catch(e){}
      
      const single = localStorage.getItem('cetApplication');
      if (single) {
        try {
          const parsed = JSON.parse(single);
          if (!apps.find(a => a.applicationId === parsed.applicationId)) {
            apps.push(parsed);
            localStorage.setItem('cetApplications', JSON.stringify(apps));
          }
        } catch(e){}
        localStorage.removeItem('cetApplication');
      }
      return apps.filter(a => a.applicationStatus !== 'DELETED');
    }

    // Async fetch from Supabase — call once on tab switch, then use cache
    window.fetchApplicationsFromSupabase = async function() {
      if (!supabase) {
         console.warn('[Supabase] Client not initialized.');
         return null;
      }
      
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        console.log('[Supabase Audit] Current Session:', sessionData?.session);
        console.log('[Supabase Audit] Session User ID:', sessionData?.session?.user?.id);
        console.log('[Supabase Audit] Session Error:', sessionError);

        const { data, error } = await supabase
          .from('students')
          .select('*');
          
        console.log('[Supabase Audit] Raw Fetch Response Data:', data);
        console.log('[Supabase Audit] Fetch Error:', error);

        console.log('[TRACE] Query Result:', data);
        console.log('[TRACE] Row Count:', data?.length);
        console.log('[TRACE] Error:', error);

        if (error) { console.warn('[Supabase] Fetch applications error:', error.message); return null; }
        
        // Map exactly to the actual schema
        _supabaseAppsCache = (data || []).map(s => {
          console.log('[TRACE] Raw Student Row', s);
          
          const application = {
            id: s.id,
            supabaseId: s.id,
            applicationId: 'APP' + (s.student_id || s.id.substring(0,6)),
            studentId: s.student_id || s.id,
            fullName: s.full_name || 'Unknown',
            name: s.full_name || 'Unknown',
            email: s.email || 'N/A',
            mobile: s.mobile || 'N/A',
            dob: s.dob || 'N/A',
            address: s.address || 'N/A',
            
            // Default mappings for missing columns
            category: s.category || 'General',
            courseApplied: s.course_applied || 'Not Specified',
            stream: s.stream || 'Not Specified',
            applicationStatus: s.application_status || 'Submitted',
            status: s.status || 'pending',
            examStatus: s.exam_status || 'NOT_SCHEDULED',
            hasAttempted: s.has_attempted || false,
            paymentStatus: s.payment_status || 'Pending Verification',
            paymentAmount: s.payment_amount || 'Rs. 0',
            academicDetails: s.academic_details || {},
            submittedAt: s.submitted_at || new Date().toISOString(),
            appliedAt: new Date().toISOString(),
            _fromSupabase: true,
          };
          
          console.log('[TRACE] Mapped Application', application);
          return application;
        });
        // Fetch locked exams from Supabase to sync admin dashboard
        try {
           const { data: lockedData } = await supabase.from('locked_exams').select('*');
           if (lockedData) {
              const mappedLocks = lockedData.map(l => ({
                 studentId: l.cet_student_id,
                 name: l.student_name,
                 course: l.course,
                 warningCount: l.warning_count,
                 reason: l.reason,
                 lockedAt: l.locked_at
              }));
              localStorage.setItem('cetLockedExams', JSON.stringify(mappedLocks));
           }
        } catch(e) {
           console.warn('[Supabase] Failed to fetch locked_exams', e);
        }

        _supabaseFetched = true;
        console.log('[Supabase] Loaded', _supabaseAppsCache.length, 'applications from cloud');
        return _supabaseAppsCache;
      } catch(e) {
        console.warn('[Supabase] Fetch error:', e);
        return null;
      }
    }

    // Expose sync function to global scope
    window.syncPendingFormsToSupabase = async function() {
       const btn = document.getElementById('btnSyncCloud');
       if (!btn) return;
       if (!supabase) { alert('Supabase client not initialized. Check your .env file.'); return; }
       
       let localApps = [];
       try { localApps = JSON.parse(localStorage.getItem('cetApplications')) || []; } catch(e){}
       
       if (!localApps || localApps.length === 0) {
          alert('No local applications found to sync.');
          return;
       }

       // Ensure we have latest from Supabase to prevent duplicates
       await window.fetchApplicationsFromSupabase();
       const cloudApps = (_supabaseAppsCache || []).filter(a => a.applicationStatus !== 'DELETED');
       const cloudEmails = cloudApps.map(a => (a.email || '').toLowerCase());
       const cloudStudentIds = cloudApps.map(a => a.studentId);

       // Find apps that are in localStorage but NOT in Supabase (by email or studentId)
       const missingApps = localApps.filter(app => {
          const email = (app.email || '').toLowerCase();
          return email && !cloudEmails.includes(email) && !cloudStudentIds.includes(app.studentId);
       });

       if (missingApps.length === 0) {
          alert('All local forms are already synced with Supabase! 100% matched.');
          return;
       }

       if (!confirm(`Found ${missingApps.length} local forms that are missing in Supabase. Do you want to sync them now? This might take a while if there are many documents.`)) return;

       btn.disabled = true;
       btn.innerHTML = `☁️ Syncing (0/${missingApps.length})...`;
       
       let syncedCount = 0;
       let errorCount = 0;

       for (let i = 0; i < missingApps.length; i++) {
           const app = missingApps[i];
           try {
              btn.innerHTML = `☁️ Syncing (${i+1}/${missingApps.length})...`;
              // Upload to Supabase via the exact same function apply.html uses
              const fileDataMap = app.uploadedFiles || {};
              const syncResult = await SupaDB.saveStudentApplication(app, fileDataMap);
              if (syncResult && syncResult.supabaseId) {
                 app.supabaseId = syncResult.supabaseId;
                 syncedCount++;
              } else {
                 errorCount++;
              }
           } catch (err) {
              console.error(`[Sync] Error syncing app ${app.studentId}:`, err);
              errorCount++;
           }
       }

       // Save back to localStorage with updated supabaseIds
       saveApplications(localApps);
       
       // Invalidate cache and re-fetch to update dashboard
       invalidateCache();
       await fetchApplicationsFromSupabase();
       renderApplications();
       renderDashboardOverview();

       btn.disabled = false;
       btn.innerHTML = '☁️ Sync to Cloud';
       
       alert(`Sync Complete! Successfully synced ${syncedCount} forms. ${errorCount > 0 ? `Failed to sync ${errorCount} forms.` : ''}`);
    };

    window.saveApplications = function(apps) {
      localStorage.setItem('cetApplications', JSON.stringify(apps));
    }

    // ============================================
    // DOCUMENTS TAB LOGIC
    // ============================================
    window.renderDocumentsTab = async function() {
      const filterCategory = document.getElementById('docFilterCategory')?.value || '';
      const filterCourse = document.getElementById('docFilterCourse')?.value || '';
      const search = (document.getElementById('docSearchInput')?.value || '').toLowerCase();
      let apps = getApplications();

      if (filterCategory) apps = apps.filter(s => (s.category || '').toUpperCase().includes(filterCategory.toUpperCase()));
      if (filterCourse) apps = apps.filter(s => (s.courseApplied || '').includes(filterCourse));
      if (search) {
        apps = apps.filter(s => 
          (s.fullName || '').toLowerCase().includes(search) || 
          (s.applicationId || '').toLowerCase().includes(search) ||
          (s.studentId || '').toLowerCase().includes(search)
        );
      }

      apps = apps.slice().reverse();
      window._currentDocumentsData = apps; // Cache for export
      const grid = document.getElementById('documentsGrid');
      const noData = document.getElementById('noDocuments');

      if (!apps.length) {
        grid.innerHTML = '';
        noData.classList.remove('hidden');
        return;
      }
      noData.classList.add('hidden');
      
      grid.innerHTML = '<div class="col-span-full py-10 text-center text-slate-500 font-bold">Fetching secure documents from Supabase...</div>';

      let allSupaDocs = [];
      if (supabase) {
         const { data, error } = await supabase.from('student_documents').select('*');
         if (data && !error) allSupaDocs = data;
      }

      const cetDocs = JSON.parse(localStorage.getItem('cetDocuments')) || {};

      grid.innerHTML = apps.map(s => {
        const studentDocs = allSupaDocs.filter(d => d.student_id === (s.supabaseId || s.id));
        let docCount = studentDocs.length;
        
        let photoThumbHtml = '<div class="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-xl shrink-0">User</div>';
        const photoDoc = studentDocs.find(d => d.doc_type === 'photoFile' || d.doc_type === 'photo');
        if (photoDoc) {
           photoThumbHtml = `<img src="${photoDoc.file_url}" class="w-12 h-12 rounded-full object-cover shadow-sm bg-white shrink-0 border-2 border-indigo-100" />`;
        }

        // Fallback for legacy base64 if no cloud docs
        if (docCount === 0) {
           let docs = cetDocs[s.applicationId] || cetDocs[s.studentId] || null;
           if (!docs) docs = s.uploadedFiles || {};
           const docKeys = Object.keys(docs).filter(k => docs[k] && docs[k].startsWith('data:'));
           docCount = docKeys.length;
           if (docs.photoFile && docs.photoFile.startsWith('data:')) {
               photoThumbHtml = `<img src="${docs.photoFile}" class="w-12 h-12 rounded-full object-cover shadow-sm bg-white shrink-0 border-2 border-indigo-100" />`;
           }
        }

        let statusBadge = '';
        if (docCount === 0) {
           statusBadge = '<span class="bg-red-100 text-red-700 border border-red-200 text-[10px] px-2 py-0.5 rounded-full font-bold">Missing Files</span>';
        } else {
           statusBadge = '<span class="bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] px-2 py-0.5 rounded-full font-bold">' + docCount + ' Uploaded</span>';
        }

        let html = '<div class="bg-slate-50 border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col">';
        html += '<div class="flex items-center gap-4 mb-4">';
        html += photoThumbHtml;
        html += '<div class="overflow-hidden">';
        html += '<p class="font-bold text-slate-900 truncate">' + (s.fullName || 'N/A') + '</p>';
        html += '<div class="flex items-center gap-2 mt-1">';
        html += '<p class="text-[10px] font-mono text-indigo-600 font-bold">' + (s.applicationId || s.studentId || '') + '</p>';
        if ((s.courseApplied || '').includes('Science')) {
            html += '<span class="bg-purple-100 text-purple-700 px-1.5 py-[1px] rounded text-[9px] font-bold truncate">CS</span>';
        } else {
            html += '<span class="bg-blue-100 text-blue-700 px-1.5 py-[1px] rounded text-[9px] font-bold truncate">CA</span>';
        }
        html += '</div></div></div>';
        html += '<div class="flex items-center justify-between mb-4 text-xs font-bold text-slate-600">';
        html += '<span class="bg-slate-200 px-2 py-1 rounded border border-slate-300">' + (s.category || 'N/A') + '</span>';
        html += statusBadge;
        html += '</div>';
        html += '<button onclick="viewStudentDocuments(\'' + (s.id || '') + '\', \'' + (s.email || '') + '\')" class="mt-auto w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg transition text-sm">Verify Documents</button>';
        html += '</div>';
        
        return html;
      }).join('');
    };

    window.viewStudentDocuments = async function(studentDbId, email) {
      let app = getApplications().find(a => a.id === studentDbId || a.applicationId === studentDbId || a.studentId === studentDbId || a.email === email);
      if (!app) return;
      
      const modal = document.getElementById('documentsModal');
      const content = document.getElementById('documentsContent');
      content.innerHTML = '<p class="p-6 text-center text-slate-500 font-bold">Loading from cloud storage...</p>';
      modal.style.display = 'flex';
      modal.classList.remove('hidden');

      let cloudDocs = [];
      if (supabase && (app.supabaseId || app.id)) {
         const { data, error } = await supabase.from('student_documents').select('*').eq('student_id', app.supabaseId || app.id);
         if (data && !error) {
             cloudDocs = data;
             
             // Generate signed URLs for all fetched cloud documents using the text-based application ID folder format
             for (const doc of cloudDocs) {
                 let bucket = 'student-documents';
                 if (['photoFile', 'signatureFile', 'photo', 'signature'].includes(doc.doc_type)) bucket = 'student-photos';
                 else if (['paymentScreenshot', 'paymentProof'].includes(doc.doc_type)) bucket = 'payment-screenshots';
                 
                 // Extract precise storage path from the saved public URL
                 let storagePath = `${app.applicationId}/${doc.file_name}`;
                 try {
                     const urlObj = new URL(doc.file_url);
                     const pathParts = urlObj.pathname.split(`/public/${bucket}/`);
                     if (pathParts.length > 1) storagePath = pathParts[1];
                 } catch(e) {}
                 
                 try {
                     const { data: signedData, error: signError } = await supabase.storage
                         .from(bucket)
                         .createSignedUrl(storagePath, 900); // 15 mins expiry
                         
                     if (signedData && !signError) {
                         doc.file_url = signedData.signedUrl;
                     } else {
                         console.warn(`[Supabase] Failed to sign URL for ${doc.doc_type}:`, signError);
                     }
                 } catch (err) {
                     console.warn('[Supabase] Doc fetch error:', err);
                 }
             }
         }
      }

      // Legacy fallback
      const cetDocs = JSON.parse(localStorage.getItem('cetDocuments')) || {};
      let localDocs = cetDocs[app.applicationId] || cetDocs[app.studentId] || null;
      if (!localDocs) localDocs = app.uploadedFiles || {};

      if (cloudDocs.length === 0 && Object.keys(localDocs).filter(k=>localDocs[k] && localDocs[k].startsWith('data:')).length === 0) {
        content.innerHTML = '<div class="text-center py-10"><div class="text-4xl mb-3">📂</div><p class="text-slate-500 font-bold">No documents uploaded.</p></div>';
        return;
      }

      const docNames = {
        'photoFile': 'Passport Photo',
        'signatureFile': 'Signature',
        'syFile': 'SY Marksheet',
        'tyFile': 'TY Marksheet',
        'casteCertificateFile': 'Caste Certificate',
        'nonCreamyLayerFile': 'Non Creamy Layer',
        'incomeCertificateFile': 'Income Certificate',
        'paymentScreenshot': 'Payment Screenshot',
        'aadharCard': 'Aadhar Card',
        '10thMarksheet': '10th Marksheet',
        '12thMarksheet': '12th Marksheet',
        'graduationMarksheet': 'Graduation Marksheet'
      };

      let html = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">`;

      // Render Cloud Docs
      for (const doc of cloudDocs) {
          const label = docNames[doc.doc_type] || doc.doc_type;
          const isPdf = doc.file_url.toLowerCase().endsWith('.pdf');
          
          let filePath = doc.file_name || doc.file_url.split('/student-documents/')[1];
          if (!filePath) filePath = doc.file_url.split('/student-photos/')[1];
          if (!filePath) filePath = doc.file_url.split('/payment-screenshots/')[1];
          if (!filePath) filePath = doc.file_url.substring(doc.file_url.lastIndexOf('/') + 1);

          console.log(`[Diagnostics] app_id: ${app.id}, file_name: ${doc.doc_type}, storage_path: ${filePath}, public_url: ${doc.file_url}`);

          let previewHtml = '';
          if (isPdf) {
             previewHtml = `
               <div class="w-full h-40 bg-slate-100 flex items-center justify-center rounded-t-lg border-b border-slate-200">
                 <div class="text-center">
                   <div class="text-3xl mb-2">📄</div>
                   <p class="text-xs font-bold text-slate-500">PDF Document</p>
                 </div>
               </div>
               <a href="${doc.file_url}" target="_blank" class="absolute top-2 right-12 bg-white text-indigo-600 p-2 rounded-lg shadow border border-indigo-100 hover:bg-indigo-50 transition" title="Preview PDF">
                 👁️
               </a>
               <a href="${doc.file_url}" download="${label}.pdf" target="_blank" class="absolute top-2 right-2 bg-white text-emerald-600 p-2 rounded-lg shadow border border-emerald-100 hover:bg-emerald-50 transition" title="Download">
                 ⬇️
               </a>
             `;
          } else {
             previewHtml = `
               <img src="${doc.file_url}" class="w-full h-40 object-cover rounded-t-lg cursor-pointer" onclick="openFullscreenImage('${doc.file_url}')" title="Click to view full screen" />
               <a href="${doc.file_url}" download="${label}.png" target="_blank" class="absolute top-2 right-2 bg-white/80 backdrop-blur text-slate-700 p-1.5 rounded-md shadow-sm border border-slate-200 hover:bg-white transition" title="Download Image">
                 ⬇️
               </a>
             `;
          }

          html += `
            <div class="bg-white border border-slate-200 rounded-lg shadow-sm relative group overflow-hidden">
              ${previewHtml}
              <div class="p-3 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
                <p class="font-bold text-sm text-slate-800 truncate">${label}</p>
                <div class="flex justify-between items-center w-full">
                  <div class="flex gap-2" id="docActions_${doc.id}">
                     <button onclick="document.getElementById('docActions_${doc.id}').innerHTML='<span class=&quot;text-xs font-bold text-emerald-700&quot;>✅ Verified</span>'" class="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold hover:bg-emerald-200 transition">Approve</button>
                     <button onclick="document.getElementById('docActions_${doc.id}').innerHTML='<span class=&quot;text-xs font-bold text-red-700&quot;>❌ Rejected</span>'" class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold hover:bg-red-200 transition">Reject</button>
                  </div>
                  <button onclick="deleteDocument('${doc.id}', '${studentDbId}', '${email}', '${filePath}', '${doc.file_url}')" class="text-xs bg-slate-200 text-slate-600 hover:bg-red-500 hover:text-white px-2 py-1 rounded transition" title="Delete permanently">🗑️</button>
                </div>
              </div>
            </div>
          `;
      }

      // Render Legacy Base64 Docs
      for (const [key, base64] of Object.entries(localDocs)) {
        if (!base64 || !base64.startsWith('data:')) continue;
        const label = docNames[key] || key.replace('File', '');
        const isPdf = base64.startsWith('data:application/pdf');
        
        let previewHtml = '';
        if (isPdf) {
           previewHtml = `
             <div class="w-full h-40 bg-slate-100 flex items-center justify-center rounded-t-lg border-b border-slate-200">
               <div class="text-center">
                 <div class="text-3xl mb-2">📄</div>
                 <p class="text-xs font-bold text-slate-500">PDF Document</p>
               </div>
             </div>
             <button onclick="downloadDocument('${base64}', '${label}.pdf')" class="absolute top-2 right-2 bg-white text-indigo-600 p-2 rounded-lg shadow border border-indigo-100 hover:bg-indigo-50 transition" title="Download">
               ⬇️
             </button>
           `;
        } else {
           previewHtml = `
             <img src="${base64}" class="w-full h-40 object-cover rounded-t-lg cursor-pointer" onclick="openFullscreenImage('${base64}')" title="Click to view full screen" />
             <button onclick="downloadDocument('${base64}', '${label}.png')" class="absolute top-2 right-2 bg-white/80 backdrop-blur text-slate-700 p-1.5 rounded-md shadow-sm border border-slate-200 hover:bg-white transition" title="Download Image">
               ⬇️
             </button>
           `;
        }

        html += `
          <div class="bg-white border border-slate-200 rounded-lg shadow-sm relative group overflow-hidden opacity-80">
            ${previewHtml}
            <div class="absolute top-0 left-0 bg-yellow-400 text-yellow-900 text-[9px] font-bold px-1 py-0.5 rounded-br">Legacy Storage</div>
            <div class="p-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <p class="font-bold text-sm text-slate-800 truncate">${label}</p>
              <div class="flex gap-2" id="docActions_legacy_${key}">
                 <button onclick="document.getElementById('docActions_legacy_${key}').innerHTML='<span class=&quot;text-xs font-bold text-emerald-700&quot;>✅ Verified</span>'" class="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold hover:bg-emerald-200 transition">Approve</button>
              </div>
            </div>
          </div>
        `;
      }

      html += `</div>`;
      content.innerHTML = html;
    };

    window.deleteDocument = async function(docId, studentDbId, email, filePath, publicUrl) {
      if (!confirm('Are you sure you want to permanently delete this document?')) return;
      if (!supabase) {
        alert('Supabase client not initialized. Cannot delete cloud document.');
        return;
      }
      
      try {
        console.log(`[Diagnostics] Deleting docId: ${docId}, filePath: ${filePath}`);
        
        // 1. Remove from DB first so the UI updates immediately if it succeeds
        const { error: dbError } = await supabase.from('student_documents').delete().eq('id', docId);
        if (dbError) throw dbError;
        
        // 2. Remove from Storage
        // The file could be in student-documents, student-photos, or payment-screenshots bucket.
        // We will try deleting from all to be safe, since storage.remove fails silently on non-existent paths.
        await supabase.storage.from('student-documents').remove([filePath]);
        await supabase.storage.from('student-photos').remove([filePath]);
        await supabase.storage.from('payment-screenshots').remove([filePath]);
        
        // Refresh UI
        if (window.renderDocumentsTab) await window.renderDocumentsTab();
        viewStudentDocuments(studentDbId, email); // Refresh modal view
        
      } catch (err) {
        console.error('Delete error:', err);
        alert('Failed to delete document: ' + err.message);
      }
    };

    window.openFullscreenImage = function(base64) {
      const w = window.open('');
      if (w) {
         w.document.write('<html><body style="margin:0;background:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;"><img src="' + base64 + '" style="max-width:90vw;max-height:85vh;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.5);" /><button onclick="window.close()" style="margin-top:20px;padding:10px 20px;background:#3b82f6;color:white;border:none;border-radius:8px;font-weight:bold;cursor:pointer;">Close Preview</button></body></html>');
         w.document.title = 'Document Preview';
      }
    };

    window.downloadDocument = function(base64, filename) {
      const a = document.createElement('a');
      a.href = base64;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    window.renderApplications = function() {
      const filter = document.getElementById('filterStatus')?.value || '';
      const courseFilter = document.getElementById('filterCourse')?.value || '';
      const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
      let apps = getApplications();
      
      console.log('[TRACE] Before Render:', apps.length);

      if (filter) apps = apps.filter(s => {
          const stat = (s.applicationStatus || 'Submitted').toUpperCase();
          return stat === filter.toUpperCase();
      });
      if (courseFilter) apps = apps.filter(s => {
          const c = (s.academicDetails && s.academicDetails.courseApplied) ? s.academicDetails.courseApplied : (s.courseApplied || '');
          return c.includes(courseFilter);
      });
      if (search) {
        apps = apps.filter(s => 
          (s.fullName || '').toLowerCase().includes(search) || 
          (s.email || '').toLowerCase().includes(search) || 
          (s.applicationId || '').toLowerCase().includes(search)
        );
      }

      apps = apps.slice().reverse();
      window._currentApplicationsData = apps; // Cache for export
      const tbody = document.getElementById('applicationsTableBody');
      const noData = document.getElementById('noApplications');

      if (!apps.length) {
        tbody.innerHTML = '';
        noData.classList.remove('hidden');
        return;
      }
      noData.classList.add('hidden');

      tbody.innerHTML = apps.map(s => {
        const badgeColors = {
          'Submitted': 'bg-amber-100 text-amber-700 border-amber-200',
          'Approved': 'bg-emerald-100 text-emerald-700 border-emerald-200',
          'APPROVED': 'bg-emerald-100 text-emerald-700 border-emerald-200',
          'Rejected': 'bg-red-100 text-red-700 border-red-200',
          'REJECTED': 'bg-red-100 text-red-700 border-red-200'
        };
        const payColors = {
          'Pending Verification': 'bg-slate-100 text-slate-700 border-slate-200',
          'Payment Done':         'bg-indigo-100 text-indigo-700 border-indigo-200',
          'Payment Rejected':     'bg-red-100 text-red-700 border-red-200',
          'PAID_DEMO':            'bg-emerald-100 text-emerald-700 border-emerald-300',
        };
        const appStatus = s.applicationStatus || 'Submitted';
        const payStatus = s.paymentStatus || 'Pending Verification';
        const statusClass = badgeColors[appStatus] || badgeColors['Submitted'];
        const pStatusClass = payColors[payStatus] || payColors['Pending Verification'];
        
        let dbApp = DB.getStudentByEmail(s.email);
        if (dbApp && dbApp.uploadedFiles) {
          s.uploadedFiles = dbApp.uploadedFiles;
        }

        let photoThumb = `<div class="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center text-lg">👤</div>`;
        if (s.uploadedFiles && s.uploadedFiles.photoFile) {
          photoThumb = `<img src="${s.uploadedFiles.photoFile}" class="w-10 h-10 rounded-lg object-cover shadow-sm bg-white" />`;
        }
        
        const acad = s.academicDetails || {};
        
        return `
          <tr class="hover:bg-slate-50 transition-colors">
            <td class="p-4">
              <div class="flex items-center gap-3">
                ${photoThumb}
                <div>
                  <p class="font-bold text-slate-900 text-sm">${s.fullName || 'Unknown'}</p>
                  <p class="text-[13px] text-slate-500">${s.email || ''}</p>
                </div>
              </div>
            </td>
            <td class="p-4">
              <div class="mb-1">
                ${(acad.courseApplied || s.courseApplied || '').includes('Science') 
                  ? '<span class="bg-purple-100 text-purple-700 border-purple-200 border px-2 py-0.5 rounded text-[11px] font-bold">🟣 M.Sc. CS</span>'
                  : '<span class="bg-blue-100 text-blue-700 border-blue-200 border px-2 py-0.5 rounded text-[11px] font-bold">🔵 M.Sc. CA</span>'}
              </div>
              <p class="text-xs text-slate-500 mt-1"><span class="font-bold text-indigo-600">12th:</span> ${acad.twelfthPercent || '--'}%</p>
            </td>
            <td class="p-4 text-sm text-slate-600">
              ${s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : '--'}
            </td>
            <td class="p-4">
              <span class="px-3 py-1 rounded-full text-xs font-bold border ${pStatusClass}">${payStatus}</span>
            </td>
            <td class="p-4">
              <span class="px-3 py-1 rounded-full text-xs font-bold border ${statusClass}">${appStatus.toUpperCase()}</span>
              ${s.applicationId ? `<p class="text-xs text-slate-400 mt-2 font-mono">${s.applicationId}</p>` : ''}
            </td>
            <td class="p-4 text-right whitespace-nowrap">
              <button onclick="previewApplication('${s.applicationId}')" class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1.5 rounded text-xs font-bold shadow-sm transition">Preview</button>
              ${(appStatus !== 'Approved' && appStatus !== 'APPROVED') ? `
                <button onclick="approveStudent('${s.applicationId}')" class="bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1.5 rounded text-xs font-bold shadow-sm transition">Approve</button>
              ` : ''}
              ${(appStatus !== 'Rejected' && appStatus !== 'REJECTED') ? `
                <button onclick="rejectStudent('${s.applicationId}')" class="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1.5 rounded text-xs font-bold border border-red-200 transition">Reject</button>
              ` : ''}
              <button onclick="window.open('../student/apply.html?edit_app_id=${s.applicationId}', '_blank')" class="bg-amber-50 hover:bg-amber-100 text-amber-600 px-2 py-1.5 rounded text-xs font-bold border border-amber-300 transition ml-1">Edit</button>
              <button onclick="deleteApplication('${s.applicationId}')" class="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1.5 rounded text-xs font-bold border border-slate-300 transition ml-1">Delete</button>
            </td>
          </tr>
        `;
      }).join('');
    }

    window.editStudentDetails = function(appId) {
      // Kept for backward compatibility if any old handlers reference it.
      window.open('../student/apply.html?edit_app_id=' + appId, '_blank');
    };

    window.previewApplication = async function(appId) {
      const apps = getApplications();
      let app = apps.find(a => a.applicationId === appId || a.studentId === appId || a.id === appId);
      if (!app) {
         let dbApp = DB.getStudentById(appId);
         if (dbApp) app = dbApp;
         else return;
      }
      
      // Try loading documents from Supabase first (for Supabase-origin apps)
      let supabaseDocs = {};
      if (supabase && app.supabaseId) {
        try {
          const { data, error } = await supabase
            .from('student_documents')
            .select('doc_type, file_url, file_name')
            .eq('student_id', app.supabaseId);
          if (!error && data && data.length > 0) {
            // Generate Signed URLs for each document
            for (const d of data) {
              let bucket = 'student-documents';
              if (['photoFile', 'signatureFile', 'photo', 'signature'].includes(d.doc_type)) bucket = 'student-photos';
              else if (['paymentScreenshot', 'paymentProof'].includes(d.doc_type)) bucket = 'payment-screenshots';
              
              // Extract precise storage path from the saved public URL
              let filePath = `${app.applicationId}/${d.file_name}`;
              try {
                  const urlObj = new URL(d.file_url);
                  const pathParts = urlObj.pathname.split(`/public/${bucket}/`);
                  if (pathParts.length > 1) filePath = pathParts[1];
              } catch(e) {}
              
              const { data: signedData, error: signError } = await supabase.storage
                .from(bucket)
                .createSignedUrl(filePath, 900); // 15 mins expiry
                
              if (signedData && !signError) {
                supabaseDocs[d.doc_type] = signedData.signedUrl;
              } else {
                console.warn(`[Supabase] Failed to sign URL for ${d.doc_type}:`, signError);
                // Fallback to the saved public URL just in case
                supabaseDocs[d.doc_type] = d.file_url;
              }
            }
            console.log('[Supabase] Loaded', data.length, 'document URLs for preview (Signed)');
          }
        } catch(e) { console.warn('[Supabase] Doc fetch error:', e); }
      }

      // If Supabase has docs, use those; otherwise fall back to localStorage
      if (Object.keys(supabaseDocs).length > 0) {
        app.uploadedFiles = supabaseDocs;
      } else {
        const cetDocs = JSON.parse(localStorage.getItem('cetDocuments')) || {};
        let localDocs = cetDocs[app.applicationId] || cetDocs[app.studentId] || null;
        if (localDocs && Object.keys(localDocs).length > 0) {
           app.uploadedFiles = localDocs;
        } else {
           let dbApp = DB.getStudentByEmail(app.email);
           if (dbApp && dbApp.uploadedFiles && Object.keys(dbApp.uploadedFiles).length > 0) {
              app.uploadedFiles = dbApp.uploadedFiles;
           } else {
              app.uploadedFiles = app.uploadedFiles || {};
           }
        }
      }
      
      const acad = app.academicDetails || {};
      let docsHtml = '';
      
      const keyMap = {
        photoFile: 'Passport Photo', signatureFile: 'Signature',
        syFile: 'SY Marksheet', tyFile: 'TY Marksheet',
        tenthFile: '10th Marksheet', marksheet10: '10th Marksheet',
        twelfthFile: '12th Marksheet', marksheet12: '12th Marksheet',
        photo: 'Passport Photo',
        signature: 'Signature',
        paymentScreenshot: 'Payment Screenshot', paymentProof: 'Payment Screenshot',
        casteCertificateFile: 'Caste Certificate', casteCertificate: 'Caste Certificate',
        nonCreamyLayerFile: 'Non Creamy Layer', incomeCertificateFile: 'Income Certificate',
        domicileFile: 'Domicile', gapCertificateFile: 'Gap Certificate',
        cetScorecard: 'CET Scorecard', cetScorecardFile: 'CET Scorecard',
        graduation: 'Graduation Documents', graduationFile: 'Graduation Documents'
      };
      
      const filesToRender = app.uploadedFiles || app.files || app.documents || {};

      if (Object.keys(filesToRender).length > 0) {
        for (const [key, data] of Object.entries(filesToRender)) {
          if (!data || (!data.startsWith('data:') && !data.startsWith('http'))) continue;
          let displayName = keyMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace('File', '').trim();
          
          const isPdf = data.startsWith('data:application/pdf') || /\.pdf(\?|$)/i.test(data);

          let previewHtml = '';
          if (isPdf) {
             previewHtml = `
               <div class="w-full h-32 bg-slate-100 flex items-center justify-center rounded-t-lg border-b border-slate-200">
                 <div class="text-center">
                   <div class="text-3xl mb-1">📄</div>
                   <p class="text-xs font-bold text-slate-500">PDF Document</p>
                 </div>
               </div>
               <button onclick="downloadDocument('${data}', '${displayName}.pdf')" class="absolute top-2 right-2 bg-white text-indigo-600 p-1.5 rounded shadow border border-indigo-100 hover:bg-indigo-50 transition" title="Download">
                 ⬇️
               </button>
             `;
          } else {
             previewHtml = `
               <img src="${data}" class="w-full h-32 object-cover rounded-t-lg cursor-pointer" onclick="openFullscreenImage('${data}')" title="Click to view full screen" />
               <button onclick="downloadDocument('${data}', '${displayName}.png')" class="absolute top-2 right-2 bg-white/80 backdrop-blur text-slate-700 p-1 rounded shadow-sm border border-slate-200 hover:bg-white transition" title="Download Image">
                 ⬇️
               </button>
             `;
          }

          docsHtml += `
            <div class="bg-white border border-slate-200 rounded-lg shadow-sm relative group overflow-hidden flex flex-col">
              ${previewHtml}
              <div class="p-2 bg-slate-50 border-t border-slate-100 flex-grow flex items-center justify-center text-center">
                <p class="font-bold text-[11px] text-slate-800 uppercase tracking-wide leading-tight">${displayName}</p>
              </div>
            </div>
          `;
        }
      }
      
      document.getElementById('previewContent').innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200 mb-6 shadow-inner">
          <div class="col-span-1 md:col-span-3 pb-2 border-b border-slate-200">
             <h4 class="text-lg font-bold text-slate-800">Personal Information</h4>
          </div>
          <div><p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Applicant Name</p><p class="font-bold text-slate-900 text-base">${app.fullName || app.name || '--'}</p></div>
          <div><p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</p><p class="font-bold text-slate-900 text-base">${app.email || '--'}</p></div>
          <div><p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile</p><p class="font-bold text-slate-900 text-base">${app.mobile || '--'}</p></div>
          <div><p class="text-xs font-bold text-slate-500 uppercase tracking-wider">DOB</p><p class="font-bold text-slate-900 text-base">${app.dob || '--'}</p></div>
          <div><p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</p><p class="font-bold text-slate-900 text-base">${app.category || acad.casteCategory || '--'}</p></div>
          <div class="col-span-1 md:col-span-3"><p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Address</p><p class="font-bold text-slate-900 text-base bg-white p-3 rounded-lg border border-slate-200 mt-1 shadow-sm">${app.address || '--'}</p></div>
          
          <div class="col-span-1 md:col-span-3 pb-2 border-b border-slate-200 mt-2">
             <h4 class="text-lg font-bold text-slate-800">Academic Details</h4>
          </div>
          <div><p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Course Applied</p><p class="font-bold text-indigo-700 text-base bg-indigo-50 px-2 py-1 inline-block rounded">${app.courseApplied || acad.courseApplied || '--'}</p></div>
          <div><p class="text-xs font-bold text-slate-500 uppercase tracking-wider">12th %</p><p class="font-bold text-slate-900 text-base">${acad.twelfthPercent ? acad.twelfthPercent + '%' : '--'}</p></div>
          <div><p class="text-xs font-bold text-slate-500 uppercase tracking-wider">12th Maths Marks</p><p class="font-bold text-slate-900 text-base">${acad.mathsMarks || '--'}</p></div>
          <div><p class="text-xs font-bold text-slate-500 uppercase tracking-wider">SY Background</p><p class="font-bold text-slate-900 text-base">${acad.syBackground || '--'}</p></div>
          <div><p class="text-xs font-bold text-slate-500 uppercase tracking-wider">SY Marks</p><p class="font-bold text-slate-900 text-base">${acad.syMarks ? acad.syMarks + '%' : '--'}</p></div>
          <div><p class="text-xs font-bold text-slate-500 uppercase tracking-wider">TY Status</p><p class="font-bold text-slate-900 text-base">${acad.tyResultStatus || '--'}</p></div>
          <div><p class="text-xs font-bold text-slate-500 uppercase tracking-wider">TY Background</p><p class="font-bold text-slate-900 text-base">${acad.tyBackground || '--'}</p></div>
          <div><p class="text-xs font-bold text-slate-500 uppercase tracking-wider">TY Marks</p><p class="font-bold text-slate-900 text-base">${acad.tyMarks ? acad.tyMarks + '%' : '--'}</p></div>
          
          <div class="col-span-1 md:col-span-3 pb-2 border-b border-slate-200 mt-2">
             <h4 class="text-lg font-bold text-slate-800">Payment Details</h4>
          </div>
          <div><p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Transaction ID / UTR</p><p class="font-bold text-slate-900 text-base font-mono">${app.transactionId || '--'}</p></div>
          <div>
             <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</p>
             <p class="font-bold text-base mt-1 ${app.paymentStatus && app.paymentStatus.includes('Done') ? 'text-emerald-600' : 'text-amber-600'}">${app.paymentStatus || 'Pending Verification'}</p>
          </div>
        </div>
        
        <div class="mb-4">
           <h4 class="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">📁 Uploaded Documents</h4>
           <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
             ${docsHtml || '<div class="col-span-4 p-6 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-bold">No documents uploaded.</div>'}
           </div>
        </div>
      `;
      
      document.getElementById('previewPaymentActions').innerHTML = `
        <button onclick="updatePaymentStatus('${app.applicationId || app.id}', 'Payment Done')" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition">Mark Payment Done</button>
        <button onclick="updatePaymentStatus('${app.applicationId || app.id}', 'Pending Verification')" class="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold shadow-sm transition">Mark Pending</button>
        <button onclick="updatePaymentStatus('${app.applicationId || app.id}', 'Payment Rejected')" class="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg font-bold shadow-sm transition">Mark Rejected</button>
        <div style="flex-grow: 1;"></div>
        <button onclick="adminDownloadReceipt('${app.applicationId || app.id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition">📄 Download Form</button>
        <button onclick="adminResendEmail('${app.applicationId || app.id}')" id="btnResendEmail_${app.applicationId || app.id}" class="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition">📧 Resend Email</button>
      `;
      
      document.getElementById('previewModal').classList.remove('hidden');
    }
    
    window.adminDownloadReceipt = function(appId) {
      let apps = getApplications();
      let app = apps.find(a => a.applicationId === appId || a.studentId === appId || a.id === appId);
      if(!app) {
         let dbApp = DB.getStudentById(appId);
         if (dbApp) app = dbApp;
         else return alert('Application not found');
      }
      
      // Store in localStorage so receipt.html can read it
      localStorage.setItem('cetApplication', JSON.stringify(app));
      
      // Open receipt page in a new tab
      window.open('../student/receipt.html', '_blank');
    };

    window.adminResendEmail = async function(appId) {
      let apps = getApplications();
      let app = apps.find(a => a.applicationId === appId || a.studentId === appId || a.id === appId);
      if(!app) {
         let dbApp = DB.getStudentById(appId);
         if (dbApp) app = dbApp;
         else return alert('Application not found');
      }
      
      if (!app.email) return alert('No email address found for this application.');
      if (!confirm('Are you sure you want to resend the application confirmation email to ' + app.email + '?')) return;
      
      const btn = document.getElementById('btnResendEmail_' + appId);
      if(btn) { btn.disabled = true; btn.innerHTML = '⏳ Sending...'; }
      
      try {
        const EmailSvc = (await import('../js/email-service.js')).default;
        const loginUrl = window.location.origin + '/student/login.html';
        const emailTemplate = EmailSvc.EmailTemplates.pendingApproval(
          app.fullName, 
          app.applicationId || app.studentId || app.id, 
          app.email,
          app.mobile || app.password,
          loginUrl,
          app.courseApplied || (app.academicDetails ? app.academicDetails.courseApplied : 'N/A'),
          app.paymentStatus || 'Pending'
        );
        
        const success = await EmailSvc.sendEmail(app.email, emailTemplate.subject, emailTemplate.html);
        
        if (!success) throw new Error("Failed to send email after retries. Check console for details.");
        
        alert('Email sent successfully to ' + app.email);
      } catch(err) {
        console.error('Email send error:', err);
        alert('Failed to send email: ' + err.message);
      } finally {
        if(btn) { btn.disabled = false; btn.innerHTML = '📧 Resend Email'; }
      }
    };
    
    window.updatePaymentStatus = async function(appId, status) {
      console.log('[Admin Action] Start: Update payment status', appId, status);
      let apps = getApplications();
      let app = apps.find(a => a.applicationId === appId);
      if(app) {
        app.paymentStatus = status;
        saveApplications(apps);

        // Also sync cet_students
        const dbStudents = DB.getStudents();
        const dbStu = dbStudents.find(s => s.email === app.email);
        if (dbStu) {
          dbStu.paymentStatus = status;
          localStorage.setItem('cet_students', JSON.stringify(dbStudents));
        }

        // Sync cetPayments
        try {
          let payments = JSON.parse(localStorage.getItem('cetPayments')) || [];
          const pi = payments.findIndex(p => p.applicationId === appId || p.email === app.email);
          if (pi !== -1) { payments[pi].paymentStatus = status; localStorage.setItem('cetPayments', JSON.stringify(payments)); }
        } catch(e) {}

        // Supabase dual-write
        if (supabase && app.supabaseId) {
          await supabase.from('students').update({ payment_status: status }).eq('id', app.supabaseId)
            .then(({ error }) => { if (error) console.warn('[Supabase] Payment status update error:', error.message); else console.log('[Admin Action] Success: Payment status updated to', status); });
        } else if (supabase && app.email) {
          await supabase.from('students').update({ payment_status: status }).eq('email', app.email)
            .then(({ error }) => { if (error) console.warn('[Supabase] Payment status update error:', error.message); });
        }

        invalidateCache();
        renderApplications();
        previewApplication(appId);
        showToast('Payment status updated to: ' + status, 'success');
        console.log('[Admin Action] Success: Payment status updated');
      }
    }
    
    window.deleteApplication = async function(appId) {
      const confirmation = prompt(`To delete this application, type "DELETE" below:\n\nApplication ID: ${appId}`);
      if(confirmation !== "DELETE") {
         showToast("Deletion cancelled.", "info");
         return;
      }
      console.log('[Admin Action] Start: Delete application', appId);
      
      let apps = getApplications();
      const app = apps.find(a => a.applicationId === appId);
      apps = apps.filter(a => a.applicationId !== appId);
      saveApplications(apps);

      // Also purge from cet_students
      if (app) {
        const dbStudents = DB.getStudents();
        const filtered = dbStudents.filter(s => s.email !== app.email);
        if (filtered.length !== dbStudents.length) {
          localStorage.setItem('cet_students', JSON.stringify(filtered));
        }

        // Also purge from cetApprovedStudents
        try {
          let approved = JSON.parse(localStorage.getItem('cetApprovedStudents')) || [];
          approved = approved.filter(a => a.applicationId !== appId && a.email !== app.email);
          localStorage.setItem('cetApprovedStudents', JSON.stringify(approved));
        } catch(e) {}

        // Also purge from cetPayments
        try {
          let payments = JSON.parse(localStorage.getItem('cetPayments')) || [];
          payments = payments.filter(p => p.applicationId !== appId && p.email !== app.email);
          localStorage.setItem('cetPayments', JSON.stringify(payments));
        } catch(e) {}
      }

      // Supabase: delete application
      if (supabase && app) {
        try {
          const { data: session } = await supabase.auth.getSession();
          const adminId = session?.session?.user?.id || 'admin';
          
          const q = app.supabaseId ? supabase.from('students').update({ status: 'deleted', application_status: 'DELETED' }).eq('id', app.supabaseId)
                                   : supabase.from('students').update({ status: 'deleted', application_status: 'DELETED' }).eq('email', app.email);
          const { error } = await q;
          
          if (error) {
            console.error('[Admin Action] Failed: Supabase delete error', error.message);
            showToast('Delete failed in cloud – retry', 'error');
          } else {
            console.log('[Admin Action] Success: Application deleted from cloud');
            await supabase.from('security_logs').insert({
               event_type: 'STUDENT_DELETED',
               message: `Application ${app.applicationId} soft-deleted by admin ${adminId}`,
               student_name: app.fullName || app.name
            });
          }
        } catch(e) {
          console.error('[Admin Action] Failed: Supabase soft-delete exception', e);
        }
      }

      invalidateCache();
      renderApplications();
      renderOverview();
      showToast('Application deleted successfully', 'success');
      console.log('[Admin Action] Success: Application deleted', appId);
    }

    window.approveStudent = async function(appId) {
      let apps = getApplications();
      let app = apps.find(a => a.applicationId === appId);
      if (!app) { showToast('Application not found', 'error'); return; }

      // Allow PAID_DEMO or Payment Done — block only if truly no payment
      const validPayment = ['PAID_DEMO', 'Payment Done', 'PAID'].includes(app.paymentStatus);
      if (!validPayment) {
        showToast('Payment not verified. Status: ' + (app.paymentStatus || 'None'), 'error');
        return;
      }
      if (!confirm('Approve this application and generate Student ID?')) return;

      console.log('[Admin Action] Start: Approve student', appId);

      console.log('[TRACE] Before Update:');
      console.log(`[TRACE] Student ID: ${app.studentId || app.applicationId}`);
      const oldStatus = app.applicationStatus || app.status || 'PENDING_APPROVAL';
      console.log(`[TRACE] Current Status: ${oldStatus}`);

      // Generate studentId if not already set
      const newStudentId = app.studentId || ('CET2026' + String(Math.floor(Math.random() * 9000) + 1000));
      const examConfig = (() => { try { return JSON.parse(localStorage.getItem('cetExamConfig')); } catch(e) { return null; } })();
      const examDate = examConfig?.examDate || '';
      const now = new Date().toISOString();

      // 1. Supabase dual-write (MUST BE FIRST)
      if (supabase) {
        showToast('Saving approval to database...', 'info');
        const updateData = {
          status: 'APPROVED',
          application_status: 'APPROVED',
          student_id: newStudentId,
          exam_status: examDate ? 'SCHEDULED' : 'NOT_SCHEDULED'
        };
        try {
          const matchField = app.supabaseId ? supabase.from('students').update(updateData).eq('id', app.supabaseId)
                                            : supabase.from('students').update(updateData).eq('email', app.email).eq('course_applied', app.courseApplied);
          const { error } = await matchField;
          
          if (error) {
            console.error('[Admin Action] Failed: Supabase approve error:', error.message);
            showToast('Database update failed. Approval aborted.', 'error');
            return; // ⛔ STOP HERE: Do not update UI or localStorage if DB fails
          }
          
          console.log('[Admin Action] Success: Student approved in cloud:', newStudentId);

          // Audit Log
          const { data: session } = await supabase.auth.getSession();
          const adminId = session?.session?.user?.id || 'admin';
          await supabase.from('security_logs').insert({
             student_id: app.supabaseId || app.id,
             student_name: app.fullName || app.name,
             event_type: 'STUDENT_APPROVED',
             message: `Admin ${adminId} changed status from ${oldStatus} to APPROVED. App ID: ${app.applicationId}`
          });
        } catch(e) {
          console.error('[Admin Action] Failed: Supabase approve exception', e);
          showToast('Network error during approval.', 'error');
          return;
        }
      }

      // 2. Update cetApplications locally
      app.applicationStatus = 'APPROVED';
      app.status = 'APPROVED';
      app.studentId = newStudentId;
      app.examStatus = examDate ? 'SCHEDULED' : 'NOT_SCHEDULED';
      app.examDate = examDate;
      app.approvedAt = now;
      localStorage.setItem('cetApplications', JSON.stringify(apps));
      
      console.log('[TRACE] After Update:');
      console.log(`[TRACE] Updated Status: ${app.applicationStatus}`);

      // 3. Add/update cetApprovedStudents
      let approved = [];
      try { approved = JSON.parse(localStorage.getItem('cetApprovedStudents')) || []; } catch(e) {}
      approved = approved.filter(a => a.applicationId !== appId);
      approved.push({ ...app });
      localStorage.setItem('cetApprovedStudents', JSON.stringify(approved));

      // 4. Sync cet_students (for student login & exam engine)
      const dbStudents = DB.getStudents();
      const dbIdx = dbStudents.findIndex(s => s.applicationId === app.applicationId || (s.email === app.email && s.courseApplied === app.courseApplied));
      if (dbIdx !== -1) {
        dbStudents[dbIdx] = {
          ...dbStudents[dbIdx],
          status: 'APPROVED',
          studentId: newStudentId,
          applicationStatus: 'APPROVED',
          examStatus: examDate ? 'SCHEDULED' : 'NOT_SCHEDULED',
          examDate: examDate,
          approvedAt: now,
        };
        localStorage.setItem('cet_students', JSON.stringify(dbStudents));
      }

      // 5. Also sync cetPayments status if present
      try {
        let payments = JSON.parse(localStorage.getItem('cetPayments')) || [];
        const pi = payments.findIndex(p => p.applicationId === appId);
        if (pi !== -1) { payments[pi].applicationStatus = 'APPROVED'; localStorage.setItem('cetPayments', JSON.stringify(payments)); }
      } catch(e) {}

      // 6. Email Notification
      import('../js/email-service.js').then(({ default: EmailSvc }) => {
        const emailHtml = EmailSvc.EmailTemplates.approval(app.fullName, newStudentId, examDate, examConfig?.startTime, app.courseApplied).html;
        const emailSubject = EmailSvc.EmailTemplates.approval(app.fullName, newStudentId, examDate, examConfig?.startTime, app.courseApplied).subject;
        EmailSvc.sendEmail(app.email, emailSubject, emailHtml).then(success => {
            if (success) {
                showToast('Email sent successfully to ' + app.fullName, 'success');
            } else {
                showToast('Student approved, but failed to send email.', 'error');
            }
        });
      }).catch(err => console.warn('Email service import failed', err));

      invalidateCache();
      renderApplications();
      renderStudents();
      renderOverview();
      showToast('Student approved! ID: ' + newStudentId, 'success');
      console.log('[Admin Action] Success: Student approved', newStudentId);
    }

    window.rejectStudent = async function(appId) {
      if (!confirm('Reject this application?')) return;
      console.log('[Admin Action] Start: Reject student', appId);
      let apps = getApplications();
      let app = apps.find(a => a.applicationId === appId);
      if (app) {
        app.applicationStatus = 'Rejected';
        app.status = 'rejected';
        localStorage.setItem('cetApplications', JSON.stringify(apps));

        // Sync cet_students
        const dbStudents = DB.getStudents();
        const dbIdx = dbStudents.findIndex(s => s.applicationId === app.applicationId || (s.email === app.email && s.courseApplied === app.courseApplied));
        if (dbIdx !== -1) {
          dbStudents[dbIdx].status = 'rejected';
          dbStudents[dbIdx].applicationStatus = 'Rejected';
          localStorage.setItem('cet_students', JSON.stringify(dbStudents));
        }

        // Also remove from cetApprovedStudents (in case it was previously approved)
        try {
          let approved = JSON.parse(localStorage.getItem('cetApprovedStudents')) || [];
          approved = approved.filter(a => a.applicationId !== appId && a.email !== app.email);
          localStorage.setItem('cetApprovedStudents', JSON.stringify(approved));
        } catch(e) {}

        // Supabase dual-write
        if (supabase) {
          try {
            const q = app.supabaseId ? supabase.from('students').update({ status: 'rejected', application_status: 'Rejected' }).eq('id', app.supabaseId)
                                     : supabase.from('students').update({ status: 'rejected', application_status: 'Rejected' }).eq('email', app.email).eq('course_applied', app.courseApplied);
            const { error } = await q;
            if (error) {
              console.warn('[Admin Action] Failed: Supabase reject error:', error.message);
              showToast('Rejection saved locally but cloud sync failed', 'error');
            } else {
              console.log('[Admin Action] Success: Student rejected in cloud');
            }
          } catch(e) {
            console.error('[Admin Action] Failed: Supabase reject exception', e);
          }
        }

        // Email Notification
        import('../js/email-service.js').then(({ default: EmailSvc }) => {
          const emailHtml = EmailSvc.EmailTemplates.rejection(app.fullName, "Application did not meet the criteria or documents were missing/invalid.").html;
          const emailSubject = EmailSvc.EmailTemplates.rejection(app.fullName, "").subject;
          EmailSvc.sendEmail(app.email, emailSubject, emailHtml);
        }).catch(err => console.warn('Email service import failed', err));

        invalidateCache();
        renderApplications();
        renderStudents();
        renderOverview();
        showToast('Application rejected successfully', 'success');
        console.log('[Admin Action] Success: Student rejected', appId);
      }
    }

    // ============================================
    // APPROVED STUDENTS & EXAM RESULTS
    // ============================================
    
    window.toggleSelectAllStudents = function(checkbox) {
      const checkboxes = document.querySelectorAll('.student-checkbox');
      checkboxes.forEach(cb => cb.checked = checkbox.checked);
    };
    
    window.sendSelectedInvites = async function() {
      const selected = Array.from(document.querySelectorAll('.student-checkbox:checked')).map(cb => cb.value);
      if(selected.length === 0) {
        showToast('Please select at least one student to send invites.', 'error');
        return;
      }
      
      const configObj = JSON.parse(localStorage.getItem('cetExamConfig')) || {};
      const courseConfig = configObj['M.Sc. Computer Science'] || configObj;
      if (!courseConfig.examDate || !courseConfig.startTime) {
         showToast('Exam date/time not configured yet. Go to Exam Settings.', 'error');
         return;
      }
      
      if(!confirm(`Are you sure you want to send Exam Invites to ${selected.length} selected students?`)) return;
      
      const btn = document.querySelector('button[onclick="sendSelectedInvites()"]');
      if(btn) { btn.disabled = true; btn.innerHTML = 'Sending...'; }
      
      showToast(`Sending ${selected.length} emails. Please wait...`, 'info');
      
      let allDbStudents = [];
      if(supabase) {
         const {data} = await supabase.from('students').select('*').in('id', selected);
         if(data) allDbStudents = data;
      } else {
         const local = DB.getStudents() || [];
         allDbStudents = local.filter(s => selected.includes(s.id || s.supabaseId));
      }
      
      let emailsPromises = [];
      allDbStudents.forEach(st => {
         if (st.email) {
            const p = import('../js/email-service.js').then(({ default: EmailSvc }) => {
              const portalUrl = window.location.origin + '/student/login.html';
              const examUrl = window.location.origin + '/exam/index.html';
              const tpl = EmailSvc.EmailTemplates.scheduleUpdate(
                 st.full_name || st.name || 'Student', 
                 courseConfig.examDate, 
                 courseConfig.startTime, 
                 courseConfig.durationMinutes || 60, 
                 courseConfig.course || 'M.Sc. Computer Science', 
                 st.student_id || st.id, 
                 portalUrl, examUrl, st.email
              );
              return EmailSvc.sendEmail(st.email, tpl.subject, tpl.html).then((success) => success === true);
            }).catch(e => false);
            emailsPromises.push(p);
         }
      });
      
      Promise.all(emailsPromises).then(results => {
         const sentCount = results.filter(r => r === true).length;
         showToast(`Successfully sent ${sentCount} invite emails!`, 'success');
         if(btn) { btn.disabled = false; btn.innerHTML = '✉️ Send Invite Emails'; }
      });
    };

    window.sendSelectedHallTickets = async function() {
      const selected = Array.from(document.querySelectorAll('.student-checkbox:checked')).map(cb => cb.value);
      if(selected.length === 0) {
        showToast('Please select at least one student to send Hall Tickets.', 'error');
        return;
      }
      
      const configObj = JSON.parse(localStorage.getItem('cetExamConfig')) || {};
      const courseConfig = configObj['M.Sc. Computer Science'] || configObj;
      const examDateStr = courseConfig.examDate || "25 June 2026";
      const examTimeStr = courseConfig.startTime || "09:30 AM";
      const durationStr = (courseConfig.durationMinutes || 90) + " Minutes";

      if(!confirm(`Are you sure you want to send Hall Ticket PDFs to ${selected.length} selected students?`)) return;
      
      const btn = document.querySelector('button[onclick="sendSelectedHallTickets()"]');
      if(btn) { btn.disabled = true; btn.innerHTML = 'Sending...'; }
      
      showToast(`Generating and sending ${selected.length} PDFs. Please wait...`, 'info');
      
      let allDbStudents = [];
      if(supabase) {
         const {data} = await supabase.from('students').select('*').in('id', selected);
         if(data) allDbStudents = data;
      } else {
         const local = DB.getStudents() || [];
         allDbStudents = local.filter(s => selected.includes(s.id || s.supabaseId));
      }
      
      let emailsPromises = [];
      for (const st of allDbStudents) {
         if (st.email) {
            try {
               const EmailSvc = (await import('../js/email-service.js')).default;
               const tmpl = EmailSvc.EmailTemplates.hallTicketEmail(
                  st.full_name || st.name || 'Student', 
                  st.student_id || st.id, 
                  st.courseApplied || 'M.Sc.'
               );
               
               const base64Pdf = await window.generateBase64AdmitCard(st, examDateStr, examTimeStr, durationStr);
               let attachments = null;
               if (base64Pdf) {
                   attachments = [{
                       filename: `CET_AdmitCard_${st.student_id || st.id || 'Student'}.pdf`,
                       content: base64Pdf.split('base64,')[1] || base64Pdf,
                       encoding: 'base64'
                   }];
               }
               
               const p = EmailSvc.sendEmail(st.email, tmpl.subject, tmpl.html, attachments).then((success) => success === true).catch(e => false);
               emailsPromises.push(p);
            } catch(e) {
               console.warn("Error sending to " + st.email, e);
            }
         }
      }
      
      Promise.all(emailsPromises).then(results => {
         const sentCount = results.filter(r => r === true).length;
         showToast(`Successfully sent ${sentCount} Hall Ticket emails!`, 'success');
         if(btn) { btn.disabled = false; btn.innerHTML = '🎓 Send Selected Hall Tickets'; }
         document.querySelectorAll('.student-checkbox').forEach(cb => cb.checked = false);
      });
    };

    window.sendAllHallTickets = async function() {
      const configObj = JSON.parse(localStorage.getItem('cetExamConfig')) || {};
      const courseConfig = configObj['M.Sc. Computer Science'] || configObj;
      const examDateStr = courseConfig.examDate || "25 June 2026";
      const examTimeStr = courseConfig.startTime || "09:30 AM";
      const durationStr = (courseConfig.durationMinutes || 90) + " Minutes";

      let allDbStudents = [];
      if(supabase) {
         const {data} = await supabase.from('students').select('*').or('application_status.eq.APPROVED,status.eq.APPROVED');
         if(data) allDbStudents = data;
      } else {
         const local = DB.getStudents() || [];
         allDbStudents = local.filter(s => (s.applicationStatus || s.status || '').toUpperCase() === 'APPROVED');
      }

      if(allDbStudents.length === 0) {
        showToast('No approved students found.', 'error');
        return;
      }
      
      if(!confirm(`Are you sure you want to generate and send Hall Ticket PDFs to ALL ${allDbStudents.length} approved students?`)) return;
      
      const btn = document.querySelector('button[onclick="sendAllHallTickets()"]');
      if(btn) { btn.disabled = true; btn.innerHTML = 'Sending All...'; }
      
      showToast(`Generating and sending ${allDbStudents.length} PDFs. This may take a while...`, 'info');
      
      let emailsPromises = [];
      for (const st of allDbStudents) {
         if (st.email) {
            try {
               const EmailSvc = (await import('../js/email-service.js')).default;
               const tmpl = EmailSvc.EmailTemplates.hallTicketEmail(
                  st.full_name || st.name || 'Student', 
                  st.student_id || st.id, 
                  st.courseApplied || 'M.Sc.'
               );
               
               const base64Pdf = await window.generateBase64AdmitCard(st, examDateStr, examTimeStr, durationStr);
               let attachments = null;
               if (base64Pdf) {
                   attachments = [{
                       filename: `CET_AdmitCard_${st.student_id || st.id || 'Student'}.pdf`,
                       content: base64Pdf.split('base64,')[1] || base64Pdf,
                       encoding: 'base64'
                   }];
               }
               
               const p = EmailSvc.sendEmail(st.email, tmpl.subject, tmpl.html, attachments).then((success) => success === true).catch(e => false);
               emailsPromises.push(p);
            } catch(e) {
               console.warn("Error sending to " + st.email, e);
            }
         }
      }
      
      Promise.all(emailsPromises).then(results => {
         const sentCount = results.filter(r => r === true).length;
         showToast(`Successfully sent ${sentCount} Hall Ticket emails!`, 'success');
         if(btn) { btn.disabled = false; btn.innerHTML = '🚀 Send ALL Hall Tickets'; }
      });
    };

    window.renderStudents = function() {
      // Read from localStorage first
      let students = [];
      try { students = JSON.parse(localStorage.getItem('cetApprovedStudents')) || []; } catch(e) {}
      students = students.filter(s => {
          const stat = (s.applicationStatus || s.status || '').toUpperCase();
          return stat === 'APPROVED';
      });

      // If Supabase cache has approved students, merge/replace
      if (_supabaseFetched && _supabaseAppsCache) {
        const supaApproved = _supabaseAppsCache.filter(s => {
            const stat = (s.applicationStatus || s.status || '').toUpperCase();
            return stat === 'APPROVED';
        });
        if (supaApproved.length > 0) students = supaApproved;
      }

      const results = DB.getResults();
      
      const filterStatus = document.getElementById('studentsFilterStatus')?.value || '';
      const filterCourse = document.getElementById('studentsFilterCourse')?.value || '';
      const search = (document.getElementById('studentsSearchInput')?.value || '').toLowerCase();
      
      // Filter logic
      students = students.filter(s => {
        const hasAttempted = s.hasAttempted;
        const examStatus = hasAttempted ? 'Completed' : (s.examStatus || 'Pending Exam');
        const matchStatus = !filterStatus || examStatus === filterStatus;
        const matchCourse = !filterCourse || (s.courseApplied || '').toLowerCase().includes(filterCourse.toLowerCase());
        const matchSearch = !search || 
          (s.fullName || '').toLowerCase().includes(search) || 
          (s.studentId || '').toLowerCase().includes(search);
        
        return matchStatus && matchCourse && matchSearch;
      });

      document.getElementById('studentsTableBody').innerHTML = students.map(s => {
        const r = results.find(x => x.studentId === s.id || x.studentId === s.studentId);
        const hasAttempted = s.hasAttempted;
        const examStatus = hasAttempted ? 'Completed' : (s.examStatus || 'Pending Exam');
        
        const securityLogs = [];
        try {
          const allLogs = JSON.parse(localStorage.getItem('cetExamSecurityLogs')) || [];
          securityLogs.push(...allLogs.filter(l => l.studentId && (l.studentId === s.id || l.studentId === s.studentId)));
        } catch(e) {}
        
        const tabSwitches = securityLogs.filter(l => l.type === 'TAB_SWITCH').length;
        const clipboards = securityLogs.filter(l => l.type === 'CLIPBOARD').length;
        const totalViolations = r ? (r.violations || 0) : (s.active_violations ?? s.activeViolations ?? securityLogs.filter(l => ['TAB_SWITCH', 'CLIPBOARD', 'FULLSCREEN_EXIT', 'NO_FACE', 'MULTIPLE_FACES', 'WINDOW_BLUR', 'RIGHT_CLICK', 'KEYBOARD_SHORTCUT'].includes(l.type)).length);

        let statusHtml = '';
        if(examStatus === 'TERMINATED') statusHtml = '<span class="text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded border border-red-200">Terminated</span>';
        else if(examStatus === 'Completed') statusHtml = '<span class="text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded border border-emerald-200">Completed</span>';
        else if(examStatus === 'Active Exam') statusHtml = '<span class="text-blue-600 font-bold text-xs bg-blue-50 px-2 py-1 rounded border border-blue-200">Active Exam</span>';
        else statusHtml = '<span class="text-amber-600 font-bold text-xs bg-amber-50 px-2 py-1 rounded border border-amber-200">Pending Exam</span>';

        const sid = s.id;
        return `
          <tr class="hover:bg-slate-50 transition-colors">
            <td class="p-4 text-center">
              <input type="checkbox" class="student-checkbox w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" value="${sid}">
            </td>
            <td class="p-4 font-mono text-sm text-indigo-600 font-bold cursor-pointer hover:underline" onclick="openStudentDetailsModal('${sid}')">${s.studentId}</td>
            <td class="p-4 font-medium text-slate-800 text-sm">${s.fullName}</td>
            <td class="p-4">${statusHtml}</td>
            <td class="p-4 text-center font-bold text-slate-900">${r ? r.score+'/'+r.total : '--'}</td>
            <td class="p-4 text-center font-bold text-red-600">${totalViolations > 0 ? totalViolations : '--'}</td>
            <td class="p-4 text-center font-bold text-orange-600">${tabSwitches > 0 ? tabSwitches : '--'}</td>
            <td class="p-4 text-center font-bold text-amber-600">${clipboards > 0 ? clipboards : '--'}</td>
            <td class="p-4">
              <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end;">
                <button type="button" onclick="downloadAdminAdmitCard('${sid}', event)" style="cursor:pointer;pointer-events:auto;" class="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded text-xs font-bold">📄 Admit Card</button>
                <button type="button" onclick="openStudentDetailsModal('${sid}')" style="cursor:pointer;pointer-events:auto;" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-bold">Details</button>
                <button type="button" onclick="openDocumentsModal('${sid}')" style="cursor:pointer;pointer-events:auto;" class="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-2 py-1 rounded text-xs font-bold">Docs</button>
                ${hasAttempted ? `<button type="button" onclick="openAnswersModal('${sid}')" style="cursor:pointer;pointer-events:auto;" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-2 py-1 rounded text-xs font-bold">Answers</button>` : ''}
                <button type="button" onclick="openIssuesModal('${sid}')" style="cursor:pointer;pointer-events:auto;" class="bg-orange-50 hover:bg-orange-100 text-orange-600 px-2 py-1 rounded text-xs font-bold">Issues</button>
                ${!hasAttempted ? `<button type="button" onclick="resumeExam('${sid}')" style="cursor:pointer;pointer-events:auto;" class="bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs font-bold">Resume</button>` : ''}
                <button type="button" onclick="openRescheduleModal('${sid}')" style="cursor:pointer;pointer-events:auto;" class="bg-purple-50 hover:bg-purple-100 text-purple-600 px-2 py-1 rounded text-xs font-bold">Reschedule</button>
                <button type="button" onclick="deleteApprovedStudent('${sid}')" style="cursor:pointer;pointer-events:auto;" class="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">Delete</button>
              </div>
            </td>
          </tr>
        `;
      }).join('') || '<tr><td colspan="6" class="p-8 text-center text-slate-500">No approved students found matching filters.</td></tr>';
    }

    // ============================================
    // ADMIT CARD GENERATION
    // ============================================
    window.downloadAdminAdmitCard = async function(studentId, event) {
      let students = [];
      if (_supabaseAppsCache) {
         students = _supabaseAppsCache;
      } else {
         students = JSON.parse(localStorage.getItem('cetApprovedStudents')) || [];
      }
      const student = students.find(s => s.id === studentId);
      if (!student) return;

      const btn = event ? event.currentTarget : null;
      let originalText = '';
      if (btn) {
         originalText = btn.innerHTML;
         btn.innerHTML = '⏳ Generating...';
         btn.disabled = true;
      }

      // 1. Fetch Photo securely
      let supaClient = null;
      if (typeof supabase !== 'undefined') supaClient = supabase;
      else if (window.supabase) supaClient = window.supabase;
      else {
         try {
            const SupaDB = await import('../js/supabase-db.js');
            supaClient = SupaDB.getClient();
         } catch(e) {}
      }

      let photoData = null;
      const sid = student.id || student.studentId;
      if (supaClient && sid) {
         try {
            const { data } = await supaClient.from('student_documents').select('file_url').eq('student_id', sid).in('doc_type', ['photoFile', 'passport_photo']).limit(1).maybeSingle();
            if (data && data.file_url) photoData = data.file_url;
         } catch(e) { console.error(e); }
      }
      
      if (!photoData) {
         photoData = student.photoData || student.passportPhotoUrl || (student.application_documents && student.application_documents.passport_photo) || (student.uploadedFiles && student.uploadedFiles.photoFile) || localStorage.getItem('cet_student_photo_' + sid) || null;
      }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');
      
      let config = DB.getSchedule(student.courseApplied || 'M.Sc. Computer Science') || {};
      let examDateStr = '25 June 2026';
      let examTimeStr = '09:30 AM to 11:00 AM';
      let durationStr = '90 Minutes';
      
      // Outer Borders
      doc.setDrawColor(30, 58, 138); doc.setLineWidth(1); doc.rect(10, 10, 190, 277);
      doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3); doc.rect(12, 12, 186, 273);

      // Header Yellow Box
      doc.setFillColor(255, 252, 230); // light yellow
      doc.rect(15, 15, 180, 25, 'F');
      
      // Load Images Helper via Fetch (with CORS Proxy fallback)
      const loadImage = async (src) => {
         try {
            let res = await fetch(src);
            if (!res.ok) throw new Error('Network response was not ok');
            const blob = await res.blob();
            return new Promise((resolve) => {
               const reader = new FileReader();
               reader.onloadend = () => resolve(reader.result);
               reader.onerror = () => resolve(null);
               reader.readAsDataURL(blob);
            });
         } catch(e) {
            console.warn('[AdmitCard] Direct image fetch failed, trying proxy...', src);
            try {
               const proxySrc = 'https://corsproxy.io/?' + encodeURIComponent(src);
               let res = await fetch(proxySrc);
               const blob = await res.blob();
               return new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result);
                  reader.onerror = () => resolve(null);
                  reader.readAsDataURL(blob);
               });
            } catch (err) {
               console.error('[AdmitCard] Proxy fetch also failed:', err);
               return null;
            }
         }
      };

      // Load College Logo
      const logoUrl = window.location.origin + '/images/maharaj.jpeg';
      const lData = await loadImage(logoUrl);
      if (lData) {
         doc.addImage(lData, 'JPEG', 20, 18, 18, 18);
      }
      
      // Header Text
      doc.setFontSize(10); doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "bold");
      doc.text("Ahmednagar Jilha Maratha Vidya Prasarak Samaj's", 105, 20, { align: "center" });
      doc.setFontSize(14); doc.setTextColor(180, 0, 0); // Dark Red
      doc.text("NEW ARTS, COMMERCE AND SCIENCE COLLEGE", 105, 26, { align: "center" });
      doc.setFontSize(12);
      doc.text("(AUTONOMOUS)", 105, 31, { align: "center" });
      doc.setFontSize(9); doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal");
      doc.text("Laltaki Road, Ahmednagar - 414 001 (MS)", 105, 36, { align: "center" });
      
      // Blue banner
      doc.setFillColor(30, 58, 138); // blue
      doc.rect(15, 40, 180, 8, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.setFont("helvetica", "bold");
      doc.text("Center for Advanced Studies in Applied Sciences (CASAS)", 105, 45, { align: "center" });
      
      // Title & Courses
      doc.setTextColor(0, 0, 0); doc.setFontSize(14);
      doc.text("ADMIT CARD (HALL TICKET)", 105, 55, { align: "center" });
      
      // Highlight BOTH courses in the heading - REMOVED
      
      doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.5); doc.rect(15, 66, 180, 68);
      doc.line(145, 66, 145, 134); 
      doc.line(70, 66, 70, 134);
      
      const rows = [
         ["Applied Course:", (student.courseApplied || '').toUpperCase()],
         ["Full Name:", student.fullName || student.name || ''],
         ["Roll No / CET ID:", student.studentId || student.id || ''],
         ["Mobile Number:", student.mobile || ''],
         ["Exam Date:", examDateStr],
         ["Reporting Time:", "09:00 AM"],
         ["Exam Time:", examTimeStr],
         ["Duration:", durationStr]
      ];
      
      let yLine = 66;
      rows.forEach((r, i) => {
         doc.setFontSize(10);
         doc.setFont("helvetica", "bold"); doc.text(r[0], 18, yLine + 5.5);
         doc.setFont("helvetica", "normal"); doc.text(r[1], 75, yLine + 5.5);
         yLine += 8.5;
         if (i < 7) {
            doc.setLineWidth(0.2); doc.line(15, yLine, 145, yLine);
         }
      });
      
      // Draw Photo
      if (photoData) {
         const pData = await loadImage(photoData);
         if (pData) doc.addImage(pData, 'JPEG', 150, 75, 40, 50);
         doc.rect(150, 75, 40, 50); // photo border
      } else {
         doc.rect(150, 75, 40, 50);
         doc.setFontSize(9); doc.setTextColor(150, 150, 150); doc.text("Photograph", 170, 100, {align:"center"}); doc.setTextColor(0,0,0);
      }
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(0,0,0);
      doc.text("Photograph", 170, 130, {align:"center"});

      // Instructions
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(180, 0, 0);
      doc.text("IMPORTANT INSTRUCTIONS FOR CANDIDATES:", 15, 160);
      
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(0, 0, 0);
      const instructions = [
         "1. Admission Criteria: Admissions are strictly based on the merit list generated from exam scores.",
         "2. Exam Date & Time: Thursday, 25 June 2026, from 09:30 AM to 11:00 AM.",
         "3. Reporting Time & Venue: Report exactly at 09:00 AM at the CASAS Department, 1st Floor, Admin Building.",
         "4. Exam Format: Entirely offline, 100 marks (75 questions: 50 Qs of 1 mark, 25 Qs of 2 marks).",
         "   Answers must be written on the provided Answer Sheet.",
         "5. Mandatory Attendance: Only students present will be considered. Absence forfeits admission claims.",
         "6. Merit List & Counseling: Merit list will be prepared immediately. Counseling begins at 01:00 PM same day.",
         "7. Provisional Admission Fee: Selected students must pay a provisional fee of Rs. 1000/- on the spot.",
         "8. Caste Certificate: Reserved category students MUST bring their original caste certificate.",
         "9. Final Admission: Confirmed only after submitting the original UG marksheet and Transfer Certificate."
      ];
      
      let instY = 168;
      instructions.forEach(inst => {
         doc.text(inst, 15, instY);
         instY += 6;
      });
      
      // Add Student Signature box
      doc.rect(20, 235, 50, 15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Student's Signature", 28, 256);

      // Add Authority Signature
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Prof. Arun Gangarde", 130, 245);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Head, CASAS", 130, 250);
      doc.text("(Center for Advanced Studies in", 130, 255);
      doc.text("Applied Sciences)", 130, 260);

      doc.save(`CET_AdmitCard_${student.studentId || 'Student'}.pdf`);
      
      if (btn) {
         btn.innerHTML = originalText;
         btn.disabled = false;
      }
    }

    // ============================================
    // LOCKED EXAMS
    // ============================================
    window.renderLockedExams = function() {
      let lockedExams = [];
      try { lockedExams = JSON.parse(localStorage.getItem('cetLockedExams')) || []; } catch(e){}
      
      // Use the locked exams directly from storage (which is now synced from Supabase)
      const currentLocked = lockedExams;
      
      document.getElementById('lockedBadge').textContent = currentLocked.length || '';

      document.getElementById('lockedTableBody').innerHTML = currentLocked.map(l => `
        <tr class="hover:bg-red-50/50 transition-colors">
          <td class="p-4 font-mono text-sm text-red-600 font-bold">${l.studentId}</td>
          <td class="p-4 font-medium text-slate-800 text-sm">${l.name}</td>
          <td class="p-4 text-center font-bold text-red-600">${l.warningCount}/3</td>
          <td class="p-4 text-sm text-slate-600">${l.reason}</td>
          <td class="p-4 text-xs text-slate-500">${new Date(l.lockedAt).toLocaleString('en-IN')}</td>
          <td class="p-4 text-right">
            <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end;">
              <button type="button" onclick="unlockExam('${l.studentId}')" style="cursor:pointer;pointer-events:auto;" class="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1.5 rounded text-xs font-bold transition-colors">Unlock</button>
              <button type="button" onclick="terminateLockedExam('${l.studentId}')" style="cursor:pointer;pointer-events:auto;" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors">Terminate</button>
            </div>
          </td>
        </tr>
      `).join('') || '<tr><td colspan="6" class="p-8 text-center text-slate-500">No locked exams currently.</td></tr>';
    }

    window.unlockExam = async function(studentId) {
       if(!confirm('Are you sure you want to unlock this exam? The student will be able to resume.')) return;
       console.log('[Admin Action] Start: Unlock exam', studentId);
       
       let students = DB.getStudents();
       const stIdx = students.findIndex(s => s.studentId === studentId);
       if(stIdx !== -1) {
          students[stIdx].examStatus = 'ACTIVE';
          students[stIdx].activeViolations = 0;
          students[stIdx].unlockedAt = new Date().toISOString();
          students[stIdx].unlockedBy = 'Admin';
          localStorage.setItem('cet_students', JSON.stringify(students));
       }
       
       let approved = [];
       try { approved = JSON.parse(localStorage.getItem('cetApprovedStudents')) || []; } catch(e){}
       const apIdx = approved.findIndex(s => s.studentId === studentId);
       if(apIdx !== -1) {
          approved[apIdx].examStatus = 'ACTIVE';
          localStorage.setItem('cetApprovedStudents', JSON.stringify(approved));
       }
       
       let lockedExams = [];
       try { lockedExams = JSON.parse(localStorage.getItem('cetLockedExams')) || []; } catch(e){}
       lockedExams = lockedExams.filter(l => l.studentId !== studentId);
       localStorage.setItem('cetLockedExams', JSON.stringify(lockedExams));
       
       // Supabase dual-write
       if (supabase) {
         await supabase.from('students').update({ exam_status: 'ACTIVE', active_violations: 0 }).eq('student_id', studentId)
           .then(({ error }) => { if (error) console.warn('[Admin Action] Failed: Unlock error:', error.message); else console.log('[Admin Action] Success: Exam unlocked in cloud'); });
         await supabase.from('locked_exams').delete().eq('cet_student_id', studentId)
           .then(({ error }) => { if (error) console.warn('[Admin Action] Failed: Locked exam delete error:', error.message); });
       }
       
       invalidateCache();
       showToast('Exam unlocked successfully', 'success');
       console.log('[Admin Action] Success: Exam unlocked', studentId);
       renderLockedExams();
       renderStudents();
    }

    window.terminateLockedExam = async function(studentId) {
       if(!confirm('Are you sure you want to PERMANENTLY TERMINATE this exam? The student will be scored 0.')) return;
       console.log('[Admin Action] Start: Terminate exam', studentId);
       
       let students = DB.getStudents();
       const stIdx = students.findIndex(s => s.studentId === studentId);
       if(stIdx !== -1) {
          students[stIdx].examStatus = 'TERMINATED';
          students[stIdx].hasAttempted = true;
          localStorage.setItem('cet_students', JSON.stringify(students));
       }
       
       let approved = [];
       try { approved = JSON.parse(localStorage.getItem('cetApprovedStudents')) || []; } catch(e){}
       const apIdx = approved.findIndex(s => s.studentId === studentId);
       if(apIdx !== -1) {
          approved[apIdx].examStatus = 'TERMINATED';
          approved[apIdx].hasAttempted = true;
          localStorage.setItem('cetApprovedStudents', JSON.stringify(approved));
       }
       
       let lockedExams = [];
       try { lockedExams = JSON.parse(localStorage.getItem('cetLockedExams')) || []; } catch(e){}
       lockedExams = lockedExams.filter(l => l.studentId !== studentId);
       localStorage.setItem('cetLockedExams', JSON.stringify(lockedExams));
       
       // Supabase dual-write
       if (supabase) {
         await supabase.from('students').update({ exam_status: 'TERMINATED', has_attempted: true }).eq('student_id', studentId)
           .then(({ error }) => { if (error) console.warn('[Admin Action] Failed: Terminate error:', error.message); else console.log('[Admin Action] Success: Exam terminated in cloud'); });
         await supabase.from('locked_exams').delete().eq('cet_student_id', studentId)
           .then(({ error }) => { if (error) console.warn('[Admin Action] Failed: Locked exam delete error:', error.message); });
       }
       
       invalidateCache();
       showToast('Exam terminated permanently', 'success');
       console.log('[Admin Action] Success: Exam terminated', studentId);
       renderLockedExams();
       renderStudents();
    }

    // ============================================
    // SCHEDULING & QUESTIONS
    // ============================================
    window.renderSchedulePreview = function() {
      const course = document.getElementById('scheduleCourse')?.value || 'M.Sc. Computer Science';
      let allConfigs = {};
      try { allConfigs = JSON.parse(localStorage.getItem('cetExamConfig')) || {}; } catch(e){}
      if (allConfigs.examDate !== undefined) allConfigs = { 'M.Sc. Computer Science': allConfigs }; // migrate old format
      
      let config = allConfigs[course];
      if (!config) {
        config = { examType: 'CET Exam', examDate: '', startTime: '', durationMinutes: 60 };
      }
      
      document.getElementById('examType').value = config.examType || 'CET Exam';
      document.getElementById('examDate').value = config.examDate;
      
      if (config.startTime) {
         let [hours, minutes] = config.startTime.split(':');
         let h = parseInt(hours, 10);
         let ampm = h >= 12 ? 'PM' : 'AM';
         h = h % 12;
         h = h ? h : 12; // the hour '0' should be '12'
         
         document.getElementById('examHour').value = h.toString().padStart(2, '0');
         document.getElementById('examMinute').value = minutes;
         document.getElementById('examAmPm').value = ampm;
      }
      
      document.getElementById('examDuration').value = config.durationMinutes;
      
      renderConfigPreview(config, course);
      renderScheduleLogs();
    }
    window.loadScheduleForm = window.renderSchedulePreview;
    
    window.renderConfigPreview = function(config, course = 'M.Sc. Computer Science') {
      if (!config.examDate || !config.startTime) {
        document.getElementById('configPreview').innerHTML = '<p class="text-slate-500 italic text-sm">No complete configuration saved.</p>';
        return;
      }
      
      let status = 'Upcoming';
      let statusColor = 'text-blue-600 bg-blue-100';
      const now = new Date();
      const start = new Date(`${config.examDate}T${config.startTime}`);
      const end = new Date(start.getTime() + config.durationMinutes * 60000);
      
      if (now >= start && now <= end) {
        status = 'Live';
        statusColor = 'text-emerald-600 bg-emerald-100 border-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.5)]';
      } else if (now > end) {
        status = 'Closed';
        statusColor = 'text-red-600 bg-red-100';
      }

      document.getElementById('configPreview').innerHTML = `
        <div class="flex justify-between items-center mb-4">
          <span class="text-sm font-bold text-slate-500 uppercase tracking-wider">Status</span>
          <span class="px-3 py-1 rounded-full text-xs font-bold border ${statusColor} animate-pulse">${status.toUpperCase()}</span>
        </div>
        <div class="grid grid-cols-2 gap-4 text-sm mt-4">
          <div class="col-span-2"><p class="text-slate-500 mb-1">Course</p><p class="font-bold text-indigo-700 bg-indigo-50 px-2 py-1 inline-block rounded">${course}</p></div>
          <div><p class="text-slate-500 mb-1">Exam Type</p><p class="font-bold text-slate-800">${config.examType || 'CET Exam'}</p></div>
          <div><p class="text-slate-500 mb-1">Date</p><p class="font-bold text-slate-800">${start.toLocaleDateString()}</p></div>
          <div><p class="text-slate-500 mb-1">Duration</p><p class="font-bold text-slate-800">${config.durationMinutes} mins</p></div>
          <div><p class="text-slate-500 mb-1">Start Time</p><p class="font-bold text-slate-800">${start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p></div>
          <div><p class="text-slate-500 mb-1">End Time</p><p class="font-bold text-slate-800">${end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p></div>
        </div>
      `;
      renderScheduleLogs();
    }
    
    window.saveSchedule = async function() {
      const date = document.getElementById('examDate').value;
      
      let hourStr = document.getElementById('examHour').value;
      const minStr = document.getElementById('examMinute').value;
      const ampm = document.getElementById('examAmPm').value;
      
      let h = parseInt(hourStr, 10);
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      const time = h.toString().padStart(2, '0') + ':' + minStr;
      
      const duration = parseInt(document.getElementById('examDuration').value) || 60;
      
      if(!date || !time) {
        showToast('Please select both Date and Start Time', 'error');
        return;
      }
      console.log('[Admin Action] Start: Save exam schedule');
      
      const startObj = new Date(`${date}T${time}`);
      const endObj = new Date(startObj.getTime() + duration * 60000);
      const endTimeStr = endObj.toTimeString().substring(0, 5);
      
      const examType = document.getElementById('examType').value;
      const course = document.getElementById('scheduleCourse')?.value || 'M.Sc. Computer Science';
      const config = {
        examType: examType,
        examDate: date,
        startTime: time,
        endTime: endTimeStr,
        durationMinutes: duration,
        course: course
      };
      
      let allConfigs = {};
      try { allConfigs = JSON.parse(localStorage.getItem('cetExamConfig')) || {}; } catch(e){}
      if (allConfigs.examDate !== undefined) allConfigs = { 'M.Sc. Computer Science': allConfigs };
      allConfigs[course] = config;
      
      localStorage.setItem('cetExamConfig', JSON.stringify(allConfigs));
      // Supabase dual-write: save to exam_config table
      if (supabase) {
        supabase.from('exam_config').select('id').eq('course', course).limit(1).then(({ data }) => {
          const row = { exam_date: date, start_time: time, duration_minutes: duration, is_active: true, course: course };
          if (data && data.length > 0) {
            supabase.from('exam_config').update(row).eq('id', data[0].id)
              .then(({ error }) => { if (error) console.warn('[Admin Action] Failed: Exam config update error:', error.message); else console.log('[Admin Action] Success: Exam config saved to cloud'); });
          } else {
            supabase.from('exam_config').insert(row)
              .then(({ error }) => { if (error) console.warn('[Admin Action] Failed: Exam config insert error:', error.message); else console.log('[Admin Action] Success: Exam config created in cloud'); })
              .catch(err => console.error(err));
          }
        }).catch(err => console.error(err));
      }
      
      showToast('Exam configuration saved securely. Assigning students...', 'success');
      console.log('[Admin Action] Success: Exam schedule saved');
      renderConfigPreview(config, course);
      
      // EXAM AUTOMATION SYSTEM
      showToast('Fetching approved students from database...', 'info');
      let approvedStudents = [];
      let allDbStudents = [];
      
      if (supabase) {
        try {
          const { data, error } = await supabase.from('students').select('*');
          if (error) throw error;
          allDbStudents = data || [];
          approvedStudents = allDbStudents.filter(s => 
             (s.status?.toUpperCase() === 'APPROVED' || s.application_status?.toUpperCase() === 'APPROVED') &&
             s.course_applied === course
          );
        } catch (e) {
          console.error('[Admin Action] Failed to fetch students from DB:', e);
          showToast('Failed to fetch students from DB.', 'error');
          return;
        }
      }

      console.log('--- EXAM NOTIFICATION DIAGNOSTICS ---');
      console.log('Total Applications in DB:', allDbStudents.length);
      console.log('Approved Applications for Course (' + course + '):', approvedStudents.length);
      approvedStudents.forEach(s => {
         console.log(`Student ID: ${s.student_id || s.id} | Name: ${s.full_name} | Email: ${s.email} | Status: ${s.status}`);
      });
      console.log('-------------------------------------');
      
      if (approvedStudents.length === 0) {
        alert('Schedule saved, but no approved students found for course: ' + course);
        return;
      }
      
      let studentsToNotify = approvedStudents;
      const alreadyScheduled = approvedStudents.filter(s => s.exam_status === 'SCHEDULED' || s.examStatus === 'SCHEDULED');
      
      if (alreadyScheduled.length > 0 && alreadyScheduled.length === approvedStudents.length) {
         if (!confirm(`All ${approvedStudents.length} approved students are ALREADY scheduled for this course.\n\nDo you want to re-send the exam schedule email to EVERYONE? (Use this only if you changed the exam time).`)) {
             alert('Schedule saved successfully. No duplicate emails sent.');
             return;
         }
      } else if (alreadyScheduled.length > 0) {
         if (confirm(`You have ${approvedStudents.length} approved students, but ${alreadyScheduled.length} of them ALREADY received the schedule email.\n\nClick OK to ONLY send emails to the newly approved students.\nClick Cancel to re-send the email to EVERYONE.`)) {
             studentsToNotify = approvedStudents.filter(s => s.exam_status !== 'SCHEDULED' && s.examStatus !== 'SCHEDULED');
         }
      }

      if (studentsToNotify.length === 0) {
        return; // Already alerted above
      }
      
      let emailsPromises = [];
      let emailsFound = 0;
      
      studentsToNotify.forEach(st => {
         // Generate hall ticket ID
         const htId = st.hallTicketId || ('HT-' + (st.student_id || st.id) + '-' + Date.now());
         
         // Send automated email to every approved student (no skipping)
         if (st.email) {
            emailsFound++;
            const p = import('../js/email-service.js').then(({ default: EmailSvc }) => {
              const portalUrl = window.location.origin + '/student/login.html';
              const examUrl = window.location.origin + '/exam/index.html';
              
              const tpl = EmailSvc.EmailTemplates.scheduleUpdate(
                 st.full_name || st.name || 'Student', date, time, duration, course, st.student_id || st.id, portalUrl, examUrl, st.email
              );
              
              return window.generateBase64AdmitCard(st, date, time, duration).then(base64Pdf => {
                  let attachments = null;
                  if (base64Pdf) {
                      attachments = [{
                          filename: `CET_AdmitCard_${st.student_id || st.id || 'Student'}.pdf`,
                          content: base64Pdf.split('base64,')[1] || base64Pdf,
                          encoding: 'base64'
                      }];
                  }
                  return EmailSvc.sendEmail(st.email, tpl.subject, tpl.html, attachments).then((success) => {
                 // Store email history in Supabase
                 if (success && supabase) {
                    supabase.from('security_logs').insert({
                       student_id: st.id,
                       student_name: st.full_name || st.name,
                       event_type: 'SCHEDULE_EMAIL_SENT',
                       message: `Exam Notification Sent: ${course} on ${date} at ${time}`
                    }).then(()=>{}).catch(e=>console.warn(e));
                 }
                 return success === true;
              });
            }).catch(e => false);
            emailsPromises.push(p);
         }
      });
      
      // Sync to Supabase in bulk
      if (supabase && studentsToNotify.length > 0) {
         const idsToUpdate = studentsToNotify.map(s => s.id);
         supabase.from('students').update({ exam_status: 'SCHEDULED' }).in('id', idsToUpdate)
           .then(()=>{}).catch(e=>console.warn('Batch exam_status update failed:', e));
      }
      
      // Update local storage arrays for immediate UI feedback
      try {
          let localStudents = DB.getStudents();
          let updated = false;
          localStudents.forEach(ls => {
              if (studentsToNotify.find(as => as.id === ls.supabaseId || as.id === ls.id)) {
                  ls.examStatus = 'SCHEDULED';
                  ls.examDate = date;
                  ls.examTime = time;
                  ls.examDuration = duration;
                  updated = true;
              }
          });
          if (updated) localStorage.setItem('cet_students', JSON.stringify(localStudents));
      } catch(e) {}
      
      invalidateCache();
      
      // Wait for emails to complete and show stats
      showToast('Sending notifications...', 'info');
      Promise.all(emailsPromises).then(results => {
         const sentCount = results.filter(r => r === true).length;
         const failedCount = emailsPromises.length - sentCount;
         alert(`Exam Automation Complete:\n\n- Total Applications in DB: ${allDbStudents.length}\n- Sent to New Students: ${studentsToNotify.length}\n- Valid Emails Found: ${emailsFound}\n- Notification Sent Count: ${sentCount}\n- Failed Email Count: ${failedCount}`);
         
         // Save to log history
         const logMsg = {
           date: new Date().toLocaleString(),
           course: course,
           assigned: studentsToNotify.length,
           sent: sentCount,
           failed: failedCount
         };
         let logs = [];
         try { logs = JSON.parse(localStorage.getItem('cetScheduleLogs')) || []; } catch(e){}
         logs.unshift(logMsg);
         if(logs.length > 50) logs = logs.slice(0,50);
         localStorage.setItem('cetScheduleLogs', JSON.stringify(logs));
         renderScheduleLogs();
      });
    }

    window.renderScheduleLogs = function() {
      let logs = [];
      try { logs = JSON.parse(localStorage.getItem('cetScheduleLogs')) || []; } catch(e){}
      const container = document.getElementById('scheduleLogsContainer');
      if (!container) return;
      
      if (logs.length === 0) {
        container.innerHTML = '<p class="text-sm text-slate-400 italic text-center py-4">No automation logs yet.</p>';
        return;
      }
      
      container.innerHTML = logs.map(l => `
        <div class="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-sm">
          <div class="flex justify-between items-center mb-1">
             <span class="font-bold text-indigo-700">${l.course}</span>
             <span class="text-xs text-slate-500">${l.date}</span>
          </div>
          <div class="grid grid-cols-3 gap-2 mt-2">
             <div class="bg-slate-50 p-2 rounded text-center">
                <div class="text-xs text-slate-500">Assigned</div>
                <div class="font-bold text-slate-800">${l.assigned}</div>
             </div>
             <div class="bg-emerald-50 p-2 rounded text-center">
                <div class="text-xs text-emerald-600">Sent</div>
                <div class="font-bold text-emerald-700">${l.sent}</div>
             </div>
             <div class="bg-red-50 p-2 rounded text-center">
                <div class="text-xs text-red-600">Failed</div>
                <div class="font-bold text-red-700">${l.failed}</div>
             </div>
          </div>
        </div>
      `).join('');
    }

    // sendExamReminders removed as logic is now fully automated inside saveSchedule

    let currentlyViewingSetId = null;
    let editingQuestionId = null;

    window.getQuestionSets = function(courseParam = null) {
      let course = courseParam || document.getElementById('questionsCourse')?.value || 'M.Sc. Computer Science';
      let allSets = {};
      try { allSets = JSON.parse(localStorage.getItem('cetQuestionSets')) || {}; } catch(e){}
      
      if (Array.isArray(allSets)) {
         // migration
         allSets = { 'M.Sc. Computer Science': allSets };
         localStorage.setItem('cetQuestionSets', JSON.stringify(allSets));
      }
      return allSets[course] || [];
    }

    window.saveQuestionSets = function(sets, courseParam = null) {
      let course = courseParam || document.getElementById('questionsCourse')?.value || 'M.Sc. Computer Science';
      let allSets = {};
      try { allSets = JSON.parse(localStorage.getItem('cetQuestionSets')) || {}; } catch(e){}
      if (Array.isArray(allSets)) allSets = { 'M.Sc. Computer Science': allSets };
      
      allSets[course] = sets;
      localStorage.setItem('cetQuestionSets', JSON.stringify(allSets));
      
      // Supabase dual-write: sync question sets
      if (supabase) {
        sets.forEach(set => {
          const row = { name: set.name, is_active: set.isActive || false, questions: set.questions || [], course: course };
          supabase.from('question_sets').upsert({ ...row, id: set.supabaseId || undefined }, { onConflict: 'id' })
            .then(({ error }) => { if (error) console.warn('[Supabase] Question set sync error:', error.message); });
        });
        console.log('[Supabase] Question sets synced to cloud');
      }
    }

    window.createQuestionSet = function() {
      const nameInput = document.getElementById('newSetName');
      const name = nameInput.value.trim();
      if(!name) { alert('Please enter a set name.'); return; }
      
      let sets = getQuestionSets();
      const newSet = {
        id: 'SET_' + Date.now(),
        name: name,
        isActive: sets.length === 0, // auto-activate if it's the first one
        questions: []
      };
      sets.push(newSet);
      saveQuestionSets(sets);
      nameInput.value = '';
      currentlyViewingSetId = newSet.id;
      renderQuestions();
    }

    window.viewSet = function(setId) {
      currentlyViewingSetId = setId;
      renderQuestions();
    }

    window.deleteSet = function(setId) {
      if(!confirm('Are you sure you want to delete this question set?')) return;
      let sets = getQuestionSets();
      sets = sets.filter(s => s.id !== setId);
      saveQuestionSets(sets);
      if(currentlyViewingSetId === setId) currentlyViewingSetId = null;
      renderQuestions();
    }

    window.activateCurrentSet = function() {
      if(!currentlyViewingSetId) return;
      let sets = getQuestionSets();
      sets.forEach(s => s.isActive = (s.id === currentlyViewingSetId));
      saveQuestionSets(sets);
      alert('This set is now Active for the student exam.');
      renderQuestions();
    }

    window.toggleQTypeFields = function() {
      const t = document.getElementById('qType').value;
      
      const elMcqOptions = document.getElementById('mcqOptionsBlock');
      if(t==='mcq_single' || t==='mcq_multi') { 
         elMcqOptions.classList.remove('hidden'); elMcqOptions.classList.add('grid'); 
      } else { 
         elMcqOptions.classList.add('hidden'); elMcqOptions.classList.remove('grid'); 
      }

      document.getElementById('mcqSingleCorrectBlock').classList.toggle('hidden', t!=='mcq_single');
      document.getElementById('mcqMultiCorrectBlock').classList.toggle('hidden', t!=='mcq_multi');
      document.getElementById('shortAnswerBlock').classList.toggle('hidden', t!=='short_answer');
      document.getElementById('wordLimitBlock').classList.toggle('hidden', t!=='descriptive');
    }

    window.editQuestion = function(qId) {
      if(!currentlyViewingSetId) return;
      let sets = getQuestionSets();
      let targetSet = sets.find(s => s.id === currentlyViewingSetId);
      if(!targetSet) return;
      
      let q = targetSet.questions.find(q => q.id === qId);
      if(!q) return;

      editingQuestionId = qId;
      document.getElementById('qType').value = q.type || 'mcq_single';
      document.getElementById('qText').value = q.text;
      document.getElementById('qMarks').value = q.marks;
      document.getElementById('qDifficulty').value = q.difficulty || 'Medium';
      document.getElementById('qSubject').value = q.subject || '';
      document.getElementById('qUnit').value = q.unit || '';
      
      if(q.options && q.options.length === 4) {
         document.getElementById('qOpt0').value = q.options[0];
         document.getElementById('qOpt1').value = q.options[1];
         document.getElementById('qOpt2').value = q.options[2];
         document.getElementById('qOpt3').value = q.options[3];
      }
      
      let correctVal = q.correct !== undefined ? q.correct : '0';
      if (q.correctIndex !== undefined) correctVal = q.correctIndex.toString();
      document.getElementById('qCorrectSingle').value = correctVal;
      
      if(q.correctMulti) {
         document.getElementById('qCorrectMulti0').checked = !!q.correctMulti[0];
         document.getElementById('qCorrectMulti1').checked = !!q.correctMulti[1];
         document.getElementById('qCorrectMulti2').checked = !!q.correctMulti[2];
         document.getElementById('qCorrectMulti3').checked = !!q.correctMulti[3];
      }
      document.getElementById('qCorrectShort').value = q.correctText || '';
      document.getElementById('qWordLimit').value = q.wordLimit || 250;
      
      toggleQTypeFields();

      document.getElementById('btnSaveQuestion').textContent = 'Update Question';
      document.getElementById('btnSaveQuestion').classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
      document.getElementById('btnSaveQuestion').classList.add('bg-emerald-600', 'hover:bg-emerald-700');
      document.getElementById('btnCancelEdit').classList.remove('hidden');
    }

    window.cancelEdit = function() {
      editingQuestionId = null;
      document.getElementById('qType').value = 'mcq_single';
      document.getElementById('qText').value = '';
      document.getElementById('qOpt0').value = '';
      document.getElementById('qOpt1').value = '';
      document.getElementById('qOpt2').value = '';
      document.getElementById('qOpt3').value = '';
      document.getElementById('qCorrectSingle').value = '0';
      document.getElementById('qCorrectMulti0').checked = false;
      document.getElementById('qCorrectMulti1').checked = false;
      document.getElementById('qCorrectMulti2').checked = false;
      document.getElementById('qCorrectMulti3').checked = false;
      document.getElementById('qCorrectShort').value = '';
      document.getElementById('qMarks').value = '1';
      document.getElementById('qDifficulty').value = 'Medium';
      document.getElementById('qSubject').value = '';
      document.getElementById('qUnit').value = '';
      document.getElementById('qWordLimit').value = '250';
      
      toggleQTypeFields();

      document.getElementById('btnSaveQuestion').textContent = 'Save Question';
      document.getElementById('btnSaveQuestion').classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
      document.getElementById('btnSaveQuestion').classList.add('bg-indigo-600', 'hover:bg-indigo-700');
      document.getElementById('btnCancelEdit').classList.add('hidden');
    }

    window.addQuestionToSet = function() {
      if(!currentlyViewingSetId) return;
      const type = document.getElementById('qType').value;
      const text = document.getElementById('qText').value.trim();
      const marks = parseFloat(document.getElementById('qMarks').value) || 1;
      const difficulty = document.getElementById('qDifficulty').value;
      const subject = document.getElementById('qSubject').value.trim();
      const unit = document.getElementById('qUnit').value.trim();

      if(!text) { alert('Question text is required.'); return; }

      let sets = getQuestionSets();
      let targetSet = sets.find(s => s.id === currentlyViewingSetId);
      if(!targetSet) return;

      let qObj = {
         id: editingQuestionId || 'Q_' + Date.now(),
         type: type,
         text: text,
         marks: marks,
         difficulty: difficulty,
         subject: subject,
         unit: unit
      };

      if (type === 'mcq_single') {
         qObj.options = [
            document.getElementById('qOpt0').value.trim(),
            document.getElementById('qOpt1').value.trim(),
            document.getElementById('qOpt2').value.trim(),
            document.getElementById('qOpt3').value.trim()
         ];
         qObj.correct = parseInt(document.getElementById('qCorrectSingle').value);
      } else if (type === 'mcq_multi') {
         qObj.options = [
            document.getElementById('qOpt0').value.trim(),
            document.getElementById('qOpt1').value.trim(),
            document.getElementById('qOpt2').value.trim(),
            document.getElementById('qOpt3').value.trim()
         ];
         qObj.correctMulti = [
            document.getElementById('qCorrectMulti0').checked,
            document.getElementById('qCorrectMulti1').checked,
            document.getElementById('qCorrectMulti2').checked,
            document.getElementById('qCorrectMulti3').checked
         ];
      } else if (type === 'short_answer') {
         qObj.correctText = document.getElementById('qCorrectShort').value.trim();
      } else if (type === 'descriptive') {
         qObj.wordLimit = parseInt(document.getElementById('qWordLimit').value) || 250;
      }

      if (editingQuestionId) {
        let qIndex = targetSet.questions.findIndex(q => q.id === editingQuestionId);
        if (qIndex > -1) {
          targetSet.questions[qIndex] = qObj;
        }
      } else {
        targetSet.questions.push(qObj);
      }

      saveQuestionSets(sets);
      cancelEdit();
      renderQuestions();
    }

    window.deleteQuestionFromSet = function(qId) {
      if(!confirm('Delete this question?')) return;
      let sets = getQuestionSets();
      let targetSet = sets.find(s => s.id === currentlyViewingSetId);
      if(targetSet) {
        targetSet.questions = targetSet.questions.filter(q => q.id !== qId);
        saveQuestionSets(sets);
        renderQuestions();
      }
    }

    window.renderQuestions = function() {
      const sets = getQuestionSets();
      
      // Render Left Panel (Sets List)
      document.getElementById('setsList').innerHTML = sets.map(s => {
        const isViewing = s.id === currentlyViewingSetId;
        const activeBadge = s.isActive ? '<span class="ml-auto text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase border border-emerald-200">Active</span>' : '';
        return `
          <div class="flex items-center gap-2 p-3 rounded-xl border transition cursor-pointer ${isViewing ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:bg-slate-50'}" onclick="viewSet('${s.id}')">
            <div class="flex-1 overflow-hidden">
              <p class="text-sm font-bold text-slate-800 truncate">${s.name}</p>
              <p class="text-xs text-slate-500">${s.questions.length} questions</p>
            </div>
            ${activeBadge}
            <button onclick="event.stopPropagation(); deleteSet('${s.id}')" class="text-slate-400 hover:text-red-500 p-1">🗑️</button>
          </div>
        `;
      }).join('') || '<p class="text-sm text-slate-400 text-center py-4">No sets created yet.</p>';

      // Render Right Panel (Questions in selected set)
      const targetSet = sets.find(s => s.id === currentlyViewingSetId);
      const btnActivate = document.getElementById('btnActivateSet');
      const btnUploadPaper = document.getElementById('btnUploadPaper');
      const addForm = document.getElementById('addQuestionForm');
      const listContainer = document.getElementById('questionsList');

      if (!targetSet) {
        document.getElementById('activeSetTitle').textContent = 'Select a Set';
        document.getElementById('qCountLabel').textContent = '';
        if(btnActivate) btnActivate.classList.add('hidden');
        if(btnUploadPaper) btnUploadPaper.classList.add('hidden');
        addForm.classList.add('hidden');
        listContainer.innerHTML = '<div class="text-center text-slate-400 mt-10 text-sm">Select a question set to upload questions.</div>';
        return;
      }

      document.getElementById('activeSetTitle').textContent = targetSet.name;
      document.getElementById('qCountLabel').textContent = `${targetSet.questions.length} questions in this set.`;
      
      if (targetSet.isActive) {
        if(btnActivate) btnActivate.classList.add('hidden');
      } else {
        if(btnActivate) btnActivate.classList.remove('hidden');
      }
      
      if(btnUploadPaper) btnUploadPaper.classList.remove('hidden');
      addForm.classList.remove('hidden');

      const typeMap = {
         'mcq_single': 'MCQ Single',
         'mcq_multi': 'MCQ Multiple',
         'short_answer': 'Short Answer',
         'descriptive': 'Descriptive',
         'programming': 'Programming',
         'file_upload': 'File Upload'
      };

      listContainer.innerHTML = targetSet.questions.map((q, i) => {
        let detailsHtml = '';
        if(q.type === 'mcq_single') {
           detailsHtml = `<div class="grid grid-cols-2 gap-2 mt-3">${q.options.map((opt, j) => `<p class="text-xs p-2 rounded border ${q.correct === j ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold' : 'bg-slate-50 border-slate-200 text-slate-600'}">${String.fromCharCode(65+j)}. ${opt}</p>`).join('')}</div>`;
        } else if(q.type === 'mcq_multi') {
           detailsHtml = `<div class="grid grid-cols-2 gap-2 mt-3">${q.options.map((opt, j) => `<p class="text-xs p-2 rounded border ${(q.correctMulti && q.correctMulti[j]) ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold' : 'bg-slate-50 border-slate-200 text-slate-600'}">${String.fromCharCode(65+j)}. ${opt}</p>`).join('')}</div>`;
        } else if(q.type === 'short_answer') {
           detailsHtml = `<div class="mt-3 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800"><span class="font-bold">Exact Answer:</span> ${q.correctText}</div>`;
        } else if(q.type === 'descriptive') {
           detailsHtml = `<div class="mt-3 p-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600"><span class="font-bold">Word Limit:</span> ${q.wordLimit || 250} words</div>`;
        }

        return `
        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div class="flex gap-4">
            <div class="w-8 h-8 shrink-0 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-sm">Q${i+1}</div>
            <div class="flex-1">
              <div class="flex justify-between items-start mb-2">
                <div>
                   <p class="text-slate-900 font-medium text-sm leading-snug">${q.text}</p>
                   <p class="text-xs text-slate-400 mt-1">${q.subject ? q.subject + ' • ' : ''}${q.unit ? q.unit + ' • ' : ''}${q.difficulty || 'Medium'}</p>
                </div>
                <div class="flex flex-col items-end gap-1 shrink-0 ml-4">
                   <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">${typeMap[q.type] || 'MCQ Single'}</span>
                   <span class="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold border border-slate-200">${q.marks} Mark(s)</span>
                </div>
              </div>
              ${detailsHtml}
            </div>
            <div class="flex flex-col gap-2 border-l border-slate-100 pl-4 items-center justify-center">
              <button onclick="editQuestion('${q.id}')" class="text-slate-400 hover:text-indigo-600 p-1" title="Edit Question">✏️</button>
              <button onclick="deleteQuestionFromSet('${q.id}')" class="text-slate-400 hover:text-red-500 p-1" title="Delete Question">🗑️</button>
            </div>
          </div>
        </div>
        `;
      }).join('') || '<p class="text-sm text-slate-400 text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">No questions added yet. Use the form above.</p>';
    }

    window._pendingReminderEmails = [];

    window.sendExamReminders = async function() {
      if (window._pendingReminderEmails.length === 0) {
         showToast('All students have started the exam! No reminders to send.', 'success');
         return;
      }
      
      const configObj = JSON.parse(localStorage.getItem('cetExamConfig')) || {};
      const courseConfig = configObj['M.Sc. Computer Science'] || configObj;
      if (!courseConfig.examDate || !courseConfig.startTime) {
         showToast('Exam date/time not configured yet. Go to Exam Settings.', 'error');
         return;
      }
      
      if(!confirm(`Send URGENT reminder emails to ${window._pendingReminderEmails.length} students who have NOT started the exam yet?`)) return;
      
      showToast(`Sending ${window._pendingReminderEmails.length} reminder emails. Please wait...`, 'info');
      
      let emailsPromises = [];
      window._pendingReminderEmails.forEach(st => {
         if (st.email) {
            const p = import('../js/email-service.js').then(({ default: EmailSvc }) => {
              const portalUrl = window.location.origin + '/student/login.html';
              const examUrl = window.location.origin + '/exam/index.html';
              const tpl = EmailSvc.EmailTemplates.scheduleUpdate(
                 st.name || st.fullName || 'Student', 
                 courseConfig.examDate, 
                 courseConfig.startTime, 
                 courseConfig.durationMinutes || 60, 
                 courseConfig.course || 'M.Sc. Computer Science', 
                 st.studentId || st.id, 
                 portalUrl, examUrl, st.email
              );
              // Prefix subject with URGENT
              tpl.subject = "URGENT REMINDER: " + tpl.subject;
              return EmailSvc.sendEmail(st.email, tpl.subject, tpl.html).then((success) => success === true);
            }).catch(e => false);
            emailsPromises.push(p);
         }
      });
      
      Promise.all(emailsPromises).then(results => {
         const sentCount = results.filter(r => r === true).length;
         showToast(`Successfully sent ${sentCount} URGENT reminder emails!`, 'success');
      });
    };

    window._monitoringFilter = 'ALL';
    
    window.setMonFilter = function(f) {
      window._monitoringFilter = f;
      window.renderMonitoring();
      showToast(`Filtered by: ${f.replace('_', ' ')}`, 'info');
    };

    window.massResetExams = async function() {
      if(!confirm("⚠️ WARNING!\n\nAre you sure you want to reset ALL exams?\n\nThis will clear the 'Completed' status for all students and allow them to take a fresh exam.\n\nOnly do this if you have finished the Demo Test and want to prepare for the Final Test!")) return;
      
      const btn = document.querySelector('button[onclick="massResetExams()"]');
      if (btn) { btn.disabled = true; btn.textContent = 'Resetting...'; }
      
      showToast('Resetting all students to SCHEDULED...', 'info');
      
      try {
        if (supabase) {
           const { error } = await supabase.from('students').update({
             exam_status: 'SCHEDULED',
             has_attempted: false,
             active_violations: 0,
             lock_reason: null
           }).in('application_status', ['APPROVED']); // update all approved students
           
           if (error) {
              console.warn('[Admin] Reset error:', error);
              showToast('Reset failed: ' + error.message, 'error');
           } else {
              // Also clear local locked exams
              LocalDB.set('cetLockedExams', []);
              showToast('✅ All exams successfully reset!', 'success');
              renderMonitoring();
              renderStudents();
           }
        }
      } catch(e) {
         showToast('Reset failed.', 'error');
      }
      
      if (btn) { btn.disabled = false; btn.innerHTML = '⚠️ Mass Reset Exams'; }
    };
    
    window.exportOfflineData = async function() {
      try {
        if (!supabase) return alert('Database client not found.');
        const client = supabase;
        
        const { data: students, error: err1 } = await client.from('students').select('*');
        if (err1) throw err1;
        
        const { data: examConfig, error: err2 } = await client.from('exam_config').select('*');
        if (err2) throw err2;
        
        const { data: questionSets, error: err3 } = await client.from('question_sets').select('*');
        if (err3) throw err3;
        
        const offlineData = {
          students: students || [],
          exam_config: examConfig || [],
          question_sets: questionSets || [],
          exam_attempts: [],
          exam_results: [],
          security_logs: []
        };
        
        const blob = new Blob([JSON.stringify(offlineData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'offline_data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('✅ Offline Data Downloaded!\n\nPlease place this "offline_data.json" file in your CET EXAM ONLINE folder before starting the offline server.');
      } catch (err) {
        console.error('Export error:', err);
        alert('Failed to export data: ' + err.message);
      }
    };

    window.renderMonitoring = async function() {
      let stats = { total: 0, notstarted: 0, progress: 0, completed: 0, warnings: 0, locked: 0 };
      let studentsList = [];
      window._pendingReminderEmails = [];

      try {
        if (supabase) {
          // Fetch from Supabase
          const { data, error } = await supabase.from('students')
            .select('student_id, full_name, email, exam_status, active_violations, has_attempted');
            
          if (!error && data) {
             studentsList = data.map(s => ({
                studentId: s.student_id,
                name: s.full_name,
                email: s.email,
                status: s.exam_status || (s.has_attempted ? 'COMPLETED' : 'PENDING'),
                violations: s.active_violations || 0
             }));
          }
        }
        
        // Fallback or combine with localStorage if empty
        if (studentsList.length === 0) {
          const localStudents = DB.getStudents() || [];
          studentsList = localStudents.map(s => ({
            studentId: s.studentId,
            name: s.fullName,
            email: s.email,
            status: s.examStatus || (s.hasAttempted ? 'COMPLETED' : 'PENDING'),
            violations: s.violations || 0
          }));
        }

        let html = '';
        studentsList.forEach(s => {
           stats.total++;
           
           let isNotStarted = (!s.status || s.status === 'PENDING' || s.status === 'NOT_STARTED');
           let isInProgress = (s.status === 'IN_PROGRESS' || s.status === 'SCHEDULED');
           let isCompleted = (s.status === 'COMPLETED');
           
           if (isNotStarted) {
               stats.notstarted++;
               if (s.email) window._pendingReminderEmails.push(s);
           }
           
           if (isInProgress) stats.progress++;
           if (isCompleted) stats.completed++;
           if (s.status === 'LOCKED' || s.status === 'TERMINATED') stats.locked++;
           stats.warnings += (s.violations || 0);

           // Filter Check
           if (window._monitoringFilter === 'NOT_STARTED' && !isNotStarted) return;
           if (window._monitoringFilter === 'IN_PROGRESS' && !isInProgress) return;
           if (window._monitoringFilter === 'COMPLETED' && !isCompleted) return;
           if (window._monitoringFilter === 'WARNINGS' && (s.violations || 0) === 0) return;

           let statusBadge = '';
           if (isInProgress) statusBadge = '<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">In Progress</span>';
           else if (isCompleted) statusBadge = '<span class="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">Completed</span>';
           else if (s.status === 'LOCKED') statusBadge = '<span class="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">Locked</span>';
           else statusBadge = `<span class="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold">${s.status || 'Pending'}</span>`;

           html += `
             <tr class="hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors">
               <td class="p-4 font-medium text-slate-800">${s.name}</td>
               <td class="p-4 font-mono text-xs text-indigo-600">${s.studentId || 'N/A'}</td>
               <td class="p-4">${statusBadge}</td>
               <td class="p-4 text-slate-600 font-mono text-xs">--:--</td>
               <td class="p-4">
                 ${s.violations > 0 ? `<span class="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs font-bold">${s.violations} Warnings</span>` : '<span class="text-slate-400 text-xs">None</span>'}
               </td>
               <td class="p-4">
                 <span class="flex items-center gap-1 ${(isCompleted||isNotStarted) ? 'text-slate-400' : 'text-emerald-600'} text-xs font-bold">
                    <span class="w-2 h-2 rounded-full ${(isCompleted||isNotStarted) ? 'bg-slate-300' : 'bg-emerald-500 animate-pulse'}"></span> 
                    ${(isCompleted||isNotStarted) ? 'Offline' : 'Active'}
                 </span>
               </td>
               <td class="p-4 text-right">
                 ${s.status === 'LOCKED' ? `<button onclick="unlockExam('${s.studentId}')" class="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-bold px-3 py-1.5 rounded transition">Unlock</button>` : ''}
               </td>
             </tr>
           `;
        });

        if (html === '') {
           html = `<tr><td colspan="7" class="p-8 text-center text-slate-400">No students found for filter: ${window._monitoringFilter.replace('_', ' ')}</td></tr>`;
        }

        document.getElementById('mon-total').textContent = stats.total;
        document.getElementById('mon-notstarted').textContent = stats.notstarted;
        document.getElementById('mon-progress').textContent = stats.progress;
        document.getElementById('mon-completed').textContent = stats.completed;
        document.getElementById('mon-warnings').textContent = stats.warnings;
        document.getElementById('monitoringTableBody').innerHTML = html;

      } catch(e) {
        console.error('[Admin] Monitoring error:', e);
      }
    }

    window.renderResults = function() {
      let res = [];
      try { res = JSON.parse(localStorage.getItem('cetExamResults')) || []; } catch(e){}
      
      // Do not inject dummy data, use actual DB/localstorage records.
      
      // Deduplicate results by studentId, keeping only the most recently submitted
      res.sort((a, b) => {
          const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
          const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
          return timeB - timeA;
      });
      const uniqueMap = new Map();
      res.forEach(r => {
          const key = r.studentId || (r.id ? String(r.id) : Math.random());
          if (!uniqueMap.has(key)) {
              uniqueMap.set(key, r);
          }
      });
      res = Array.from(uniqueMap.values());
      
      // Calculate Course Ranks
      const courseGroups = {};
      res.forEach(r => {
         const c = r.course || 'M.Sc Computer Science';
         if (!courseGroups[c]) courseGroups[c] = [];
         courseGroups[c].push(r);
      });
      
      Object.values(courseGroups).forEach(group => {
         group.sort((a, b) => {
            if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
            const percentA = a.total ? (a.score / a.total) : 0;
            const percentB = b.total ? (b.score / b.total) : 0;
            if (percentB !== percentA) return percentB - percentA;
            const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
            const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
            return timeA - timeB; // Earliest submission first
         });
         group.forEach((r, i) => r.courseRank = i + 1);
      });

      // Overall Sort by score descending to display in table
      res.sort((a, b) => {
         if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
         const percentA = a.total ? (a.score / a.total) : 0;
         const percentB = b.total ? (b.score / b.total) : 0;
         if (percentB !== percentA) return percentB - percentA;
         const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
         const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
         return timeA - timeB;
      });

      // Filter Logic
      const filterSearch = (document.getElementById('resFilterSearch')?.value || '').toLowerCase();
      const filterCat = document.getElementById('resFilterCategory')?.value || '';
      const filterCourse = document.getElementById('resFilterCourse')?.value || '';
      const filterStatus = document.getElementById('resFilterStatus')?.value || '';

      const filteredRes = res.filter(r => {
        const matchSearch = !filterSearch || (r.studentId || '').toLowerCase().includes(filterSearch) || (r.name || r.studentName || '').toLowerCase().includes(filterSearch);
        const matchCat = !filterCat || r.category === filterCat;
        const matchCourse = !filterCourse || r.course === filterCourse;
        const matchStatus = !filterStatus || r.status === filterStatus;
        return matchSearch && matchCat && matchCourse && matchStatus;
      });

      // Update Summary Cards
      document.getElementById('resCardTotal').innerText = res.length;
      document.getElementById('resCardAppeared').innerText = res.length;
      const passedCount = res.filter(r => r.status === 'Passed' || (r.score/r.total >= 0.4)).length;
      document.getElementById('resCardPassed').innerText = passedCount;
      document.getElementById('resCardFailed').innerText = res.length - passedCount;
      const highestScore = Math.max(...res.map(r => r.score || 0), 0);
      document.getElementById('resCardHighest').innerText = highestScore;

      // Store globally so onclick handlers can access by index
      window._allResults = filteredRes;

      // Render Table
      document.getElementById('resultsTableBody').innerHTML = filteredRes.map((r, idx) => {
        const percent = r.total ? ((r.score / r.total) * 100).toFixed(2) : 0;
        const displayStatus = r.status || (percent >= 40 ? 'Passed' : 'Failed');
        let statusBadge = `<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-200">${displayStatus}</span>`;
        if (displayStatus === 'Passed') statusBadge = `<span class="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold border border-emerald-200">Passed</span>`;
        else if (displayStatus === 'Failed') statusBadge = `<span class="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold border border-red-200">Failed</span>`;
        else if (displayStatus === 'Completed') statusBadge = `<span class="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold border border-indigo-200">Completed</span>`;

        return `
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="p-4 font-mono font-bold text-sm text-indigo-600">${r.studentId}</td>
          <td class="p-4 font-medium text-slate-900 text-sm">${r.name || r.studentName || 'Unknown'}</td>
          <td class="p-4 text-sm text-slate-600">${r.course || 'M.Sc Computer Science'}</td>
          <td class="p-4 text-sm font-bold text-slate-500">${r.category || 'OPEN'}</td>
          <td class="p-4 font-bold text-lg text-slate-800">${r.score || 0} <span class="text-xs text-slate-400 font-normal">/ ${r.totalQuestions || r.total || 0}</span></td>
          <td class="p-4 text-sm font-bold text-slate-700">${percent}%</td>
          <td class="p-4 text-sm font-bold text-slate-900">#${r.courseRank || idx+1}</td>
          <td class="p-4">${statusBadge}</td>
          <td class="p-4 text-slate-500 text-sm">${r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '--'}</td>
          <td class="p-4" style="white-space:nowrap;">
            <div style="display:flex;gap:6px;justify-content:flex-end;pointer-events:auto;position:relative;z-index:10;">
              <button type="button" onclick="viewResultModal(${idx})" style="cursor:pointer;pointer-events:auto;position:relative;z-index:10;" class="text-indigo-600 font-bold text-xs bg-indigo-50 px-2 py-1 rounded border border-indigo-100 hover:bg-indigo-100">View Result</button>
              <button type="button" onclick="viewAnswersModal(${idx})" style="cursor:pointer;pointer-events:auto;position:relative;z-index:10;" class="text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded border border-emerald-100 hover:bg-emerald-100">View Answers</button>
              <button type="button" onclick="downloadStudentPDF(${idx})" style="cursor:pointer;pointer-events:auto;position:relative;z-index:10;" class="text-slate-600 font-bold text-xs bg-slate-100 px-2 py-1 rounded border border-slate-200 hover:bg-slate-200">Download PDF</button>
              <button type="button" onclick="deleteResultModal(${idx})" style="cursor:pointer;pointer-events:auto;position:relative;z-index:10;" class="text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded border border-red-100 hover:bg-red-100">Delete</button>
            </div>
        </tr>
      `}).join('') || '<tr><td colspan="10" class="p-8 text-center text-slate-500">No results found matching filters.</td></tr>';
    }

    window.deleteResultModal = async function(idx) {
        if (!confirm("Are you sure you want to delete this result? This will reset the student's exam status and allow them to take the exam again.")) return;
        
        const r = window._allResults && window._allResults[idx];
        if (!r) { alert('No result data found.'); return; }
        
        let allResults = JSON.parse(localStorage.getItem('cetExamResults')) || [];
        
        // Remove ALL results matching this student ID from local storage so they don't reappear
        allResults = allResults.filter(res => res.studentId !== r.studentId);
        localStorage.setItem('cetExamResults', JSON.stringify(allResults));
        
        let localStudents = JSON.parse(localStorage.getItem('cet_students')) || [];
        let stIndex = localStudents.findIndex(s => s.studentId === r.studentId || s.id === r.studentId);
        if (stIndex !== -1) {
            localStudents[stIndex].exam_status = 'Pending Exam';
            localStudents[stIndex].hasTakenExam = false;
            localStudents[stIndex].exam_locked = false;
            localStudents[stIndex].total_warnings = 0;
            localStorage.setItem('cet_students', JSON.stringify(localStudents));
        }

        if (window._currentApplicationsData) {
            let appIndex = window._currentApplicationsData.findIndex(app => app.student_id === r.studentId || app.studentId === r.studentId);
            if (appIndex !== -1) {
                window._currentApplicationsData[appIndex].exam_status = 'Pending Exam';
                window._currentApplicationsData[appIndex].hasTakenExam = false;
                window._currentApplicationsData[appIndex].exam_locked = false;
            }
        }
        
        if (window.supabase) {
            try {
                // Delete from exam_results table
                if (r.id && typeof r.id === 'string' && r.id.length > 5) {
                    await window.supabase.from('exam_results').delete().eq('id', r.id);
                } else {
                    await window.supabase.from('exam_results').delete().eq('student_id', r.studentId);
                }
                
                // Update applications table
                const { data: apps } = await window.supabase.from('applications').select('id').eq('student_id', r.studentId);
                if (apps && apps.length > 0) {
                   await window.supabase.from('applications')
                      .update({ 
                          exam_status: 'Pending Exam', 
                          hasTakenExam: false,
                          exam_locked: false,
                          total_warnings: 0
                      })
                      .eq('student_id', r.studentId);
                }
            } catch (err) {
                console.error('Error deleting from supabase:', err);
            }
        }
        
        renderResults();
        if (typeof renderStudents === 'function') renderStudents();
        showToast('Result deleted successfully. Student can now retake the exam.', 'success');
    };

    window.publishGlobalResults = async function() {
      const filterCourse = document.getElementById('resFilterCourse')?.value || '';
      if(!confirm(`Are you sure you want to publish results${filterCourse ? ' for ' + filterCourse : ''}? This will make them visible to students and send email notifications.`)) return;
      
      let resList = JSON.parse(localStorage.getItem('cetExamResults')) || [];
      if (resList.length === 0) {
         showToast('No results to publish.', 'error'); return;
      }
      
      const allStudents = JSON.parse(localStorage.getItem('cet_students')) || [];
      let resultsToPublish = filterCourse ? resList.filter(r => r.course === filterCourse || r.courseApplied === filterCourse) : resList;
      if (resultsToPublish.length === 0) {
         showToast('No results found for selected course.', 'error'); return;
      }
      
      const courseGroups = {};
      resultsToPublish.forEach(r => {
         const course = r.course || r.courseApplied || 'M.Sc. Computer Science';
         if (!courseGroups[course]) courseGroups[course] = [];
         courseGroups[course].push(r);
      });
      
      const SupaDB = (await import('../js/supabase-db.js')).default;
      const EmailSvc = (await import('../js/email-service.js')).default;
      
      document.getElementById('emailDeliveryPanel').classList.remove('hidden');
      const emailProgressText = document.getElementById('emailProgressText');
      const emailProgressBar = document.getElementById('emailProgressBar');
      const emailStatusDetail = document.getElementById('emailStatusDetail');
      
      let totalEmails = 0;
      let sentEmails = 0;
      let rankUpdates = [];
      let emailsPromises = [];
      
      Object.keys(courseGroups).forEach(courseName => {
         let group = courseGroups[courseName];
         group.sort((a,b) => (b.score||0) - (a.score||0));
         totalEmails += group.length;
         
         group.forEach((r, idx) => {
            r.result_published = true;
            const st = allStudents.find(s => s.id === r.studentId || s.studentId === r.studentId);
            
            const overallRank = idx + 1;
            let catRank = 'N/A';
            let stCat = 'OPEN';
            
            if (st) {
               stCat = st.category || st.academicDetails?.category || 'OPEN';
               const catResults = group.filter(cr => {
                  const cs = allStudents.find(s => s.id === cr.studentId || s.studentId === cr.studentId);
                  const csCat = cs?.category || cs?.academicDetails?.category || 'OPEN';
                  return csCat === stCat;
               });
               const catIdx = catResults.findIndex(cr => cr.studentId === r.studentId);
               catRank = catIdx !== -1 ? catIdx + 1 : 'N/A';
            }
            
            if (r.studentId) {
               rankUpdates.push({ student_id: r.studentId, overall_rank: overallRank, category_rank: catRank !== 'N/A' ? catRank : null });
            }
            
            if (st && st.email) {
               const url = window.location.origin + '/student/login.html';
               const html = `
                 <div style="font-family:sans-serif; max-width:600px; margin:0 auto; padding:20px; border:1px solid #eee; border-radius:10px;">
                   <h2 style="color:#4f46e5; text-align:center;">CET Exam Result Published</h2>
                   <p>Dear <strong>${r.name || r.studentName}</strong>,</p>
                   <p>Your CET Exam results for <strong>${courseName}</strong> have been officially published by the administration.</p>
                   <div style="background:#f8fafc; padding:15px; border-radius:8px; margin:20px 0;">
                     <p><strong>Student ID:</strong> ${r.studentId}</p>
                     <p><strong>Score:</strong> ${r.score} / ${r.totalQuestions || r.total || 0}</p>
                     <p><strong>Overall Rank:</strong> #${overallRank}</p>
                     <p><strong>Category Rank (${stCat}):</strong> #${catRank}</p>
                   </div>
                   <div style="text-align:center; margin-top:30px;">
                     <a href="${url}" style="background:#4f46e5; color:white; padding:12px 24px; text-decoration:none; border-radius:6px; font-weight:bold;">View Scorecard Dashboard</a>
                   </div>
                 </div>
               `;
               const p = EmailSvc.sendEmail(st.email, "CET Exam Result Published - " + courseName, html).then(() => {
                 sentEmails++;
                 emailProgressText.textContent = `${sentEmails} / ${totalEmails}`;
                 emailProgressBar.style.width = `${(sentEmails / totalEmails) * 100}%`;
                 emailStatusDetail.textContent = `Sent to ${st.email}`;
               }).catch(e => console.error("Email fail", e));
               emailsPromises.push(p);
            }
         });
      });
      
      localStorage.setItem('cetExamResults', JSON.stringify(resList));
      
      let cetResults = JSON.parse(localStorage.getItem('cet_results')) || [];
      cetResults.forEach(cr => {
         const matchingPublished = resultsToPublish.find(r => r.studentId === cr.studentId && (r.course === cr.courseApplied || r.course === cr.course || r.courseApplied === cr.courseApplied));
         if (matchingPublished) {
            cr.result_published = true;
         }
      });
      localStorage.setItem('cet_results', JSON.stringify(cetResults));

      emailStatusDetail.textContent = 'Updating database...';
      const isPublished = await SupaDB.setResultsPublished(true);
      if (rankUpdates.length > 0) {
         await SupaDB.updateResultRanks(rankUpdates);
      }
      
      if (!isPublished) {
         showToast('Failed to update Supabase, but local records are updated.', 'error');
      }

      showToast('Publishing results and sending emails...', 'success');
      Promise.allSettled(emailsPromises).then(() => {
         emailStatusDetail.textContent = 'All emails processed!';
         showToast('Results published successfully!', 'success');
         document.getElementById('btnPublish').classList.add('hidden');
         document.getElementById('btnUnpublish').classList.remove('hidden');
         renderResults();
         setTimeout(() => { document.getElementById('emailDeliveryPanel').classList.add('hidden'); }, 3000);
      });
    }

    window.unpublishGlobalResults = async function() {
      if(!confirm(`Are you sure you want to unpublish results? Students will no longer be able to view their results.`)) return;
      
      let resList = JSON.parse(localStorage.getItem('cetExamResults')) || [];
      resList.forEach(r => r.result_published = false);
      localStorage.setItem('cetExamResults', JSON.stringify(resList));
      
      let cetResults = JSON.parse(localStorage.getItem('cet_results')) || [];
      cetResults.forEach(r => r.result_published = false);
      localStorage.setItem('cet_results', JSON.stringify(cetResults));

      const SupaDB = (await import('../js/supabase-db.js')).default;
      const isUpdated = await SupaDB.setResultsPublished(false);
      
      if (isUpdated) {
         showToast('Results unpublished successfully!', 'success');
         document.getElementById('btnUnpublish').classList.add('hidden');
         document.getElementById('btnPublish').classList.remove('hidden');
      } else {
         showToast('Failed to unpublish on Supabase, but local state updated.', 'error');
      }
      renderResults();
    }

    window.generateCategoryRankList = async function() {
      let resList = window._allResults || JSON.parse(localStorage.getItem('cetExamResults')) || [];
      if (resList.length === 0) {
        showToast('No results available to generate rank list', 'error'); return;
      }
      
      const filterCat = document.getElementById('resFilterCategory')?.value || '';
      if (!filterCat) {
        showToast('Please select a Category from the dropdown filter first.', 'error'); return;
      }
      
      let sorted = [...resList].sort((a,b) => {
         if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
         const percentA = a.total ? (a.score / a.total) : 0;
         const percentB = b.total ? (b.score / b.total) : 0;
         if (percentB !== percentA) return percentB - percentA;
         const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
         const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
         return timeA - timeB;
      });
      
      if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast('PDF library not loaded yet', 'error'); return;
      }
      
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');
      
      doc.setFontSize(22);
      doc.setTextColor(30, 58, 138);
      doc.text("CET EXAM ONLINE", 105, 20, { align: "center" });
      
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(`Official Rank List - ${filterCat} Category`, 105, 30, { align: "center" });
      
      const config = JSON.parse(localStorage.getItem('cetExamConfig')) || {};
      if (config.examDate) {
         doc.setFontSize(12);
         doc.text(`Exam Date: ${new Date(config.examDate).toLocaleDateString()}`, 105, 38, { align: "center" });
      }
      
      const tableData = sorted.map((r, idx) => [
        idx + 1,
        r.studentId,
        r.name || r.studentName,
        r.score || 0,
        r.totalQuestions || r.total || 0,
        r.status || (r.score >= (0.4 * (r.total||100)) ? 'Passed' : 'Failed')
      ]);
      
      doc.autoTable({
        startY: 45,
        head: [['Cat. Rank', 'Student ID', 'Name', 'Score', 'Total', 'Status']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 138] },
        styles: { fontSize: 10, cellPadding: 3 }
      });
      
      doc.save(`CET_Category_Merit_List_${filterCat}_${new Date().toISOString().split('T')[0]}.pdf`);
      showToast('Category Merit List downloaded successfully', 'success');
    }

    window.generateRankList = async function() {
      let resList = window._allResults || JSON.parse(localStorage.getItem('cetExamResults')) || [];
      if (resList.length === 0) {
        showToast('No results available to generate rank list', 'error');
        return;
      }
      
      let sorted = [...resList].sort((a,b) => {
         if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
         const percentA = a.total ? (a.score / a.total) : 0;
         const percentB = b.total ? (b.score / b.total) : 0;
         if (percentB !== percentA) return percentB - percentA;
         const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
         const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
         return timeA - timeB;
      });
      
      if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast('PDF library not loaded yet', 'error');
        return;
      }
      
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');
      
      doc.setFontSize(22);
      doc.setTextColor(30, 58, 138); // blue
      doc.text("CET EXAM ONLINE", 105, 20, { align: "center" });
      
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text("Official Rank List", 105, 30, { align: "center" });
      
      const config = JSON.parse(localStorage.getItem('cetExamConfig')) || {};
      if (config.examDate) {
         doc.setFontSize(12);
         doc.text(`Exam Date: ${new Date(config.examDate).toLocaleDateString()}`, 105, 38, { align: "center" });
      }
      
      if (typeof doc.autoTable !== 'function') {
         showToast("PDF AutoTable plugin not loaded", "error");
         return;
      }
      
      let tableData = sorted.map((r, i) => [
         i + 1,
         r.studentId,
         r.name || r.studentName || 'Unknown',
         r.course || 'M.Sc Computer Science',
         `${r.score} / ${r.totalQuestions || r.total || 0}`,
         ((r.score / (r.totalQuestions || r.total || 1)) * 100).toFixed(2) + '%'
      ]);
      
      doc.autoTable({
         startY: 45,
         head: [['Rank', 'CET ID', 'Student Name', 'Course', 'Score', 'Percentage']],
         body: tableData,
         theme: 'grid',
         headStyles: { fillColor: [30, 58, 138], textColor: 255 },
      });
      
      doc.save(`CET_RankList.pdf`);
      showToast('Rank List PDF generated successfully', 'success');
      console.log('[Admin Action] Success: Rank List generated');
    }

    window.handleResultsDownload = function(action) {
      if (!action) return;
      if (action === 'pdf_overall') {
        window.generateRankList();
      } else if (action === 'pdf_msc_cs') {
        window.generateCourseRankList('M.Sc. Computer Science');
      } else if (action === 'pdf_msc_ca') {
        window.generateCourseRankList('M.Sc. Computer Application');
      } else if (action === 'excel' || action === 'csv') {
        showToast('Feature coming soon', 'info');
      }
    };

    window.generateCourseRankList = async function(courseName) {
      let resList = window._allResults || JSON.parse(localStorage.getItem('cetExamResults')) || [];
      resList = resList.filter(r => (r.course === courseName || r.courseApplied === courseName));
      
      if (resList.length === 0) {
        showToast(`No results available for ${courseName}`, 'error');
        return;
      }
      
      let sorted = [...resList].sort((a,b) => {
         if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
         const percentA = a.total ? (a.score / a.total) : 0;
         const percentB = b.total ? (b.score / b.total) : 0;
         if (percentB !== percentA) return percentB - percentA;
         const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
         const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
         return timeA - timeB;
      });
      
      if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast('PDF library not loaded yet', 'error'); return;
      }
      
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');
      
      doc.setFontSize(22);
      doc.setTextColor(30, 58, 138);
      doc.text("CET EXAM ONLINE", 105, 20, { align: "center" });
      
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(`Official Rank List - ${courseName}`, 105, 30, { align: "center" });
      
      const config = JSON.parse(localStorage.getItem('cetExamConfig')) || {};
      if (config.examDate) {
         doc.setFontSize(12);
         doc.text(`Exam Date: ${new Date(config.examDate).toLocaleDateString()}`, 105, 38, { align: "center" });
      }
      
      let tableData = sorted.map((r, i) => [
         i + 1,
         r.studentId,
         r.name || r.studentName || 'Unknown',
         `${r.score} / ${r.totalQuestions || r.total || 0}`,
         ((r.score / (r.totalQuestions || r.total || 1)) * 100).toFixed(2) + '%'
      ]);
      
      doc.autoTable({
         startY: 45,
         head: [['Rank', 'CET ID', 'Student Name', 'Score', 'Percentage']],
         body: tableData,
         theme: 'grid',
         headStyles: { fillColor: [30, 58, 138], textColor: 255 },
      });
      
      const fileNameSafe = courseName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      doc.save(`CET_Merit_List_${fileNameSafe}.pdf`);
      showToast(`${courseName} Rank List generated`, 'success');
    }


    let currentEvalResultId = null;
    let tempManualMarks = {};

    window.evaluateResult = function(resId) {
       let resList = JSON.parse(localStorage.getItem('cetExamResults')) || [];
       let res = resList.find(x => x.id === resId);
       if(!res) return;

       currentEvalResultId = resId;
       document.getElementById('evalStudentName').textContent = `${res.name} (${res.studentId})`;

       let sets = getQuestionSets();
       let activeSet = sets.find(s => s.isActive) || sets[0];
       if(!activeSet) return alert("No active questions set found for evaluation.");

       let html = '';
       let manualTotal = 0;

       activeSet.questions.forEach((q, i) => {
          let ans = (res.answers && res.answers[i] !== undefined) ? res.answers[i] : null;
          let ansDisplay = '';
          let requiresManual = false;

          if(q.type === 'mcq_single' || !q.type) {
             ansDisplay = ans !== null ? `Option ${String.fromCharCode(65+parseInt(ans))}: ${q.options[ans]}` : 'Not answered';
          } else if(q.type === 'mcq_multi') {
             ansDisplay = (ans && ans.length) ? ans.map(idx => `Option ${String.fromCharCode(65+parseInt(idx))}`).join(', ') : 'Not answered';
          } else if(q.type === 'short_answer') {
             ansDisplay = ans !== null ? String(ans) : 'Not answered';
          } else if(q.type === 'descriptive' || q.type === 'programming') {
             ansDisplay = ans !== null ? `<pre class="bg-slate-100 p-3 border border-slate-200 rounded text-xs whitespace-pre-wrap mt-2 text-slate-700 font-mono">${ans}</pre>` : 'Not answered';
             requiresManual = true;
          } else if(q.type === 'file_upload') {
             ansDisplay = ans !== null ? `Uploaded File: ${ans.name}` : 'Not answered';
             requiresManual = true;
          }

          let existingManual = (res.manualMarks && res.manualMarks[i]) ? res.manualMarks[i] : 0;
          manualTotal += existingManual;

          html += `
            <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
               <div class="flex justify-between items-start mb-3">
                  <h4 class="font-semibold text-slate-800 text-sm leading-snug">Q${i+1}. ${q.text}</h4>
                  <span class="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold border border-slate-200 shrink-0 ml-4">${q.marks} Mark(s)</span>
               </div>
               <div class="mb-4 text-sm text-slate-600">
                  <span class="font-bold text-slate-800">Student Answer:</span> <span class="${ans === null ? 'text-slate-400 italic' : ''}">${ansDisplay}</span>
               </div>
               ${requiresManual ? `
                 <div class="flex items-center gap-3 bg-indigo-50 p-3 rounded-lg border border-indigo-100 mt-4">
                    <label class="text-xs font-bold text-indigo-700 uppercase tracking-wider">Manual Marks:</label>
                    <input type="number" max="${q.marks}" min="0" value="${existingManual}" onchange="updateManualMark(${i}, this.value)" class="w-20 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:border-indigo-500" />
                 </div>
               ` : ''}
            </div>
          `;
       });

       tempManualMarks = {};
       document.getElementById('evalQuestionsList').innerHTML = html;
       document.getElementById('evalAutoScore').textContent = res.score || 0;
       document.getElementById('evalManualScore').textContent = manualTotal;
       document.getElementById('evalTotalScore').textContent = (res.score || 0) + manualTotal;
       document.getElementById('evalRemarks').value = res.remarks || '';

       document.getElementById('evalModal').classList.remove('hidden');
    }

    window.updateManualMark = function(qIndex, val) {
       tempManualMarks[qIndex] = parseFloat(val) || 0;
       
       let resList = JSON.parse(localStorage.getItem('cetExamResults')) || [];
       let res = resList.find(x => x.id === currentEvalResultId);
       let auto = res ? (res.score || 0) : 0;
       
       let totalM = 0;
       if(res && res.manualMarks) {
          for(let k in res.manualMarks) {
             if(tempManualMarks[k] === undefined) totalM += res.manualMarks[k];
          }
       }
       for(let k in tempManualMarks) totalM += tempManualMarks[k];

       document.getElementById('evalManualScore').textContent = totalM;
       document.getElementById('evalTotalScore').textContent = auto + totalM;
    }

    window.publishResult = function() {
       let resList = JSON.parse(localStorage.getItem('cetExamResults')) || [];
       let resIndex = resList.findIndex(x => x.id === currentEvalResultId);
       if(resIndex === -1) return;

       if(!resList[resIndex].manualMarks) resList[resIndex].manualMarks = {};
       
       for(let k in tempManualMarks) {
          resList[resIndex].manualMarks[k] = tempManualMarks[k];
       }
       
       let totalM = 0;
       for(let k in resList[resIndex].manualMarks) totalM += resList[resIndex].manualMarks[k];

       resList[resIndex].manualScore = totalM;
       resList[resIndex].remarks = document.getElementById('evalRemarks').value;
       resList[resIndex].status = 'Published';

       localStorage.setItem('cetExamResults', JSON.stringify(resList));
       
       // Email Notification
       const res = resList[resIndex];
       const st = DB.getStudentById(res.studentId);
       if (st && st.email) {
         import('../js/email-service.js').then(({ default: EmailSvc }) => {
           const emailHtml = EmailSvc.EmailTemplates.resultPublished(st.fullName, totalM + (res.score || 0), res.totalQuestions || 0).html;
           const emailSubject = EmailSvc.EmailTemplates.resultPublished(st.fullName, totalM + (res.score || 0), res.totalQuestions || 0).subject;
           EmailSvc.sendEmail(st.email, emailSubject, emailHtml);
         }).catch(err => console.warn('Email service import failed', err));
       }

       tempManualMarks = {};
       document.getElementById('evalModal').classList.add('hidden');
       alert('Result Published Successfully!');
       renderResults();
    }

    window.exportResultsCSV = function() {
       let resList = JSON.parse(localStorage.getItem('cetExamResults')) || [];
       if(resList.length === 0) return alert('No results to export.');
       
       let csv = 'Student ID,Name,Auto Score,Manual Score,Total Score,Status,Submitted At,Remarks\n';
       resList.forEach(r => {
          let auto = r.score || 0;
          let manual = r.manualScore || 0;
          let total = auto + manual;
          let dt = r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '';
          let rem = (r.remarks || '').replace(/,/g, ' ');
          csv += `"${r.studentId}","${r.name}","${auto}","${manual}","${total}","${r.status}","${dt}","${rem}"\n`;
       });
       
       let blob = new Blob([csv], { type: 'text/csv' });
       let url = window.URL.createObjectURL(blob);
       let a = document.createElement('a');
       a.setAttribute('hidden', '');
       a.setAttribute('href', url);
       a.setAttribute('download', 'Exam_Results.csv');
       document.body.appendChild(a);
       a.click();
       document.body.removeChild(a);
    }

    window.adminLogout = function() {
      DB.setAdminLogin(false);
      window.location.href = 'login.html';
    }
    
    // ============================================
    // APPROVED STUDENTS MODAL ACTIONS
    // ============================================
    // ---- Unified modal open/close helpers ----
    function showModal(id) {
      const el = document.getElementById(id);
      if (!el) { console.error('Modal not found:', id); return; }
      el.style.cssText = 'display:flex !important; position:fixed; inset:0; z-index:9999; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); align-items:center; justify-content:center; padding:1rem;';
    }
    function hideModal(id) {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    }
    window.closeStudentModal = function(id) { hideModal(id); }

    function getStudentForModal(id) {
       let s = DB.getStudentById(id);
       if (!s) {
         let approved = [];
         try { approved = JSON.parse(localStorage.getItem('cetApprovedStudents')) || []; } catch(e){}
         s = approved.find(a => a.id === id || a.studentId === id || a.applicationId === id);
       }
       if (!s) {
         let apps = window.getApplications ? window.getApplications() : [];
         s = apps.find(a => a.id === id || a.studentId === id || a.applicationId === id);
       }
       return s;
    }

    window.openStudentDetailsModal = function(id) {
      console.log('[Details] clicked, student id:', id);
      const s = getStudentForModal(id);
      if (!s) { console.warn('Student not found for id:', id); return; }
      const examStatus = s.hasAttempted ? 'Completed' : (s.examStatus || 'Pending Exam');
      document.getElementById('studentDetailsContent').innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          ${[['Student ID', s.studentId], ['Full Name', s.fullName || s.name || '--'], ['Email', s.email || '--'], ['Mobile', s.mobile || '--'], ['Course', s.courseApplied || '--'], ['Category', s.category || '--'], ['Exam Status', examStatus], ['Reg. Date', s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '--']].map(([label, val]) => `
            <div style="background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
              <p style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;margin:0 0 4px;">${label}</p>
              <p style="font-weight:600;color:#0f172a;margin:0;word-break:break-all;">${val}</p>
            </div>`).join('')}
        </div>
        <div style="margin-top:16px;text-align:right;">
          <button type="button" onclick="downloadHallTicketAdmin('${id}')" style="background:#059669;color:#fff;font-weight:700;padding:8px 24px;border-radius:8px;border:none;cursor:pointer;margin-right:12px;">Download Hall Ticket</button>
          <button type="button" onclick="closeStudentModal('studentDetailsModal')" style="background:#4f46e5;color:#fff;font-weight:700;padding:8px 24px;border-radius:8px;border:none;cursor:pointer;">Close</button>
        </div>
      `;
      showModal('studentDetailsModal');
    }

    window.downloadHallTicketAdmin = async function(id) {
       const btn = event ? event.currentTarget : null;
       if (btn) {
           btn.innerHTML = '⏳ Generating...';
           btn.disabled = true;
       }
       
       try {
           const student = getStudentForModal(id);
           if (!student) throw new Error("Student data not found.");
           
           if (!window.jspdf || !window.jspdf.jsPDF) {
               await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
           }
           const { jsPDF } = window.jspdf;
           const doc = new jsPDF('p', 'mm', 'a4');
           
           let photoData = null;
           const targetId = student.supabaseId || student.studentId || student.id;
           if (supabase && targetId) {
               try {
                  const { data } = await supabase.from('student_documents').select('file_url').eq('student_id', targetId).in('doc_type', ['photoFile', 'passport_photo', 'photo']).limit(1).maybeSingle();
                  if (data && data.file_url) photoData = data.file_url;
               } catch(e) {}
           }
           if (!photoData) {
               photoData = student.photoData || student.passportPhotoUrl || (student.uploadedFiles && student.uploadedFiles.photoFile);
           }

           const examDateStr = '25 June 2026';
           const examTimeStr = '09:30 AM to 11:00 AM';
           const durationStr = '90 Minutes';
           
           // Outer Borders
           doc.setDrawColor(30, 58, 138); doc.setLineWidth(1); doc.rect(10, 10, 190, 277);
           doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3); doc.rect(12, 12, 186, 273);

           // Header Box
           doc.setFillColor(255, 252, 230);
           doc.rect(15, 15, 180, 25, 'F');
           
           const logoUrl = window.location.origin + '/images/maharaj.jpeg';
           try {
               const lData = await new Promise((resolve) => {
                   const img = new Image(); img.crossOrigin = 'Anonymous';
                   img.onload = () => {
                       const canvas = document.createElement('canvas');
                       canvas.width = img.width; canvas.height = img.height;
                       const ctx = canvas.getContext('2d');
                       ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0,0,img.width,img.height);
                       ctx.drawImage(img,0,0); resolve(canvas.toDataURL('image/jpeg'));
                   };
                   img.onerror = () => resolve(null);
                   img.src = logoUrl;
               });
               if (lData) doc.addImage(lData, 'JPEG', 20, 18, 18, 18);
           } catch(e) {}
           
           // Header Text
           doc.setFontSize(10); doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "bold");
           doc.text("Ahmednagar Jilha Maratha Vidya Prasarak Samaj's", 105, 20, { align: "center" });
           doc.setFontSize(14); doc.setTextColor(180, 0, 0);
           doc.text("NEW ARTS, COMMERCE AND SCIENCE COLLEGE", 105, 26, { align: "center" });
           doc.setFontSize(12); doc.text("(AUTONOMOUS)", 105, 31, { align: "center" });
           doc.setFontSize(9); doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal");
           doc.text("Laltaki Road, Ahmednagar - 414 001 (MS)", 105, 36, { align: "center" });
           
           // Blue banner
           doc.setFillColor(30, 58, 138); doc.rect(15, 40, 180, 8, 'F');
           doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.setFont("helvetica", "bold");
           doc.text("Center for Advanced Studies in Applied Sciences (CASAS)", 105, 45, { align: "center" });
           
           // Title & Courses
           doc.setTextColor(0, 0, 0); doc.setFontSize(14);
           doc.text("ADMIT CARD (HALL TICKET)", 105, 55, { align: "center" });
           
           doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.5); doc.rect(15, 66, 180, 68);
           doc.line(145, 66, 145, 134); 
           doc.line(70, 66, 70, 134);
           
           const rows = [
              ["Applied Course:", (student.courseApplied || '').toUpperCase()],
              ["Full Name:", student.fullName || student.name || ''],
              ["Roll No / CET ID:", student.studentId || student.id || ''],
              ["Mobile Number:", student.mobile || ''],
              ["Exam Date:", examDateStr],
              ["Reporting Time:", "09:00 AM"],
              ["Exam Time:", examTimeStr],
              ["Duration:", durationStr]
           ];
           
           let yLine = 66;
           rows.forEach((r, i) => {
              doc.setFontSize(10);
              doc.setFont("helvetica", "bold"); doc.text(r[0], 18, yLine + 5.5);
              doc.setFont("helvetica", "normal"); doc.text(r[1], 75, yLine + 5.5);
              yLine += 8.5;
              if (i < 7) {
                 doc.setLineWidth(0.2); doc.line(15, yLine, 145, yLine);
              }
           });
           
           // Draw Photo
           if (photoData) {
              try {
                  const pData = await new Promise((resolve) => {
                      const img = new Image(); img.crossOrigin = 'Anonymous';
                      img.onload = () => {
                          const canvas = document.createElement('canvas');
                          canvas.width = img.width; canvas.height = img.height;
                          const ctx = canvas.getContext('2d');
                          ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0,0,img.width,img.height);
                          ctx.drawImage(img,0,0); resolve(canvas.toDataURL('image/jpeg'));
                      };
                      img.onerror = () => resolve(null);
                      img.src = photoData.startsWith('data:') ? photoData : photoData + '?cb=' + Date.now();
                  });
                  if (pData) {
                      doc.addImage(pData, 'JPEG', 150, 75, 40, 50);
                  }
              } catch(e) {}
           }
           doc.rect(150, 75, 40, 50);
           doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text("Photograph", 170, 130, {align:"center"});

           // Instructions
           doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(180, 0, 0);
           doc.text("IMPORTANT INSTRUCTIONS FOR CANDIDATES:", 15, 160);
           
           doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(0, 0, 0);
           const instructions = [
              "1. Admission Criteria: Admissions are strictly based on the merit list generated from exam scores.",
              "2. Exam Date & Time: Thursday, 25 June 2026, from 09:30 AM to 11:00 AM.",
              "3. Reporting Time & Venue: Report exactly at 09:00 AM at the CASAS Department, 1st Floor, Admin Building.",
              "4. Exam Format: Entirely offline, 100 marks (75 questions: 50 Qs of 1 mark, 25 Qs of 2 marks).",
              "   Answers must be written on the provided Answer Sheet.",
              "5. Mandatory Attendance: Only students present will be considered. Absence forfeits admission claims.",
              "6. Merit List & Counseling: Merit list will be prepared immediately. Counseling begins at 01:00 PM same day.",
              "7. Provisional Admission Fee: Selected students must pay a provisional fee of Rs. 1000/- on the spot.",
              "8. Caste Certificate: Reserved category students MUST bring their original caste certificate.",
              "9. Final Admission: Confirmed only after submitting the original UG marksheet and Transfer Certificate."
           ];
           
           let instY = 168;
           instructions.forEach(inst => {
              doc.text(inst, 15, instY);
              instY += 6;
           });
           
           doc.setDrawColor(0,0,0); doc.rect(20, 235, 50, 15);
           doc.setFontSize(10); doc.text("Student's Signature", 28, 256);

           doc.setFont("helvetica", "bold"); doc.setFontSize(11);
           doc.text("Prof. Arun Gangarde", 130, 245);
           doc.setFontSize(9); doc.setFont("helvetica", "normal");
           doc.text("Head, CASAS", 130, 250);
           doc.text("(Center for Advanced Studies in", 130, 255);
           doc.text("Applied Sciences)", 130, 260);

           doc.save(`CET_AdmitCard_${student.studentId || 'Pending'}.pdf`);
           
       } catch (err) {
           console.error("Hall Ticket Error:", err);
           alert("Error generating Hall Ticket: " + err.message);
       } finally {
           if (btn) {
               btn.innerHTML = 'Download Hall Ticket';
               btn.disabled = false;
           }
       }
    }

    window.generateBase64AdmitCard = async function(student, examDateStr, examTimeStr, durationStr) {
        try {
            if (!window.jspdf || !window.jspdf.jsPDF) {
                await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            }
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            
            let photoData = null;
            const targetId = student.supabaseId || student.studentId || student.id;
            if (supabase && targetId) {
                try {
                   const { data } = await supabase.from('student_documents').select('file_url').eq('student_id', targetId).in('doc_type', ['photoFile', 'passport_photo', 'photo']).limit(1).maybeSingle();
                   if (data && data.file_url) photoData = data.file_url;
                } catch(e) {}
            }
            if (!photoData) {
                photoData = student.photoData || student.passportPhotoUrl || (student.uploadedFiles && student.uploadedFiles.photoFile);
            }
            
            // Outer Borders
            doc.setDrawColor(30, 58, 138); doc.setLineWidth(1); doc.rect(10, 10, 190, 277);
            doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3); doc.rect(12, 12, 186, 273);

            // Header Box
            doc.setFillColor(255, 252, 230);
            doc.rect(15, 15, 180, 25, 'F');
            
            const logoUrl = window.location.origin + '/images/maharaj.jpeg';
            try {
                const lData = await new Promise((resolve) => {
                    const img = new Image(); img.crossOrigin = 'Anonymous';
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width; canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0,0,img.width,img.height);
                        ctx.drawImage(img,0,0); resolve(canvas.toDataURL('image/jpeg'));
                    };
                    img.onerror = () => resolve(null);
                    img.src = logoUrl;
                });
                if (lData) doc.addImage(lData, 'JPEG', 20, 18, 18, 18);
            } catch(e) {}
            
            // Header Text
            doc.setFontSize(10); doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "bold");
            doc.text("Ahmednagar Jilha Maratha Vidya Prasarak Samaj's", 105, 20, { align: "center" });
            doc.setFontSize(14); doc.setTextColor(180, 0, 0);
            doc.text("NEW ARTS, COMMERCE AND SCIENCE COLLEGE", 105, 26, { align: "center" });
            doc.setFontSize(12); doc.text("(AUTONOMOUS)", 105, 31, { align: "center" });
            doc.setFontSize(9); doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal");
            doc.text("Laltaki Road, Ahmednagar - 414 001 (MS)", 105, 36, { align: "center" });
            
            // Blue banner
            doc.setFillColor(30, 58, 138); doc.rect(15, 40, 180, 8, 'F');
            doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.setFont("helvetica", "bold");
            doc.text("Center for Advanced Studies in Applied Sciences (CASAS)", 105, 45, { align: "center" });
            
            // Title & Courses
            doc.setTextColor(0, 0, 0); doc.setFontSize(14);
            doc.text("ADMIT CARD (HALL TICKET)", 105, 55, { align: "center" });
            
            doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.5); doc.rect(15, 66, 180, 68);
            doc.line(145, 66, 145, 134); 
            doc.line(70, 66, 70, 134);
            
            const rows = [
               ["Applied Course:", (student.courseApplied || '').toUpperCase()],
               ["Full Name:", student.fullName || student.name || ''],
               ["Roll No / CET ID:", student.studentId || student.id || ''],
               ["Mobile Number:", student.mobile || ''],
               ["Exam Date:", examDateStr],
               ["Reporting Time:", "09:00 AM"],
               ["Exam Time:", examTimeStr],
               ["Duration:", durationStr]
            ];
            
            let yLine = 66;
            rows.forEach((r, i) => {
               doc.setFontSize(10);
               doc.setFont("helvetica", "bold"); doc.text(r[0], 18, yLine + 5.5);
               doc.setFont("helvetica", "normal"); doc.text(r[1], 75, yLine + 5.5);
               yLine += 8.5;
               if (i < 7) {
                  doc.setLineWidth(0.2); doc.line(15, yLine, 145, yLine);
               }
            });
            
            // Draw Photo
            if (photoData) {
               try {
                   const pData = await new Promise((resolve) => {
                       const img = new Image(); img.crossOrigin = 'Anonymous';
                       img.onload = () => {
                           const canvas = document.createElement('canvas');
                           canvas.width = img.width; canvas.height = img.height;
                           const ctx = canvas.getContext('2d');
                           ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0,0,img.width,img.height);
                           ctx.drawImage(img,0,0); resolve(canvas.toDataURL('image/jpeg'));
                       };
                       img.onerror = () => resolve(null);
                       img.src = photoData.startsWith('data:') ? photoData : photoData + '?cb=' + Date.now();
                   });
                   if (pData) doc.addImage(pData, 'JPEG', 150, 75, 40, 50);
               } catch(e) {}
            }
            doc.rect(150, 75, 40, 50);
            doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text("Photograph", 170, 130, {align:"center"});

            // Instructions
            doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(180, 0, 0);
            doc.text("IMPORTANT INSTRUCTIONS FOR CANDIDATES:", 15, 160);
            
            doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(0, 0, 0);
            const instructions = [
               "1. Admission Criteria: Admissions are strictly based on the merit list generated from exam scores.",
               "2. Exam Date & Time: Thursday, 25 June 2026, from 09:30 AM to 11:00 AM.",
               "3. Reporting Time & Venue: Report exactly at 09:00 AM at the CASAS Department, 1st Floor, Admin Building.",
               "4. Exam Format: Entirely offline, 100 marks (75 questions: 50 Qs of 1 mark, 25 Qs of 2 marks).",
               "   Answers must be written on the provided Answer Sheet.",
               "5. Mandatory Attendance: Only students present will be considered. Absence forfeits admission claims.",
               "6. Merit List & Counseling: Merit list will be prepared immediately. Counseling begins at 01:00 PM same day.",
               "7. Provisional Admission Fee: Selected students must pay a provisional fee of Rs. 1000/- on the spot.",
               "8. Caste Certificate: Reserved category students MUST bring their original caste certificate.",
               "9. Final Admission: Confirmed only after submitting the original UG marksheet and Transfer Certificate."
            ];
            
            let instY = 168;
            instructions.forEach(inst => {
               doc.text(inst, 15, instY);
               instY += 6;
            });
            
            doc.setDrawColor(0,0,0); doc.rect(20, 235, 50, 15);
            doc.setFontSize(10); doc.text("Student's Signature", 28, 256);

            doc.setFont("helvetica", "bold"); doc.setFontSize(11);
            doc.text("Prof. Arun Gangarde", 130, 245);
            doc.setFontSize(9); doc.setFont("helvetica", "normal");
            doc.text("Head, CASAS", 130, 250);
            doc.text("(Center for Advanced Studies in", 130, 255);
            doc.text("Applied Sciences)", 130, 260);

            return doc.output('datauristring');
        } catch (err) {
            console.error("Base64 Hall Ticket Error:", err);
            return null;
        }
    }

    window.openDocumentsModal = async function(id) {
      console.log('[Docs] clicked, student id:', id);
      const s = getStudentForModal(id);
      const apps = window.getApplications();
      const app = apps.find(a => a.email === s?.email || a.studentId === s?.studentId || a.id === s?.id);
      
      document.getElementById('documentsContent').innerHTML = '<p style="text-align:center;color:#64748b;padding:20px;">Fetching documents from secure cloud...</p>';
      showModal('documentsModal');

      const targetId = s?.supabaseId || s?.id || id;
      let supaDocs = [];
      if (supabase) {
         try {
            const { data, error } = await supabase.from('student_documents').select('*').eq('student_id', targetId);
            if (data && !error) supaDocs = data;
         } catch(e) {}
      }
      
      let finalDocs = {};
      
      // 1. Load from Supabase
      if (supaDocs.length > 0) {
         supaDocs.forEach(d => { finalDocs[d.doc_type] = d.file_url; });
      } 
      // 2. Load from localStorage cetDocuments
      else {
         const cetDocs = JSON.parse(localStorage.getItem('cetDocuments')) || {};
         let localD = cetDocs[app?.applicationId] || cetDocs[app?.studentId] || cetDocs[targetId];
         if (localD) {
            finalDocs = localD;
         } else if (app && app.uploadedFiles) {
            finalDocs = app.uploadedFiles;
         }
      }

      let content = '';
      const docList = ['SY Marksheet', 'TY Marksheet', '10th Marksheet', '12th Marksheet', 'Caste Certificate', 'Photo', 'Aadhar Card'];
      
      if (Object.keys(finalDocs).length > 0) {
        content = Object.entries(finalDocs).map(([key, data]) => {
          if(!data) return '';
          const isImage = data.startsWith('data:image') || data.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i) || data.includes('student-photos') || data.includes('payment-screenshots');
          return `<div style="padding:12px;background:#fff;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:10px;">
            <p style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin:0 0 8px;">${key.replace(/File$/, '')}</p>
            ${isImage ? `<img src="${data}" style="max-height:120px;border-radius:6px;display:block;margin-bottom:8px;background:#f8fafc;" />` : ''}
            <div style="display:flex;gap:8px;">
              <a href="${data}" target="_blank" style="background:#eff6ff;color:#3b82f6;padding:4px 12px;border-radius:6px;font-size:12px;font-weight:700;text-decoration:none;">Preview</a>
              <a href="${data}" download="${key}" style="background:#f0fdf4;color:#16a34a;padding:4px 12px;border-radius:6px;font-size:12px;font-weight:700;text-decoration:none;">Download</a>
            </div>
          </div>`;
        }).join('');
      } else {
        // Show dummy document list when no real docs available
        content = docList.map(doc => `
          <div style="padding:12px;background:#fff;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <p style="font-size:12px;font-weight:700;color:#334155;margin:0;">${doc}</p>
              <p style="font-size:11px;color:#94a3b8;margin:4px 0 0;">Not uploaded yet</p>
            </div>
            <span style="background:#fef9c3;color:#854d0e;font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;">PENDING</span>
          </div>`).join('');
        content = `<p style="color:#94a3b8;font-size:12px;margin-bottom:10px;">No documents uploaded. Expected documents:</p>` + content;
      }
      document.getElementById('documentsContent').innerHTML = content;
    }

    window.openAnswersModal = function(id) {
      console.log('[Answers] clicked, student id:', id);
      const s = getStudentForModal(id);
      const res = DB.getResults().find(r => r.studentId === id || r.studentId === s?.studentId);

      const dummyAnswers = [
        { q: 'What is the full form of CPU?', studentAns: 'Central Processing Unit', correctAns: 'Central Processing Unit', marks: 1, status: 'Correct' },
        { q: 'Which language is used for web styling?', studentAns: 'CSS', correctAns: 'CSS', marks: 1, status: 'Correct' },
        { q: 'What does HTML stand for?', studentAns: 'HyperText Markup Language', correctAns: 'HyperText Markup Language', marks: 1, status: 'Correct' },
        { q: 'Which planet is closest to the Sun?', studentAns: 'Venus', correctAns: 'Mercury', marks: 0, status: 'Wrong' },
      ];
      const answers = (res && res.answers && Object.keys(res.answers).length) ? 
        Object.entries(res.answers).map(([qId, ans]) => ({ q: qId, studentAns: Array.isArray(ans) ? ans.join(', ') : ans, correctAns: '(backend)', marks: 1, status: 'Correct' })) 
        : dummyAnswers;

      const totalScore = answers.reduce((sum, a) => sum + (a.status === 'Correct' ? a.marks : 0), 0);
      document.getElementById('answersContent').innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:0.8rem;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:8px;text-align:left;border-bottom:2px solid #e2e8f0;color:#64748b;font-size:10px;text-transform:uppercase;">#</th>
              <th style="padding:8px;text-align:left;border-bottom:2px solid #e2e8f0;color:#64748b;font-size:10px;text-transform:uppercase;">Question</th>
              <th style="padding:8px;text-align:left;border-bottom:2px solid #e2e8f0;color:#64748b;font-size:10px;text-transform:uppercase;">Student Answer</th>
              <th style="padding:8px;text-align:left;border-bottom:2px solid #e2e8f0;color:#64748b;font-size:10px;text-transform:uppercase;">Correct Answer</th>
              <th style="padding:8px;text-align:center;border-bottom:2px solid #e2e8f0;color:#64748b;font-size:10px;text-transform:uppercase;">Marks</th>
              <th style="padding:8px;text-align:center;border-bottom:2px solid #e2e8f0;color:#64748b;font-size:10px;text-transform:uppercase;">Result</th>
            </tr>
          </thead>
          <tbody>
            ${answers.map((a, i) => `
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:8px;color:#94a3b8;">${i+1}</td>
                <td style="padding:8px;font-weight:600;color:#0f172a;">${a.q}</td>
                <td style="padding:8px;color:#334155;">${a.studentAns}</td>
                <td style="padding:8px;color:#059669;font-weight:600;">${a.correctAns}</td>
                <td style="padding:8px;text-align:center;font-weight:700;">${a.marks}</td>
                <td style="padding:8px;text-align:center;">
                  <span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:${a.status==='Correct'?'#d1fae5':'#fee2e2'};color:${a.status==='Correct'?'#059669':'#dc2626'};">${a.status}</span>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
        <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;padding:10px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
          <strong style="color:#0f172a;">Total: ${totalScore} / ${answers.length}</strong>
          <button type="button" onclick="closeStudentModal('answersModal')" style="background:#4f46e5;color:#fff;font-weight:700;padding:6px 18px;border-radius:8px;border:none;cursor:pointer;">Close</button>
        </div>`;
      showModal('answersModal');
    }

    window.openIssuesModal = function(id) {
      console.log('[Issues] clicked, student id:', id);
      const issues = [
        { type: 'Network Problem', message: 'Browser disconnected during exam.', time: 'Today 10:15 AM', status: 'Open' },
        { type: 'Tab Switch Warning', message: 'Student switched tabs 3 times.', time: 'Today 10:22 AM', status: 'Resolved' },
      ];
      document.getElementById('issuesContent').innerHTML = issues.map((issue, i) => `
        <div style="padding:12px;background:#fff;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:10px;display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <p style="font-size:11px;font-weight:700;color:#ef4444;text-transform:uppercase;margin:0 0 4px;">${issue.type}</p>
            <p style="font-size:13px;color:#334155;margin:0 0 4px;">${issue.message}</p>
            <p style="font-size:11px;color:#94a3b8;margin:0;">${issue.time}</p>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
            <span style="background:${issue.status==='Resolved'?'#d1fae5':'#fef9c3'};color:${issue.status==='Resolved'?'#059669':'#854d0e'};font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;">${issue.status}</span>
            ${issue.status !== 'Resolved' ? `<button type="button" onclick="this.closest('div').previousElementSibling && (this.previousElementSibling.textContent='Resolved'); this.closest('[style]').querySelector('span').textContent='Resolved'; this.style.display='none';" style="background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;cursor:pointer;">Mark Resolved</button>` : ''}
          </div>
        </div>`).join('') +
        `<div style="text-align:right;margin-top:8px;"><button type="button" onclick="closeStudentModal('issuesModal')" style="background:#4f46e5;color:#fff;font-weight:700;padding:6px 18px;border-radius:8px;border:none;cursor:pointer;">Close</button></div>`;
      showModal('issuesModal');
    }

    window.openRescheduleModal = function(id) {
      console.log('[Reschedule] clicked, student id:', id);
      document.getElementById('rescheduleStudentId').value = id;
      showModal('rescheduleModal');
    }

    window.saveReschedule = async function() {
      const id = document.getElementById('rescheduleStudentId').value;
      const date = document.getElementById('rescheduleDate').value;
      const time = document.getElementById('rescheduleTime').value;
      console.log('[Admin Action] Start: Reschedule exam', id, date, time);
      if (!date || !time) { showToast('Please select both date and time', 'error'); return; }
      
      const s = getStudentForModal(id);
      if (s) {
         // Update in cet_students if exists
         let allStudents = DB.getStudents();
         const dbIdx = allStudents.findIndex(st => st.id === id || st.studentId === s.studentId);
         if (dbIdx !== -1) {
            allStudents[dbIdx] = { ...allStudents[dbIdx], rescheduleDate: date, rescheduleTime: time, examStatus: 'SCHEDULED', hasAttempted: false, examTimeLeft: null, activeViolations: 0 };
            localStorage.setItem('cet_students', JSON.stringify(allStudents));
         } else {
            // Re-inject into local storage if they were missing (came from cloud)
            s.rescheduleDate = date; s.rescheduleTime = time; s.examStatus = 'SCHEDULED'; s.hasAttempted = false; s.examTimeLeft = null; s.activeViolations = 0;
            allStudents.push(s);
            localStorage.setItem('cet_students', JSON.stringify(allStudents));
         }
      }

      // Also sync cetApprovedStudents
      try {
        let approved = JSON.parse(localStorage.getItem('cetApprovedStudents')) || [];
        const apIdx = approved.findIndex(a => a.id === id || a.studentId === (s?.studentId));
        if (apIdx !== -1) {
          approved[apIdx].rescheduleDate = date;
          approved[apIdx].rescheduleTime = time;
          approved[apIdx].examStatus = 'SCHEDULED';
          approved[apIdx].hasAttempted = false;
          approved[apIdx].examTimeLeft = null;
          approved[apIdx].activeViolations = 0;
          localStorage.setItem('cetApprovedStudents', JSON.stringify(approved));
        }
      } catch(e) {}
      
      // Wipe old results locally so the student gets a fresh attempt
      try {
        let allResults = JSON.parse(localStorage.getItem('cetExamResults')) || [];
        allResults = allResults.filter(r => r.studentId !== id && r.studentId !== (s?.studentId));
        localStorage.setItem('cetExamResults', JSON.stringify(allResults));
        
        let cetResults = JSON.parse(localStorage.getItem('cet_results')) || [];
        cetResults = cetResults.filter(r => r.studentId !== id && r.studentCetId !== (s?.studentId));
        localStorage.setItem('cet_results', JSON.stringify(cetResults));
        
        let allAnswers = JSON.parse(localStorage.getItem('allStudentAnswers')) || [];
        allAnswers = allAnswers.filter(ans => ans.studentId !== id && ans.studentId !== (s?.studentId));
        localStorage.setItem('allStudentAnswers', JSON.stringify(allAnswers));
        
        let secLogs = JSON.parse(localStorage.getItem('cetExamSecurityLogs')) || [];
        secLogs = secLogs.filter(l => l.studentId !== id && l.studentId !== (s?.studentId));
        localStorage.setItem('cetExamSecurityLogs', JSON.stringify(secLogs));
        
        // Ensure cetApplications is also updated so dashboard doesn't pull stale state
        let apps = JSON.parse(localStorage.getItem('cetApplications')) || [];
        const appIdx = apps.findIndex(a => a.id === id || a.studentId === (s?.studentId));
        if (appIdx !== -1) {
           apps[appIdx].rescheduleDate = date;
           apps[appIdx].rescheduleTime = time;
           apps[appIdx].examStatus = 'SCHEDULED';
           apps[appIdx].hasAttempted = false;
           apps[appIdx].examTimeLeft = null;
           apps[appIdx].activeViolations = 0;
           localStorage.setItem('cetApplications', JSON.stringify(apps));
        }
      } catch(e) {}

      // Supabase dual-write
      if (supabase && s) {
        const studentIdStr = s.studentId || id;
        const customExamDateStr = date + '|' + time;
        
        // Helper to check if a string is a valid UUID
        const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        
        // Collect promises
        const promises = [];
        
        // Prepare academic_details payload to store the rescheduled time without needing a new column
        const existingDetails = typeof s.academicDetails === 'string' ? JSON.parse(s.academicDetails) : (s.academicDetails || {});
        const newAcademicDetails = { ...existingDetails, rescheduleDate: date, rescheduleTime: time, examDate: customExamDateStr };
        
        // 1. Reset Student Table - by email (safest)
        if (s.email) {
           promises.push(supabase.from('students').update({ exam_status: 'SCHEDULED', has_attempted: false, active_violations: 0, lock_reason: null, academic_details: newAcademicDetails }).eq('email', s.email));
        }
        
        // 2. Create personalized exam_config overlay (delete first to avoid missing unique constraint errors)
        if (studentIdStr && !isUUID(studentIdStr)) {
            promises.push(
                supabase.from('exam_config').delete().eq('course', 'RESCHEDULE_' + studentIdStr).then(() => {
                    return supabase.from('exam_config').insert({
                        course: 'RESCHEDULE_' + studentIdStr,
                        exam_date: date,
                        start_time: time,
                        duration_minutes: 60,
                        is_active: true,
                        instructions: 'Rescheduled custom exam',
                        rules: 'Standard Rules'
                    });
                })
            );
        }
        
        // 2. Clear old attempts, results, locked, logs
        // By cet_student_id
        if (studentIdStr && !isUUID(studentIdStr)) {
           promises.push(supabase.from('exam_results').delete().eq('cet_student_id', studentIdStr));
           promises.push(supabase.from('locked_exams').delete().eq('cet_student_id', studentIdStr));
           promises.push(supabase.from('security_logs').delete().eq('cet_student_id', studentIdStr));
           promises.push(supabase.from('exam_attempts').delete().eq('cet_student_id', studentIdStr));
           promises.push(supabase.from('students').update({ exam_status: 'SCHEDULED', has_attempted: false, active_violations: 0, lock_reason: null, academic_details: newAcademicDetails }).eq('student_id', studentIdStr));
        }
        
        // By UUID (if we have it in s.id or id)
        const validUuid = isUUID(s.id) ? s.id : (isUUID(id) ? id : null);
        if (validUuid) {
           promises.push(supabase.from('exam_results').delete().eq('student_id', validUuid));
           promises.push(supabase.from('locked_exams').delete().eq('student_id', validUuid));
           promises.push(supabase.from('security_logs').delete().eq('student_id', validUuid));
           promises.push(supabase.from('exam_attempts').delete().eq('student_id', validUuid));
           promises.push(supabase.from('students').update({ exam_status: 'SCHEDULED', has_attempted: false, active_violations: 0, lock_reason: null, academic_details: newAcademicDetails }).eq('id', validUuid));
        }
        
        // Wait for all cloud updates to finish before refetching
        try {
          const results = await Promise.all(promises);
          
          let hasErrors = false;
          results.forEach(res => {
            if (res && res.error) {
              console.warn('[Admin Action] Supabase update error:', res.error);
              hasErrors = true;
            }
          });
          
          if (hasErrors) {
            console.warn('[Admin Action] Some cloud updates failed. Checking if student table was updated...');
          } else {
            console.log('[Admin Action] Successfully completed all cloud updates for reschedule');
          }
        } catch (err) {
          console.warn('[Admin Action] Exception during cloud updates:', err);
        }
      }

      // Email Notification
      if (s && s.email) {
        import('../js/email-service.js').then(({ default: EmailSvc }) => {
          const emailHtml = EmailSvc.EmailTemplates.scheduleUpdate(s.fullName, date, time).html;
          const emailSubject = EmailSvc.EmailTemplates.scheduleUpdate(s.fullName, date, time).subject;
          
          window.generateBase64AdmitCard(s, date, time, '90 Minutes').then(base64Pdf => {
             let attachments = null;
             if (base64Pdf) {
                 attachments = [{
                     filename: `CET_AdmitCard_${s.studentId || s.id || 'Student'}.pdf`,
                     content: base64Pdf.split('base64,')[1] || base64Pdf,
                     encoding: 'base64'
                 }];
             }
             EmailSvc.sendEmail(s.email, emailSubject, emailHtml, attachments);
          });
        }).catch(err => console.warn('Email service import failed', err));
      }

      invalidateCache();
      hideModal('rescheduleModal');
      showToast('Exam rescheduled to ' + date + ' at ' + time, 'success');
      console.log('[Admin Action] Success: Exam rescheduled', id);
      renderStudents();
      
      // Force Supabase refresh immediately so UI cache drops the old 'Completed' state
      if (supabase && typeof window.fetchApplicationsFromSupabase === 'function') {
         window.fetchApplicationsFromSupabase().then(() => window.renderStudents());
      }
    }

    window.resumeExam = async function(id) {
      console.log('[Admin Action] Start: Resume exam', id);
      const s = DB.getStudentById(id);
      if (s) {
        DB.updateStudent(id, { examStatus: 'Active Exam' });

        // Also sync cetApprovedStudents
        try {
          let approved = JSON.parse(localStorage.getItem('cetApprovedStudents')) || [];
          const apIdx = approved.findIndex(a => a.id === id || a.studentId === s.studentId);
          if (apIdx !== -1) {
            approved[apIdx].examStatus = 'Active Exam';
            localStorage.setItem('cetApprovedStudents', JSON.stringify(approved));
          }
        } catch(e) {}

        // Supabase dual-write
        if (supabase) {
          await supabase.from('students').update({ exam_status: 'ACTIVE' }).eq('student_id', s.studentId || id)
            .then(({ error }) => { if (error) console.warn('[Admin Action] Failed: Resume error:', error.message); else console.log('[Admin Action] Success: Exam resumed in cloud'); });
        }
        invalidateCache();
        showToast('Exam resumed! Status set to Active Exam.', 'success');
        console.log('[Admin Action] Success: Exam resumed', id);
        renderStudents();
      }
    }

    window.deleteApprovedStudent = function(id) {
      console.log('[Admin Action] Start: Open delete modal', id);
      document.getElementById('deleteStudentConfirmId').value = id;
      document.getElementById('deleteStudentName').textContent = getStudentForModal(id)?.fullName || 'this student';
      showModal('deleteStudentModal');
    }

    window.confirmDeleteStudent = async function() {
      const id = document.getElementById('deleteStudentConfirmId').value;
      const s = getStudentForModal(id);
      
      const confirmation = prompt(`To delete this student, type "DELETE" below:\n\nStudent Name: ${s?.fullName || 'this student'}`);
      if(confirmation !== "DELETE") {
         showToast("Deletion cancelled.", "info");
         hideModal('deleteStudentModal');
         return;
      }
      
      console.log('[Admin Action] Start: Delete approved student', id);
      const studentEmail = s?.email;
      const studentStudentId = s?.studentId;

      // 1. Remove from cet_students completely (not just status change)
      if (s) {
        const allStudents = DB.getStudents();
        const filtered = allStudents.filter(st => st.id !== id);
        localStorage.setItem('cet_students', JSON.stringify(filtered));
      }

      // 2. Remove from cetApprovedStudents
      try {
        let approved = JSON.parse(localStorage.getItem('cetApprovedStudents')) || [];
        approved = approved.filter(a => a.id !== id && a.email !== studentEmail && a.studentId !== studentStudentId);
        localStorage.setItem('cetApprovedStudents', JSON.stringify(approved));
      } catch(e) {}

      // 3. Remove from cetApplications
      try {
        let apps = JSON.parse(localStorage.getItem('cetApplications')) || [];
        apps = apps.filter(a => a.email !== studentEmail && a.studentId !== studentStudentId);
        localStorage.setItem('cetApplications', JSON.stringify(apps));
      } catch(e) {}

      // 4. Remove from cetPayments
      try {
        let payments = JSON.parse(localStorage.getItem('cetPayments')) || [];
        payments = payments.filter(p => p.email !== studentEmail && p.studentId !== studentStudentId);
        localStorage.setItem('cetPayments', JSON.stringify(payments));
      } catch(e) {}

      // 5. Supabase: delete from cloud
      if (supabase && s) {
        try {
          const { data: session } = await supabase.auth.getSession();
          const adminId = session?.session?.user?.id || 'admin';
          
          const matchQuery = s.supabaseId ? supabase.from('students').update({ status: 'deleted', application_status: 'DELETED' }).eq('id', s.supabaseId) : supabase.from('students').update({ status: 'deleted', application_status: 'DELETED' }).eq('student_id', studentStudentId || id);
          const { error } = await matchQuery;
          if (error) {
            console.error('[Admin Action] Failed: Supabase delete error:', error.message);
            showToast('Delete failed in cloud – retry', 'error');
          } else {
            console.log('[Admin Action] Success: Student deleted from cloud');
            await supabase.from('security_logs').insert({
               event_type: 'STUDENT_DELETED',
               message: `Student ${studentStudentId || id} soft-deleted by admin ${adminId}`,
               student_name: s.fullName || s.name
            });
          }
        } catch(e) {
          console.error('[Admin Action] Failed: Supabase soft-delete exception', e);
        }
      }

      invalidateCache();
      hideModal('deleteStudentModal');
      showToast('Student deleted successfully', 'success');
      console.log('[Admin Action] Success: Student fully deleted', id);
      renderStudents();
      renderApplications();
      renderOverview();
    }

    // Old showToast removed — using the improved version defined in RELIABILITY INFRASTRUCTURE section above
    
    // Assign DB to window for inline onclick hooks in HTML
    window.DB = DB;

    // ============================================
    // LIVE RESULTS - MODAL & DOWNLOAD FUNCTIONS
    // ============================================

    window.viewResultModal = function(idx) {
      const r = window._allResults && window._allResults[idx];
      if (!r) { alert('No result data found.'); return; }
      console.log('View Result clicked', r);
      const percent = r.total ? ((r.score / r.total) * 100).toFixed(2) : 0;
      const passing = percent >= 40 ? 'PASS' : 'FAIL';
      document.getElementById('resultDetailContent').innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div style="background:#fff;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
            <p style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;margin:0 0 4px;">Student ID</p>
            <p style="font-weight:700;color:#4f46e5;margin:0;">${r.studentId}</p>
          </div>
          <div style="background:#fff;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
            <p style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;margin:0 0 4px;">Name</p>
            <p style="font-weight:600;color:#0f172a;margin:0;">${r.name || r.studentName || '--'}</p>
          </div>
          <div style="background:#fff;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
            <p style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;margin:0 0 4px;">Course</p>
            <p style="font-weight:600;color:#0f172a;margin:0;">${r.course || 'BSc Computer Science'}</p>
          </div>
          <div style="background:#fff;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
            <p style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;margin:0 0 4px;">Category</p>
            <p style="font-weight:600;color:#0f172a;margin:0;">${r.category || 'OPEN'}</p>
          </div>
          <div style="background:#fff;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
            <p style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;margin:0 0 4px;">Score</p>
            <p style="font-weight:800;font-size:1.25rem;color:#0f172a;margin:0;">${r.score || 0} <span style="font-size:0.75rem;color:#94a3b8;font-weight:400;">/ ${r.total || 0}</span></p>
          </div>
          <div style="background:#fff;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
            <p style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;margin:0 0 4px;">Percentage</p>
            <p style="font-weight:800;font-size:1.25rem;color:#0f172a;margin:0;">${percent}%</p>
          </div>
          <div style="background:#fff;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
            <p style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;margin:0 0 4px;">Rank</p>
            <p style="font-weight:600;color:#0f172a;margin:0;">#${idx + 1}</p>
          </div>
          <div style="background:#fff;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
            <p style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;margin:0 0 4px;">Status</p>
            <p style="font-weight:600;color:#0f172a;margin:0;">${r.status || 'Completed'}</p>
          </div>
          <div style="background:#fff;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
            <p style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;margin:0 0 4px;">Date</p>
            <p style="font-weight:600;color:#0f172a;margin:0;">${r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '--'}</p>
          </div>
          <div style="background:${passing === 'PASS' ? '#ecfdf5' : '#fef2f2'};padding:12px;border-radius:8px;border:1px solid ${passing === 'PASS' ? '#a7f3d0' : '#fecaca'};">
            <p style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;margin:0 0 4px;">Passing Status</p>
            <p style="font-weight:800;font-size:1rem;color:${passing === 'PASS' ? '#059669' : '#dc2626'};margin:0;">${passing}</p>
          </div>
        </div>
        <div style="margin-top:16px;display:flex;justify-content:space-between;align-items:center;">
          <button type="button" onclick="editResultScore(${idx})" style="background:#f59e0b;color:#fff;font-weight:700;padding:8px 24px;border-radius:8px;border:none;cursor:pointer;display:flex;align-items:center;gap:8px;">✏️ Edit Score</button>
          <button type="button" onclick="document.getElementById('resultDetailModal').style.display='none';" style="background:#4f46e5;color:#fff;font-weight:700;padding:8px 24px;border-radius:8px;border:none;cursor:pointer;">Close</button>
        </div>
      `;
      document.getElementById('resultDetailModal').style.display = 'flex';
    }
    
    window.editResultScore = async function(idx) {
       const r = window._allResults && window._allResults[idx];
       if (!r) return;
       
       let newScore = prompt(`Edit Score for ${r.name || r.studentName} (${r.studentId}):\nCurrent Score: ${r.score} / ${r.total || r.totalQuestions}`, r.score);
       if (newScore === null) return; // user cancelled
       
       newScore = parseFloat(newScore);
       if (isNaN(newScore)) {
          alert('Invalid score entered.');
          return;
       }
       
       // Update Local Array
       r.score = newScore;
       
       const totalQ = r.total || r.totalQuestions || 15;
       const correctAns = newScore;
       const wrongAns = Math.max(0, totalQ - newScore);
       r.correctAnswers = correctAns;
       r.wrongAnswers = wrongAns;
       
       // Reflect in main cetExamResults array
       let allRes = JSON.parse(localStorage.getItem('cetExamResults')) || [];
       let mainIdx = allRes.findIndex(x => x.id === r.id || (x.studentId === r.studentId && x.course === r.course));
       if (mainIdx !== -1) {
          allRes[mainIdx].score = newScore;
          allRes[mainIdx].correctAnswers = correctAns;
          allRes[mainIdx].wrongAnswers = wrongAns;
          localStorage.setItem('cetExamResults', JSON.stringify(allRes));
       }
       
       // Update Supabase Database
       try {
          if (supabase) {
             const { error } = await supabase
                 .from('exam_results')
                 .update({ 
                     score: newScore,
                     correct_answers: correctAns,
                     wrong_answers: wrongAns
                 })
                 .eq('cet_student_id', r.studentId);
             
             if (error) throw error;
             
             // Also update exam_attempts so everything matches perfectly
             await supabase
                 .from('exam_attempts')
                 .update({ score: newScore })
                 .eq('cet_student_id', r.studentId);
                 
             console.log('[Supabase] Result updated successfully');
          }
       } catch (err) {
          console.error('Failed to update result on cloud:', err);
          alert('Note: Score updated locally, but failed to sync to cloud. Error: ' + err.message);
       }
       
       // Refresh UI
       document.getElementById('resultDetailModal').style.display = 'none';
       window.renderResults();
       alert(`Score successfully updated to ${newScore}.`);
    };;

    window.viewAnswersModal = function(idx) {
      const r = window._allResults && window._allResults[idx];
      if (!r) { alert('No result data found.'); return; }
      console.log('View Answers clicked', r);

      // Try to get real answers; fall back to dummy data
      const dummyAnswers = [
        { q: 'What is React?', studentAns: 'A JavaScript Library', correctAns: 'A JavaScript Library', marks: 1, status: 'Correct' },
        { q: 'Which database is used in this project?', studentAns: 'MySQL', correctAns: 'MySQL', marks: 1, status: 'Correct' },
        { q: 'What does HTML stand for?', studentAns: 'HyperText Markup Language', correctAns: 'HyperText Markup Language', marks: 1, status: 'Correct' },
        { q: 'What is Spring Boot?', studentAns: 'A Java Framework', correctAns: 'A Java Framework', marks: 1, status: 'Correct' },
      ];
      const answers = (r.answers && r.answers.length) ? r.answers : dummyAnswers;
      const totalMarks = answers.reduce((sum, a) => sum + (a.status === 'Correct' ? (a.marks || 1) : 0), 0);

      document.getElementById('answersModalName').textContent = `${r.name || r.studentName || ''} — ${r.studentId}`;
      document.getElementById('resultAnswersContent').innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:0.8rem;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:10px;text-align:left;border-bottom:2px solid #e2e8f0;color:#64748b;font-size:10px;text-transform:uppercase;">#</th>
              <th style="padding:10px;text-align:left;border-bottom:2px solid #e2e8f0;color:#64748b;font-size:10px;text-transform:uppercase;">Question</th>
              <th style="padding:10px;text-align:left;border-bottom:2px solid #e2e8f0;color:#64748b;font-size:10px;text-transform:uppercase;">Student Answer</th>
              <th style="padding:10px;text-align:left;border-bottom:2px solid #e2e8f0;color:#64748b;font-size:10px;text-transform:uppercase;">Correct Answer</th>
              <th style="padding:10px;text-align:center;border-bottom:2px solid #e2e8f0;color:#64748b;font-size:10px;text-transform:uppercase;">Marks</th>
              <th style="padding:10px;text-align:center;border-bottom:2px solid #e2e8f0;color:#64748b;font-size:10px;text-transform:uppercase;">Result</th>
            </tr>
          </thead>
          <tbody>
            ${answers.map((a, i) => `
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:10px;color:#64748b;">${i+1}</td>
                <td style="padding:10px;font-weight:600;color:#0f172a;">${a.q || a.question || '--'}</td>
                <td style="padding:10px;color:#334155;">${a.studentAns || a.studentAnswer || '--'}</td>
                <td style="padding:10px;color:#059669;font-weight:600;">${a.correctAns || a.correctAnswer || '--'}</td>
                <td style="padding:10px;text-align:center;font-weight:700;">${a.marks || 1}</td>
                <td style="padding:10px;text-align:center;">
                  <span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:${a.status === 'Correct' ? '#d1fae5' : '#fee2e2'};color:${a.status === 'Correct' ? '#059669' : '#dc2626'};">
                    ${a.status || 'Correct'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top:16px;display:flex;justify-content:space-between;align-items:center;padding:12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
          <p style="font-weight:700;color:#0f172a;margin:0;">Final Saved Score: <span style="color:#4f46e5;font-size:1.1rem;">${r.score !== undefined ? r.score : totalMarks} / ${r.total || r.totalQuestions || answers.length}</span> <span style="font-size:10px;color:#64748b;font-weight:500;margin-left:8px;">(Auto-evaluated: ${totalMarks})</span></p>
          <button type="button" onclick="document.getElementById('resultAnswersModal').style.display='none';" style="background:#4f46e5;color:#fff;font-weight:700;padding:8px 20px;border-radius:8px;border:none;cursor:pointer;">Close</button>
        </div>
      `;
      document.getElementById('resultAnswersModal').style.display = 'flex';
    };

    window.downloadStudentPDF = function(idx) {
      const r = window._allResults && window._allResults[idx];
      if (!r) { alert('No result data found.'); return; }
      console.log('Download PDF clicked', r);

      if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
        alert('PDF library loading... please try again in a moment.'); return;
      }
      const { jsPDF } = window.jspdf || window;
      const doc = new jsPDF();
      const percent = r.total ? ((r.score / r.total) * 100).toFixed(2) : 0;
      const passing = percent >= 40 ? 'PASS' : 'FAIL';

      // Header
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, 210, 28, 'F');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('Shri Rambhau Mhalgi College', 105, 10, { align: 'center' });
      doc.setFontSize(10);
      doc.text('Department of Computer Science | CET Exam Result', 105, 18, { align: 'center' });

      // Title
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Individual Student Result Sheet', 105, 40, { align: 'center' });
      doc.setDrawColor(79, 70, 229);
      doc.setLineWidth(0.5);
      doc.line(20, 43, 190, 43);

      // Details
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      const fields = [
        ['Student ID', r.studentId],
        ['Name', r.name || r.studentName || '--'],
        ['Course', r.course || 'BSc Computer Science'],
        ['Category', r.category || 'OPEN'],
        ['Score', `${r.score || 0} / ${r.total || 0}`],
        ['Percentage', `${percent}%`],
        ['Rank', `#${idx + 1}`],
        ['Status', r.status || 'Completed'],
        ['Date', r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '--'],
        ['Passing Status', passing],
      ];
      let y = 54;
      fields.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, 22, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(value), 70, y);
        y += 10;
      });

      // Signature section
      y += 10;
      doc.setDrawColor(200, 200, 200);
      doc.line(20, y, 190, y);
      y += 12;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Exam Coordinator', 30, y, { align: 'center' });
      doc.text('HOD', 105, y, { align: 'center' });
      doc.text('Principal', 180, y, { align: 'center' });
      y -= 10;
      doc.setDrawColor(80, 80, 80);
      doc.line(10, y, 60, y);
      doc.line(80, y, 130, y);
      doc.line(155, y, 200, y);

      doc.save(`${r.studentId}_Result.pdf`);
    };

    window.handleResultsDownload = function(type) {
      if (!type) return;
      let data = window._allResults;
      if (!data || data.length === 0) {
        data = [
          { studentId: 'CET20261944', name: 'Navnath', course: 'BSc Computer Science', category: 'OBC', score: 1, total: 2, status: 'Completed' },
          { studentId: 'CET20262406', name: 'Navnath', course: 'BSc Computer Science', category: 'OPEN', score: 1, total: 2, status: 'Completed' },
        ];
      }
      console.log('Download Results clicked:', type, data);

      if (type === 'csv') {
        const header = 'Student ID,Name,Course,Category,Score,Total,Percentage,Status,Date\n';
        const rows = data.map(r => {
          const pct = r.total ? ((r.score/r.total)*100).toFixed(2) : 0;
          return `${r.studentId},"${r.name||''}","${r.course||''}","${r.category||''}",${r.score||0},${r.total||0},${pct}%,"${r.status||''}","${r.submittedAt ? new Date(r.submittedAt).toLocaleString() : ''}"`;
        }).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'CET_Results.csv'; a.click();
        URL.revokeObjectURL(url);
      }
      else if (type === 'excel') {
        if (typeof XLSX === 'undefined') { alert('Excel library still loading, please retry.'); return; }
        const wsData = [['Student ID','Name','Course','Category','Score','Total','Percentage','Status','Date']];
        data.forEach(r => {
          const pct = r.total ? ((r.score/r.total)*100).toFixed(2) : 0;
          wsData.push([r.studentId, r.name||'', r.course||'', r.category||'', r.score||0, r.total||0, pct+'%', r.status||'', r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '']);
        });
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, 'Results');
        XLSX.writeFile(wb, 'CET_Results.xlsx');
      }
      else if (type.startsWith('pdf')) {
        if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') { alert('PDF library loading... please retry.'); return; }
        
        let filteredData = data;
        let title = 'CET Exam Overall Merit List';
        let filename = 'CET_Overall_Merit_List.pdf';
        
        if (type === 'pdf_msc_cs') {
           filteredData = data.filter(r => r.course === 'M.Sc Computer Science' || r.course === 'M.Sc. Computer Science');
           title = 'M.Sc Computer Science Merit List';
           filename = 'MSc_Computer_Science_Merit_List.pdf';
        } else if (type === 'pdf_msc_ca') {
           filteredData = data.filter(r => r.course === 'M.Sc Computer Application' || r.course === 'M.Sc. Computer Application');
           title = 'M.Sc Computer Application Merit List';
           filename = 'MSc_Computer_Application_Merit_List.pdf';
        }
        
        if (filteredData.length === 0) {
           alert('No results available for this merit list.');
           return;
        }

        const { jsPDF } = window.jspdf || window;
        const doc = new jsPDF({ orientation: 'landscape' });
        doc.setFillColor(79, 70, 229);
        doc.rect(0, 0, 297, 22, 'F');
        doc.setFontSize(13);
        doc.setTextColor(255,255,255);
        doc.setFont('helvetica','bold');
        doc.text(title, 148, 14, { align: 'center' });
        doc.setTextColor(30,30,30);
        const tableRows = filteredData.map((r, i) => {
          const pct = r.total ? ((r.score/r.total)*100).toFixed(2) : 0;
          return [r.courseRank || (i+1), r.studentId, r.name||'', r.course||'', r.category||'', `${r.score||0}/${r.total||0}`, pct+'%', r.status||''];
        });
        doc.autoTable({
          startY: 30,
          head: [['Rank','Student ID','Name','Course','Category','Score','Percentage','Status']],
          body: tableRows,
          styles: { fontSize: 9, cellPadding: 5 },
          headStyles: { fillColor: [79, 70, 229], textColor: [255,255,255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248,250,252] }
        });
        const finalY = doc.lastAutoTable.finalY + 20;
        doc.setFont('helvetica','bold');
        doc.setFontSize(9);
        doc.line(20, finalY, 70, finalY); doc.line(113, finalY, 163, finalY); doc.line(220, finalY, 270, finalY);
        doc.text('Exam Coordinator', 45, finalY+8, {align:'center'});
        doc.text('Head of Department', 138, finalY+8, {align:'center'});
        doc.text('Principal', 245, finalY+8, {align:'center'});
        doc.save(filename);
      }
      else if (type === 'word') {
        // Fallback: generate a plain-text .doc file since docx CDN may vary
        let content = 'CET EXAM RESULTS\n\nStudent ID\tName\tCourse\tCategory\tScore\tPercentage\tStatus\n';
        data.forEach(r => {
          const pct = r.total ? ((r.score/r.total)*100).toFixed(2) : 0;
          content += `${r.studentId}\t${r.name||''}\t${r.course||''}\t${r.category||''}\t${r.score||0}/${r.total||0}\t${pct}%\t${r.status||''}\n`;
        });
        const blob = new Blob([content], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'CET_Results.doc'; a.click();
        URL.revokeObjectURL(url);
      }
    };

    window.openCategoryReportModal = function() {
       const apps = window.getApplications ? window.getApplications() : [];
       if (!apps || apps.length === 0) {
           alert("No applications found to generate report.");
           return;
       }

       // Calculate statistics
       // Group by Course -> Category
       const stats = {};
       const allCategories = new Set();
       const allCourses = new Set();
       
       apps.forEach(app => {
           let course = app.courseApplied || (app.academicDetails && app.academicDetails.courseApplied) || 'Unknown Course';
           let category = app.category || (app.academicDetails && app.academicDetails.casteCategory) || 'Unknown Category';
           
           allCourses.add(course);
           allCategories.add(category);
           
           if (!stats[course]) stats[course] = {};
           if (!stats[course][category]) stats[course][category] = 0;
           if (!stats[course]['Total']) stats[course]['Total'] = 0;
           
           stats[course][category]++;
           stats[course]['Total']++;
       });
       
       const categoriesArray = Array.from(allCategories).sort();
       window._categoryStatsData = { stats, courses: Array.from(allCourses).sort(), categories: categoriesArray };

       let html = `<table class="w-full text-left border-collapse border border-slate-200">
          <thead>
            <tr class="bg-indigo-50 text-indigo-900 text-xs uppercase tracking-wider font-bold">
              <th class="p-3 border border-slate-200">Course</th>`;
              
       categoriesArray.forEach(c => {
           html += `<th class="p-3 border border-slate-200 text-center">${c}</th>`;
       });
       
       html += `<th class="p-3 border border-slate-200 text-center bg-indigo-100">Total</th>
            </tr>
          </thead>
          <tbody>`;
          
       window._categoryStatsData.courses.forEach(course => {
           html += `<tr class="hover:bg-slate-50">
             <td class="p-3 border border-slate-200 font-bold text-slate-800">${course}</td>`;
           categoriesArray.forEach(c => {
               const count = stats[course][c] || 0;
               html += `<td class="p-3 border border-slate-200 text-center text-slate-600">${count > 0 ? count : '-'}</td>`;
           });
           html += `<td class="p-3 border border-slate-200 text-center font-bold text-indigo-700 bg-indigo-50/50">${stats[course]['Total']}</td>
           </tr>`;
       });
       
       html += `</tbody></table>`;
       
       document.getElementById('categoryReportContent').innerHTML = html;
       document.getElementById('categoryReportModal').style.display = 'flex';
    };

    window.downloadDetailedCategoryMeritList = function(format) {
       const apps = window.getApplications ? window.getApplications() : [];
       if (!apps || apps.length === 0) { alert('No applications to export.'); return; }
       
       // Group students by Caste Category
       const groupedByCaste = {};
       apps.forEach(app => {
           let category = app.category || (app.academicDetails && app.academicDetails.casteCategory) || 'Unknown Category';
           if (!groupedByCaste[category]) groupedByCaste[category] = [];
           groupedByCaste[category].push(app);
       });
       
       const categories = Object.keys(groupedByCaste).sort();
       
       if (format === 'excel') {
          if (typeof XLSX === 'undefined') { alert('Excel library still loading, please retry.'); return; }
          const wb = XLSX.utils.book_new();
          
          categories.forEach(caste => {
             const wsData = [];
             
             // Group by Course within caste
             const courseGroups = {};
             groupedByCaste[caste].forEach(a => {
                const course = a.courseApplied || (a.academicDetails && a.academicDetails.courseApplied) || 'Unknown Course';
                if (!courseGroups[course]) courseGroups[course] = [];
                courseGroups[course].push(a);
             });
             
             Object.keys(courseGroups).sort().forEach(course => {
                wsData.push([`COURSE: ${course} (Category: ${caste}) - Total: ${courseGroups[course].length}`]);
                wsData.push(['Application ID', 'Student ID', 'Applicant Name', 'Mobile', 'Email', 'Status']);
                courseGroups[course].forEach(a => {
                   wsData.push([
                      a.applicationId || '',
                      a.studentId || '',
                      a.fullName || a.name || '',
                      a.mobile || '',
                      a.email || '',
                      a.applicationStatus || a.status || ''
                   ]);
                });
                wsData.push([]); // Empty row spacing
             });
             
             const ws = XLSX.utils.aoa_to_sheet(wsData);
             let sheetName = caste.replace(/[\\\/\?\*\[\]]/g, '').substring(0, 31);
             if(!sheetName) sheetName = "Category";
             XLSX.utils.book_append_sheet(wb, ws, sheetName);
          });
          
          XLSX.writeFile(wb, `Detailed_Caste_Merit_List_${new Date().toISOString().split('T')[0]}.xlsx`);
       } 
       else if (format === 'pdf') {
          if (typeof jspdf === 'undefined') { alert('PDF library still loading, please retry.'); return; }
          const doc = new jspdf.jsPDF();
          let currentY = 15;
          
          doc.setFontSize(16);
          doc.text('Category & Course Wise Merit List', 14, currentY);
          currentY += 10;
          
          categories.forEach(caste => {
             // Check page bounds for main category header
             if (currentY > 260) { doc.addPage(); currentY = 15; }
             
             doc.setFontSize(15);
             doc.setTextColor(255, 255, 255);
             doc.setFillColor(79, 70, 229); // Indigo background
             doc.rect(14, currentY, 182, 8, 'F');
             doc.text(`CATEGORY: ${caste} (Total: ${groupedByCaste[caste].length})`, 16, currentY + 6);
             currentY += 14;
             
             // Group by Course within caste
             const courseGroups = {};
             groupedByCaste[caste].forEach(a => {
                const course = a.courseApplied || (a.academicDetails && a.academicDetails.courseApplied) || 'Unknown Course';
                if (!courseGroups[course]) courseGroups[course] = [];
                courseGroups[course].push(a);
             });
             
             Object.keys(courseGroups).sort().forEach(course => {
                 if (currentY > 260) { doc.addPage(); currentY = 15; }
                 
                 doc.setFontSize(12);
                 doc.setTextColor(51, 65, 85); // Slate 700
                 doc.text(`Course: ${course} (${courseGroups[course].length} Students)`, 14, currentY);
                 currentY += 4;
                 
                 const tableData = courseGroups[course].map(a => {
                    return [
                       a.applicationId || '',
                       a.fullName || a.name || '',
                       a.mobile || '',
                       a.applicationStatus || a.status || ''
                    ];
                 });
                 
                 doc.autoTable({
                    startY: currentY,
                    head: [['App ID', 'Applicant Name', 'Mobile', 'App Status']],
                    body: tableData,
                    theme: 'grid',
                    headStyles: { fillColor: [148, 163, 184] }, // Slate 400
                    margin: { left: 14, right: 14 }
                 });
                 
                 currentY = doc.lastAutoTable.finalY + 10;
             });
             
             currentY += 5; // Extra spacing between categories
          });
          
          doc.save(`Detailed_Caste_Merit_List_${new Date().toISOString().split('T')[0]}.pdf`);
       }
       else if (format === 'word') {
          let content = 'CATEGORY & COURSE WISE DETAILED MERIT LIST\n\n';
          categories.forEach(caste => {
             content += `========================================================\n`;
             content += `CATEGORY: ${caste} (Total: ${groupedByCaste[caste].length} Students)\n`;
             content += `========================================================\n\n`;
             
             const courseGroups = {};
             groupedByCaste[caste].forEach(a => {
                const course = a.courseApplied || (a.academicDetails && a.academicDetails.courseApplied) || 'Unknown Course';
                if (!courseGroups[course]) courseGroups[course] = [];
                courseGroups[course].push(a);
             });
             
             Object.keys(courseGroups).sort().forEach(course => {
                 content += `--- COURSE: ${course} (${courseGroups[course].length} Students) ---\n`;
                 content += `App ID\tName\tMobile\tEmail\n`;
                 courseGroups[course].forEach(a => {
                    content += `${a.applicationId||''}\t${a.fullName||a.name||''}\t${a.mobile||''}\t${a.email||''}\n`;
                 });
                 content += `\n`;
             });
             content += `\n`;
          });
          
          const blob = new Blob([content], { type: 'application/msword' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = `Detailed_Caste_Merit_List_${new Date().toISOString().split('T')[0]}.doc`; a.click();
          URL.revokeObjectURL(url);
       }
    };

    window.downloadSeparateDetailedPDFs = function() {
       const apps = window.getApplications ? window.getApplications() : [];
       if (!apps || apps.length === 0) { alert('No applications to export.'); return; }
       if (typeof jspdf === 'undefined') { alert('PDF library still loading, please retry.'); return; }
       
       // Group by Course
       const groupedByCourse = {};
       apps.forEach(app => {
           let course = app.courseApplied || (app.academicDetails && app.academicDetails.courseApplied) || 'Unknown_Course';
           if (!groupedByCourse[course]) groupedByCourse[course] = [];
           groupedByCourse[course].push(app);
       });
       
       const courses = Object.keys(groupedByCourse);
       if(courses.length === 0) return;
       
       alert(`Generating ${courses.length} separate PDFs (one for each course). Please wait.`);
       
       let delay = 0;
       courses.forEach((course, index) => {
           setTimeout(() => {
               const doc = new jspdf.jsPDF({ orientation: 'landscape' });
               let currentY = 15;
               const courseApps = groupedByCourse[course];
               
               // Main Header
               doc.setFontSize(18);
               doc.setTextColor(30, 58, 138); // Blue 900
               doc.text(`Detailed Applications Report`, 14, currentY);
               currentY += 8;
               
               doc.setFontSize(14);
               doc.setTextColor(15, 23, 42); // Slate 900
               doc.text(`Course: ${course}`, 14, currentY);
               currentY += 6;
               
               doc.setFontSize(12);
               doc.setTextColor(71, 85, 105); // Slate 500
               doc.text(`Total Applications: ${courseApps.length}`, 14, currentY);
               currentY += 10;
               
               // Group by Category within this Course
               const groupedByCategory = {};
               courseApps.forEach(app => {
                   let category = app.category || (app.academicDetails && app.academicDetails.casteCategory) || 'Unknown_Category';
                   if(!groupedByCategory[category]) groupedByCategory[category] = [];
                   groupedByCategory[category].push(app);
               });
               
               const categories = Object.keys(groupedByCategory).sort();
               
               categories.forEach(category => {
                   const catApps = groupedByCategory[category];
                   
                   // Check if page break is needed before category header
                   if(currentY > 170) {
                       doc.addPage();
                       currentY = 15;
                   }
                   
                   // Category Subheader
                   doc.setFontSize(13);
                   doc.setTextColor(255, 255, 255);
                   doc.setFillColor(79, 70, 229); // Indigo 600
                   doc.rect(14, currentY, 269, 8, 'F');
                   doc.text(`Category: ${category} (Total: ${catApps.length})`, 16, currentY + 6);
                   currentY += 12;
                   
                   const tableData = catApps.map(a => {
                      return [
                         a.applicationId || '',
                         a.studentId || '',
                         a.fullName || a.name || '',
                         a.mobile || '',
                         a.email || '',
                         a.gender || (a.personalDetails && a.personalDetails.gender) || '',
                         a.applicationStatus || a.status || '',
                         a.paymentStatus || '',
                         a.score !== undefined ? a.score : '-'
                      ];
                   });
                   
                   doc.autoTable({
                      startY: currentY,
                      head: [['App ID', 'Student ID', 'Applicant Name', 'Mobile', 'Email', 'Gender', 'App Status', 'Payment', 'Score']],
                      body: tableData,
                      theme: 'grid',
                      headStyles: { fillColor: [148, 163, 184], textColor: [255, 255, 255], fontSize: 9 }, // Slate 400
                      bodyStyles: { fontSize: 8 },
                      margin: { left: 14, right: 14 }
                   });
                   
                   currentY = doc.lastAutoTable.finalY + 10;
               });
               
               let safeC = course.replace(/[^a-zA-Z0-9]/g, '_');
               doc.save(`${safeC}_Detailed_List.pdf`);
               
               if(index === courses.length - 1) {
                  if(typeof showAdminToast === 'function') showAdminToast('All Course PDFs generated successfully!', 'success');
               }
           }, delay);
           delay += 1000; // 1 second delay
       });
    };

    window.downloadApplications = function(format) {
       const data = window._currentApplicationsData || [];
       if (data.length === 0) { alert('No applications to export.'); return; }
       if (format === 'excel') {
         if (typeof XLSX === 'undefined') { alert('Excel library still loading, please retry.'); return; }
         const wsData = [['Application ID', 'Student ID', 'Applicant Name', 'Email', 'Mobile', 'Course Applied', 'Category', 'Status', 'Payment Status', 'Applied On']];
         data.forEach(a => {
           const acad = a.academicDetails || {};
           wsData.push([a.applicationId||'', a.studentId||'', a.fullName||a.name||'', a.email||'', a.mobile||'', a.courseApplied||acad.courseApplied||'', a.category||acad.casteCategory||'', a.applicationStatus||a.status||'', a.paymentStatus||'', a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : '']);
         });
         const wb = XLSX.utils.book_new();
         const ws = XLSX.utils.aoa_to_sheet(wsData);
         XLSX.utils.book_append_sheet(wb, ws, 'Applications');
         XLSX.writeFile(wb, `Applications_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
       } else if (format === 'pdf') {
         if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') { alert('PDF library loading... please retry.'); return; }
         const { jsPDF } = window.jspdf || window;
         const doc = new jsPDF({ orientation: 'landscape' });
         doc.text('Applications Report', 14, 15);
         const tableRows = data.map(a => {
           const acad = a.academicDetails || {};
           return [a.applicationId||'', a.fullName||a.name||'', a.email||'', a.mobile||'', a.courseApplied||acad.courseApplied||'', a.category||acad.casteCategory||'', a.applicationStatus||a.status||'', a.paymentStatus||''];
         });
         doc.autoTable({ startY: 25, head: [['Application ID', 'Applicant Name', 'Email', 'Mobile', 'Course', 'Category', 'App Status', 'Payment Status']], body: tableRows, styles: { fontSize: 8 } });
         doc.save(`Applications_Report_${new Date().toISOString().split('T')[0]}.pdf`);
       } else if (format === 'word') {
         let content = 'APPLICATIONS REPORT\n\nApplication ID\tApplicant Name\tEmail\tMobile\tCourse\tCategory\tApp Status\tPayment Status\tApplied On\n';
         data.forEach(a => {
           const acad = a.academicDetails || {};
           content += `${a.applicationId||''}\t${a.fullName||a.name||''}\t${a.email||''}\t${a.mobile||''}\t${a.courseApplied||acad.courseApplied||''}\t${a.category||acad.casteCategory||''}\t${a.applicationStatus||a.status||''}\t${a.paymentStatus||''}\t${a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : ''}\n`;
         });
         const blob = new Blob([content], { type: 'application/msword' });
         const url = URL.createObjectURL(blob);
         const link = document.createElement('a'); link.href = url; link.download = `Applications_Report_${new Date().toISOString().split('T')[0]}.doc`; link.click();
         URL.revokeObjectURL(url);
       }
    };

    window.downloadDocumentsReport = function(format) {
       const data = window._currentDocumentsData || [];
       if (data.length === 0) { alert('No document data to export.'); return; }
       
       const cetDocs = JSON.parse(localStorage.getItem('cetDocuments')) || {};
       
       const getDocCount = (s) => {
         // This is a naive count based on local storage fallback as real cloud docs requires async fetch
         let docs = cetDocs[s.applicationId] || cetDocs[s.studentId] || null;
         if (!docs) docs = s.uploadedFiles || {};
         const docKeys = Object.keys(docs).filter(k => docs[k] && docs[k].startsWith('data:'));
         return docKeys.length;
       };

       if (format === 'excel') {
         if (typeof XLSX === 'undefined') { alert('Excel library still loading, please retry.'); return; }
         const wsData = [['Application ID', 'Student ID', 'Applicant Name', 'Course', 'Category', 'Status', 'Docs Count']];
         data.forEach(s => {
           wsData.push([s.applicationId||'', s.studentId||'', s.fullName||s.name||'', s.courseApplied||'', s.category||'', s.applicationStatus||'', getDocCount(s)]);
         });
         const wb = XLSX.utils.book_new();
         const ws = XLSX.utils.aoa_to_sheet(wsData);
         XLSX.utils.book_append_sheet(wb, ws, 'Documents');
         XLSX.writeFile(wb, `Documents_Verification_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
       } else if (format === 'pdf') {
         if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') { alert('PDF library loading... please retry.'); return; }
         const { jsPDF } = window.jspdf || window;
         const doc = new jsPDF({ orientation: 'portrait' });
         doc.text('Documents Verification Report', 14, 15);
         const tableRows = data.map(s => [s.applicationId||'', s.fullName||s.name||'', s.courseApplied||'', s.category||'', getDocCount(s)]);
         doc.autoTable({ startY: 25, head: [['App ID', 'Applicant Name', 'Course', 'Category', 'Docs Count']], body: tableRows });
         doc.save(`Documents_Verification_Report_${new Date().toISOString().split('T')[0]}.pdf`);
       } else if (format === 'word') {
         let content = 'DOCUMENTS VERIFICATION REPORT\n\nApplication ID\tApplicant Name\tCourse\tCategory\tStatus\tDocs Count\n';
         data.forEach(s => {
           content += `${s.applicationId||''}\t${s.fullName||s.name||''}\t${s.courseApplied||''}\t${s.category||''}\t${s.applicationStatus||''}\t${getDocCount(s)}\n`;
         });
         const blob = new Blob([content], { type: 'application/msword' });
         const url = URL.createObjectURL(blob);
         const link = document.createElement('a'); link.href = url; link.download = `Documents_Verification_Report_${new Date().toISOString().split('T')[0]}.doc`; link.click();
         URL.revokeObjectURL(url);
       }
    };
    window.downloadWhatsAppContacts = function() {
        const data = window._currentApplicationsData || [];
        if (data.length === 0) { 
            alert('No applications found.'); 
            return; 
        }
        
        // Extract mobile numbers from all valid applications
        const numbers = data.map(a => a.mobile).filter(Boolean);
        
        // Remove duplicates and empty strings
        const uniqueNumbers = [...new Set(numbers)];
        
        if (uniqueNumbers.length === 0) { 
            alert('No mobile numbers found in the current list.'); 
            return; 
        }
        
        // Generate VCF content
        let vcfContent = '';
        uniqueNumbers.forEach((num, index) => {
            // Get student name if available, otherwise just use generic name
            const student = data.find(a => a.mobile === num);
            const rawName = student && (student.fullName || student.name) ? student.fullName || student.name : `Student ${index + 1}`;
            // Remove any commas or newlines from the name to prevent VCF corruption
            const cleanName = rawName.replace(/[\r\n,]/g, ' ').trim();
            vcfContent += `BEGIN:VCARD\nVERSION:3.0\nFN:CET MSC ${cleanName}\nTEL;TYPE=CELL:${num}\nEND:VCARD\n`;
        });
        
        // Create and trigger download
        const blob = new Blob([vcfContent], { type: 'text/vcard' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CET_WhatsApp_Contacts_${new Date().toISOString().split('T')[0]}.vcf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert(`✅ Successfully downloaded ${uniqueNumbers.length} contacts!\n\nPlease open this .vcf file on your mobile phone to save all numbers instantly.`);
    };
  