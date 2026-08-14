import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, ShieldCheck, 
  Share2, Download, CheckCircle, Smartphone, FileText, Video, 
  Sliders, UserCheck, MessageSquare, Award, ArrowRight, Music, FastForward, Check
} from 'lucide-react';
import { User } from '../types';

interface IleWalkthroughVideoModalProps {
  user?: User | null;
  onClose: () => void;
}

interface AIPersona {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
  accent: string;
  speechPitch: number;
  speechRate: number;
  bgGradient: string;
}

const AI_PERSONAS: AIPersona[] = [
  {
    id: 'aisha',
    name: 'Aisha Lawal',
    role: 'Senior Real Estate Advisor',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    accent: 'Lagos Professional English',
    speechPitch: 1.1,
    speechRate: 1.0,
    bgGradient: 'from-emerald-900/80 via-teal-950 to-gray-950',
  },
  {
    id: 'tunde',
    name: 'Tunde Adebayo',
    role: 'Brokerage Tech Specialist',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80',
    accent: 'Nigerian Enterprise Executive',
    speechPitch: 0.9,
    speechRate: 1.05,
    bgGradient: 'from-blue-900/80 via-slate-950 to-gray-950',
  },
  {
    id: 'kemi',
    name: 'Kemi Okonjo',
    role: 'Diaspora & Investment Lead',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    accent: 'Global Real Estate Strategist',
    speechPitch: 1.05,
    speechRate: 1.0,
    bgGradient: 'from-amber-900/80 via-orange-950 to-gray-950',
  }
];

