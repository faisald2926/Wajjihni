
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, RoadmapStep, ChatMessage, InterviewEvaluation } from "../types";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Using gemini-2.5-flash for basic text tasks (same as working version)
const MODEL_FAST = "gemini-2.5-flash";

/**
 * Generates 10 psychometric questions in ARABIC.
 */
export const getAssessmentQuestions = async (major: string): Promise<string[]> => {
  const prompt = `
    Generate 10 short, specific psychometric or technical interest questions for a student/graduate in the field of "${major}".
    The questions MUST be in ARABIC language.
    The goal is to understand their specific niche interests.
    
    The questions should be statements where the user will rate "Agree" or "Disagree".
    Example: "أستمتع بحل الخوارزميات الرياضية أكثر من التصميم البصري."
    
    Return ONLY a JSON array of strings.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    // Correct usage of .text property
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Assessment Gen Error:", error);
    return [
      "أفضل العمل الفردي والتركيز العميق على العمل الجماعي.",
      "تستهويني الجوانب النظرية والبحثية أكثر من التطبيق العملي.",
      "أحب التعامل مع البيانات والأرقام المعقدة.",
      "أفضل الوظائف التي تتطلب إبداعاً بصرياً.",
      "لدي شغف بحل المشكلات التقنية المعقدة.",
      "أفضل بيئة العمل المكتبية المستقرة.",
      "أهتم بمتابعة أحدث التقنيات في مجالي بشكل يومي.",
      "أفضل الأدوار القيادية وإدارة الفرق.",
      "أحب التواصل المباشر مع العملاء والجمهور.",
      "أفضل العمل في مشاريع قصيرة الأمد وسريعة الإنجاز."
    ];
  }
};

/**
 * Analyzes the user profile INCLUDING assessment answers.
 */
export const analyzeProfile = async (profile: UserProfile) => {
  const quizContext = profile.assessmentAnswers
    ?.map(a => `- العبارة: "${a.question}" | تقييم المستخدم (10/1): ${a.score}`)
    .join('\n') || "لم يتم إجراء اختبار.";

  const prompt = `
    تحليل ملف مستخدم لتطبيق توجيه مهني.
    المعلومات الأساسية:
    - نبذة شخصية: ${profile.description}
    - التخصص: ${profile.major}
    - الحالة: ${profile.status === 'student' ? 'طالب جامعي' : 'خريج'}
    - ${profile.status === 'student' ? 'المستوى الدراسي (السنة)' : 'سنوات الخبرة'}: ${profile.yearsOfExperience}

    نتائج اختبار الميول (التقييم من 1 "لا أتفق" إلى 10 "أتفق بشدة"):
    ${quizContext}

    المطلوب: 
    1. تحليل دقيق جداً للميول بناءً على إجابات الاختبار والتخصص.
    2. اقتراح أفضل 3 أدوار وظيفية دقيقة (Job Titles) تناسب هذا المزيج.
    
    الرد JSON فقط:
    {
      "summary": "تحليل عميق يربط بين إجابات الاختبار والتخصص في فقرة واحدة",
      "strengths": ["نقطة قوة مستنتجة 1", "نقطة قوة 2", ...],
      "recommendedRoles": ["المسمى الوظيفي 1", "المسمى الوظيفي 2", "المسمى الوظيفي 3"]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    // Correct usage of .text property
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Analysis Error:", error);
    throw error;
  }
};

/**
 * Generates a roadmap based on the TOP recommended role.
 */
