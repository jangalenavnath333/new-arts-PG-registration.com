
    import DB, { getDefaultQuestions } from '../js/db.js';

    // System Guard
    if (!DB.isAdminLoggedIn()) window.location.href = 'login.html';

    window.addEventListener('DOMContentLoaded', () => {
      window.renderOverview();
      window.loadScheduleForm();
      handleRoute(); // Initialize routing
    });

    // Chart instances
    let statusChart = null;
    let scoresChart = null;

    // Routing Logic
    window.addEventListener('popstate', handleRoute);

    function handleRoute() {
      let path = window.location.pathname;
      let hash = window.location.hash;
      
      let tab = 'overview'; // default
      
      if (path.includes('/applications') || hash === '#applications') tab = 'applications';
      else if (path.includes('/approved-students') || hash === '#students') tab = 'students';
      else if (path.includes('/exam-settings') || hash === '#schedule') tab = 'schedule';
      else if (path.includes('/question-bank') || hash === '#questions') tab = 'questions';
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
          'students': '/admin/approved-students',
          'schedule': '/admin/exam-settings',
          'questions': '/admin/question-bank',
          'results': '/admin/live-results'
        };
        // Use hash-based routing to prevent 404s on reload since there's no server-side React Router
        window.history.pushState({}, '', '#' + tab);
      }
      activateTabUI(tab);
    }

    function activateTabUI(tab) {
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(n => {
        n.classList.remove('bg-indigo-600', 'text-white');
        n.classList.add('text-slate-400');
      });
      
      const tabElement = document.getElementById('tab-' + tab);
      if (tabElement) tabElement.classList.add('active');
      
      const activeNav = document.getElementById('nav-' + tab);
      if (activeNav) {
        activeNav.classList.remove('text-slate-400');
        activeNav.classList.add('bg-indigo-600', 'text-white');
      }

      const titles = { overview:'Dashboard Overview', applications:'Student Applications', students:'Approved Students Registry', schedule:'Examination Scheduling', questions:'Secure Question Bank', results:'Live Exam Results' };
      document.getElementById('pageTitle').textContent = titles[tab] || 'Dashboard';

      if (tab === 'applications') window.renderApplications();
      if (tab === 'students') window.renderStudents();
      if (tab === 'questions') window.renderQuestions();
      if (tab === 'results') window.renderResults();
    }

    // ============================================
    // APPLICATION LOGIC (Robust Fixes Implemented)
    // ============================================
    window.renderOverview = function() {
      const studs = DB.getStudents() || [];
      const pending = studs.filter(s => s.status === 'pending').length;
      const approved = studs.filter(s => s.status === 'approved').length;
      const rejected = studs.filter(s => s.status === 'rejected').length;
      const attempted = studs.filter(s => s.hasAttempted).length;

      document.getElementById('s-total').textContent = studs.length;
      document.getElementById('s-pending').textContent = pending;
      document.getElementById('s-approved').textContent = approved;
      document.getElementById('s-rejected').textContent = rejected;
      document.getElementById('s-attempted').textContent = attempted;
      document.getElementById('pendingBadge').textContent = pending || '';

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

    // --- DATA MIGRATION ---
    window.getApplications = function() {
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
      return apps;
    }
    
    window.saveApplications = function(apps) {
      localStorage.setItem('cetApplications', JSON.stringify(apps));
    }

    window.renderApplications = function() {
      const filter = document.getElementById('filterStatus')?.value || '';
      const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
      let apps = getApplications();

      if (filter) apps = apps.filter(s => (s.applicationStatus || 'Submitted') === filter);
      if (search) {
        apps = apps.filter(s => 
          (s.fullName || '').toLowerCase().includes(search) || 
          (s.email || '').toLowerCase().includes(search) || 
          (s.applicationId || '').toLowerCase().includes(search)
        );
      }

      apps = apps.slice().reverse();
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
          'Rejected': 'bg-red-100 text-red-700 border-red-200'
        };
        const payColors = {
          'Pending Verification': 'bg-slate-100 text-slate-700 border-slate-200',
          'Payment Done': 'bg-indigo-100 text-indigo-700 border-indigo-200',
          'Payment Rejected': 'bg-red-100 text-red-700 border-red-200'
        };
        const appStatus = s.applicationStatus || 'Submitted';
        const payStatus = s.paymentStatus || 'Pending Verification';
        const statusClass = badgeColors[appStatus] || badgeColors['Submitted'];
        const pStatusClass = payColors[payStatus] || payColors['Pending Verification'];
        
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
              <p class="text-sm font-medium text-slate-800">${acad.courseApplied || '--'}</p>
              <p class="text-xs text-slate-500 mt-0.5"><span class="font-bold text-indigo-600">12th:</span> ${acad.twelfthPercent || '--'}%</p>
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
              ${appStatus !== 'Approved' ? `
                <button onclick="approveStudent('${s.applicationId}')" class="bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1.5 rounded text-xs font-bold shadow-sm transition">Approve</button>
              ` : ''}
              ${appStatus !== 'Rejected' ? `
                <button onclick="rejectStudent('${s.applicationId}')" class="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1.5 rounded text-xs font-bold border border-red-200 transition">Reject</button>
              ` : ''}
              <button onclick="deleteApplication('${s.applicationId}')" class="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1.5 rounded text-xs font-bold border border-slate-300 transition ml-1">Delete</button>
            </td>
          </tr>
        `;
      }).join('');
    }

    window.previewApplication = function(appId) {
      const apps = getApplications();
      const app = apps.find(a => a.applicationId === appId);
      if (!app) return;
      
      const acad = app.academicDetails || {};
      let docsHtml = '';
      if (app.uploadedFiles) {
        for (const [key, data] of Object.entries(app.uploadedFiles)) {
          if (data.startsWith('data:image')) {
            docsHtml += `<div class="mb-4"><p class="text-xs font-bold text-slate-500 mb-1 uppercase">${key}</p><img src="${data}" class="max-w-full h-auto rounded border border-slate-200 shadow-sm" /></div>`;
          } else if (data.startsWith('data:application/pdf')) {
            docsHtml += `<div class="mb-4"><p class="text-xs font-bold text-slate-500 mb-1 uppercase">${key}</p><a href="${data}" target="_blank" class="text-indigo-600 underline text-sm">Open/View PDF</a></div>`;
          } else {
            docsHtml += `<div class="mb-4"><p class="text-xs font-bold text-slate-500 mb-1 uppercase">${key}</p><p class="text-sm">File attached</p></div>`;
          }
        }
      }
      
      document.getElementById('previewContent').innerHTML = `
        <div class="grid grid-cols-2 gap-4">
          <div><p class="text-xs text-slate-500">Applicant Name</p><p class="font-bold">${app.fullName}</p></div>
          <div><p class="text-xs text-slate-500">Email</p><p class="font-bold">${app.email}</p></div>
          <div><p class="text-xs text-slate-500">Mobile</p><p class="font-bold">${app.mobile}</p></div>
          <div><p class="text-xs text-slate-500">DOB</p><p class="font-bold">${app.dob}</p></div>
          <div class="col-span-2"><p class="text-xs text-slate-500">Address</p><p class="font-bold">${app.address}</p></div>
          <div><p class="text-xs text-slate-500">Course</p><p class="font-bold">${acad.courseApplied}</p></div>
          <div><p class="text-xs text-slate-500">12th Stream</p><p class="font-bold">${acad.stream}</p></div>
          <div><p class="text-xs text-slate-500">10th %</p><p class="font-bold">${acad.tenthPercent}%</p></div>
          <div><p class="text-xs text-slate-500">12th %</p><p class="font-bold">${acad.twelfthPercent}%</p></div>
          <div><p class="text-xs text-slate-500">Transaction ID/UTR</p><p class="font-bold text-indigo-600">${app.transactionId || '--'}</p></div>
          <div><p class="text-xs text-slate-500">Payment Status</p><p class="font-bold">${app.paymentStatus || 'Pending Verification'}</p></div>
        </div>
        <hr class="border-slate-200" />
        <h4 class="font-bold text-slate-800">Uploaded Documents</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${docsHtml || '<p class="text-sm text-slate-500">No documents uploaded.</p>'}
        </div>
      `;
      
      document.getElementById('previewPaymentActions').innerHTML = `
        <button onclick="updatePaymentStatus('${appId}', 'Payment Done')" class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition">Mark Payment Done</button>
        <button onclick="updatePaymentStatus('${appId}', 'Pending Verification')" class="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition">Mark Pending</button>
        <button onclick="updatePaymentStatus('${appId}', 'Payment Rejected')" class="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg text-xs font-bold transition">Mark Rejected</button>
      `;
      
      document.getElementById('previewModal').classList.remove('hidden');
    }
    
    window.updatePaymentStatus = function(appId, status) {
      let apps = getApplications();
      let app = apps.find(a => a.applicationId === appId);
      if(app) {
        app.paymentStatus = status;
        saveApplications(apps);
        renderApplications();
        previewApplication(appId); // refresh modal
      }
    }
    
    window.deleteApplication = function(appId) {
      if(!confirm('Are you sure you want to delete this application?')) return;
      let apps = getApplications();
      apps = apps.filter(a => a.applicationId !== appId);
      saveApplications(apps);
      renderApplications();
      renderOverview();
    }

    window.approveStudent = function(appId) {
      let apps = getApplications();
      let app = apps.find(a => a.applicationId === appId);
      if(!app) return;
      
      if (app.paymentStatus !== 'Payment Done') {
        alert('Please verify payment before approving this application.');
        return;
      }
      
      if(!confirm('Approve and generate ID?')) return;
      
      app.applicationStatus = 'Approved';
      saveApplications(apps);
      
      // Update in main DB for exam access
      if(app.studentId) {
        DB.approveStudent(app.studentId);
      }
      
      renderApplications();
      renderOverview();
      alert('Student officially approved! ID Generated.');
    }
    
    window.rejectStudent = function(appId) {
      if(!confirm('Reject this application?')) return;
      let apps = getApplications();
      let app = apps.find(a => a.applicationId === appId);
      if(app) {
        app.applicationStatus = 'Rejected';
        saveApplications(apps);
        if(app.studentId) DB.rejectStudent(app.studentId, 'Rejected via dashboard');
        renderApplications();
        renderOverview();
      }
    }

    // ============================================
    // APPROVED STUDENTS & EXAM RESULTS
    // ============================================
    window.renderStudents = function() {
      const students = DB.getStudents().filter(s => s.status === 'approved');
      const results = DB.getResults();
      document.getElementById('studentsTableBody').innerHTML = students.map(s => {
        const r = results.find(x => x.studentId === s.id);
        return `
          <tr class="hover:bg-slate-50">
            <td class="p-4 font-mono text-sm text-indigo-600 font-bold">${s.studentId}</td>
            <td class="p-4 font-medium text-slate-800 text-sm">${s.fullName}</td>
            <td class="p-4 text-sm text-slate-600">${s.courseApplied}</td>
            <td class="p-4">${s.hasAttempted ? '<span class="text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded border border-emerald-200">Completed</span>' : '<span class="text-amber-600 font-bold text-xs bg-amber-50 px-2 py-1 rounded border border-amber-200">Pending Exam</span>'}</td>
            <td class="p-4 text-right font-bold text-slate-900">${r ? `${r.score}/${r.total}` : '--'}</td>
          </tr>
        `;
      }).join('') || '<tr><td colspan="5" class="p-8 text-center text-slate-500">No approved students yet.</td></tr>';
    }

    // ============================================
    // SCHEDULING & QUESTIONS
    // ============================================
    window.loadScheduleForm = function() {
      let config = { examType: 'CET Exam', examDate: '', startTime: '', durationMinutes: 60 };
      try { config = JSON.parse(localStorage.getItem('cetExamConfig')) || config; } catch(e){}
      
      document.getElementById('examType').value = config.examType || 'CET Exam';
      document.getElementById('examDate').value = config.examDate;
      document.getElementById('examTime').value = config.startTime;
      document.getElementById('examDuration').value = config.durationMinutes;
      
      renderConfigPreview(config);
    }
    
    window.renderConfigPreview = function(config) {
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
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div><p class="text-slate-500 mb-1">Exam Type</p><p class="font-bold text-slate-800">${config.examType || 'CET Exam'}</p></div>
          <div><p class="text-slate-500 mb-1">Date</p><p class="font-bold text-slate-800">${start.toLocaleDateString()}</p></div>
          <div><p class="text-slate-500 mb-1">Duration</p><p class="font-bold text-slate-800">${config.durationMinutes} mins</p></div>
          <div><p class="text-slate-500 mb-1">Start Time</p><p class="font-bold text-slate-800">${start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p></div>
          <div><p class="text-slate-500 mb-1">End Time</p><p class="font-bold text-slate-800">${end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p></div>
        </div>
      `;
    }
    
    window.saveSchedule = function() {
      const date = document.getElementById('examDate').value;
      const time = document.getElementById('examTime').value;
      const duration = parseInt(document.getElementById('examDuration').value) || 60;
      
      if(!date || !time) {
        alert("Please select both Date and Start Time.");
        return;
      }
      
      const startObj = new Date(`${date}T${time}`);
      const endObj = new Date(startObj.getTime() + duration * 60000);
      const endTimeStr = endObj.toTimeString().substring(0, 5); // HH:MM
      
      const examType = document.getElementById('examType').value;
      const config = {
        examType: examType,
        examDate: date,
        startTime: time,
        endTime: endTimeStr,
        durationMinutes: duration
      };
      
      localStorage.setItem('cetExamConfig', JSON.stringify(config));
      alert('Exam configuration saved securely.');
      renderConfigPreview(config);
    }

    let currentlyViewingSetId = null;
    let editingQuestionId = null;

    window.getQuestionSets = function() {
      let sets = [];
      try { sets = JSON.parse(localStorage.getItem('cetQuestionSets')) || []; } catch(e){}
      return sets;
    }

    window.saveQuestionSets = function(sets) {
      localStorage.setItem('cetQuestionSets', JSON.stringify(sets));
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
      
      document.getElementById('qCorrectSingle').value = q.correct !== undefined ? q.correct : '0';
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
      const addForm = document.getElementById('addQuestionForm');
      const listContainer = document.getElementById('questionsList');

      if (!targetSet) {
        document.getElementById('activeSetTitle').textContent = 'Select a Set';
        document.getElementById('qCountLabel').textContent = '';
        btnActivate.classList.add('hidden');
        addForm.classList.add('hidden');
        listContainer.innerHTML = '<div class="text-center text-slate-400 mt-10 text-sm">Select or create a question set to begin.</div>';
        return;
      }

      document.getElementById('activeSetTitle').textContent = targetSet.name;
      document.getElementById('qCountLabel').textContent = `${targetSet.questions.length} questions in this set.`;
      
      if (targetSet.isActive) {
        btnActivate.classList.add('hidden');
      } else {
        btnActivate.classList.remove('hidden');
      }
      
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
        \`;
      }).join('') || '<p class="text-sm text-slate-400 text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">No questions added yet. Use the form above.</p>';
    }

    window.renderResults = function() {
      let res = [];
      try { res = JSON.parse(localStorage.getItem('cetExamResults')) || []; } catch(e){}
      
      document.getElementById('resultsTableBody').innerHTML = res.reverse().map(r => {
        let statusBadge = '<span class="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold border border-emerald-200">Submitted</span>';
        if (r.status === 'Terminated due to warnings') {
          statusBadge = '<span class="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold border border-red-200">Terminated</span>';
        } else if (r.status === 'Auto Submitted' || r.autoSubmitted) {
          statusBadge = '<span class="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold border border-amber-200">Auto Submitted</span>';
        }
        
        return `
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="p-4 font-mono font-bold text-sm text-indigo-600">${r.studentId}</td>
          <td class="p-4 font-medium text-slate-900 text-sm">${r.name || r.studentName || 'Unknown'}</td>
          <td class="p-4 font-bold text-lg text-slate-800">${(r.score || 0) + (r.manualScore || 0)} <span class="text-xs text-slate-400 font-normal">/ ${r.totalQuestions || r.total}</span></td>
          <td class="p-4">${statusBadge}</td>
          <td class="p-4 text-slate-500 text-sm">${r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '--'}</td>
          <td class="p-4 text-right"><button onclick="evaluateResult('${r.id}')" class="text-indigo-600 font-bold hover:underline text-sm bg-indigo-50 px-3 py-1.5 rounded border border-indigo-100">Evaluate</button></td>
        </tr>
      `}).join('') || '<tr><td colspan="5" class="p-8 text-center text-slate-500">No results submitted yet.</td></tr>';
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
    
    // Assign DB to window for inline onclick hooks in HTML
    window.DB = DB;
  