export const IleWalkthroughVideoModal: React.FC<IleWalkthroughVideoModalProps> = ({ user, onClose }) => {
  // Customization Inputs
  const [agentName, setAgentName] = useState(user?.name || 'Chief Agent Bayo');
  const [agencyName, setAgencyName] = useState('Prime Lekki Properties');
  const [targetLocation, setTargetLocation] = useState('Lekki Phase 1 & Ikoyi');
  const [agentPhone, setAgentPhone] = useState(user?.phone || '+234 803 123 4567');
  const [selectedPersona, setSelectedPersona] = useState<AIPersona>(AI_PERSONAS[0]);

  // Video State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // 0 to 60 seconds
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.25 | 1.5>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [bgMusicEnabled, setBgMusicEnabled] = useState(true);
  const [showCustomizePanel, setShowCustomizePanel] = useState(false);

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  // Web Audio Music Generator Ref
  const audioContextRef = useRef<AudioContext | null>(null);
  const musicOscillatorRef = useRef<OscillatorNode | null>(null);

  // Web Speech Synthesis
  const synthRef = useRef<SpeechSynthesis | null>(typeof window !== 'undefined' ? window.speechSynthesis : null);

  // 60-Second Scenes Data
  const scenes = [
    {
      id: 1,
      title: 'Verified Identity & Fraud Defense',
      timeRange: '0:00 - 0:15',
      startTime: 0,
      endTime: 15,
      headline: 'Instant Trust via NIMC & LASERA Verification',
      subtext: 'No fake agents, no duplicate scams. Verify identity in 10 seconds.',
      script: `Welcome to Ilé! I'm ${selectedPersona.name}. Powered by ${agencyName}, we connect clients with verified real estate. With NIMC Virtual NIN and LASERA regulatory checks, every listing is 100% fraud-proof.`,
      icon: ShieldCheck,
      color: 'emerald',
      highlights: [
        '10-Second NIMC vNIN Checksum',
        'Official LASERA Regulatory Seal',
        'Liveness Biometric Face Match'
      ]
    },
    {
      id: 2,
      title: 'Smart AI Listings & Virtual Staging',
      timeRange: '0:15 - 0:30',
      startTime: 15,
      endTime: 30,
      headline: 'AI Staging & Verified Land Title Registry',
      subtext: 'Transform empty rooms into luxury spaces with Gemini 2.5 AI.',
      script: `In ${targetLocation}, standing out is everything. Ilé AI automatically writes high-converting property descriptions, verifies Lagos Land Titles, and renders 3D photorealistic Virtual Staging in under a minute!`,
      icon: Sparkles,
      color: 'blue',
      highlights: [
        'Photorealistic 3D Virtual Furniture',
        'Lagos State Land Title Search',
        'AI Flood & Commute Pulse Data'
      ]
    },
    {
      id: 3,
      title: 'WhatsApp Business Hub & Legal Agreements',
      timeRange: '0:30 - 0:45',
      startTime: 30,
      endTime: 45,
      headline: 'Automated WhatsApp CRM & Contract Generator',
      subtext: 'Send automated property kits and generate tenancy deeds instantly.',
      script: `Engage buyers right inside WhatsApp. With one click, generate Lagos State compliant Tenancy Agreements and Deed of Assignment contracts formatted with official stamp duties.`,
      icon: MessageSquare,
      color: 'amber',
      highlights: [
        'Instant WhatsApp Property PDF Pitch',
        '1-Click Tenancy & Deed Contracts',
        'Diaspora Scout Live HD Video Calls'
      ]
    },
    {
      id: 4,
      title: 'Close Deals 3x Faster & Earn Big',
      timeRange: '0:45 - 1:00',
      startTime: 45,
      endTime: 60,
      headline: 'Accelerate Deal Closure & Revenue',
      subtext: `Contact ${agentName} at ${agencyName} to start closing today.`,
      script: `Agents on Ilé close deals three times faster and double their commission turnover. Contact ${agentName} at ${agencyName} on ${agentPhone} today. Let's build real estate wealth together with Ilé!`,
      icon: Award,
      color: 'purple',
      highlights: [
        '3x Faster Client Decision Cycles',
        'Integrated Escrow & Rent Financing',
        'Ilé Real Estate Academy Certification'
      ]
    }
  ];

  // Sync active scene based on currentTime
  useEffect(() => {
    const activeIndex = scenes.findIndex(s => currentTime >= s.startTime && currentTime < s.endTime);
    if (activeIndex !== -1 && activeIndex !== currentSceneIndex) {
      setCurrentSceneIndex(activeIndex);
    }
  }, [currentTime]);

  // Video Timer Loop
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= 60) {
            setIsPlaying(false);
            if (synthRef.current) synthRef.current.cancel();
            return 0;
          }
          return prev + 1 * playbackSpeed;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  // Handle Voice Speech Synthesis
  const speakCurrentScene = (sceneIndex: number) => {
    if (!synthRef.current || isMuted) return;
    
    synthRef.current.cancel(); // Stop current speech
    
    const currentScene = scenes[sceneIndex];
    if (!currentScene) return;

    const utterance = new SpeechSynthesisUtterance(currentScene.script);
    utterance.pitch = selectedPersona.speechPitch;
    utterance.rate = selectedPersona.speechRate * playbackSpeed;
    
    // Select a good voice if available
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v => v.lang.includes('en-NG') || v.name.includes('Nigeria') || v.name.includes('Natural') || v.lang.includes('en-GB'));
    if (preferredVoice) utterance.voice = preferredVoice;

    synthRef.current.speak(utterance);
  };

  // Trigger speech when scene changes or play toggles
  useEffect(() => {
    if (isPlaying) {
      speakCurrentScene(currentSceneIndex);
      playBackgroundSynthMusic();
    } else {
      if (synthRef.current) synthRef.current.cancel();
      stopBackgroundSynthMusic();
    }
  }, [currentSceneIndex, isPlaying, selectedPersona]);

  // Background Music Synthesis via Web Audio API
  const playBackgroundSynthMusic = () => {
    if (!bgMusicEnabled || isMuted) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    } catch (e) {
      console.log('Web audio initialized', e);
    }
  };

  const stopBackgroundSynthMusic = () => {
    if (musicOscillatorRef.current) {
      try {
        musicOscillatorRef.current.stop();
      } catch (e) {}
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setCurrentSceneIndex(0);
    if (synthRef.current) synthRef.current.cancel();
  };

  const handleSeekScene = (index: number) => {
    const targetScene = scenes[index];
    setCurrentSceneIndex(index);
    setCurrentTime(targetScene.startTime);
    if (isPlaying) {
      speakCurrentScene(index);
    }
  };

  // Handle Video Export
  const handleExportVideo = () => {
    setIsExporting(true);
    setExportProgress(10);

    const interval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsExporting(false);
          // Trigger file download simulation
          const blob = new Blob([
            `Ilé Walkthrough Video Script & Asset Package\n\nAgent: ${agentName}\nAgency: ${agencyName}\nPersona: ${selectedPersona.name}\nTarget Region: ${targetLocation}\n\nSCENE 1: ${scenes[0].script}\n\nSCENE 2: ${scenes[1].script}\n\nSCENE 3: ${scenes[2].script}\n\nSCENE 4: ${scenes[3].script}`
          ], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Ile_60Sec_Walkthrough_${agentName.replace(/\s+/g, '_')}.txt`;
          a.click();
          return 100;
        }
        return prev + 20;
      });
    }, 400);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://ile.ng/video-walkthrough?agent=${encodeURIComponent(agentName)}&persona=${selectedPersona.id}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const currentScene = scenes[currentSceneIndex];
  const IconComponent = currentScene.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-gray-950 text-white w-full max-w-5xl rounded-3xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-gray-800/80 flex items-center justify-between bg-gray-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Video size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">Ilé 60-Second Walkthrough Video Studio</h2>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full">
                  AI Avatar Synthesis
                </span>
              </div>
              <p className="text-xs text-gray-400">Customized video presentation for agents to showcase features & close deals faster</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCustomizePanel(!showCustomizePanel)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                showCustomizePanel 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700'
              }`}
            >
              <Sliders size={14} />
              <span>{showCustomizePanel ? 'Hide Customizer' : 'Customize Video'}</span>
            </button>
            <button
              onClick={() => {
                if (synthRef.current) synthRef.current.cancel();
                onClose();
              }}
              className="p-2 hover:bg-gray-800 text-gray-400 hover:text-white rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Main Content Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-0">
          
          {/* Main Video Viewport Section (8 Cols on Desktop) */}
          <div className={`p-4 sm:p-6 flex flex-col justify-between ${showCustomizePanel ? 'lg:col-span-7' : 'lg:col-span-12'} transition-all`}>
            
            {/* Video Screen Container */}
            <div className={`relative w-full aspect-video rounded-2xl bg-gradient-to-br ${selectedPersona.bgGradient} border border-gray-800 shadow-2xl overflow-hidden flex flex-col justify-between p-4 sm:p-6 select-none`}>
              
              {/* Background Animated Particle Overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.15),transparent_50%)] pointer-events-none" />

              {/* Video Top Branding Overlay */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-bold tracking-wide text-white">ILÉ REAL ESTATE NETWORK</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10 text-[11px] font-mono text-emerald-300 font-bold">
                    {agencyName}
                  </div>
                  <div className="bg-emerald-600/80 text-white px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider shadow">
                    Verified Agent
                  </div>
                </div>
              </div>

              {/* Central AI Persona & Scene Visual Stage */}
              <div className="relative z-10 my-auto py-2 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                
                {/* AI Presenter Avatar Card */}
                <div className="sm:col-span-4 flex flex-col items-center text-center">
                  <div className="relative group">
                    <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-gradient-to-tr from-emerald-500 via-teal-400 to-amber-400 shadow-2xl transition-all duration-500 ${isPlaying ? 'scale-105 ring-4 ring-emerald-500/30' : ''}`}>
                      <img 
                        src={selectedPersona.avatarUrl} 
                        alt={selectedPersona.name} 
                        className="w-full h-full object-cover rounded-full filter brightness-105"
                      />
                    </div>

                    {/* Audio Equalizer Pulsing Waves during playback */}
                    {isPlaying && (
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-emerald-500/50 flex items-center gap-1">
                        <span className="w-1 h-3 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1 h-4 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1 h-2 bg-emerald-400 rounded-full animate-bounce" />
                        <span className="w-1 h-3 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.2s]" />
                      </div>
                    )}
                  </div>

                  <h4 className="mt-2 text-sm font-bold text-white tracking-wide">{selectedPersona.name}</h4>
                  <p className="text-[10px] text-emerald-300 font-medium">{selectedPersona.role}</p>
                </div>

                {/* Active Scene Content Breakdown */}
                <div className="sm:col-span-8 bg-black/50 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/10 shadow-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    <IconComponent size={16} />
                    <span>Scene {currentSceneIndex + 1}: {currentScene.title}</span>
                  </div>

                  <h3 className="text-base sm:text-lg font-extrabold text-white leading-snug">
                    "{currentScene.headline}"
                  </h3>

                  <p className="text-xs text-gray-300 leading-relaxed italic">
                    "{currentScene.script}"
                  </p>

                  <div className="pt-1 flex flex-wrap gap-1.5">
                    {currentScene.highlights.map((item, idx) => (
                      <span key={idx} className="bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 text-[10px] font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <CheckCircle size={10} className="text-emerald-400" /> {item}
                      </span>
                    ))}
                  </div>
                </div>

              </div>

              {/* Video Bottom Floating Caption Bar */}
              <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2 bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-xs">
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="font-bold text-emerald-400">Agent:</span> {agentName} 
                  <span className="text-gray-500">•</span> 
                  <span className="font-bold text-emerald-400">Region:</span> {targetLocation}
                </div>

                <div className="text-[11px] text-gray-400 font-mono">
                  Tel: <span className="text-white font-bold">{agentPhone}</span>
                </div>
              </div>

            </div>

            {/* Video Controls & Time Scrubber */}
            <div className="mt-4 bg-gray-900/80 border border-gray-800 rounded-2xl p-4 space-y-3">
              
              {/* Timeline Progress Bar */}
              <div>
                <div className="flex justify-between items-center text-xs font-mono text-gray-400 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-400">
                      0:{currentTime < 10 ? `0${Math.floor(currentTime)}` : Math.floor(currentTime)}
                    </span>
                    <span>/ 1:00</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-300">
                    Scene {currentSceneIndex + 1} of 4
                  </span>
                </div>

                <div className="relative w-full h-3 bg-gray-800 rounded-full cursor-pointer overflow-hidden flex items-center"
                     onClick={(e) => {
                       const rect = e.currentTarget.getBoundingClientRect();
                       const clickX = e.clientX - rect.left;
                       const pct = clickX / rect.width;
                       const seekTime = pct * 60;
                       setCurrentTime(seekTime);
                     }}>
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-200" 
                    style={{ width: `${(currentTime / 60) * 100}%` }}
                  />
                  
                  {/* Scene Markers */}
                  {scenes.map((s, idx) => (
                    <div 
                      key={s.id} 
                      className="absolute top-0 bottom-0 w-0.5 bg-gray-900 z-10" 
                      style={{ left: `${(s.startTime / 60) * 100}%` }}
                      title={s.title}
                    />
                  ))}
                </div>

                {/* Scene Buttons Row */}
                <div className="grid grid-cols-4 gap-1.5 mt-2">
                  {scenes.map((s, idx) => (
                    <button
                      key={s.id}
                      onClick={() => handleSeekScene(idx)}
                      className={`p-2 rounded-xl text-left border transition-all text-xs ${
                        currentSceneIndex === idx 
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold' 
                          : 'bg-gray-800/60 border-gray-800 text-gray-400 hover:bg-gray-800'
                      }`}
                    >
                      <div className="text-[10px] opacity-75">{s.timeRange}</div>
                      <div className="truncate font-semibold">{s.title}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Buttons Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePlayPause}
                    className="bg-emerald-500 hover:bg-emerald-600 text-gray-950 font-extrabold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                    <span>{isPlaying ? 'Pause Video' : 'Play Walkthrough'}</span>
                  </button>

                  <button
                    onClick={handleReset}
                    className="p-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors cursor-pointer"
                    title="Replay from Beginning"
                  >
                    <RotateCcw size={18} />
                  </button>

                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                      isMuted ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                    }`}
                    title={isMuted ? 'Unmute Speech Voice' : 'Mute Speech Voice'}
                  >
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>

                  <button
                    onClick={() => setBgMusicEnabled(!bgMusicEnabled)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      bgMusicEnabled ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}
                    title="Toggle Afro Beats Ambient Music"
                  >
                    <Music size={16} />
                    <span className="hidden sm:inline">Afro Beats</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-gray-800 rounded-xl p-1 border border-gray-700 text-xs font-bold text-gray-300">
                    {([1, 1.25, 1.5] as const).map(spd => (
                      <button
                        key={spd}
                        onClick={() => setPlaybackSpeed(spd)}
                        className={`px-2 py-1 rounded-lg transition-all ${
                          playbackSpeed === spd ? 'bg-emerald-500 text-gray-950 font-extrabold' : 'hover:text-white'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleExportVideo}
                    disabled={isExporting}
                    className="bg-gray-800 hover:bg-gray-700 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 border border-gray-700 transition-all cursor-pointer"
                  >
                    <Download size={16} className="text-emerald-400" />
                    <span>{isExporting ? `Exporting (${exportProgress}%)` : 'Export Video'}</span>
                  </button>
                </div>
              </div>

            </div>

          </div>

          {/* Side Customizer & Persona Selection Panel (5 Cols) */}
          {showCustomizePanel && (
            <div className="lg:col-span-5 bg-gray-900 border-t lg:border-t-0 lg:border-l border-gray-800 p-6 space-y-6 overflow-y-auto">
              
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders size={18} className="text-emerald-400" />
                  <span>Customize Walkthrough Video</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Personalize the video presentation with your agency details and select an AI presenter persona.
                </p>
              </div>

              {/* Persona Selection */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                  Select AI Presenter Persona
                </label>
                <div className="space-y-2">
                  {AI_PERSONAS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPersona(p)}
                      className={`w-full p-3 rounded-2xl border flex items-center gap-3 text-left transition-all ${
                        selectedPersona.id === p.id 
                          ? 'bg-emerald-500/10 border-emerald-500 text-white ring-1 ring-emerald-500/50' 
                          : 'bg-gray-800/50 border-gray-800 text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      <img src={p.avatarUrl} alt={p.name} className="w-12 h-12 rounded-full object-cover border border-gray-700" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-white">{p.name}</h4>
                          {selectedPersona.id === p.id && <Check size={16} className="text-emerald-400" />}
                        </div>
                        <p className="text-xs text-emerald-400">{p.role}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{p.accent}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Agent Form Inputs */}
              <div className="space-y-4 pt-2 border-t border-gray-800">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Agent / Presenter Name</label>
                  <input 
                    type="text" 
                    value={agentName} 
                    onChange={(e) => setAgentName(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Brokerage / Agency Name</label>
                  <input 
                    type="text" 
                    value={agencyName} 
                    onChange={(e) => setAgencyName(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Target Location Focus</label>
                  <input 
                    type="text" 
                    value={targetLocation} 
                    onChange={(e) => setTargetLocation(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Phone / WhatsApp Contact</label>
                  <input 
                    type="text" 
                    value={agentPhone} 
                    onChange={(e) => setAgentPhone(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {/* Quick Share Buttons */}
              <div className="pt-4 border-t border-gray-800 space-y-2">
                <button
                  onClick={handleCopyLink}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-gray-700 transition-all cursor-pointer"
                >
                  <Share2 size={16} className="text-emerald-400" />
                  <span>{copiedLink ? 'Walkthrough Link Copied!' : 'Copy Customized Video Link'}</span>
                </button>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Check out this customized Ilé 60-second video walkthrough presented by ${selectedPersona.name} for ${agencyName}: https://ile.ng/video-walkthrough?agent=${encodeURIComponent(agentName)}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <MessageSquare size={16} />
                  <span>Share Customized Video to WhatsApp</span>
                </a>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default IleWalkthroughVideoModal;
