import React, { useState } from 'react';
import { UserProfile, UserStatus } from '../types';
import { ChevronLeft, User, BookOpen, Clock, ArrowRight, BrainCircuit, Loader2 } from 'lucide-react';
import { getAssessmentQuestions } from '../services/geminiService';

interface OnboardingFormProps {
  onSubmit: (profile: UserProfile) => void;
  onBack: () => void;
}

const MAJOR_GROUPS = [
  {
    category: 'كلية الهندسة',
    majors: ['الهندسة المدنية', 'الهندسة الكهربائية', 'الهندسة الميكانيكية', 'الهندسة الكيميائية', 'الهندسة الصناعية', 'هندسة البترول والغاز الطبيعي', 'هندسة التعدين']
  },
  {
    category: 'كلية الاقتصاد والعلوم الإدارية',
    majors: ['إدارة الأعمال', 'الاقتصاد', 'المحاسبة', 'التمويل', 'نظم المعلومات الإدارية']
  },
  {
    category: 'كلية علوم الحاسب والمعلومات',
    majors: ['علوم الحاسب', 'نظم المعلومات', 'تقنية المعلومات', 'هندسة حاسب', 'هندسة برمجيات']
  },
  {
    category: 'كلية العلوم',
    majors: ['الرياضيات', 'الفيزياء', 'الكيمياء', 'الأحياء']
  },
  {
    category: 'كلية اللغات والترجمة',
    majors: ['الغة الإنجليزية', 'اللغة الفرنسية', 'اللغة الإسبانية', 'اللغة التركية', 'اللغة الفارسية', 'اللغة العبرية', 'اللغة الصينية']
  },
  {
    category: 'كلية العلوم الاجتماعية',
    majors: ['علم الاجتماع', 'علم النفس', 'التاريخ', 'الجغرافيا']
  },
  {
    category: 'كلية الشريعة',
    majors: ['الشريعة', 'الفقه', 'أصول الفقه']
  },
  {
    category: 'كلية أصول الدين',
    majors: ['العقيدة', 'التفسير', 'الحديث']
  },
  {
    category: 'كلية اللغة العربية',
    majors: ['اللغة العربية', 'الأدب', 'البلاغة والنقد', 'النحو والصرف']
  },
  {
    category: 'القانون',
    majors: ['قانون', 'محاماه']
  }
];

const LIKERT_OPTIONS = [
  { value: 1, size: 'w-10 h-10', color: 'border-[#7C3AED] hover:bg-[#7C3AED]/10', active: 'bg-[#7C3AED]' },
  { value: 2, size: 'w-8 h-8', color: 'border-[#8B5CF6] hover:bg-[#8B5CF6]/10', active: 'bg-[#8B5CF6]' },
  { value: 3, size: 'w-6 h-6', color: 'border-[#A78BFA] hover:bg-[#A78BFA]/10', active: 'bg-[#A78BFA]' },
  { value: 4, size: 'w-5 h-5', color: 'border-slate-400 hover:bg-slate-100', active: 'bg-slate-400' },
  { value: 5, size: 'w-6 h-6', color: 'border-[#34D399] hover:bg-[#34D399]/10', active: 'bg-[#34D399]' },
  { value: 6, size: 'w-8 h-8', color: 'border-[#10B981] hover:bg-[#10B981]/10', active: 'bg-[#10B981]' },
  { value: 7, size: 'w-10 h-10', color: 'border-[#059669] hover:bg-[#059669]/10', active: 'bg-[#059669]' },
];

