import React, { useEffect, useState, useRef } from 'react';
import { UserProfile, AnalysisResult, RoadmapStep, ChatMessage, InterviewEvaluation } from '../types';
import { analyzeProfile, generateRoadmap, chatWithAdvisor, generateCV, evaluateInterview, ai } from '../services/geminiService';
import { Modality, LiveServerMessage, Blob } from '@google/genai';
import { 
  Bot, 
  Map as MapIcon, 
  FileText, 
  Briefcase, 
  Send, 
  Loader2, 
  CheckCircle2, 
  Award,
  Download,
  ExternalLink,
  Target,
  Mic,
  StopCircle,
  Headphones,
  Volume2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface DashboardProps {
  profile: UserProfile;
}

const Dashboard: React.FC<DashboardProps> = ({ profile }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'roadmap' | 'chat' | 'cv' | 'interview'>('overview');
  
  // Data States
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [roadmap, setRoadmap] = useState<RoadmapStep[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [cvContent, setCvContent] = useState<string>('');
  
  // Loading States
  const [loadingAnalysis, setLoadingAnalysis] = useState(true);
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingCv, setLoadingCv] = useState(false);

  // Inputs
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Interview Simulation States ---
  const [interviewActive, setInterviewActive] = useState(false);
  const [interviewTimeLeft, setInterviewTimeLeft] = useState(20 * 60); // 20 minutes
  const [interviewTranscript, setInterviewTranscript] = useState('');
  const [interviewEvaluation, setInterviewEvaluation] = useState<InterviewEvaluation | null>(null);
  const [loadingEvaluation, setLoadingEvaluation] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const timerRef = useRef<any>(null);

  // Initial Analysis and Sequential Loading
  useEffect(() => {
    const initData = async () => {
      try {
        // Step 1: Analyze Profile
        setLoadingAnalysis(true);
        const analysisResult = await analyzeProfile(profile);
        setAnalysis(analysisResult);
        setLoadingAnalysis(false);

        // Step 2: Generate Roadmap based on TOP role
        if (analysisResult.recommendedRoles && analysisResult.recommendedRoles.length > 0) {
          setLoadingRoadmap(true);
          const topRole = analysisResult.recommendedRoles[0];
          const roadmapResult = await generateRoadmap(profile, topRole);
          setRoadmap(roadmapResult);
          setLoadingRoadmap(false);
        }

      } catch (e) {
        console.error(e);
        setLoadingAnalysis(false);
        setLoadingRoadmap(false);
      }
    };
    initData();
  }, [profile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, activeTab]);

  // Clean up Audio Contexts on unmount
  useEffect(() => {
    return () => {
      stopInterview();
    };
  }, []);

  // --- HANDLERS ---
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg: ChatMessage = { role: 'user', text: chatInput, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setLoadingChat(true);

    try {
      const responseText = await chatWithAdvisor(chatHistory, userMsg.text, profile);
      const botMsg: ChatMessage = { role: 'model', text: responseText || "عذراً، حدث خطأ.", timestamp: new Date() };
      setChatHistory(prev => [...prev, botMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleGenerateCV = async () => {
    if (cvContent) return; // Already generated
    setLoadingCv(true);
    try {
      const content = await generateCV(profile, analysis);
      setCvContent(content || '');
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCv(false);
    }
  };

  // --- INTERVIEW LOGIC (LIVE API) ---
  const startInterview = async () => {
    if (!analysis?.recommendedRoles?.[0]) return;
    const targetRole = analysis.recommendedRoles[0];
    
    setInterviewActive(true);
    setInterviewTimeLeft(20 * 60);
    setInterviewTranscript('');
    setInterviewEvaluation(null);

    // 1. Setup Audio Contexts
    const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 16000});
    const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    inputAudioContextRef.current = inputCtx;
    audioContextRef.current = outputCtx;
    nextStartTimeRef.current = outputCtx.currentTime;

    try {
      // 2. Get User Media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 3. Connect to Live API
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `
            You are a senior HR Manager conducting a professional job interview in Arabic.
            The job role is: "${targetRole}".
            The candidate is a ${profile.status} in ${profile.major}.
            
            Start by welcoming the candidate briefly when they speak.
            Keep your questions concise.
            Wait for the candidate to answer before asking the next question.
          `,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: async () => {
             console.log("Interview Connected");
             
             // Ensure contexts are running
             if (outputCtx.state === 'suspended') {
               await outputCtx.resume();
             }
             if (inputCtx.state === 'suspended') {
               await inputCtx.resume();
             }

             // Setup Input Stream
             const source = inputCtx.createMediaStreamSource(stream);
             const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
             scriptProcessor.onaudioprocess = (e) => {
               if (!interviewActive) return; // safety check
               const inputData = e.inputBuffer.getChannelData(0);
               const pcmBlob = createPcmBlob(inputData);
               sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
             };
             source.connect(scriptProcessor);
             scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
             // Handle Transcript
             if (msg.serverContent?.outputTranscription?.text) {
               setInterviewTranscript(prev => prev + "\nالمحاور: " + msg.serverContent?.outputTranscription?.text);
             }
             if (msg.serverContent?.inputTranscription?.text) {
               setInterviewTranscript(prev => prev + "\nأنت: " + msg.serverContent?.inputTranscription?.text);
             }

             // Handle Audio
             const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
             if (base64Audio) {
                const ctx = audioContextRef.current;
                if(ctx) {
                   // Ensure context is running if message received
                   if (ctx.state === 'suspended') await ctx.resume();

                  // Track start time
                  nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                  
                  const audioBuffer = await decodeAudioData(
                    decodeBase64(base64Audio),
                    ctx,
                    24000,
                    1
                  );
                  const source = ctx.createBufferSource();
                  source.buffer = audioBuffer;
                  const node = ctx.createGain(); // volume control if needed
                  source.connect(node);
                  node.connect(ctx.destination);
                  
                  source.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += audioBuffer.duration;
                  
                  sourcesRef.current.add(source);
                  source.onended = () => sourcesRef.current.delete(source);
                }
             }

             // Handle Interruption
             if(msg.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                if(audioContextRef.current) nextStartTimeRef.current = audioContextRef.current.currentTime;
             }
          },
          onclose: () => console.log("Interview Closed"),
          onerror: (e) => console.error("Interview Error", e)
        }
      });
      
      // Start Timer
      timerRef.current = setInterval(() => {
        setInterviewTimeLeft(prev => {
          if (prev <= 1) {
             stopInterview();
             return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (e) {
      console.error("Failed to start interview", e);
      setInterviewActive(false);
    }
  };

  const stopInterview = async () => {
    // 1. Cleanup Audio
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    
    setInterviewActive(false);
    
    // 2. Generate Evaluation if we have a transcript
    if (interviewTranscript.length > 50) {
      setLoadingEvaluation(true);
      const role = analysis?.recommendedRoles?.[0] || 'Unknown';
      try {
         const evalResult = await evaluateInterview(interviewTranscript, role);
         setInterviewEvaluation(evalResult);
      } catch(e) {
         console.error(e);
      } finally {
         setLoadingEvaluation(false);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loadingAnalysis) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-600 space-y-6">
        <div className="relative">
          <div className="absolute inset-0 bg-teal-500 blur-xl opacity-20 animate-pulse rounded-full"></div>
          <Loader2 className="w-16 h-16 animate-spin text-teal-600 relative z-10" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">جاري تحليل مسارك المهني</h2>
          <p className="text-slate-500">يقوم الذكاء الاصطناعي بدراسة إجاباتك ومقارنتها بسوق العمل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row direction-rtl font-sans">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-72 bg-white border-l border-slate-200 p-6 flex flex-col fixed md:relative bottom-0 md:h-screen z-20 shadow-xl md:shadow-none">
        <div className="hidden md:flex items-center gap-3 mb-10 text-slate-900 px-2">
          <div className="p-2 bg-teal-100 rounded-lg">
             <Briefcase className="w-6 h-6 text-teal-700" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">وجهني</h1>
            <span className="text-[10px] text-teal-600 font-bold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">AI PRO</span>
          </div>
        </div>

        <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible no-scrollbar p-1">
          <NavButton 
            active={activeTab === 'overview'} 
            onClick={() => setActiveTab('overview')} 
            icon={<Briefcase size={20} />} 
            label="نظرة عامة" 
          />
          <NavButton 
            active={activeTab === 'roadmap'} 
            onClick={() => setActiveTab('roadmap')} 
            icon={<MapIcon size={20} />} 
            label="المسار المهني" 
          />
          <NavButton 
            active={activeTab === 'chat'} 
            onClick={() => setActiveTab('chat')} 
            icon={<Bot size={20} />} 
            label="المساعد الذكي" 
          />
           <NavButton 
            active={activeTab === 'interview'} 
            onClick={() => setActiveTab('interview')} 
            icon={<Headphones size={20} />} 
            label="المقابلة الذكية" 
          />
          <NavButton 
            active={activeTab === 'cv'} 
            onClick={() => { setActiveTab('cv'); handleGenerateCV(); }} 
            icon={<FileText size={20} />} 
            label="السيرة الذاتية" 
          />
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100 hidden md:block">
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
              <UserIcon />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-900 truncate">{profile.major}</p>
              <p className="text-xs text-slate-500">{profile.status === 'student' ? 'طالب' : 'خريج'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 mb-20 md:mb-0 overflow-y-auto h-screen scroll-smooth">
        
        {/* Header Mobile */}
        <div className="md:hidden flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-slate-900">وجهني</h1>
          <span className="text-xs px-2 py-1 bg-teal-100 text-teal-800 rounded-full font-bold">{profile.status}</span>
        </div>

        {/* --- OVERVIEW TAB --- */}
        {activeTab === 'overview' && analysis && (
          <div className="space-y-8 max-w-5xl mx-auto animate-fadeIn pb-10">
            <header className="mb-8">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3 leading-tight">
                 التحليل المهني الشامل
              </h2>
              <p className="text-slate-500 text-lg">بناءً على تخصصك وإجابات اختبار الميول، إليك التقرير التالي:</p>
            </header>

            {/* Summary Hero */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                   <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600"><Award size={24} /></div>
                   <h3 className="font-bold text-xl text-slate-800">الخلاصة التنفيذية</h3>
                </div>
                <p className="text-slate-700 leading-8 text-lg font-medium">{analysis.summary}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
               {/* Recommended Roles - Takes up more space */}
               <div className="md:col-span-7 bg-slate-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                  <div className="relative z-10">
                    <h3 className="font-bold text-xl mb-6 border-b border-white/20 pb-4 flex items-center gap-2">
                      <Target className="text-teal-400" />
                      أفضل 3 مسارات وظيفية لك
                    </h3>
                    <div className="space-y-4">
                      {analysis.recommendedRoles.map((role, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/5 hover:bg-white/20 transition-colors cursor-default">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center font-bold text-sm">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-lg">{role}</span>
                          </div>
                          {idx === 0 && <span className="text-xs bg-teal-500 text-white px-2 py-1 rounded">الأنسب لك</span>}
                        </div>
                      ))}
                    </div>
                  </div>
               </div>

               {/* Strengths */}
               <div className="md:col-span-5 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                  <h3 className="font-bold text-xl mb-6 text-slate-800">نقاط القوة المكتشفة</h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.strengths.map((s, idx) => (
                      <span key={idx} className="px-4 py-2 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold hover:border-teal-500 hover:text-teal-600 transition-colors cursor-default">
                        {s}
                      </span>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* --- ROADMAP TAB --- */}
        {activeTab === 'roadmap' && (
          <div className="max-w-4xl mx-auto animate-fadeIn pb-10">
            <header className="mb-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-2">خارطة الطريق المتقدمة</h2>
                  <p className="text-slate-500">تم تصميم هذه الخطة لتأهيلك لوظيفة: <span className="font-bold text-teal-600 underline">{analysis?.recommendedRoles[0]}</span></p>
                </div>
                {loadingRoadmap && <div className="text-sm text-teal-600 font-medium animate-pulse flex items-center gap-2"><Loader2 className="animate-spin w-4 h-4"/> جاري بناء الخطة...</div>}
              </div>
            </header>

            {loadingRoadmap ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-50">
                 <div className="w-full max-w-md space-y-4">
                    {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-200 rounded-2xl animate-pulse"></div>)}
                 </div>
              </div>
            ) : (
              <div className="space-y-8 relative">
                {/* Connecting Line */}
                <div className="absolute top-8 bottom-8 right-[27px] w-0.5 bg-slate-200 md:block hidden"></div>

                {roadmap.map((step, idx) => (
                  <div key={idx} className="relative flex flex-col md:flex-row gap-6 group">
                    {/* Number Indicator */}
                    <div className="hidden md:flex flex-none w-14 h-14 rounded-full bg-white border-4 border-teal-50 text-teal-600 font-bold text-xl items-center justify-center relative z-10 shadow-sm group-hover:bg-teal-500 group-hover:text-white transition-colors group-hover:border-teal-200">
                      {idx + 1}
                    </div>

                    {/* Card */}
                    <div className="flex-1 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 group-hover:shadow-md transition-all hover:-translate-y-1">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-slate-800 group-hover:text-teal-700 transition-colors">{step.title}</h3>
                        <span className="text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded-lg shadow-sm">{step.duration}</span>
                      </div>
                      
                      <p className="text-slate-600 mb-6 leading-relaxed border-b border-slate-50 pb-4">{step.description}</p>
                      
                      {/* Certifications & Platform */}
                      <div className="flex flex-col md:flex-row gap-4">
                         {step.certifications && step.certifications.length > 0 && (
                           <div className="flex-1">
                              <span className="text-xs font-bold text-slate-400 uppercase block mb-2">الشهادات المستهدفة</span>
                              <div className="flex flex-wrap gap-2">
                                {step.certifications.map((cert, cIdx) => (
                                  <span key={cIdx} className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-700 border border-yellow-100 rounded text-xs font-bold">
                                     <Award size={12} /> {cert}
                                  </span>
                                ))}
                              </div>
                           </div>
                         )}
                         
                         <div className="md:w-auto">
                            <span className="text-xs font-bold text-slate-400 uppercase block mb-2">المنصة المقترحة</span>
                            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg font-bold border border-blue-100">
                              <ExternalLink size={14} />
                              <span>{step.platform}</span>
                            </div>
                         </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- INTERVIEW TAB (NEW) --- */}
        {activeTab === 'interview' && (
          <div className="max-w-4xl mx-auto animate-fadeIn h-full flex flex-col items-center">
            
            {!interviewActive && !interviewEvaluation && (
              <div className="text-center max-w-lg mt-10">
                 <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Headphones size={48} className="text-teal-600" />
                 </div>
                 <h2 className="text-3xl font-bold text-slate-900 mb-4">المقابلة الوظيفية الذكية</h2>
                 <p className="text-slate-500 mb-8 leading-relaxed">
                   استعد للمقابلات الحقيقية من خلال محاكاة صوتية كاملة مع الذكاء الاصطناعي.
                   سيقوم النظام بتمثيل دور مدير التوظيف لوظيفة <span className="font-bold text-teal-600">{analysis?.recommendedRoles[0]}</span> وإجراء مقابلة معك لمدة 20 دقيقة.
                 </p>
                 <button 
                  onClick={startInterview}
                  className="px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:bg-slate-800 hover:scale-105 transition-all flex items-center gap-3 mx-auto"
                 >
                   <Mic size={24} />
                   ابدأ المقابلة الآن
                 </button>
                 <p className="mt-4 text-xs text-slate-400 flex items-center justify-center gap-1">
                   <CheckCircle2 size={12} /> تأكد من السماح باستخدام الميكروفون
                 </p>
              </div>
            )}

            {interviewActive && (
              <div className="w-full flex flex-col items-center justify-center h-[60vh]">
                 <div className="relative mb-12">
                    <div className="absolute inset-0 bg-teal-500 blur-2xl opacity-20 animate-ping rounded-full"></div>
                    <div className="w-40 h-40 bg-gradient-to-br from-slate-900 to-slate-800 rounded-full flex items-center justify-center shadow-2xl relative z-10 border-4 border-teal-500/30">
                       <div className="flex gap-1 items-center h-8">
                         {[1,2,3,4,5].map(i => (
                           <div key={i} className="w-1.5 bg-teal-400 rounded-full animate-voice-bar" style={{height: `${Math.random() * 24 + 8}px`, animationDelay: `${i * 0.1}s`}}></div>
                         ))}
                       </div>
                    </div>
                 </div>

                 <div className="text-center space-y-4">
                    <h3 className="text-2xl font-bold text-slate-900">المقابلة جارية...</h3>
                    <div className="flex items-center justify-center gap-2 text-teal-600">
                       <Volume2 size={20} className="animate-pulse" />
                       <p className="text-lg font-bold animate-pulse">تحدث الآن لتبدأ المحادثة (قل مرحباً)</p>
                    </div>
                    <div className="text-4xl font-mono font-bold text-slate-800 tabular-nums">
                       {formatTime(interviewTimeLeft)}
                    </div>
                 </div>

                 <button 
                  onClick={stopInterview}
                  className="mt-12 px-6 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors flex items-center gap-2"
                 >
                   <StopCircle size={20} />
                   إنهاء المقابلة
                 </button>
              </div>
            )}

            {!interviewActive && loadingEvaluation && (
               <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-12 h-12 animate-spin text-teal-600 mb-4" />
                  <h3 className="text-xl font-bold text-slate-800">جاري تحليل المقابلة...</h3>
                  <p className="text-slate-500">نقوم الآن بتقييم إجاباتك وإعداد التقرير والنصائح.</p>
               </div>
            )}

            {!interviewActive && interviewEvaluation && (
               <div className="w-full space-y-6 animate-fadeIn pb-10">
                  <header className="flex items-center justify-between">
                     <h2 className="text-2xl font-bold text-slate-900">تقرير أداء المقابلة</h2>
                     <div className={`px-4 py-2 rounded-xl font-bold text-white ${interviewEvaluation.score >= 70 ? 'bg-green-500' : interviewEvaluation.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                        النتيجة: {interviewEvaluation.score}/100
                     </div>
                  </header>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                     <h3 className="font-bold text-lg mb-2 text-slate-800">رأي المستشار (الذكاء الاصطناعي)</h3>
                     <p className="text-slate-600 leading-relaxed">{interviewEvaluation.feedback}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                        <h3 className="font-bold text-green-800 mb-4 flex items-center gap-2"><CheckCircle2 size={20}/> نقاط القوة</h3>
                        <ul className="space-y-2">
                           {interviewEvaluation.strengths.map((s, idx) => (
                             <li key={idx} className="text-green-700 text-sm list-disc list-inside">{s}</li>
                           ))}
                        </ul>
                     </div>
                     <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
                        <h3 className="font-bold text-orange-800 mb-4 flex items-center gap-2"><Target size={20}/> نصائح للتحسين</h3>
                        <ul className="space-y-2">
                           {interviewEvaluation.improvements.map((s, idx) => (
                             <li key={idx} className="text-orange-700 text-sm list-disc list-inside">{s}</li>
                           ))}
                        </ul>
                     </div>
                  </div>

                  <div className="flex justify-center mt-6">
                     <button onClick={startInterview} className="px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-bold">
                        إجراء مقابلة أخرى
                     </button>
                  </div>
               </div>
            )}
          </div>
        )}

        {/* --- CHAT TAB --- */}
        {activeTab === 'chat' && (
          <div className="h-[80vh] flex flex-col bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden animate-fadeIn">
            {/* ... Existing Chat UI ... */}
            <div className="bg-slate-900 p-4 flex items-center gap-3 text-white">
              <div className="bg-white/10 p-2 rounded-full">
                <Bot size={24} className="text-teal-400" />
              </div>
              <div>
                <h3 className="font-bold">المستشار المهني الذكي</h3>
                <p className="text-xs text-slate-400">مدعوم بنموذج Gemini 2.5 Flash</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50">
              {chatHistory.length === 0 && (
                <div className="text-center text-slate-400 mt-20 flex flex-col items-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                     <Bot size={40} className="text-slate-300" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-600">كيف يمكنني مساعدتك؟</h4>
                  <p className="text-sm">اسأل عن تفاصيل خارطة الطريق، أو نصائح للمقابلة الشخصية.</p>
                </div>
              )}
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-5 py-4 rounded-3xl shadow-sm text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-teal-600 text-white rounded-tl-none' 
                      : 'bg-white border border-slate-200 text-slate-700 rounded-tr-none'
                  }`}>
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                </div>
              ))}
              {loadingChat && (
                <div className="flex justify-start">
                   <div className="bg-white px-6 py-4 rounded-3xl rounded-tr-none shadow-sm flex gap-2 items-center border border-slate-100">
                      <span className="text-xs font-bold text-slate-400">يكتب...</span>
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                      </span>
                   </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-slate-100">
              <div className="relative">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="اكتب استفسارك هنا..."
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-colors"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={loadingChat || !chatInput.trim()}
                  className="absolute left-2 top-2 p-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- CV TAB --- */}
        {activeTab === 'cv' && (
          <div className="max-w-4xl mx-auto animate-fadeIn h-full flex flex-col pb-10">
            {/* Same as before basically, just styling tweaks */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900">السيرة الذاتية الذكية</h2>
              <button className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 px-5 py-2.5 rounded-xl transition-all font-bold shadow-lg shadow-slate-200">
                <Download size={18} />
                <span>حفظ PDF</span>
              </button>
            </div>

            {loadingCv ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-white rounded-3xl border border-dashed border-slate-300 min-h-[400px]">
                <Loader2 className="w-10 h-10 animate-spin text-teal-500 mb-4" />
                <p>جاري صياغة السيرة الذاتية...</p>
              </div>
            ) : (
              <div className="bg-white p-8 md:p-16 shadow-xl border border-slate-100 rounded-3xl min-h-[600px] overflow-y-auto">
                <div className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-headings:font-bold prose-p:text-slate-600 prose-a:text-teal-600">
                   <ReactMarkdown>{cvContent}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
};

// --- AUDIO HELPER FUNCTIONS ---
function createPcmBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: btoa(String.fromCharCode(...new Uint8Array(int16.buffer))),
    mimeType: 'audio/pcm;rate=16000',
  };
}

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


const NavButton = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full md:w-auto md:justify-start justify-center ${
      active 
        ? 'bg-slate-900 text-white shadow-lg shadow-slate-200 scale-105' 
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
    }`}
  >
    {icon}
    <span className="font-bold whitespace-nowrap hidden md:inline-block">{label}</span>
    {/* Mobile Label only for active? No, keep layout clean */}
  </button>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
  </svg>
);

export default Dashboard;