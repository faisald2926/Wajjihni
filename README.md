# وجهني (Wajjihni) | دليلك المهني الذكي 🧭

<div align="center">
  
![Project Status](https://img.shields.io/badge/Status-Prototype-teal)
![AI Model](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-purple)
![Language](https://img.shields.io/badge/Language-TypeScript-blue)
[![CI](https://github.com/faisald2926/Wajjihni/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/faisald2926/Wajjihni/actions/workflows/ci.yml)

**تم تطويره بواسطة: فيصل الداود**

</div>

## 📖 نبذة عن المشروع

**وجهني** هي منصة ذكية تهدف إلى سد الفجوة بين المناهج الجامعية ومتطلبات سوق العمل المتسارعة في العالم العربي.

بدلاً من النصائح العامة، تستخدم المنصة أحدث تقنيات الذكاء الاصطناعي من Google (**Gemini 2.5 Multimodal Live API**) للعمل كمستشار مهني شخصي. يقوم النظام بتحليل تخصص الطالب وميوله الدقيقة، ثم يرسم له خطة عملية، ويجري معه مقابلات صوتية حية، ويجهز سيرته الذاتية.

## ✨ أبرز المميزات

- **🎙️ محاكاة المقابلة الشخصية (Live Voice):** 
  الميزة الأقوى في التطبيق. استخدام تقنية الـ Live API لإجراء مقابلة صوتية حية (Audio-to-Audio) مع الذكاء الاصطناعي الذي يتقمص دور مدير التوظيف، مع تقديم تقرير تقييم شامل للأداء بعد انتهاء المكالمة.

- **🧠 تحليل الميول الديناميكي:** 
  توليد أسئلة نفسية وتقنية دقيقة (باللغة العربية) بناءً على تخصص المستخدم الجامعي لفهم شغفه بدقة.

- **🗺️ خارطة الطريق المهنية:** 
  إنشاء خطة زمنية مفصلة لمدة 6 أشهر، تشمل الشهادات الاحترافية المطلوبة (Professional Certificates) والمنصات التعليمية المقترحة (مثل Coursera و Udemy).

- **📄 صانع السيرة الذاتية الذكي:** 
  كتابة سيرة ذاتية (CV) احترافية بصيغة Markdown تركز على نقاط القوة التي تم اكتشافها والكلمات المفتاحية المناسبة للدور الوظيفي المستهدف.

- **💬 المستشار الذكي:** 
  واجهة محادثة نصية للإجابة على الاستفسارات المهنية الدقيقة.

## 🛠️ التقنيات المستخدمة

- **الواجهة الأمامية:** React 19, TypeScript, Vite
- **التصميم:** Tailwind CSS, Lucide React
- **الذكاء الاصطناعي:** Google Generative AI SDK (`@google/genai`)
- **النماذج المستخدمة:** 
- (للنصوص والتحليل) `gemini-2.5-flash`
- (للمحادثة الصوتية الحية) `gemini-2.5-flash-native-audio-preview` 
- **الصوت:** Web Audio API (لمعالجة التدفق الصوتي PCM 16kHz)

## 🚀 طريقة التشغيل (Local Setup)

### المتطلبات
- تثبيت Node.js.
- الحصول على مفتاح API من [Google AI Studio](https://aistudio.google.com/).

### خطوات التثبيت

1. **نسخ المستودع (Clone)**
   ```bash
   git clone https://github.com/faisald2926/Wajjihni.git
   cd Wajjihni
   ```

2. **تثبيت الحزم**
   ```bash
   npm install
   ```

3. **إعداد متغيرات البيئة**
   قم بإنشاء ملف جديد في المجلد الرئيسي (root) باسم `.env.local` وأضف السطر التالي بداخله:

   ```env
   GEMINI_API_KEY=your_api_key_here
