
import React, { useState, useEffect } from 'react';
import { MOCK_ACADEMY_UNITS, MOCK_TERMS } from '../services/mockData';
import { generateAcademyLesson, explainRealEstateTerm } from '../services/geminiService';
import { AcademyUnit, AcademyLesson, User, Term } from '../types';
import { Star, Lock, CheckCircle, Zap, Heart, X, Award, Share2, ArrowLeft, Loader2, BookOpen, HelpCircle, GraduationCap, Search, Lightbulb, Filter, AlertCircle, Trophy, Target, Flame, Crown, Medal, Coins } from 'lucide-react';

interface AcademyViewProps {
    user: User;
    onBack: () => void;
}

// Mock Leaderboard Data
const MOCK_LEADERBOARD = [
    { id: 'u1', name: 'Kunle Adebayo', xp: 12450, rank: 1, avatar: 'https://ui-avatars.com/api/?name=Kunle+Adebayo&background=166534&color=fff', league: 'Tycoon' },
    { id: 'u3', name: 'Chioma N.', xp: 11200, rank: 2, avatar: 'https://ui-avatars.com/api/?name=Chioma+N&background=ca8a04&color=fff', league: 'Tycoon' },
    { id: 'u4', name: 'Emeka O.', xp: 9800, rank: 3, avatar: 'https://ui-avatars.com/api/?name=Emeka+O&background=0ea5e9&color=fff', league: 'Tycoon' },
    { id: 'u5', name: 'Sarah J.', xp: 8500, rank: 4, avatar: 'https://ui-avatars.com/api/?name=Sarah+J', league: 'Mover' },
    { id: 'u6', name: 'Tunde B.', xp: 7200, rank: 5, avatar: 'https://ui-avatars.com/api/?name=Tunde+B', league: 'Mover' },
];

// Mock Quests
const INITIAL_QUESTS = [
    { id: 'q1', title: 'Early Bird', desc: 'Login before 9 AM', current: 1, target: 1, reward: 50, claimed: false, icon: SunIcon },
    { id: 'q2', title: 'Knowledge Seeker', desc: 'Complete 2 Lessons', current: 1, target: 2, reward: 100, claimed: false, icon: BookOpen },
    { id: 'q3', title: 'Market Mover', desc: 'Share a listing link', current: 0, target: 1, reward: 150, claimed: false, icon: Share2 },
    { id: 'q4', title: 'Verification', desc: 'Verify your ID', current: 1, target: 1, reward: 500, claimed: true, icon: CheckCircle },
];

function SunIcon(props: any) {
    return <Zap {...props} />; // Reusing Zap for simplicity
}