export const generateRoadmap = async (profile: UserProfile, targetRole: string): Promise<RoadmapStep[]> => {
  const prompt = `
    أنت خبير توجيه مهني. قم بإنشاء خارطة طريق مكثفة لمدة 6 أشهر لتجهيز المستخدم لوظيفة: "${targetRole}".
    
    المستخدم: ${profile.major}, ${profile.status === 'student' ? 'المستوى الدراسي: السنة ' + profile.yearsOfExperience : 'خبرة ' + profile.yearsOfExperience + ' سنوات'}.
    
    المطلوب: 5 مراحل (Steps) متسلسلة ومنطقية.
    لكل مرحلة، يجب اقتراح شهادات احترافية (Professional Certifications) معروفة.
    
    Output JSON format:
    [
      {
        "title": "اسم المرحلة",
        "description": "شرح تفصيلي",
        "certifications": ["اسم الشهادة 1", "اسم الشهادة 2"],
        "platform": "Coursera", 
        "duration": "شهر واحد"
      }
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    // Correct usage of .text property
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Roadmap Error:", error);
    return [];
  }
};

/**
 * Evaluates the Interview based on the transcript.
 */
export const evaluateInterview = async (transcript: string, role: string): Promise<InterviewEvaluation> => {
  const prompt = `
    قم بتقييم مقابلة وظيفية (محاكاة) للدور الوظيفي: "${role}".
    
    سجل الحوار (Transcript):
    ${transcript}
    
    المطلوب: تقييم شامل لأداء المرشح من حيث الثقة، المعلومات التقنية، وطريقة الرد.
    
    JSON Output Format:
    {
      "score": number (0-100),
      "feedback": "نص تقييمي شامل ومفصل",
      "improvements": ["نقطة للتحسين 1", "نقطة للتحسين 2"],
      "strengths": ["نقطة قوة 1", "نقطة قوة 2"]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    // Correct usage of .text property
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Evaluation Error", error);
    return { score: 0, feedback: "حدث خطأ في التقييم", improvements: [], strengths: [] };
  }
};

/**
 * Chat with the Career Advisor.
 */
export const chatWithAdvisor = async (history: ChatMessage[], newMessage: string, profile: UserProfile) => {
  const systemInstruction = `
    أنت مستشار مهني في تطبيق "وجهني".
    المستخدم: ${profile.major} (${profile.status}).
    الأسلوب: احترافي، دقيق، وداعم.
  `;

  const chat = ai.chats.create({
    model: MODEL_FAST,
    config: { systemInstruction },
    history: history.map(h => ({
      role: h.role,
      parts: [{ text: h.text }]
    }))
  });

  // chat.sendMessage parameter is correct (message)
  const response = await chat.sendMessage({ message: newMessage });
  // Correct usage of .text property
  return response.text;
};

/**
 * Generates CV Content based on user inputs - ATS Optimized.
 */
export const generateCV = async (profile: UserProfile, analysis: any, cvData: {
  fullName: string;
  email: string;
  phone: string;
  linkedin: string;
  education: string;
  skills: string;
  experience: string;
  projects: string;
  summary: string;
  language: 'ar' | 'en'
}) => {
  const prompt = `
    Create a professional, ATS-optimized CV/Resume in ${cvData.language === 'ar' ? 'Arabic' : 'English'} language.
    Use clean Markdown formatting that is ATS-friendly.
    
    === USER DATA ===
    Full Name: ${cvData.fullName}
    Email: ${cvData.email || 'Not provided'}
    Phone: ${cvData.phone || 'Not provided'}
    LinkedIn: ${cvData.linkedin || 'Not provided'}
    
    Professional Summary: ${cvData.summary || 'Fresh graduate seeking opportunities'}
    
    Education: ${cvData.education || `${profile.major}`}
    
    Work Experience: ${cvData.experience || 'No formal experience yet'}
    
    Technical Skills: ${cvData.skills || analysis?.strengths?.join(', ') || 'Various skills'}
    
    Projects: ${cvData.projects || 'No projects listed'}
    
    === AI ANALYSIS ===
    Target Role: ${analysis?.recommendedRoles?.[0] || 'Professional'}
    Strengths: ${analysis?.strengths?.join(', ') || 'Not analyzed'}
    
    Create sections: Contact, Summary, Education, Experience, Skills, Projects.
    Use action verbs and ATS-friendly keywords.
  `;

  const response = await ai.models.generateContent({
    model: MODEL_FAST,
    contents: prompt,
  });

  return response.text;
};

// Export the initialized AI instance
export { ai };
