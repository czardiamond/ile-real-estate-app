import React, { useState, useEffect } from 'react';
import { User, AcademyUnit, AcademyLesson, Term } from '../types';
import { MOCK_ACADEMY_UNITS, MOCK_TERMS } from '../services/mockData';
import { generateAcademyLesson, explainRealEstateTerm } from '../services/geminiService';
import { saveUserProfileToFirestore } from '../services/firebase';
import { ArrowLeft, Award, Flame, Zap, CheckCircle2, Lock, Play, BookOpen, Search, Sparkles, HelpCircle, Trophy, RefreshCw, ChevronRight, Check, AlertCircle } from 'lucide-react';

interface AcademyViewProps {
  user: User | null;
  onBack: () => void;
}

export const AcademyView: React.FC<AcademyViewProps> = ({ user, onBack }) => {
  const [units, setUnits] = useState<AcademyUnit[]>(MOCK_ACADEMY_UNITS);
  const [selectedLesson, setSelectedLesson] = useState<{ unitId: string; lesson: AcademyLesson } | null>(null);
  
  // Game Stats State
  const [xp, setXp] = useState<number>(350);
  const [streak, setStreak] = useState<number>(5);
  
  // Lesson Loading & Execution State
  const [isLoadingLesson, setIsLoadingLesson] = useState<boolean>(false);
  const [lessonContent, setLessonContent] = useState<{ content: string; quizQuestion: string; options: string[]; correctAnswerIndex: number } | null>(null);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [isQuizSubmitted, setIsQuizSubmitted] = useState<boolean>(false);
  const [quizScoreEarned, setQuizScoreEarned] = useState<number | null>(null);

  // Glossary State
  const [glossarySearch, setGlossarySearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeTermExplanation, setActiveTermExplanation] = useState<{ term: string; explanation: string } | null>(null);
  const [isExplainingTerm, setIsExplainingTerm] = useState<boolean>(false);

  // Active View Tab: "PATH" or "GLOSSARY"
  const [activeTab, setActiveTab] = useState<'PATH' | 'GLOSSARY'>('PATH');

  // Load Saved Academy Progress
  useEffect(() => {
    const key = `gemini_academy_progress_${user?.id || 'guest'}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const completedIds: string[] = JSON.parse(stored);
        if (Array.isArray(completedIds)) {
          setUnits(prev => prev.map(unit => ({
            ...unit,
            lessons: unit.lessons.map(l => ({
              ...l,
              isCompleted: completedIds.includes(l.id) || l.isCompleted
            }))
          })));
        }
      } catch (e) {
        console.error("Failed to load saved academy progress", e);
      }
    }
  }, [user?.id]);

  // Launch a Lesson or Quiz
  const handleStartLesson = async (unitId: string, lesson: AcademyLesson) => {
    setSelectedLesson({ unitId, lesson });
    setIsLoadingLesson(true);
    setLessonContent(null);
    setSelectedQuizOption(null);
    setIsQuizSubmitted(false);
    setQuizScoreEarned(null);

    try {
      const generated = await generateAcademyLesson(lesson.topic);
      setLessonContent(generated);
    } catch (err) {
      console.error("Failed to generate lesson:", err);
      // Fallback fallback content if API is sleepy
      setLessonContent({
        content: `Understanding ${lesson.title} in the Nigerian Real Estate market is critical. Key documents like Certificate of Occupancy (C of O) and Governor's Consent protect buyers from fraudulent title claims. Always verify registered survey plans at Alausa Land Registry before finalizing payments.`,
        quizQuestion: `What is the primary purpose of verifying land titles at the Land Registry?`,
        options: [
          `To confirm legal ownership and prevent title fraud`,
          `To pay local agency fees in advance`,
          `To obtain a temporary occupancy lease`,
          `To negotiate architectural design discounts`
        ],
        correctAnswerIndex: 0
      });
    } finally {
      setIsLoadingLesson(false);
    }
  };

  const handleQuizSubmit = () => {
    if (selectedQuizOption === null || !lessonContent) return;
    setIsQuizSubmitted(true);
    const isCorrect = selectedQuizOption === lessonContent.correctAnswerIndex;
    
    if (isCorrect) {
      const bonus = 50;
      setQuizScoreEarned(bonus);
      setXp(prev => prev + bonus);
      
      // Mark lesson completed & persist
      if (selectedLesson) {
        setUnits(prev => {
          const updatedUnits = prev.map(unit => {
            if (unit.id === selectedLesson.unitId) {
              return {
                ...unit,
                lessons: unit.lessons.map(l => l.id === selectedLesson.lesson.id ? { ...l, isCompleted: true } : l)
              };
            }
            return unit;
          });

          // Save to LocalStorage & Firestore
          const completedLessonIds = updatedUnits.flatMap(u => u.lessons.filter(l => l.isCompleted).map(l => l.id));
          const key = `gemini_academy_progress_${user?.id || 'guest'}`;
          localStorage.setItem(key, JSON.stringify(completedLessonIds));

          if (user?.id) {
            saveUserProfileToFirestore({
              ...user,
              academyProgress: completedLessonIds
            } as any).catch(console.error);
          }

          return updatedUnits;
        });
      }
    } else {
      setQuizScoreEarned(0);
    }
  };

  // Explain Real Estate Term with Gemini AI
  const handleExplainTerm = async (termObj: Term) => {
    setIsExplainingTerm(true);
    setActiveTermExplanation({ term: termObj.term, explanation: termObj.shortDef });

    try {
      const aiDetail = await explainRealEstateTerm(termObj.term);
      setActiveTermExplanation({ term: termObj.term, explanation: aiDetail });
    } catch (e) {
      console.error(e);
    } finally {
      setIsExplainingTerm(false);
    }
  };

  const filteredTerms = MOCK_TERMS.filter(t => {
    const matchesSearch = t.term.toLowerCase().includes(glossarySearch.toLowerCase()) || 
                          t.shortDef.toLowerCase().includes(glossarySearch.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || t.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Calculate total completed
  const totalLessons = units.flatMap(u => u.lessons).length;
  const completedLessons = units.flatMap(u => u.lessons).filter(l => l.isCompleted).length;
  const progressPercent = Math.round((completedLessons / totalLessons) * 100);

  return (
    <div className="min-h-screen bg-surface text-on-surface pb-24 animate-in fade-in duration-300">
      {/* Top Game Bar Header - Material 3 Style */}
      <header className="sticky top-0 z-40 bg-surface-container-low/95 backdrop-blur-md border-b border-outline-variant/30 px-4 md:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="p-2 rounded-full hover:bg-surface-container transition-colors text-on-surface"
              title="Return to Dashboard"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-on-surface flex items-center gap-2">
                <Trophy size={22} className="text-amber-500" />
                <span>Ilé Academy Game</span>
              </h1>
              <p className="text-xs text-on-surface-variant hidden sm:block">Master Nigerian Real Estate & Land Title Rules</p>
            </div>
          </div>

          {/* Gamified HUD Stats Pill */}
          <div className="flex items-center gap-2 sm:gap-3 bg-surface-container px-3.5 py-1.5 rounded-full border border-outline-variant/40 shadow-sm text-xs font-bold">
            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400" title="Daily Streak">
              <Flame size={16} className="fill-amber-500 text-amber-500 animate-bounce" />
              <span>{streak} Days</span>
            </div>
            <div className="h-4 w-px bg-outline-variant/50" />
            <div className="flex items-center gap-1 text-primary" title="Total XP Earned">
              <Zap size={16} className="fill-primary text-primary" />
              <span>{xp} XP</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-4xl mx-auto px-4 md:px-8 pt-6 space-y-6">
        {/* Banner Card & Level Progress */}
        <div className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-emerald-500/10 border border-primary/20 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left flex-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} /> Agent Certification Quest
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-on-surface">
              Level 1: Certified Land Title Specialist
            </h2>
            <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed">
              Earn XP by passing micro-lessons on C of O verification, Governor Consent, Lagos Tenancy Laws, and deal closing.
            </p>
            
            {/* Progress Bar */}
            <div className="pt-2 space-y-1 max-w-md">
              <div className="flex justify-between text-xs font-semibold text-on-surface-variant">
                <span>Course Mastery</span>
                <span>{completedLessons} of {totalLessons} Lessons ({progressPercent}%)</span>
              </div>
              <div className="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-surface-container-low p-2 rounded-2xl border border-outline-variant/30 shrink-0">
            <button
              onClick={() => setActiveTab('PATH')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'PATH'
                ? 'bg-primary text-white shadow-md'
                : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <BookOpen size={16} />
              <span>Skill Tree</span>
            </button>
            <button
              onClick={() => setActiveTab('GLOSSARY')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'GLOSSARY'
                ? 'bg-primary text-white shadow-md'
                : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <Search size={16} />
              <span>Naija Glossary</span>
            </button>
          </div>
        </div>

        {/* TAB 1: GAMIFIED SKILL TREE PATH */}
        {activeTab === 'PATH' && (
          <div className="space-y-8 py-2">
            {units.map((unit, unitIdx) => (
              <div key={unit.id} className="bg-surface-container-low border border-outline-variant/40 rounded-3xl p-5 md:p-6 shadow-sm space-y-6">
                {/* Unit Header */}
                <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base shadow-sm">
                      U{unitIdx + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-on-surface">{unit.title}</h3>
                      <p className="text-xs text-on-surface-variant">{unit.description}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                    {unit.lessons.filter(l => l.isCompleted).length}/{unit.lessons.length} Done
                  </span>
                </div>

                {/* Duolingo-style Vertical Lesson Path Node Tree */}
                <div className="flex flex-col items-center gap-4 relative py-2">
                  {/* Vertical connecting line */}
                  <div className="absolute top-4 bottom-4 w-1 bg-outline-variant/40 rounded-full z-0" />

                  {unit.lessons.map((lesson, idx) => {
                    const isCompleted = lesson.isCompleted;
                    const isLocked = lesson.isLocked;

                    return (
                      <div 
                        key={lesson.id} 
                        className={`relative z-10 flex items-center gap-4 w-full max-w-sm transition-transform ${
                          idx % 2 === 1 ? 'translate-x-3 sm:translate-x-6' : '-translate-x-3 sm:-translate-x-6'
                        }`}
                      >
                        <button
                          disabled={isLocked}
                          onClick={() => handleStartLesson(unit.id, lesson)}
                          className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg transition-all transform active:scale-95 shrink-0 ${
                            isCompleted
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600 ring-4 ring-emerald-500/20'
                            : isLocked
                            ? 'bg-surface-container text-on-surface-variant/40 cursor-not-allowed border border-outline-variant'
                            : 'bg-primary text-white hover:bg-primary/90 ring-4 ring-primary/20 animate-pulse'
                          }`}
                          title={lesson.title}
                        >
                          {isCompleted ? (
                            <CheckCircle2 size={28} />
                          ) : isLocked ? (
                            <Lock size={24} />
                          ) : (
                            <Play size={24} className="ml-1 fill-white" />
                          )}
                        </button>

                        <div className="bg-surface-container p-3 rounded-2xl border border-outline-variant/40 flex-1 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">
                              {lesson.type}
                            </span>
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                              <Zap size={10} /> +50 XP
                            </span>
                          </div>
                          <h4 className="font-bold text-xs text-on-surface line-clamp-1 mt-0.5">{lesson.title}</h4>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: REAL ESTATE GLOSSARY & AI EXPLAINER */}
        {activeTab === 'GLOSSARY' && (
          <div className="space-y-6 py-2">
            {/* Search & Category Filter */}
            <div className="bg-surface-container-low border border-outline-variant/40 rounded-3xl p-4 md:p-6 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3.5 text-on-surface-variant/60" size={18} />
                  <input
                    type="text"
                    placeholder="Search terms like C of O, Caution Fee, Excision..."
                    value={glossarySearch}
                    onChange={(e) => setGlossarySearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-full bg-surface-container border border-outline-variant/40 text-xs font-medium text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-primary"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {['ALL', 'LEGAL', 'FINANCE', 'SLANG', 'GENERAL'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-2 rounded-full text-[11px] font-bold transition-all shrink-0 ${
                        selectedCategory === cat
                        ? 'bg-primary text-white'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Terms Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {filteredTerms.map(termObj => (
                  <div
                    key={termObj.id}
                    onClick={() => handleExplainTerm(termObj)}
                    className="p-3.5 rounded-2xl bg-surface-container/60 hover:bg-surface-container border border-outline-variant/30 cursor-pointer transition-all hover:border-primary/40 group space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-on-surface group-hover:text-primary transition-colors flex items-center gap-1">
                        {termObj.term}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                        {termObj.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant line-clamp-2 leading-tight">
                      {termObj.shortDef}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* INTERACTIVE LESSON / QUIZ MODAL */}
      {selectedLesson && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-low border border-outline-variant/40 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-low">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-on-surface">{selectedLesson.lesson.title}</h3>
                  <span className="text-[10px] text-on-surface-variant font-medium">Topic: {selectedLesson.lesson.topic}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedLesson(null)}
                className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 md:p-6 overflow-y-auto space-y-5 flex-1">
              {isLoadingLesson ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
                  <RefreshCw className="animate-spin text-primary" size={32} />
                  <p className="text-xs font-bold text-on-surface">AI Instructor Generating Lesson...</p>
                  <p className="text-[11px] text-on-surface-variant">Synthesizing Lagos/Abuja Land Registry guidelines & legal tips.</p>
                </div>
              ) : lessonContent ? (
                <>
                  {/* Lesson Text */}
                  <div className="bg-surface-container p-4 rounded-2xl border border-outline-variant/30 space-y-2">
                    <h4 className="font-bold text-xs text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen size={14} /> Key Takeaway
                    </h4>
                    <p className="text-xs md:text-sm text-on-surface leading-relaxed">
                      {lessonContent.content}
                    </p>
                  </div>

                  {/* Multiple Choice Quiz */}
                  <div className="space-y-3 pt-2">
                    <h4 className="font-bold text-xs text-on-surface flex items-center gap-1.5">
                      <HelpCircle size={15} className="text-amber-500" />
                      <span>Quiz Challenge:</span>
                    </h4>
                    <p className="text-xs font-semibold text-on-surface-variant">
                      {lessonContent.quizQuestion}
                    </p>

                    <div className="space-y-2">
                      {lessonContent.options.map((option, idx) => {
                        const isSelected = selectedQuizOption === idx;
                        const isCorrectOption = isQuizSubmitted && idx === lessonContent.correctAnswerIndex;
                        const isWrongSelected = isQuizSubmitted && isSelected && idx !== lessonContent.correctAnswerIndex;

                        return (
                          <button
                            key={idx}
                            disabled={isQuizSubmitted}
                            onClick={() => setSelectedQuizOption(idx)}
                            className={`w-full p-3 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between gap-2 ${
                              isCorrectOption
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold'
                              : isWrongSelected
                              ? 'bg-red-500/10 border-red-500 text-red-700 dark:text-red-300'
                              : isSelected
                              ? 'bg-primary/10 border-primary text-primary font-bold'
                              : 'bg-surface-container/50 border-outline-variant/30 hover:bg-surface-container text-on-surface'
                            }`}
                          >
                            <span>{option}</span>
                            {isCorrectOption && <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
                            {isWrongSelected && <AlertCircle size={16} className="text-red-500 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Score Feedback Banner */}
                  {isQuizSubmitted && (
                    <div className={`p-4 rounded-2xl border text-xs flex items-center gap-3 animate-in slide-in-from-bottom duration-300 ${
                      selectedQuizOption === lessonContent.correctAnswerIndex
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200'
                    }`}>
                      {selectedQuizOption === lessonContent.correctAnswerIndex ? (
                        <>
                          <CheckCircle2 size={24} className="text-emerald-500 shrink-0" />
                          <div>
                            <span className="font-bold block">Correct! +50 XP Earned 🎉</span>
                            <span className="text-[11px]">You've mastered this real estate concept!</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={24} className="text-amber-500 shrink-0" />
                          <div>
                            <span className="font-bold block">Not quite!</span>
                            <span className="text-[11px]">Correct answer was Option #{lessonContent.correctAnswerIndex + 1}. Review the lesson and try again!</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-outline-variant/30 bg-surface-container-low flex justify-end gap-2">
              {!isQuizSubmitted ? (
                <button
                  disabled={selectedQuizOption === null || isLoadingLesson}
                  onClick={handleQuizSubmit}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-primary text-white font-bold text-xs shadow-md disabled:opacity-50 hover:bg-primary/90 transition-all"
                >
                  Submit Answer
                </button>
              ) : (
                <button
                  onClick={() => setSelectedLesson(null)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-emerald-600 text-white font-bold text-xs shadow-md hover:bg-emerald-700 transition-all"
                >
                  Continue Learning
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI TERM EXPLANATION MODAL */}
      {activeTermExplanation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-low border border-outline-variant/40 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                <Sparkles size={18} className="text-primary" />
                <span>{activeTermExplanation.term}</span>
              </h3>
              <button
                onClick={() => setActiveTermExplanation(null)}
                className="p-1 rounded-full hover:bg-surface-container text-on-surface-variant"
              >
                ✕
              </button>
            </div>

            {isExplainingTerm ? (
              <div className="py-6 flex flex-col items-center justify-center space-y-2 text-center">
                <RefreshCw className="animate-spin text-primary" size={24} />
                <p className="text-xs text-on-surface-variant">Querying Gemini Real Estate AI...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-surface-container p-4 rounded-2xl border border-outline-variant/30">
                  <p className="text-xs text-on-surface leading-relaxed">
                    {activeTermExplanation.explanation}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={() => setActiveTermExplanation(null)}
              className="w-full py-2.5 rounded-full bg-primary text-white font-bold text-xs shadow-md"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
