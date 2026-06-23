import React, { useState, useEffect } from 'react';
import DB from '../js/db.js';

// Custom hook to mimic the dashboard functionality in a React context
const StudentHome = () => {
    const [student, setStudent] = useState(null);
    const [schedule, setSchedule] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch data from our DB mock
        const currentStudent = DB.getCurrentStudent();
        const examSchedule = DB.getSchedule();
        
        if (currentStudent) {
            setStudent(currentStudent);
        }
        setSchedule(examSchedule);
        setLoading(false);
    }, []);

    const handleDownloadHallTicket = async () => {
        if (!student || student.status !== 'approved') {
            alert("⚠️ Your application is not yet approved. Hall ticket is only available for approved candidates.");
            return;
        }

        try {
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF('p', 'mm', 'a4');
            
            // Photo handling
            let photoData = null;
            const sid = student.id || student.studentId;
            // Fetch photo from supabase if possible
            try {
                const { getClient } = await import('../js/supabase-db.js');
                const supaClient = getClient();
                if (supaClient && sid) {
                    const { data } = await supaClient.from('student_documents').select('file_url').eq('student_id', sid).in('doc_type', ['photoFile', 'passport_photo']).limit(1).maybeSingle();
                    if (data && data.file_url) photoData = data.file_url;
                }
            } catch(e) { console.log(e); }
            
            if (!photoData) {
                photoData = student.photoData || student.passportPhotoUrl || (student.application_documents && student.application_documents.passport_photo) || (student.uploadedFiles && student.uploadedFiles.photoFile) || localStorage.getItem('cet_student_photo_' + sid) || null;
            }

            let examDateStr = '25 June 2026';
            let examTimeStr = '09:30 AM to 11:00 AM';
            let durationStr = '90 Minutes';
            
            // Outer Borders
            doc.setDrawColor(30, 58, 138); doc.setLineWidth(1); doc.rect(10, 10, 190, 277);
            doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3); doc.rect(12, 12, 186, 273);

            // Header Yellow Box
            doc.setFillColor(255, 252, 230); // light yellow
            doc.rect(15, 15, 180, 25, 'F');
            
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
                  console.warn('Direct image fetch failed, trying proxy...', src);
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
                     return null;
                  }
               }
            };

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
            
            // Title
            doc.setTextColor(0, 0, 0); doc.setFontSize(14);
            doc.text("ADMIT CARD (HALL TICKET)", 105, 55, { align: "center" });
            doc.setFontSize(12);
            doc.text(student.courseApplied ? student.courseApplied.toUpperCase() : "M.SC. COMPUTER SCIENCE", 105, 62, { align: "center" });
            
            // Outer border for table
            doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.5);
            doc.rect(15, 66, 180, 80);
            
            // Photo Area vertical line
            doc.line(145, 66, 145, 146); 
            
            // Draw rows
            const rows = [
               ["Full Name:", student.fullName || ''],
               ["Roll No / CET ID:", student.studentId || ''],
               ["Mobile Number:", student.mobile || ''],
               ["Exam Date:", examDateStr],
               ["Exam Time:", examTimeStr],
               ["Duration:", durationStr],
               ["Login ID:", student.email || student.mobile],
               ["Password:", student.password_hash || student.mobile]
            ];
            
            let yLine = 66;
            rows.forEach((r, i) => {
               doc.setFontSize(10);
               doc.setFont("helvetica", "bold"); doc.text(r[0], 18, yLine + 6);
               doc.setFont("helvetica", "normal"); doc.text(r[1], 75, yLine + 6);
               
               yLine += 10;
               if (i < 7) {
                  doc.setLineWidth(0.2); doc.line(15, yLine, 145, yLine); // Horizontal line
               }
            });
            
            doc.line(70, 66, 70, 146);
            
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

            // Add Important Instructions
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(180, 0, 0);
            doc.text("IMPORTANT INSTRUCTIONS FOR CANDIDATES:", 15, 155);
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);
            
            const instructions = [
               "1. Schedule: Offline Exam on 25 June 2026 (09:30 AM to 11:00 AM).",
               "   Report strictly at 09:00 AM at CASAS Dept (1st Floor, Admin Building).",
               "2. Format: Offline mode. Total 100 Marks (75 Questions).",
               "3. Counseling: Merit list and Counseling Round will be on the same day at 01:00 PM.",
               "4. Admission: Selected students must pay Rs. 1000/- provisional fee on the spot.",
               "5. Documents: Bring Original Caste Certificate (if applicable) and valid ID proof."
            ];
            
            let instY = 162;
            instructions.forEach(inst => {
               doc.text(inst, 15, instY);
               instY += 5.5;
            });
            
            // Add Student Signature box
            doc.rect(20, 195, 50, 15);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text("Student's Signature", 28, 216);

            // Add Authority Signature
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text("Prof. Arun Gangarde", 130, 205);
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text("Head, CASAS", 130, 210);
            doc.text("(Center for Advanced Studies in", 130, 215);
            doc.text("Applied Sciences)", 130, 220);

            doc.save(`CET_AdmitCard_${student.studentId || 'Pending'}.pdf`);
        } catch(error) {
            console.error("Error generating hall ticket:", error);
            alert("Error generating hall ticket. Please try again.");
        }
    };

    if (loading) return <div className="p-10 text-center">Loading Portal...</div>;

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
            
            {/* 1. Official College Header */}
            <header className="bg-white shadow-sm border-b border-slate-200">
                <div className="w-full flex flex-col items-center py-4 px-6 md:flex-row md:justify-between max-w-7xl mx-auto">
                    <img 
                      src="/images/logo.png" 
                      alt="College Banner" 
                      className="h-16 md:h-20 object-contain mb-4 md:mb-0"
                    />
                    <div className="text-center md:text-right">
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Portal Version 2.0</span>
                        <h4 className="text-slate-700 font-bold">Student Admission Dashboard</h4>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-10">
                
                {/* Profile Welcome Section */}
                <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800">Hello, {student?.fullName || 'Candidate'}</h1>
                        <p className="text-slate-500 mt-1 font-medium italic">Welcome to your Computer Science entrance portal.</p>
                    </div>
                    <div className="flex gap-3">
                         <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                             student?.status === 'approved' 
                             ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                             : 'bg-amber-50 text-amber-600 border-amber-200'
                         }`}>
                             Status: {student?.status || 'Pending'}
                         </span>
                    </div>
                </div>

                {/* Dashboard Responsive Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Card 1: Application Status */}
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 flex items-center justify-center rounded-2xl mb-6 text-2xl">📋</div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Application Status</h3>
                        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                            {student?.status === 'approved' 
                                ? 'Congratulations! Your application has been approved. You are eligible for the entrance exam.' 
                                : 'Your application is currently being reviewed by the administration. Check back soon.'}
                        </p>
                        <div className="pt-4 border-t border-slate-100 font-bold text-indigo-600 text-sm cursor-pointer hover:underline">
                            View Full Application Details →
                        </div>
                    </div>

                    {/* Card 3: Upcoming Exam */}
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl group-hover:scale-110 transition-transform">🎓</div>
                        <h3 className="text-xl font-bold mb-2">Upcoming Exam</h3>
                        <div className="space-y-4 my-6">
                            <div className="flex items-center gap-3">
                                <span className="w-8 font-bold text-indigo-400">📅</span>
                                <span className="text-sm font-medium">{schedule?.date || 'Not Scheduled Yet'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-8 font-bold text-indigo-400">⏰</span>
                                <span className="text-sm font-medium">{schedule?.time || '00:00 AM'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-8 font-bold text-indigo-400">📍</span>
                                <span className="text-sm font-medium">Online Examination Center</span>
                            </div>
                        </div>
                        <button 
                            disabled={!schedule?.isActive}
                            className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                                schedule?.isActive
                                ? 'bg-indigo-500 text-white hover:bg-indigo-400'
                                : 'bg-white/10 text-white/40 cursor-not-allowed'
                            }`}
                        >
                            {schedule?.isActive ? 'Launch Exam Portal →' : 'Entrance Portal Closed'}
                        </button>
                    </div>

                </div>

                {/* Information Alert */}
                <div className="mt-8 bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-4 text-blue-800">
                    <span className="text-xl">ℹ️</span>
                    <div>
                        <p className="text-sm font-bold">Important Information:</p>
                        <p className="text-xs mt-1 leading-relaxed">Please ensure you have a working webcam and stable internet connection before the exam session begins. Mock tests are available 24/7 for practice.</p>
                    </div>
                </div>

            </main>

            <footer className="py-10 text-center border-t border-slate-200 mt-10">
                <p className="text-xs text-slate-400 font-medium">© 2026 Department of Computer Science, NACS College Ahmednagar. All rights reserved.</p>
            </footer>

        </div>
    );
};

export default StudentHome;