const OnboardingForm: React.FC<OnboardingFormProps> = ({ onSubmit, onBack }) => {
  const [step, setStep] = useState<1 | 2 | 'loading_questions'>(1);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});

  const [formData, setFormData] = useState<UserProfile>({
    name: 'User',
    description: '',
    major: '',
    status: UserStatus.Student,
    yearsOfExperience: 1
  });

  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.description && formData.major) {
      setStep('loading_questions');
      try {
        const generatedQuestions = await getAssessmentQuestions(formData.major);
        setQuestions(generatedQuestions);
        const initialAnswers: any = {};
        generatedQuestions.forEach((_, idx) => initialAnswers[idx] = 4); // Default to neutral
        setAnswers(initialAnswers);
        setStep(2);
      } catch (err) {
        console.error("Failed to load questions", err);
        setStep(1);
      }
    }
  };

  const handleFinalSubmit = () => {
    const formattedAnswers = questions.map((q, idx) => ({
      question: q,
      score: answers[idx] || 4
    }));

    onSubmit({
      ...formData,
      assessmentAnswers: formattedAnswers
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 direction-rtl">
      <div className="bg-white max-w-4xl w-full rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        <div className="hidden md:flex md:w-1/3 bg-slate-900 p-8 flex-col text-white relative overflow-hidden gap-12">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-4">
              {step === 1 ? "بياناتك الأولية" : "تحليل الشخصية"}
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              {step === 1 
                ? "أخبرنا عن خلفيتك الأكاديمية وشغفك العام لنبدأ في رسم الملامح الأولى لمسارك." 
                : "سيقوم الذكاء الاصطناعي بطرح أسئلة دقيقة بناءً على تخصصك لتحديد المسار الوظيفي الأمثل لك."}
            </p>
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className={`flex items-center gap-4 ${step === 1 ? 'opacity-100' : 'opacity-50'}`}>
              <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center font-bold">1</div>
              <span>المعلومات الأساسية</span>
            </div>
            <div className={`h-8 w-0.5 bg-slate-700 mr-5`}></div>
            <div className={`flex items-center gap-4 ${step === 2 ? 'opacity-100' : 'opacity-50'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${step === 2 ? 'bg-teal-500' : 'bg-slate-700'}`}>2</div>
              <span>التقييم الدقيق</span>
            </div>
          </div>
        </div>

        <div className="flex-1 p-8 relative flex flex-col">
          {step === 1 && (
            <button onClick={onBack} className="absolute top-6 left-6 text-slate-400 hover:text-slate-600 transition-colors">
              <ChevronLeft />
            </button>
          )}

          {step === 'loading_questions' ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 animate-fadeIn">
              <BrainCircuit className="w-16 h-16 text-teal-500 animate-pulse" />
              <h3 className="text-xl font-bold text-slate-800">جاري إعداد الاختبار...</h3>
              <p className="text-slate-500 max-w-xs">يقوم الذكاء الاصطناعي الآن بصياغة أسئلة تناسب تخصص "{formData.major}"</p>
            </div>
          ) : step === 1 ? (
            <div className="animate-fadeIn flex-1 flex flex-col">
              <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="text-teal-500">#</span> ابدأ رحلتك
              </h2>
              <form onSubmit={handleNextStep} className="space-y-6 flex-1">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-teal-600" />
                    التخصص الجامعي
                  </label>
                  <select
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    value={formData.major}
                    onChange={(e) => setFormData({...formData, major: e.target.value})}
                  >
                    <option value="" disabled>اختر التخصص</option>
                    {MAJOR_GROUPS.map(group => (
                      <optgroup key={group.category} label={group.category}>
                        {group.majors.map(m => <option key={m} value={m}>{m}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-teal-600" />
                    نبذة عن اهتماماتك
                  </label>
                  <textarea
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none h-24 resize-none"
                    placeholder="ما الذي يثير فضولك في مجالك؟ ما هي المواد التي استمتعت بها؟"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">الحالة</label>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, status: UserStatus.Student})}
                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${formData.status === UserStatus.Student ? 'bg-white shadow text-teal-600' : 'text-slate-500'}`}
                      >
                        طالب
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, status: UserStatus.Graduate})}
                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${formData.status === UserStatus.Graduate ? 'bg-white shadow text-teal-600' : 'text-slate-500'}`}
                      >
                        موظف
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-teal-600" />
                      {formData.status === UserStatus.Student ? 'المستوى الدراسي (السنة)' : 'سنوات الخبرة'}
                    </label>
                    <input
                      required
                      type="number"
                      min="0"
                      max="50"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      value={formData.yearsOfExperience}
                      onChange={(e) => setFormData({...formData, yearsOfExperience: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="flex-1"></div>

                <button
                  type="submit"
                  className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg flex items-center justify-center gap-2 group"
                >
                  التالي: تقييم الميول
                  <ArrowRight className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </button>
              </form>
            </div>
          ) : (
            <div className="animate-fadeIn flex-1 flex flex-col h-full">
               <h2 className="text-2xl font-bold text-slate-800 mb-2">إلى أي مدى تتفق؟</h2>
               <p className="text-slate-500 text-sm mb-10">اختر الدائرة التي تمثل رأيك (اليمين: موافق)</p>
               
               <div className="flex-1 overflow-y-auto pr-2 space-y-12 custom-scrollbar pb-6 text-right">
                 {questions.map((q, idx) => (
                   <div key={idx} className="space-y-6">
                     <p className="font-medium text-slate-800 text-lg leading-relaxed">{q}</p>
                     <div className="flex items-center justify-between gap-4 bg-white p-4">
                       <span className="text-sm font-bold text-[#7C3AED]">غير موافق</span>
                       <div className="flex items-center gap-4 flex-1 justify-center">
                         {LIKERT_OPTIONS.map((option) => (
                           <button
                             key={option.value}
                             onClick={() => setAnswers({...answers, [idx]: option.value})}
                             className={`
                               ${option.size} 
                               rounded-full 
                               border-2 
                               transition-all 
                               duration-200 
                               flex items-center justify-center
                               ${option.color}
                               ${answers[idx] === option.value ? `${option.active} scale-110 shadow-lg` : 'bg-transparent'}
                             `}
                           >
                             {answers[idx] === option.value && <div className="w-2 h-2 bg-white rounded-full"></div>}
                           </button>
                         ))}
                       </div>
                       <span className="text-sm font-bold text-[#059669]">موافق</span>
                     </div>
                   </div>
                 ))}
               </div>

               <div className="pt-4 border-t border-slate-100 mt-4 flex gap-3">
                 <button 
                  onClick={() => setStep(1)}
                  className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200"
                 >
                   رجوع
                 </button>
                 <button
                  onClick={handleFinalSubmit}
                  className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold rounded-xl hover:shadow-lg hover:from-teal-600 hover:to-emerald-700 transition-all shadow-md"
                >
                  تحليل النتائج وبناء الخارطة
                </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingForm;