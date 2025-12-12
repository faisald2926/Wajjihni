import React from 'react';
import { ArrowLeft, Sparkles, Target, Briefcase, GraduationCap, Users, FileText, Mic, CheckCircle } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden font-sans pb-10">
      
      {/* --- HERO SECTION --- */}
      <section className="relative min-h-[90vh] flex flex-col justify-center bg-slate-900 text-white overflow-hidden rounded-b-[3rem] shadow-2xl mb-12">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-teal-500/20 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-[0%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px]"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
        </div>

        <nav className="absolute top-0 w-full container mx-auto px-6 py-8 flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-teal-400" />
            <span className="text-2xl font-bold tracking-tight">وجهني</span>
          </div>
          {/* Visitor Button Removed */}
        </nav>

        <div className="container mx-auto px-6 relative z-10 text-center flex flex-col items-center mt-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-sm font-bold mb-8 backdrop-blur-md">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
            </span>
             الذكاء الاصطناعي في خدمة مستقبلك
          </div>

          <h1 className="text-6xl md:text-9xl font-extrabold mb-8 leading-tight tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400">اصنع مسارك.</span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mb-12 leading-relaxed font-light">
            منصة "وجهني" تستخدم أحدث تقنيات الذكاء الاصطناعي لتحليل مهاراتك بدقة، وتصميم خارطة طريق عملية تأخذك من مقاعد الدراسة إلى قمة المنافسة في سوق العمل.
          </p>

          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <button 
              onClick={onStart}
              className="group relative px-12 py-6 bg-teal-500 hover:bg-teal-400 text-slate-900 font-bold text-xl rounded-2xl transition-all shadow-[0_0_50px_-10px_rgba(45,212,191,0.4)] hover:shadow-[0_0_70px_-10px_rgba(45,212,191,0.6)] flex items-center justify-center gap-3 hover:-translate-y-1"
            >
              ابدأ التحليل المجاني
              <ArrowLeft className="w-6 h-6 group-hover:-translate-x-2 transition-transform" />
            </button>
          </div>
          
          <div className="mt-16 flex flex-wrap justify-center gap-8 text-slate-400 text-sm font-medium">
             <span className="flex items-center gap-2"><CheckCircle size={16} className="text-teal-500"/> لا حاجة للتسجيل</span>
             <span className="flex items-center gap-2"><CheckCircle size={16} className="text-teal-500"/> تحليل فوري</span>
             <span className="flex items-center gap-2"><CheckCircle size={16} className="text-teal-500"/> خطة مخصصة</span>
          </div>
        </div>
      </section>

      {/* --- STATS SECTION --- */}
      <section className="py-12 bg-white mb-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-items-center">
            <StatItem number="+120" label="تخصص جامعي" />
            <StatItem number="أكثر من 90%" label="دقة التحليل" />
            <StatItem number="24/7" label="مستشار ذكي" />
          </div>
        </div>
      </section>

      {/* --- PROCESS SECTION (Redesigned Vertical Timeline) --- */}
      <section className="py-24 bg-slate-50 relative overflow-hidden">
        <div className="container mx-auto px-6 relative">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">كيف يعمل النظام؟</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">خطوات بسيطة تفصلك عن خطتك المهنية الاحترافية</p>
          </div>

          {/* Vertical Line */}
          <div className="absolute left-1/2 top-48 bottom-24 w-0.5 bg-indigo-100 -translate-x-1/2 hidden md:block"></div>

          <div className="space-y-12 relative z-10">
            {/* Step 1: Right */}
            <TimelineStep 
              number="01" 
              title="سجّل بياناتك" 
              desc="أدخل تخصصك، مستواك الدراسي، ونبذة سريعة عن شغفك. لا نحتاج لأكثر من دقيقة."
              icon={<Users className="text-white" />}
              alignment="right"
              color="bg-blue-500"
            />
            {/* Step 2: Left */}
            <TimelineStep 
              number="02" 
              title="تحليل الذكاء الاصطناعي" 
              desc="يقوم النظام بدراسة مدخلاتك ومقارنتها بمتطلبات سوق العمل الحالية لتحديد الفجوات."
              icon={<Sparkles className="text-white" />}
              alignment="left"
              color="bg-indigo-500"
            />
            {/* Step 3: Right */}
            <TimelineStep 
              number="03" 
              title="استلم الخطة" 
              desc="احصل على خارطة طريق شاملة، دورات مقترحة، ومسارات وظيفية تناسبك بدقة."
              icon={<Target className="text-white" />}
              alignment="right"
              color="bg-purple-500"
            />
            {/* Step 4: Left */}
            <TimelineStep 
              number="04" 
              title="انطلق لسوق العمل" 
              desc="استفد من أدوات السيرة الذاتية ومحاكاة المقابلة لتكون جاهزاً للفرصة القادمة."
              icon={<Briefcase className="text-white" />}
              alignment="left"
              color="bg-pink-500"
            />
          </div>
        </div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section className="py-24 bg-slate-900 text-white rounded-[3rem] mx-4 md:mx-10 shadow-2xl">
        <div className="container mx-auto px-6">
           <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="md:w-1/2">
                <h2 className="text-4xl font-bold mb-6 leading-tight">كل ما تحتاجه للانطلاق <br/><span className="text-teal-400">في مكان واحد</span></h2>
                <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                  نحن لا نعطيك مجرد نصائح عامة. منصة وجهني تقدم لك أدوات فعلية وعملية تساعدك على سد الفجوة المهارية والحصول على الوظيفة التي تستحقها.
                </p>
                <ul className="space-y-4">
                  <ListItem text="تحليل الفجوات المهارية بدقة" />
                  <ListItem text="اقتراح الشهادات المهنية (PMP, AWS, etc)" />
                  <ListItem text="مراجعة وتوليد السيرة الذاتية (CV)" />
                  <ListItem text="محاكاة للمقابلات الشخصية" />
                </ul>
              </div>
              <div className="md:w-1/2 grid grid-cols-2 gap-4">
                 <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm transform translate-y-8 hover:bg-white/10 transition-colors">
                    <Briefcase className="w-8 h-8 text-teal-400 mb-4" />
                    <h3 className="font-bold text-lg mb-2">الوظائف</h3>
                    <p className="text-sm text-slate-400">اكتشف مسميات وظيفية دقيقة تناسبك.</p>
                 </div>
                 <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
                    <GraduationCap className="w-8 h-8 text-purple-400 mb-4" />
                    <h3 className="font-bold text-lg mb-2">التعليم</h3>
                    <p className="text-sm text-slate-400">خطط تعليمية من Coursera و Udemy.</p>
                 </div>
                 <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm transform translate-y-8 hover:bg-white/10 transition-colors">
                    <FileText className="w-8 h-8 text-yellow-400 mb-4" />
                    <h3 className="font-bold text-lg mb-2">CV Builder</h3>
                    <p className="text-sm text-slate-400">بناء سيرة ذاتية بكلمات مفتاحية قوية.</p>
                 </div>
                 <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
                    <Mic className="w-8 h-8 text-red-400 mb-4" />
                    <h3 className="font-bold text-lg mb-2">المقابلات</h3>
                    <p className="text-sm text-slate-400">محاكاة واقعية للمقابلات بالذكاء الاصطناعي.</p>
                 </div>
              </div>
           </div>
        </div>
      </section>

    </div>
  );
};

const StatItem = ({ number, label }: { number: string, label: string }) => (
  <div className="text-center">
    <div className="text-4xl font-extrabold text-slate-900 mb-2">{number}</div>
    <div className="text-slate-500 font-medium">{label}</div>
  </div>
);

const TimelineStep = ({ number, title, desc, icon, alignment, color }: any) => {
  const isRight = alignment === 'right';
  return (
    <div className={`flex flex-col md:flex-row items-center justify-between w-full ${isRight ? '' : 'md:flex-row-reverse'}`}>
      
      {/* Card Content */}
      <div className="w-full md:w-5/12 mb-8 md:mb-0">
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100 hover:-translate-y-1 transition-transform relative overflow-hidden group">
           {/* Decorative bg */}
           <div className={`absolute top-0 right-0 w-24 h-24 ${color} opacity-10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150`}></div>

           <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center mb-6 shadow-md`}>
             {React.cloneElement(icon, { size: 24 })}
           </div>
           <h3 className="text-2xl font-bold text-slate-900 mb-3">{title}</h3>
           <p className="text-slate-500 leading-relaxed">{desc}</p>
        </div>
      </div>

      {/* Center Node */}
      <div className="relative flex items-center justify-center w-12 md:w-2/12 z-10">
         <div className={`w-12 h-12 rounded-full ${color} text-white font-bold flex items-center justify-center shadow-lg border-4 border-white text-sm`}>
            {number}
         </div>
      </div>

      {/* Empty Space for balancing */}
      <div className="w-full md:w-5/12 hidden md:block"></div>
    </div>
  );
};

const ListItem = ({ text }: { text: string }) => (
  <li className="flex items-center gap-3 text-slate-300">
    <div className="w-2 h-2 rounded-full bg-teal-400"></div>
    {text}
  </li>
);

export default LandingPage;