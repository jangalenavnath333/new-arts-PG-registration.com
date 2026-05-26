import React, { useState, useEffect, useRef } from 'react';
import DB from '../js/db.js';

const ExamInterface = () => {
  // 1. State Management
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: selectedOptionIndex }
  const [timeLeft, setTimeLeft] = useState(3600); // 60 minutes in seconds
  const [isFinished, setIsFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const timerRef = useRef(null);

  // 2. Fetch Questions & Start Timer
  useEffect(() => {
    const fetchedQuestions = DB.getQuestions();
    setQuestions(fetchedQuestions);
    setLoading(false);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, []);

  // 3. Helper Functions
  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleOptionSelect = (optionIndex) => {
    if (isFinished) return;
    const currentQ = questions[currentIndex];
    setAnswers({ ...answers, [currentQ.id]: optionIndex });
  };

  const handleAutoSubmit = () => {
    setIsFinished(true);
    // Logic to save results to DB would go here
  };

  const handleSubmitManual = () => {
    if (window.confirm("Are you sure you want to submit the exam?")) {
      handleAutoSubmit();
    }
  };

  if (loading) return <div className="p-20 text-center font-bold text-slate-400">Loading Examination...</div>;
  if (isFinished) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-md w-full border border-slate-100">
        <div className="text-6xl mb-6">✅</div>
        <h1 className="text-2xl font-black text-slate-800">Exam Submitted!</h1>
        <p className="text-slate-500 mt-2 mb-8">Your responses have been recorded successfully. Results will be announced shortly.</p>
        <button className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-100">Return to Dashboard</button>
      </div>
    </div>
  );

  const currentQ = questions[currentIndex];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none">
      
      {/* Top Header: Timer & Subject */}
      <header className="bg-white border-b border-slate-200 py-4 px-8 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold">CET</div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Computer Science Entrance</h2>
            <p className="text-xs text-slate-400 font-medium">{currentQ?.subject || 'Assessment'}</p>
          </div>
        </div>
        
        <div className={`flex items-center gap-3 px-6 py-2.5 rounded-2xl border-2 transition-colors ${
          timeLeft < 300 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-50 border-slate-100 text-slate-700'
        }`}>
          <span className="text-xl">⏱️</span>
          <span className="font-mono text-2xl font-black tracking-tighter">{formatTime(timeLeft)}</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Main Exam Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-12 flex flex-col items-center">
          <div className="max-w-3xl w-full">
            
            {/* Question Card */}
            <div className="bg-white rounded-[2rem] p-10 shadow-sm border border-slate-100 mb-8 min-h-[400px] flex flex-col">
              <span className="text-indigo-600 font-black text-sm uppercase tracking-widest mb-4">Question {currentIndex + 1} of {questions.length}</span>
              <h3 className="text-xl md:text-2xl font-bold text-slate-800 leading-snug mb-10">
                {currentQ?.text}
              </h3>
              
              <div className="grid grid-cols-1 gap-4 mt-auto">
                {currentQ?.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleOptionSelect(idx)}
                    className={`text-left p-5 rounded-2xl border-2 transition-all font-medium flex items-center gap-4 group ${
                      answers[currentQ.id] === idx
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-md transform translate-x-2'
                        : 'bg-white border-slate-100 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                      answers[currentQ.id] === idx ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center w-full">
              <button 
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="px-8 py-3 rounded-xl font-bold text-slate-400 hover:text-slate-600 disabled:opacity-30 flex items-center gap-2 transition-all"
              >
                ← Previous
              </button>

              {currentIndex === questions.length - 1 ? (
                <button 
                  onClick={handleSubmitManual}
                  className="bg-emerald-600 text-white px-10 py-3 rounded-xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all hover:scale-105"
                >
                  🚀 Submit Final Exam
                </button>
              ) : (
                <button 
                  onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
                  className="bg-indigo-600 text-white px-10 py-3 rounded-xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                >
                  Save & Next →
                </button>
              )}
            </div>

          </div>
        </main>

        {/* Question Panel (Sidebar) */}
        <aside className="w-80 bg-white border-l border-slate-200 hidden lg:flex flex-col p-6 overflow-y-auto">
          <div className="mb-8">
            <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-2">Question Palette</h4>
            <div className="flex gap-4 text-xs font-bold text-slate-400">
              <div className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500 rounded-sm"></span> Answered</div>
              <div className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded-sm"></span> Skipped</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {questions.map((q, idx) => {
              const isAnswered = answers[q.id] !== undefined;
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-full aspect-square rounded-xl flex items-center justify-center font-bold text-sm transition-all border-2 ${
                    isCurrent ? 'ring-2 ring-indigo-600 ring-offset-2 scale-110 z-10' : ''
                  } ${
                    isAnswered 
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-100' 
                      : (idx < currentIndex) 
                        ? 'bg-red-400 border-red-400 text-white shadow-md shadow-red-50' 
                        : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-auto p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <p className="text-xs text-amber-700 leading-relaxed font-medium">
              <strong>Note:</strong> Auto-submission will trigger when the timer hits 00:00. Switching tabs will result in a violation.
            </p>
          </div>
        </aside>

      </div>
    </div>
  );
};

export default ExamInterface;
