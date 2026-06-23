import React, { useState } from 'react';

const StudentDashboard = () => {
  const [activeTab, setActiveTab] = useState('My Profile');

  const menuItems = [
    { name: 'My Profile', icon: '👤' },
    { name: 'Mock Test', icon: '📝' },
    { name: 'View Results', icon: '📊' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      
      {/* 1. Header with College Banner */}
      <header className="bg-white shadow-md z-10">
        <div className="w-full bg-white flex justify-center p-2">
            {/* The standard college banner image */}
            <img 
              src="/images/logo.png" 
              alt="College Banner" 
              className="h-16 md:h-20 w-auto object-contain"
            />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* 2. Professional Sidebar */}
        <aside className="w-64 bg-slate-900 text-slate-300 hidden md:flex flex-col shadow-xl">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-xl font-bold text-white tracking-tight">Student Portal</h2>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-semibold text-indigo-400">Computer Science</p>
          </div>
          
          <nav className="flex-1 py-4 px-3 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  activeTab === item.name 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                    : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium text-sm">{item.name}</span>
              </button>
            ))}
          </nav>
          
          <div className="p-4 border-t border-slate-800">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 hover:text-red-400 font-medium text-sm transition-colors">
              <span>🚪</span> Logout
            </button>
          </div>
        </aside>

        {/* 3. Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-10">
          
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-slate-900">Welcome back, Student!</h1>
            <p className="text-slate-500 font-medium">Manage your examination details and track your progress here.</p>
          </div>

          {/* Professional Grid System */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Profile Statistics/Summary Card */}
            <div className="col-span-1 lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-slate-800 uppercase tracking-wide text-xs">Current Application Status</h3>
                <span className="bg-emerald-100 text-emerald-700 text-xs px-3 py-1 rounded-full font-bold">Approved</span>
              </div>
              <div className="space-y-4">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 w-3/4 rounded-full"></div>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Total Completion</span>
                    <span className="text-indigo-600 font-bold">75% Complete</span>
                </div>
              </div>
            </div>

            {/* Notification/Action Card */}
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-2xl shadow-lg shadow-indigo-200 text-white">
              <h3 className="font-bold text-lg mb-2">Upcoming Exam</h3>
              <p className="text-indigo-100 text-sm mb-4">Your Mock Test is scheduled for next Monday. Don't forget to practice!</p>
              <button className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                Practice Now →
              </button>
            </div>

            {/* Quick Access Grid Items */}


            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-300 transition-colors group">
                <div className="text-2xl mb-4 p-3 bg-purple-50 w-fit rounded-xl group-hover:bg-indigo-50 transition-colors">🎯</div>
                <h4 className="font-bold mb-1">Daily Quiz</h4>
                <p className="text-xs text-slate-500 leading-relaxed">Top scoring students get priority seat allocation.</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-300 transition-colors group">
                <div className="text-2xl mb-4 p-3 bg-amber-50 w-fit rounded-xl group-hover:bg-indigo-50 transition-colors">📜</div>
                <h4 className="font-bold mb-1">Guidelines</h4>
                <p className="text-xs text-slate-500 leading-relaxed">Read the important proctoring rules before the exam.</p>
            </div>

          </div>

        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;
