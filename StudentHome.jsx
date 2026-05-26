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

    const handleDownloadHallTicket = () => {
        if (!student || student.status !== 'approved') {
            alert("⚠️ Your application is not yet approved. Hall ticket is only available for approved candidates.");
            return;
        }

        // Logic to generate a PDF Mockup (using window.print or a dummy blob for this UI demo)
        const hallTicketContent = `
            ==================================================
            ENTRANCE EXAM HALL TICKET - 2026
            New Arts, Commerce and Science College, Ahmednagar
            ==================================================
            
            Name: ${student.fullName}
            Candidate ID: ${student.studentId}
            Exam Date: ${schedule?.date || 'To be announced'}
            Exam Time: ${schedule?.time || 'To be announced'}
            Course: ${student.courseApplied}
            
            [Photo of ${student.fullName}]
            
            --------------------------------------------------
            Instructions:
            - Carry this ticket to the exam center.
            - Bring original ID proof.
            ==================================================
        `;

        const element = document.createElement("a");
        const file = new Blob([hallTicketContent], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = `HallTicket_${student.studentId}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
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

                    {/* Card 2: Download Hall Ticket */}
                    <div className={`p-8 rounded-3xl shadow-sm border transition-all ${
                        student?.status === 'approved' 
                        ? 'bg-white border-slate-200 hover:border-indigo-300' 
                        : 'bg-slate-50 border-slate-100 opacity-60'
                    }`}>
                        <div className={`w-12 h-12 flex items-center justify-center rounded-2xl mb-6 text-2xl ${
                            student?.status === 'approved' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'
                        }`}>🎫</div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Download Hall Ticket</h3>
                        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                            Official admit card for the computer science department entrance examination.
                        </p>
                        <button 
                            onClick={handleDownloadHallTicket}
                            disabled={student?.status !== 'approved'}
                            className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                                student?.status === 'approved'
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 active:scale-95'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            {student?.status === 'approved' ? 'Download PDF Admit Card' : 'Unavailable (Pending Approval)'}
                        </button>
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