const AcademyView: React.FC<AcademyViewProps> = ({ user, onBack }) => {
    // Navigation State
    const [activeTab, setActiveTab] = useState<'learn' | 'leaderboard' | 'quests' | 'dictionary'>('learn');

    // Lesson State
    const [lessonContent, setLessonContent] = useState<{content: string, quizQuestion: string, options: string[], correctAnswerIndex: number} | null>(null);
    const [currentLesson, setCurrentLesson] = useState<AcademyLesson | null>(null);
    const [modalState, setModalState] = useState<'LOADING' | 'LESSON' | 'QUIZ' | 'SUCCESS' | 'CERTIFICATE'>('LOADING');
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [feedbackStatus, setFeedbackStatus] = useState<'IDLE' | 'CORRECT' | 'WRONG'>('IDLE');
    
    // Gamification State
    const [xp, setXp] = useState(2450);
    const [hearts, setHearts] = useState(5);
    const [streak, setStreak] = useState(3);
    const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set(['l1', 'l2']));
    const [quests, setQuests] = useState(INITIAL_QUESTS);

    // Dictionary State
    const [searchTerm, setSearchTerm] = useState('');
    const [dictCategory, setDictCategory] = useState<string>('ALL');
    const [selectedTerm, setSelectedTerm] = useState<Term | null>(null);
    const [aiExplanation, setAiExplanation] = useState<string | null>(null);
    const [loadingExplanation, setLoadingExplanation] = useState(false);

    // Generate Path Position (Zig Zag Effect)
    const getPosition = (index: number) => {
        const position = index % 4;
        let offset = 0;
        if (position === 1) offset = 50;
        if (position === 3) offset = -50;
        return { transform: `translateX(${offset}px)` };
    };

    const handleLessonStart = async (lesson: AcademyLesson) => {
        const isLocked = !completedLessonIds.has(lesson.id) && lesson.isLocked;
        if (isLocked) return;
        
        setCurrentLesson(lesson);
        setModalState('LOADING');
        
        // AI Generation
        const data = await generateAcademyLesson(lesson.topic);
        setLessonContent(data);
        setModalState('LESSON');
    };

    const handleContentRead = () => {
        if (lessonContent?.quizQuestion) {
             setModalState('QUIZ');
        } else {
             completeLesson();
        }
    };

    const handleAnswerSubmit = () => {
        if (selectedOption === null || !lessonContent) return;

        if (selectedOption === lessonContent.correctAnswerIndex) {
            setFeedbackStatus('CORRECT');
            setTimeout(() => {
                completeLesson();
            }, 1200);
        } else {
            setFeedbackStatus('WRONG');
            setHearts(prev => Math.max(0, prev - 1));
        }
    };

    const completeLesson = () => {
        setXp(prev => prev + 100);
        setStreak(prev => prev + 1);
        if (currentLesson) {
            setCompletedLessonIds(prev => new Set(prev).add(currentLesson.id));
        }
        
        if (currentLesson?.type === 'CHALLENGE') {
            setModalState('CERTIFICATE');
        } else {
            setModalState('SUCCESS');
        }
    };

    const closeLessonModal = () => {
        setCurrentLesson(null);
        setLessonContent(null);
        setSelectedOption(null);
        setFeedbackStatus('IDLE');
        setModalState('LOADING');
    };

    const handleClaimQuest = (questId: string, reward: number) => {
        setXp(prev => prev + reward);
        setQuests(prev => prev.map(q => q.id === questId ? { ...q, claimed: true } : q));
    };

    const handleTermClick = async (term: Term) => {
        setSelectedTerm(term);
        setLoadingExplanation(true);
        setAiExplanation(null);
        const explanation = await explainRealEstateTerm(term.term);
        setAiExplanation(explanation);
        setLoadingExplanation(false);
    };

    const filteredTerms = MOCK_TERMS.filter(t => {
        const matchesSearch = t.term.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              t.category.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = dictCategory === 'ALL' || t.category === dictCategory;
        return matchesSearch && matchesCategory;
    });

    const formatXP = (num: number) => {
        return num.toLocaleString();
    };

    return (
        <div className="fixed inset-0 z-[60] bg-surface flex flex-col h-full w-full animate-in slide-in-from-right duration-300">
            {/* Header / HUD */}
            <div className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-20">
                <div className="px-4 py-3 flex items-center justify-between">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft size={24} className="text-gray-600" />
                    </button>
                    <div className="flex gap-4 md:gap-6 text-sm md:text-base">
                        <div className="flex items-center gap-1 text-orange-500 font-bold bg-orange-50 px-2 py-1 rounded-lg">
                            <Flame size={18} fill="currentColor" /> {streak}
                        </div>
                        <div className="flex items-center gap-1 text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-lg">
                            <Star size={18} fill="currentColor" /> {formatXP(xp)}
                        </div>
                        <div className="flex items-center gap-1 text-red-500 font-bold bg-red-50 px-2 py-1 rounded-lg">
                            <Heart size={18} fill="currentColor" /> {hearts}
                        </div>
                    </div>
                </div>
                
                {/* Tabs */}
                <div className="flex px-4 gap-1 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'learn', label: 'Path', icon: BookOpen },
                        { id: 'quests', label: 'Hustle', icon: Target },
                        { id: 'leaderboard', label: 'Ranking', icon: Trophy },
                        { id: 'dictionary', label: 'Lingo', icon: GraduationCap }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 min-w-[80px] pb-3 pt-2 text-xs md:text-sm font-bold border-b-2 transition-all flex flex-col items-center gap-1 ${
                                activeTab === tab.id 
                                ? 'border-primary text-primary' 
                                : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            <tab.icon size={18} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto bg-gray-50 relative pb-24">
                
                {/* --- LEARNING PATH TAB --- */}
                {activeTab === 'learn' && (
                    <div className="max-w-md mx-auto py-8 flex flex-col items-center gap-12 relative z-0">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                        {MOCK_ACADEMY_UNITS.map((unit, unitIdx) => (
                            <div key={unit.id} className="w-full flex flex-col items-center gap-8 px-4">
                                {/* Unit Header Card */}
                                <div className={`w-full ${unit.color} text-white p-5 rounded-3xl shadow-lg flex justify-between items-center transform transition-transform hover:scale-105`}>
                                    <div>
                                        <h3 className="font-bold text-xl mb-1">{unit.title}</h3>
                                        <p className="text-xs opacity-90 leading-relaxed max-w-[200px]">{unit.description}</p>
                                    </div>
                                    <Award size={40} className="opacity-80" />
                                </div>

                                {/* Lessons Path */}
                                <div className="flex flex-col items-center gap-4 w-full">
                                    {unit.lessons.map((lesson, idx) => {
                                        const isCompleted = completedLessonIds.has(lesson.id);
                                        const isLocked = !isCompleted && lesson.isLocked; 
                                        
                                        return (
                                            <div key={lesson.id} className="relative flex flex-col items-center" style={getPosition(idx)}>
                                                {/* Connector Line */}
                                                {idx < unit.lessons.length - 1 && (
                                                   <div className="absolute top-10 h-16 w-3 bg-gray-200 -z-10 rounded-full" 
                                                        style={{ 
                                                            transform: `translateY(20px) rotate(${
                                                                (idx % 4 === 0) ? '20deg' : 
                                                                (idx % 4 === 1) ? '-20deg' : 
                                                                (idx % 4 === 2) ? '-20deg' : 
                                                                '20deg'
                                                            })`,
                                                            height: '60px'
                                                        }}
                                                   ></div>
                                                )}

                                                <button 
                                                    onClick={() => handleLessonStart(lesson)}
                                                    disabled={isLocked}
                                                    className={`
                                                        relative w-20 h-20 rounded-full flex items-center justify-center border-b-8 transition-all active:border-b-0 active:translate-y-2 shadow-sm
                                                        ${isLocked 
                                                            ? 'bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed' 
                                                            : isCompleted
                                                                ? 'bg-yellow-400 border-yellow-600 text-white'
                                                                : 'bg-primary border-green-800 text-white'
                                                        }
                                                    `}
                                                >
                                                    {isLocked ? (
                                                        <Lock size={24} />
                                                    ) : isCompleted ? (
                                                        <CheckCircle size={32} />
                                                    ) : (
                                                        <Star size={32} fill="currentColor" />
                                                    )}

                                                    {!isLocked && !isCompleted && (
                                                        <div className="absolute -top-10 bg-white text-gray-800 text-xs font-bold px-3 py-1.5 rounded-xl shadow-md whitespace-nowrap animate-bounce">
                                                            Start
                                                            <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white transform rotate-45"></div>
                                                        </div>
                                                    )}
                                                </button>
                                                <span className="mt-2 font-bold text-gray-600 text-xs bg-white/80 px-2 py-1 rounded-md max-w-[120px] text-center">{lesson.title}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* --- QUESTS TAB (DAILY HUSTLE) --- */}
                {activeTab === 'quests' && (
                    <div className="max-w-md mx-auto p-4 space-y-6">
                        {/* Daily Header */}
                        <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            <h2 className="text-2xl font-bold mb-1">Daily Hustle</h2>
                            <p className="text-orange-100 text-sm mb-4">Complete tasks to earn XP and rank up.</p>
                            
                            <div className="flex items-center gap-2 bg-black/20 p-3 rounded-xl border border-white/10">
                                <div className="p-2 bg-orange-500 rounded-full text-white">
                                    <Trophy size={20} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between text-xs font-bold mb-1">
                                        <span>Daily Goal</span>
                                        <span>3/5</span>
                                    </div>
                                    <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden">
                                        <div className="bg-yellow-400 h-full w-[60%]"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quests List */}
                        <div className="space-y-4">
                            {quests.map(quest => (
                                <div key={quest.id} className={`bg-white p-4 rounded-2xl border transition-all ${quest.claimed ? 'border-green-200 bg-green-50/50' : 'border-gray-100 shadow-sm'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex gap-3">
                                            <div className={`p-3 rounded-xl h-fit ${quest.claimed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                                <quest.icon size={20} />
                                            </div>
                                            <div>
                                                <h4 className={`font-bold ${quest.claimed ? 'text-green-800' : 'text-gray-900'}`}>{quest.title}</h4>
                                                <p className="text-xs text-gray-500">{quest.desc}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="block font-bold text-blue-600 text-sm">+{quest.reward} XP</span>
                                        </div>
                                    </div>

                                    {quest.claimed ? (
                                        <button disabled className="w-full py-2 rounded-xl bg-green-200 text-green-700 text-xs font-bold flex items-center justify-center gap-1 opacity-70">
                                            <CheckCircle size={14} /> Claimed
                                        </button>
                                    ) : (
                                        <div className="flex gap-3 items-center">
                                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-blue-500 transition-all duration-500" 
                                                    style={{ width: `${(quest.current / quest.target) * 100}%` }}
                                                ></div>
                                            </div>
                                            <button 
                                                onClick={() => handleClaimQuest(quest.id, quest.reward)}
                                                disabled={quest.current < quest.target}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                                    quest.current >= quest.target 
                                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:scale-105' 
                                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                }`}
                                            >
                                                {quest.current >= quest.target ? 'Claim' : `${quest.current}/${quest.target}`}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- LEADERBOARD TAB --- */}
                {activeTab === 'leaderboard' && (
                    <div className="max-w-md mx-auto flex flex-col h-full">
                        {/* League Header */}
                        <div className="bg-indigo-900 text-white p-6 pt-8 rounded-b-[40px] shadow-xl text-center relative z-10 mx-[-4px]">
                            <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full border border-white/20 mb-4">
                                <Crown size={16} className="text-yellow-400" />
                                <span className="text-xs font-bold tracking-wider uppercase">Tycoon League</span>
                            </div>
                            <p className="text-indigo-200 text-xs mb-1">Weekly Reset in 3 days</p>
                            
                            {/* Top 3 Podium */}
                            <div className="flex justify-center items-end gap-4 mt-6 mb-[-40px]">
                                {/* 2nd Place */}
                                <div className="flex flex-col items-center">
                                    <div className="relative">
                                        <img src={MOCK_LEADERBOARD[1].avatar} className="w-16 h-16 rounded-full border-4 border-gray-300 shadow-lg" alt="" />
                                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gray-300 text-gray-800 text-[10px] font-bold px-2 py-0.5 rounded-full">2</div>
                                    </div>
                                    <div className="h-24 w-20 bg-indigo-800/50 mt-4 rounded-t-lg backdrop-blur-sm border-t border-white/10"></div>
                                </div>
                                {/* 1st Place */}
                                <div className="flex flex-col items-center z-10">
                                    <div className="relative">
                                        <Crown size={24} className="absolute -top-8 left-1/2 -translate-x-1/2 text-yellow-400 animate-bounce" fill="currentColor" />
                                        <img src={MOCK_LEADERBOARD[0].avatar} className="w-20 h-20 rounded-full border-4 border-yellow-400 shadow-xl" alt="" />
                                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-0.5 rounded-full">1</div>
                                    </div>
                                    <div className="h-32 w-24 bg-indigo-700/80 mt-4 rounded-t-lg backdrop-blur-sm border-t border-white/20 flex flex-col justify-end pb-4">
                                        <p className="font-bold text-sm text-white truncate px-2">{MOCK_LEADERBOARD[0].name.split(' ')[0]}</p>
                                        <p className="text-[10px] text-indigo-300">{formatXP(MOCK_LEADERBOARD[0].xp)} XP</p>
                                    </div>
                                </div>
                                {/* 3rd Place */}
                                <div className="flex flex-col items-center">
                                    <div className="relative">
                                        <img src={MOCK_LEADERBOARD[2].avatar} className="w-16 h-16 rounded-full border-4 border-amber-700 shadow-lg" alt="" />
                                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-amber-700 text-amber-100 text-[10px] font-bold px-2 py-0.5 rounded-full">3</div>
                                    </div>
                                    <div className="h-20 w-20 bg-indigo-800/50 mt-4 rounded-t-lg backdrop-blur-sm border-t border-white/10"></div>
                                </div>
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 bg-white pt-12 px-4 pb-4 overflow-y-auto">
                            {MOCK_LEADERBOARD.slice(3).map((user) => (
                                <div key={user.id} className="flex items-center gap-4 p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                                    <span className="font-bold text-gray-400 w-6">{user.rank}</span>
                                    <img src={user.avatar} alt="" className="w-10 h-10 rounded-full bg-gray-100" />
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-900 text-sm">{user.name}</p>
                                        <p className="text-xs text-gray-500">{user.league}</p>
                                    </div>
                                    <div className="text-right font-bold text-sm text-blue-600">
                                        {formatXP(user.xp)} XP
                                    </div>
                                </div>
                            ))}
                            
                            {/* Current User Fixed Bottom */}
                            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                                <div className="max-w-md mx-auto flex items-center gap-4">
                                    <span className="font-bold text-gray-900 w-6">42</span>
                                    <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-full border-2 border-primary" />
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-900 text-sm">You</p>
                                        <p className="text-xs text-gray-500">Tycoon League</p>
                                    </div>
                                    <div className="text-right font-bold text-sm text-primary">
                                        {formatXP(xp)} XP
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- DICTIONARY TAB --- */}
                {activeTab === 'dictionary' && (
                    <div className="max-w-2xl mx-auto p-4 md:p-6">
                         <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 text-white mb-6 relative overflow-hidden shadow-lg">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
                             <div className="relative z-10">
                                 <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                                     <GraduationCap className="text-yellow-300" /> Real Estate Lingo
                                 </h2>
                                 <p className="text-blue-100 text-sm mb-4">Master the language of Nigerian property. Tap any card to learn more.</p>
                                 <div className="relative">
                                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                                     <input 
                                        type="text" 
                                        placeholder="Search terms (e.g. C of O)..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder:text-white/50 outline-none focus:bg-white/30 transition-colors"
                                     />
                                 </div>
                             </div>
                         </div>

                         {/* Filter Chips */}
                         <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
                            {['ALL', 'LEGAL', 'SLANG', 'FINANCE', 'GENERAL'].map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setDictCategory(cat)}
                                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                                        dictCategory === cat
                                        ? 'bg-primary text-white border-primary shadow-md'
                                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    {cat === 'ALL' ? 'All' : cat}
                                </button>
                            ))}
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {filteredTerms.map(term => (
                                 <button 
                                    key={term.id}
                                    onClick={() => handleTermClick(term)}
                                    className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/30 transition-all text-left group flex flex-col h-full"
                                 >
                                     <div className="flex justify-between items-start mb-2 w-full">
                                         <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide ${
                                             term.category === 'LEGAL' ? 'bg-red-50 text-red-700' : 
                                             term.category === 'FINANCE' ? 'bg-green-50 text-green-700' :
                                             term.category === 'SLANG' ? 'bg-yellow-50 text-yellow-700' :
                                             'bg-blue-50 text-blue-700'
                                         }`}>
                                             {term.category}
                                         </span>
                                         <HelpCircle size={16} className="text-gray-300 group-hover:text-primary transition-colors" />
                                     </div>
                                     <h3 className="text-lg font-bold text-gray-900 mb-1">{term.term}</h3>
                                     <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{term.shortDef}</p>
                                 </button>
                             ))}
                         </div>
                         
                         {filteredTerms.length === 0 && (
                             <div className="text-center py-12">
                                 <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                                     <Search className="text-gray-400" />
                                 </div>
                                 <p className="text-gray-500 font-medium">No terms found matching "{searchTerm}"</p>
                                 <button onClick={() => {setSearchTerm(''); setDictCategory('ALL')}} className="mt-2 text-primary font-bold text-sm hover:underline">Clear Filters</button>
                             </div>
                         )}
                    </div>
                )}
            </div>

            {/* LESSON MODAL */}
            {currentLesson && (
                <div className="fixed inset-0 z-[70] bg-surface flex flex-col animate-in slide-in-from-bottom duration-300">
                    {/* Modal Header */}
                    <div className="px-6 py-4 flex items-center justify-between">
                         <button onClick={closeLessonModal}><X size={24} className="text-gray-400 hover:text-gray-800" /></button>
                         <div className="w-full h-3 bg-gray-200 rounded-full mx-6 overflow-hidden">
                             <div 
                                className="h-full bg-primary transition-all duration-500" 
                                style={{ width: modalState === 'LOADING' ? '10%' : modalState === 'SUCCESS' ? '100%' : '50%' }}
                             ></div>
                         </div>
                         <div className="flex items-center gap-1 text-red-500 font-bold">
                             <Heart size={20} fill="currentColor" /> {hearts}
                         </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full px-6">
                        
                        {/* STATE: LOADING */}
                        {modalState === 'LOADING' && (
                             <div className="text-center">
                                 <Loader2 size={48} className="animate-spin text-primary mx-auto mb-4" />
                                 <h3 className="text-xl font-bold text-gray-800">Ilé AI is preparing your lesson...</h3>
                                 <p className="text-gray-500 mt-2">Curating Nigerian real estate insights</p>
                             </div>
                        )}

                        {/* STATE: LESSON READING */}
                        {modalState === 'LESSON' && lessonContent && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold text-gray-900">New Concept</h2>
                                <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm text-lg leading-relaxed text-gray-700">
                                    <div className="flex gap-4 mb-4">
                                        <BookOpen className="text-primary shrink-0" size={32} />
                                        <h3 className="font-bold text-xl">{currentLesson.title}</h3>
                                    </div>
                                    {lessonContent.content}
                                </div>
                                <button 
                                    onClick={handleContentRead}
                                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-lg hover:bg-primary/90 shadow-lg shadow-primary/20 border-b-4 border-green-900 active:border-b-0 active:translate-y-1 transition-all"
                                >
                                    Got it!
                                </button>
                            </div>
                        )}

                         {/* STATE: QUIZ */}
                         {modalState === 'QUIZ' && lessonContent && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold text-gray-900">Pop Quiz</h2>
                                <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
                                    <h3 className="font-bold text-lg mb-6 leading-tight">{lessonContent.quizQuestion}</h3>
                                    <div className="space-y-3">
                                        {lessonContent.options.map((option, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => { setSelectedOption(idx); setFeedbackStatus('IDLE'); }}
                                                disabled={feedbackStatus === 'CORRECT'}
                                                className={`w-full p-4 text-left rounded-xl border-2 font-medium transition-all relative ${
                                                    selectedOption === idx 
                                                    ? feedbackStatus === 'WRONG' 
                                                        ? 'border-red-500 bg-red-50 text-red-700 animate-in shake'
                                                        : feedbackStatus === 'CORRECT'
                                                            ? 'border-green-500 bg-green-50 text-green-700'
                                                            : 'border-blue-500 bg-blue-50 text-blue-700' 
                                                    : 'border-gray-200 hover:bg-gray-50'
                                                }`}
                                            >
                                                {option}
                                                {selectedOption === idx && feedbackStatus === 'WRONG' && <X className="absolute right-4 top-4" />}
                                                {selectedOption === idx && feedbackStatus === 'CORRECT' && <CheckCircle className="absolute right-4 top-4" />}
                                            </button>
                                        ))}
                                    </div>
                                    {feedbackStatus === 'WRONG' && (
                                        <div className="mt-4 flex items-center gap-2 text-red-600 text-sm font-bold animate-in fade-in">
                                            <AlertCircle size={16} /> Incorrect. Try again!
                                        </div>
                                    )}
                                </div>
                                <button 
                                    onClick={handleAnswerSubmit}
                                    disabled={selectedOption === null || feedbackStatus === 'CORRECT'}
                                    className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg border-b-4 active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50 disabled:border-b-0 disabled:translate-y-0 ${
                                        feedbackStatus === 'CORRECT' 
                                        ? 'bg-green-600 text-white border-green-800'
                                        : 'bg-primary text-white border-green-900 hover:bg-primary/90'
                                    }`}
                                >
                                    {feedbackStatus === 'CORRECT' ? 'Nice! Continuing...' : 'Check Answer'}
                                </button>
                            </div>
                        )}

                        {/* STATE: SUCCESS */}
                        {modalState === 'SUCCESS' && (
                             <div className="text-center space-y-6">
                                 <div className="w-32 h-32 bg-yellow-400 rounded-full flex items-center justify-center mx-auto animate-bounce border-4 border-white shadow-xl">
                                     <CheckCircle size={64} className="text-white" />
                                 </div>
                                 <div>
                                     <h2 className="text-3xl font-bold text-green-700 mb-2">Lesson Complete!</h2>
                                     <div className="flex justify-center gap-4 mt-4">
                                         <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-xl font-bold border border-yellow-200">
                                             +20 XP
                                         </div>
                                         <div className="px-4 py-2 bg-orange-100 text-orange-800 rounded-xl font-bold border border-orange-200">
                                             Streak +1
                                         </div>
                                     </div>
                                 </div>
                                 <button 
                                    onClick={closeLessonModal}
                                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-lg hover:bg-primary/90 shadow-lg border-b-4 border-green-900 active:border-b-0 active:translate-y-1 transition-all"
                                >
                                    Continue
                                </button>
                             </div>
                        )}

                        {/* STATE: CERTIFICATE */}
                        {modalState === 'CERTIFICATE' && (
                             <div className="bg-white p-2 rounded-2xl shadow-2xl border-4 border-yellow-400 relative overflow-hidden text-center">
                                 <div className="p-8 border-2 border-dashed border-gray-300 rounded-xl bg-surface-container-low">
                                     <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                         <Award size={32} className="text-yellow-600" />
                                     </div>
                                     <h2 className="font-serif text-3xl font-bold text-gray-900 mb-2">Certificate of Competence</h2>
                                     <p className="text-gray-500 text-sm mb-6">Awarded to</p>
                                     <p className="font-cursive text-4xl text-primary mb-6 border-b border-gray-300 inline-block px-8 pb-2">{user.name}</p>
                                     <p className="text-gray-600 text-sm">For successfully mastering the basics of</p>
                                     <p className="font-bold text-lg text-gray-900 mt-1 mb-8">Nigerian Real Estate</p>
                                     
                                     <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-200 pt-4">
                                         <span>Ilé Academy</span>
                                         <span>{new Date().toLocaleDateString()}</span>
                                     </div>
                                 </div>
                                 <div className="p-4 bg-yellow-50 mt-4 rounded-xl flex gap-3">
                                     <button className="flex-1 bg-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90">
                                         <Share2 size={18} /> Share
                                     </button>
                                     <button onClick={closeLessonModal} className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50">
                                         Done
                                     </button>
                                 </div>
                             </div>
                        )}

                    </div>
                </div>
            )}

            {/* TERM EXPLANATION MODAL */}
            {selectedTerm && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white w-full max-w-md rounded-[32px] p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <button onClick={() => setSelectedTerm(null)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                            <X size={20} className="text-gray-600" />
                        </button>
                        
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                                <Lightbulb size={32} className="text-blue-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedTerm.term}</h2>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{selectedTerm.category}</span>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Definition</h4>
                                <p className="text-gray-700 text-sm">{selectedTerm.shortDef}</p>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap size={16} className="text-blue-600" fill="currentColor" />
                                    <h4 className="text-xs font-bold text-blue-600 uppercase">Street Smart Explanation</h4>
                                </div>
                                {loadingExplanation ? (
                                    <div className="flex items-center gap-2 text-blue-700/50 text-sm">
                                        <Loader2 size={14} className="animate-spin" /> Ilé AI is thinking...
                                    </div>
                                ) : (
                                    <p className="text-blue-800 text-sm leading-relaxed">
                                        "{aiExplanation}"
                                    </p>
                                )}
                            </div>
                        </div>

                        <button 
                            onClick={() => setSelectedTerm(null)}
                            className="w-full mt-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800"
                        >
                            Got it, thanks!
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AcademyView;
