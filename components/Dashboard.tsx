
import React, { useEffect, useState, useRef } from 'react';
import { UserProfile, AnalysisResult, RoadmapStep, ChatMessage } from '../types';
import { analyzeProfile, generateRoadmap, chatWithAdvisor, generateCV, ai } from '../services/geminiService';
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
  Target,
  Mic,
  Volume2,
  Mail,
  Phone,
  Languages,
  User,
  Sparkles,
  MessageCircle,
  ArrowRight as LucideArrowRight,
  PhoneCall
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface DashboardProps {
  profile: UserProfile;
  skipAnalysis?: boolean; // Skip API calls for test mode
}

const Dashboard: React.FC<DashboardProps> = ({ profile, skipAnalysis = false }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'roadmap' | 'chat' | 'cv' | 'interview'>(skipAnalysis ? 'interview' : 'overview');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(
    skipAnalysis ? { summary: "وضع الاختبار", strengths: ["اختبار"], recommendedRoles: ["مطور برمجيات"] } : null
  );
  const [roadmap, setRoadmap] = useState<RoadmapStep[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [cvContent, setCvContent] = useState<string>('');

  const [loadingAnalysis, setLoadingAnalysis] = useState(!skipAnalysis);
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingCv, setLoadingCv] = useState(false);

  const [cvStep, setCvStep] = useState<'form' | 'result'>('form');
  const [cvForm, setCvForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    linkedin: '',
    education: '',
    skills: '',
    experience: '',
    projects: '',
    summary: '',
    language: 'ar' as 'ar' | 'en'
  });

  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Interview States
  const [interviewActive, setInterviewActive] = useState(false);
  const [isAiTalking, setIsAiTalking] = useState(false);
  const [userVolume, setUserVolume] = useState(0);
  const [interviewTimeLeft, setInterviewTimeLeft] = useState(15 * 60);

  // Audio Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const timerRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    // Skip API calls if in test mode
    if (skipAnalysis) return;

    const initData = async () => {
      try {
        setLoadingAnalysis(true);
        const analysisResult = await analyzeProfile(profile);
        setAnalysis(analysisResult);
        setLoadingAnalysis(false);
        if (analysisResult.recommendedRoles?.length > 0) {
          setLoadingRoadmap(true);
          const roadmapResult = await generateRoadmap(profile, analysisResult.recommendedRoles[0]);
          setRoadmap(roadmapResult);
          setLoadingRoadmap(false);
        }
      } catch (e) {
        console.error(e);
        setLoadingAnalysis(false);
      }
    };
    initData();
  }, [profile, skipAnalysis]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, activeTab, loadingChat]);

  // Handle visual feedback for user's voice
  useEffect(() => {
    let animationFrame: number;
    const monitorVolume = () => {
      if (analyserRef.current && interviewActive) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setUserVolume(average);
      }
      animationFrame = requestAnimationFrame(monitorVolume);
    };
    if (interviewActive) {
      monitorVolume();
    }
    return () => cancelAnimationFrame(animationFrame);
  }, [interviewActive]);

  const startInterview = async () => {
    if (!analysis?.recommendedRoles?.[0]) return;
    const targetRole = analysis.recommendedRoles[0];

    setInterviewActive(true);
    setInterviewTimeLeft(15 * 60);

    // 1. Setup Audio Contexts IMMEDIATELY on user interaction
    const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

    // Resume immediately to unlock audio on browsers
    await inputCtx.resume();
    await outputCtx.resume();

    inputAudioContextRef.current = inputCtx;
    outputAudioContextRef.current = outputCtx;
    nextStartTimeRef.current = outputCtx.currentTime;

    try {
      // 2. Get User Media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 3. Connect to Live API
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `
            You are a professional HR Manager conducting a job interview in Arabic.
            The job role is: "${targetRole}".
            
            Start the conversation by introducing yourself briefly and asking the first question.
            Keep your questions concise.
            Wait for the candidate to answer before asking the next question.
          `,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
        },
        callbacks: {
          onopen: async () => {
            console.log("Interview Connected");

            // Double check resume
            if (outputCtx.state === 'suspended') await outputCtx.resume();
            if (inputCtx.state === 'suspended') await inputCtx.resume();

            // Setup Input Stream - Use smaller buffer for lower latency (512 or 256)
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(512, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);

              // Only send if session is ready - NO interviewActive check!
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              }).catch(console.error);
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Handle Audio
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData;
            if (audioData) {
              const ctx = outputAudioContextRef.current;
              if (ctx) {
                if (ctx.state === 'suspended') await ctx.resume();

                // Track start time
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

                const audioBuffer = await decodeAudioData(
                  decode(audioData.data),
                  ctx,
                  24000,
                  1
                );
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);

                setIsAiTalking(true);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;

                sourcesRef.current.add(source);
                source.onended = () => {
                  sourcesRef.current.delete(source);
                  if (sourcesRef.current.size === 0) setIsAiTalking(false);
                };
              }
            }

            // Handle Interruption
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              if (outputAudioContextRef.current) nextStartTimeRef.current = outputAudioContextRef.current.currentTime;
              setIsAiTalking(false);
            }
          },
          onclose: (e) => {
            console.log("Interview Closed", e);
            setInterviewActive(false);
          },
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

  const stopInterview = () => {
    setInterviewActive(false);
    setIsAiTalking(false);
    setUserVolume(0);
    if (timerRef.current) clearInterval(timerRef.current);

    // Stop all audio sources
    for (const source of sourcesRef.current.values()) {
      try { source.stop(); } catch (e) { }
    }
    sourcesRef.current.clear();

    // Cleanup nodes and contexts
    if (scriptProcessorRef.current) scriptProcessorRef.current.disconnect();
    if (inputAudioContextRef.current) inputAudioContextRef.current.close().catch(() => { });
    if (outputAudioContextRef.current) outputAudioContextRef.current.close().catch(() => { });
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = { role: 'user', text: chatInput, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setLoadingChat(true);
    try {
      const responseText = await chatWithAdvisor(chatHistory, userMsg.text, profile);
      setChatHistory(prev => [...prev, { role: 'model', text: responseText || "خطأ.", timestamp: new Date() }]);
    } catch (e) { console.error(e); } finally { setLoadingChat(false); }
  };

  const handleGenerateCVNow = async () => {
    setLoadingCv(true);
    try {
      const content = await generateCV(profile, analysis, cvForm);
      setCvContent(content);
      setCvStep('result');
    } catch (e) { console.error(e); } finally { setLoadingCv(false); }
  };

  if (loadingAnalysis) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-slate-600 bg-slate-50">
      <Loader2 className="w-12 h-12 animate-spin text-teal-600 mb-4" />
      <h2 className="text-xl font-bold">جاري تحليل مسارك المهني...</h2>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row direction-rtl font-sans">
      <aside className="w-full md:w-72 bg-white border-l p-6 flex flex-col fixed md:relative bottom-0 md:h-screen z-20 shadow-xl md:shadow-none">
        <div className="hidden md:flex items-center gap-3 mb-10 px-2">
          <Briefcase className="w-6 h-6 text-teal-700" />
          <h1 className="text-xl font-extrabold">وجهني</h1>
        </div>
        <nav className="flex md:flex-col gap-2 overflow-x-auto no-scrollbar p-1">
          <NavButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<Briefcase size={20} />} label="نظرة عامة" />
          <NavButton active={activeTab === 'roadmap'} onClick={() => setActiveTab('roadmap')} icon={<MapIcon size={20} />} label="المسار المهني" />
          <NavButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<Bot size={20} />} label="المساعد الذكي" />
          <NavButton active={activeTab === 'interview'} onClick={() => setActiveTab('interview')} icon={<PhoneCall size={20} />} label="المقابلة الصوتية" />
          <NavButton active={activeTab === 'cv'} onClick={() => setActiveTab('cv')} icon={<FileText size={20} />} label="السيرة الذاتية" />
        </nav>
      </aside>

      <main className="flex-1 p-6 md:p-10 mb-20 md:mb-0 overflow-y-auto h-screen scroll-smooth">
        {activeTab === 'interview' && (
          <div className="max-w-4xl mx-auto h-full flex flex-col items-center justify-center animate-fadeIn">
            {!interviewActive ? (
              <div className="text-center">
                <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner"><Mic size={48} className="text-teal-600" /></div>
                <h2 className="text-3xl font-bold mb-4">المقابلة الوظيفية الذكية</h2>
                <p className="text-slate-500 mb-10 max-w-md mx-auto text-lg">تحدث مباشرة مع مدير التوظيف الذكي. سيقوم بطرح الأسئلة وتقييم ردودك بصوت مسموع.</p>
                <button onClick={startInterview} className="px-12 py-5 bg-slate-900 text-white rounded-3xl font-bold shadow-2xl hover:scale-105 transition-all flex items-center gap-3 mx-auto">
                  ابدأ المكالمة الآن
                  <PhoneCall size={24} />
                </button>
              </div>
            ) : (
              <div className="text-center space-y-16 relative w-full flex flex-col items-center">
                <div className="relative flex items-center justify-center">
                  {/* Dynamic Voice Ripples */}
                  <div className={`absolute w-64 h-64 rounded-full bg-teal-500/10 transition-all duration-300 ${isAiTalking ? 'scale-150 opacity-100' : 'scale-100 opacity-0'}`}></div>
                  <div className={`absolute w-80 h-80 rounded-full border border-teal-500/20 transition-all duration-700 ${isAiTalking ? 'animate-ping' : 'hidden'}`}></div>

                  {/* User Pulse Circle */}
                  <div
                    className="absolute rounded-full bg-teal-500/10 transition-all duration-75"
                    style={{
                      width: `${200 + (userVolume * 1.5)}px`,
                      height: `${200 + (userVolume * 1.5)}px`,
                      opacity: userVolume > 5 ? 0.8 : 0
                    }}
                  ></div>

                  {/* Central Responsive Circle */}
                  <div className={`
                    w-48 h-48 
                    bg-slate-900 
                    rounded-full 
                    flex items-center justify-center 
                    border-4 
                    transition-all duration-300 z-10 shadow-2xl
                    ${isAiTalking ? 'border-teal-500 scale-110 shadow-[0_0_80px_rgba(20,184,166,0.6)]' :
                      userVolume > 10 ? 'border-teal-400 scale-105 shadow-[0_0_50px_rgba(20,184,166,0.3)]' : 'border-slate-700 scale-100'}
                  `}>
                    {isAiTalking ? <Volume2 size={72} className="text-teal-400 animate-pulse" /> : <Mic size={72} className={userVolume > 10 ? 'text-teal-400' : 'text-slate-600'} />}
                  </div>
                </div>

                <div className="space-y-8">
                  <h3 className="text-6xl font-mono font-bold text-slate-800 tabular-nums">{formatTime(interviewTimeLeft)}</h3>
                  <div className="flex flex-col items-center gap-4">
                    <div className={`flex items-center gap-3 px-8 py-3 rounded-full font-bold transition-all duration-300 shadow-md border
                      ${isAiTalking ? 'bg-teal-100 border-teal-200 text-teal-700 scale-110' :
                        userVolume > 10 ? 'bg-blue-100 border-blue-200 text-blue-700' :
                          'bg-slate-100 border-slate-200 text-slate-500'}
                    `}>
                      <span className={`w-3 h-3 rounded-full ${isAiTalking || userVolume > 10 ? 'bg-current animate-pulse' : 'bg-slate-400'}`}></span>
                      {isAiTalking ? 'مدير التوظيف يتحدث...' : userVolume > 10 ? 'أنت تتحدث الآن...' : 'بانتظار ردك...'}
                    </div>
                    <p className="text-slate-400 font-medium">المقابلة جارية كمدير موارد بشرية محترف.</p>
                  </div>
                </div>

                <button onClick={stopInterview} className="px-10 py-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-colors shadow-sm border border-red-100">إنهاء المكالمة</button>
              </div>
            )}
          </div>
        )}

        {/* --- OTHER TABS CONTENT (Kept intact) --- */}
        {activeTab === 'overview' && analysis && (
          <div className="space-y-8 max-w-5xl mx-auto animate-fadeIn pb-10">
            <h2 className="text-3xl font-extrabold">التحليل المهني</h2>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-lg leading-relaxed">{analysis.summary}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900 text-white p-8 rounded-3xl">
                <h3 className="font-bold mb-6 text-xl">الوظائف المقترحة</h3>
                {analysis.recommendedRoles.map((r, i) => <div key={i} className="mb-3 p-4 bg-white/10 rounded-2xl font-bold">{r}</div>)}
              </div>
              <div className="bg-white p-8 rounded-3xl border">
                <h3 className="font-bold mb-6 text-xl">نقاط القوة</h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.strengths.map((s, i) => <span key={i} className="px-4 py-2 bg-teal-50 text-teal-700 rounded-xl font-bold border border-teal-100">{s}</span>)}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'roadmap' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-10">
            <h2 className="text-3xl font-bold mb-8">خارطة الطريق المهنية</h2>
            {roadmap.map((s, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl border shadow-sm flex gap-6 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-full bg-teal-500 text-white flex items-center justify-center font-bold text-xl flex-shrink-0">{i + 1}</div>
                <div className="flex-1">
                  <h3 className="font-bold text-xl mb-2">{s.title}</h3>
                  <p className="text-slate-600 mb-4">{s.description}</p>
                  <div className="flex gap-3">
                    <span className="text-xs bg-slate-100 px-3 py-1.5 rounded-lg font-bold">{s.duration}</span>
                    <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold">{s.platform}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="h-[80vh] flex flex-col bg-white rounded-3xl shadow-xl border overflow-hidden animate-fadeIn">
            <div className="bg-slate-900 p-5 text-white font-bold flex items-center gap-3"><Bot size={24} /> المساعد الذكي</div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
              {chatHistory.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-5 rounded-3xl shadow-sm ${m.role === 'user' ? 'bg-teal-600 text-white rounded-tl-none' : 'bg-white text-slate-800 border rounded-tr-none'}`}>
                    <ReactMarkdown>{m.text}</ReactMarkdown>
                  </div>
                </div>
              ))}
              {loadingChat && (
                <div className="flex justify-start">
                  <div className="bg-white border p-5 rounded-3xl rounded-tr-none animate-pulse">يكتب الآن...</div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-5 border-t flex gap-3">
              <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder="اسأل أي شيء..." className="flex-1 p-4 bg-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500" />
              <button onClick={handleSendMessage} className="p-4 bg-teal-600 text-white rounded-2xl shadow-lg shadow-teal-100"><Send size={24} /></button>
            </div>
          </div>
        )}

        {activeTab === 'cv' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-10">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold">السيرة الذاتية الذكية</h2>
              <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 font-bold rounded-full text-sm animate-pulse">متوافقة مع ATS ✓</span>
            </div>
            {cvStep === 'form' ? (
              <div className="bg-white p-10 rounded-3xl shadow-sm border space-y-8">
                {/* Basic Info Section */}
                <div>
                  <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><User size={20} /> المعلومات الأساسية</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-600">الاسم الكامل *</label>
                      <input type="text" className="w-full p-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-teal-500" placeholder="محمد عبدالله الأحمد" value={cvForm.fullName} onChange={(e) => setCvForm({ ...cvForm, fullName: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-600">البريد الإلكتروني</label>
                      <input type="email" className="w-full p-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-teal-500" placeholder="example@email.com" value={cvForm.email} onChange={(e) => setCvForm({ ...cvForm, email: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-600">رقم الجوال</label>
                      <input type="tel" className="w-full p-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-teal-500" placeholder="+966 5X XXX XXXX" value={cvForm.phone} onChange={(e) => setCvForm({ ...cvForm, phone: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-600">رابط LinkedIn (اختياري)</label>
                      <input type="url" className="w-full p-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-teal-500" placeholder="linkedin.com/in/yourname" value={cvForm.linkedin} onChange={(e) => setCvForm({ ...cvForm, linkedin: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* Summary Section */}
                <div>
                  <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><MessageCircle size={20} /> الملخص المهني</h3>
                  <textarea className="w-full p-4 bg-slate-50 border rounded-2xl h-24 resize-none focus:ring-2 focus:ring-teal-500" placeholder="اكتب ملخصاً قصيراً عن نفسك، أهدافك المهنية، وما الذي يميزك..." value={cvForm.summary} onChange={(e) => setCvForm({ ...cvForm, summary: e.target.value })} />
                </div>

                {/* Education Section */}
                <div>
                  <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><Award size={20} /> التعليم والشهادات</h3>
                  <textarea className="w-full p-4 bg-slate-50 border rounded-2xl h-28 resize-none focus:ring-2 focus:ring-teal-500" placeholder="مثال:
- بكالوريوس علوم الحاسب - جامعة الملك سعود (2020-2024)
- شهادة AWS Cloud Practitioner" value={cvForm.education} onChange={(e) => setCvForm({ ...cvForm, education: e.target.value })} />
                </div>

                {/* Experience Section */}
                <div>
                  <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><Briefcase size={20} /> الخبرات العملية</h3>
                  <textarea className="w-full p-4 bg-slate-50 border rounded-2xl h-32 resize-none focus:ring-2 focus:ring-teal-500" placeholder="مثال:
- مطور برمجيات في شركة XYZ (2023-الآن): طورت تطبيقات ويب باستخدام React وNode.js
- متدرب في شركة ABC (2022): عملت على مشاريع تحليل البيانات" value={cvForm.experience} onChange={(e) => setCvForm({ ...cvForm, experience: e.target.value })} />
                </div>

                {/* Skills Section */}
                <div>
                  <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><Target size={20} /> المهارات التقنية</h3>
                  <textarea className="w-full p-4 bg-slate-50 border rounded-2xl h-20 resize-none focus:ring-2 focus:ring-teal-500" placeholder="مثال: Python, JavaScript, React, SQL, Git, AWS, Figma" value={cvForm.skills} onChange={(e) => setCvForm({ ...cvForm, skills: e.target.value })} />
                </div>

                {/* Projects Section */}
                <div>
                  <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><Sparkles size={20} /> المشاريع والإنجازات</h3>
                  <textarea className="w-full p-4 bg-slate-50 border rounded-2xl h-28 resize-none focus:ring-2 focus:ring-teal-500" placeholder="مثال:
- تطبيق إدارة المهام: تطبيق ويب لإدارة المشاريع باستخدام React
- مشروع تخرج: نظام توصيات ذكي باستخدام Machine Learning" value={cvForm.projects} onChange={(e) => setCvForm({ ...cvForm, projects: e.target.value })} />
                </div>

                {/* Language Selection */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-bold text-slate-600 flex items-center gap-2"><Languages size={18} /> لغة السيرة الذاتية:</label>
                  <select className="p-3 bg-slate-50 border rounded-xl font-bold focus:ring-2 focus:ring-teal-500" value={cvForm.language} onChange={(e) => setCvForm({ ...cvForm, language: e.target.value as 'ar' | 'en' })}>
                    <option value="ar">العربية</option>
                    <option value="en">الإنجليزية</option>
                  </select>
                </div>

                <button onClick={handleGenerateCVNow} disabled={loadingCv || !cvForm.fullName} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-slate-800 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  {loadingCv ? <Loader2 className="animate-spin w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
                  توليد السيرة الذاتية الاحترافية
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <button onClick={() => setCvStep('form')} className="text-sm text-teal-600 font-bold hover:underline">← تعديل البيانات</button>
                <div className="bg-white p-12 rounded-3xl border shadow-2xl text-right prose max-w-none">
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

// --- AUDIO HELPERS ---
function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

function createPcmBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // convert float32 -1 to 1 to int16 -32768 to 32767
    int16[i] = data[i] * 32768;
  }

  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const buffer = ctx.createBuffer(
    numChannels,
    data.length / 2 / numChannels,
    sampleRate,
  );

  const dataInt16 = new Int16Array(data.buffer);
  const l = dataInt16.length;
  const dataFloat32 = new Float32Array(l);
  for (let i = 0; i < l; i++) {
    dataFloat32[i] = dataInt16[i] / 32768.0;
  }

  // Extract interleaved channels (usually mono in this case)
  if (numChannels === 0) {
    buffer.copyToChannel(dataFloat32, 0);
  } else {
    for (let i = 0; i < numChannels; i++) {
      const channel = dataFloat32.filter(
        (_, index) => index % numChannels === i,
      );
      buffer.copyToChannel(channel, i);
    }
  }

  return buffer;
}

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex items-center gap-3 px-5 py-4 rounded-2xl w-full transition-all ${active ? 'bg-slate-900 text-white shadow-xl scale-105' : 'text-slate-500 hover:bg-slate-50'}`}>
    {icon}<span className="font-bold hidden md:inline">{label}</span>
  </button>
);

export default Dashboard;

