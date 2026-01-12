'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'zh';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation strings
const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.title': 'Expression Copilot',
    
    // Home page
    'home.hero.title': 'Expression Copilot',
    'home.hero.subtitle': 'A thinking amplifier for cross-language content.',
    'home.hero.description': 'Read, translate, and reinterpret ideas from articles, raw text, or videos — with AI that explains what matters, why it matters, and how it connects, in the style you choose.',
    'home.howItWorks.title': 'How Expression Copilot Works',
    'home.howItWorks.description': 'Start with a link, raw text, or video.\n\nExpression Copilot doesn\'t just translate — it reads for meaning first.\nIt identifies key ideas, context, and relationships, then re-expresses them clearly in your chosen language and style.\n\nWorks across articles, pasted text, and videos with available captions.',
    'home.features.title': 'CORE CAPABILITIES',
    'home.features.lightning': 'Instant Clarity',
    'home.features.lightning.desc': 'Break down complex content and get to the point — without losing nuance or context.',
    'home.features.smart': 'Context That Actually Makes Sense',
    'home.features.smart.desc': 'Understand the ideas behind the words — assumptions, implications, and deeper meaning included.',
    'home.features.tracking': 'Stay in Control',
    'home.features.tracking.desc': 'Transparent usage and cost awareness, so you always know what you\'re getting from AI.',
    'home.usecases.title': 'Perfect for Every Creator',
    'home.usecases.researchers': 'Researchers',
    'home.usecases.researchers.desc': 'Make sense of dense research faster\nBreak down arguments, methods, and conclusions without losing academic precision.',
    'home.usecases.writers': 'Content Writers',
    'home.usecases.writers.desc': 'Reshape global ideas into publishable content\nTranslate and restructure foreign-language material into clear, natural writing — adapted to your voice, platform, and audience.',
    'home.usecases.business': 'Business Professionals',
    'home.usecases.business.desc': 'Get to the point faster in global content\nTranslate and restructure international reports into clear summaries that highlight key ideas and implications.',
    'home.usecases.students': 'Students',
    'home.usecases.students.desc': 'Learn from global content with translations that maintain original meaning and structure.',
    'home.cta.title': 'Ready to Transform Your Content?',
    'home.cta.description': 'Join users who are already using Expression Copilot to understand and analyze content in multiple languages.',
    'footer.copyright': '© 2025 Expression Copilot. All rights reserved.',
    'footer.tagline': 'Transforming content with intelligence and precision.',
    
    // User Home Page
    'userhome.contactSupport': '💬 Contact Support',
    'userhome.loading': 'Loading...',
    'userhome.articleHistory': 'Article History',
    'userhome.tokenUsage': 'Token Usage',
    'userhome.paidPlan': 'Paid Plan',
    'userhome.tokensUsed': 'tokens used',
    'userhome.signOut': 'Sign Out',
    'userhome.upgradeToPaidPlan': 'Upgrade to Paid Plan',
    'userhome.article': 'article',
    'userhome.articles': 'articles',
    'userhome.article.zh': '',
    'userhome.settings': 'Settings',
    'auth.getStarted': 'Get Started',
    'auth.logIn': 'Log In',
    'auth.signIn': 'Sign In',
    'auth.signingIn': 'Signing in...',
    'auth.signInWithGoogle': 'Sign In with Google',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.or': 'or',
    'auth.backToHome': '← Back to home',
    'auth.invalidEmailOrPassword': 'Invalid email or password',
    'auth.signInFailed': 'Sign in failed',
    'auth.errorOccurred': 'An error occurred during sign in. Please try again.',
    'auth.viewDemo': 'View Demo',
    'auth.createAccount': 'Create an Account',
    'auth.alreadyHaveAccount': 'Already have an account?',
    'auth.dontHaveAccount': 'Don\'t have an account?',
    'auth.signUp': 'Sign up',
    
    // Support Form
    'support.title': 'Contact Support',
    'support.name': 'Your Name',
    'support.email': 'Your Email',
    'support.subject': 'Subject',
    'support.message': 'Your Message (minimum 10 words)',
    'support.cancel': 'Cancel',
    'support.send': 'Send Message',
    'support.sending': 'Sending...',
    'support.success': '✅ Message sent successfully! We\'ll get back to you soon.',
    'support.error.required': 'Required',
    'support.error.invalidEmail': 'Invalid email address',
    'support.error.minWords': 'Message must contain at least 10 words',
    'support.wordCount': 'word',
    'support.wordCount.plural': 'words',
    'support.wordCount.minimum': '(minimum 10 words required)',
    
    // Article Processor
    'processor.title': 'Start with a link, text, or video',
    'processor.title.helptip': 'Expression Copilot reads across formats before rewriting.',
    'processor.input.url': 'URL',
    'processor.input.url.full': 'URL',
    'processor.input.text': 'Raw Text',
    'processor.input.video': 'Video',
    'processor.input.placeholder.url': 'Paste an article link. We\'ll extract meaning, not just text.',
    'processor.rewritingLevel.label': 'Degree of Rewriting',
    'processor.process': 'Process',
    'processor.process.url': 'Analyze Article',
    'processor.process.text': 'Analyze Text',
    'processor.process.video': 'Analyze Video',
    'processor.rewritingLevel.light': 'Low (preserve structure)',
    'processor.rewritingLevel.medium': 'Medium (reframe & reorganize)',
    'processor.rewritingLevel.heavy': 'High (reinterpret ideas)',
    'processor.input.placeholder.text': 'Paste your article text here...',
    'processor.input.placeholder.video': 'Supports videos with captions. We analyze the transcript, not the visuals.',
    'processor.style.label': 'Thinking Style:',
    'processor.language.label': 'Output Language',
    'processor.language.helptip': 'Meaning preserved, structure adapted.',
    'processor.processing': 'Processing...',
    'processor.translation.title': 'Translation',
    'processor.translation.generating': '(Generating...)',
    'processor.insights.title': 'Insights & Interpretation',
    'processor.insights.generating': '(Generating...)',
    'processor.download': 'Download',
    'processor.textToSpeech': 'Play Audio',
    'processor.textToSpeech.generating': 'Generating audio...',
    'processor.collapse': 'Collapse',
    'processor.expand': 'Expand',
    
    // Payment Management
    'payment.title': 'Payment Information',
    'payment.methods': 'Payment Methods',
    'payment.billing': 'Billing Information',
    'payment.invoices': 'Invoice History',
    'payment.default': 'Default',
    'payment.setAsDefault': 'Set as Default',
    'payment.remove': 'Remove',
    'payment.edit': 'Edit',
    'payment.save': 'Save',
    'payment.saving': 'Saving...',
    'payment.cancel': 'Cancel',
    'payment.view': 'View',
    'payment.viewMore': 'View More',
    'payment.noMethods': 'No payment methods found.',
    'payment.noBilling': 'No billing information found.',
    'payment.noInvoices': 'No invoices found.',
    'payment.addMethodNote': 'To add a new payment method, please use the Stripe billing portal.',
    'payment.name': 'Name',
    'payment.phone': 'Phone',
    'payment.address': 'Address',
    'payment.addressLine1': 'Address Line 1',
    'payment.addressLine2': 'Address Line 2',
    'payment.city': 'City',
    'payment.state': 'State',
    'payment.postalCode': 'Postal Code',
    'payment.country': 'Country',
    'payment.email': 'Email',
    'payment.invoice': 'Invoice',
    'payment.paid': 'Paid',
    'payment.removeConfirm': 'Are you sure you want to remove this payment method?',
    
    // Common
    'common.loading': 'Loading...',
  },
  zh: {
    // Navigation
    'nav.title': '智能表达助理',
    
    // Home page
    'home.hero.title': '智能表达助理',
    'home.hero.subtitle': '跨语言内容的思维放大器。',
    'home.hero.description': '阅读、翻译并重新诠释来自文章、原始文本或视频的想法 — 通过 AI 解释什么重要、为什么重要以及如何连接，以您选择的风格呈现。',
    'home.howItWorks.title': '智能表达助理 如何工作',
    'home.howItWorks.description': '从链接、原始文本或视频开始。\n\n智能表达助理 不仅仅是翻译 — 它首先理解含义。\n它识别关键想法、上下文和关系，然后以您选择的语言和风格清晰地重新表达它们。\n\n适用于文章、粘贴的文本以及带有可用字幕的视频。',
    'home.features.title': '核心能力',
    'home.features.lightning': '即时清晰',
    'home.features.lightning.desc': '分解复杂内容并直达要点 — 不失细微差别或上下文。',
    'home.features.smart': '真正有意义的上下文',
    'home.features.smart.desc': '理解文字背后的想法 — 包括假设、含义和更深层的意义。',
    'home.features.tracking': '保持控制',
    'home.features.tracking.desc': '透明的使用情况和成本意识，让您始终了解从 AI 中获得的内容。',
    'home.usecases.title': '适合所有创作者',
    'home.usecases.researchers': '研究人员',
    'home.usecases.researchers.desc': '更快理解密集研究\n分解论点、方法和结论，同时保持学术精确性。',
    'home.usecases.writers': '内容创作者',
    'home.usecases.writers.desc': '将全球想法重塑为可发布的内容\n将外语材料翻译并重组为清晰、自然的写作 — 适应您的声音、平台和受众。',
    'home.usecases.business': '商务专业人士',
    'home.usecases.business.desc': '在全球内容中更快抓住要点\n将国际报告翻译并重组为清晰的摘要，突出关键想法和含义。',
    'home.usecases.students': '学生',
    'home.usecases.students.desc': '通过保持原始含义和结构的翻译，从全球内容中学习。',
    'home.cta.title': '准备好转换您的内容了吗？',
    'home.cta.description': '加入已经在使用 智能表达助理 来理解和分析多语言内容的用户。',
    'footer.copyright': '© 2025 智能表达助理。保留所有权利。',
    'footer.tagline': '用智能和精确转换内容。',
    
    // User Home Page
    'userhome.contactSupport': '💬 联系客服',
    'userhome.loading': '加载中...',
    'userhome.articleHistory': '文章历史',
    'userhome.tokenUsage': 'Token 使用情况',
    'userhome.paidPlan': '付费套餐',
    'userhome.tokensUsed': '已使用 tokens',
    'userhome.signOut': '退出登录',
    'userhome.upgradeToPaidPlan': '升级到付费套餐',
    'userhome.article': 'article',
    'userhome.articles': 'articles',
    'userhome.article.zh': '篇文章',
    'userhome.settings': '设置',
    'auth.getStarted': '开始使用',
    'auth.logIn': '登录',
    'auth.signIn': '登录',
    'auth.signingIn': '正在登录...',
    'auth.signInWithGoogle': '使用 Google 登录',
    'auth.email': '邮箱',
    'auth.password': '密码',
    'auth.or': '或',
    'auth.backToHome': '← 返回首页',
    'auth.invalidEmailOrPassword': '邮箱或密码无效',
    'auth.signInFailed': '登录失败',
    'auth.errorOccurred': '登录时发生错误，请重试。',
    'auth.viewDemo': '查看演示',
    'auth.createAccount': '创建账户',
    'auth.alreadyHaveAccount': '已有账户？',
    'auth.dontHaveAccount': '还没有账户？',
    'auth.signUp': '注册',
    
    // Support Form
    'support.title': '联系客服',
    'support.name': '您的姓名',
    'support.email': '您的邮箱',
    'support.subject': '主题',
    'support.message': '您的消息（至少 10 个字）',
    'support.cancel': '取消',
    'support.send': '发送消息',
    'support.sending': '发送中...',
    'support.success': '✅ 消息发送成功！我们会尽快回复您。',
    'support.error.required': '必填',
    'support.error.invalidEmail': '无效的邮箱地址',
    'support.error.minWords': '消息必须包含至少 10 个字',
    'support.wordCount': '字',
    'support.wordCount.plural': '字',
    'support.wordCount.minimum': '（至少需要 10 个字）',
    
    // Article Processor
    'processor.title': '从链接、文本或视频开始',
    'processor.title.helptip': '智能表达助理在重写前会跨格式阅读。',
    'processor.input.url': '网址链接',
    'processor.input.url.full': '网址链接',
    'processor.input.text': '原始文本',
    'processor.input.video': '视频',
    'processor.input.placeholder.url': '粘贴文章链接。我们将提取含义，而不仅仅是文本。',
    'processor.rewritingLevel.label': '改写程度',
    'processor.process': '处理',
    'processor.process.url': '分析文章',
    'processor.process.text': '分析文本',
    'processor.process.video': '分析视频',
    'processor.rewritingLevel.light': '低（保留结构）',
    'processor.rewritingLevel.medium': '中（重构与重组）',
    'processor.rewritingLevel.heavy': '高（重新诠释想法）',
    'processor.input.placeholder.text': '在此粘贴您的文章文本...',
    'processor.input.placeholder.video': '支持带字幕的视频。我们分析转录文本，而非视觉内容。',
    'processor.style.label': '思维风格：',
    'processor.language.label': '输出语言',
    'processor.language.helptip': '含义保留，结构适配。',
    'processor.process.url': '分析文章',
    'processor.process.text': '分析文本',
    'processor.process.video': '分析视频',
    'processor.processing': '处理中...',
    'processor.translation.title': 'Translation (中文翻译)',
    'processor.translation.generating': '(正在生成...)',
    'processor.insights.title': 'Insights & Interpretation (深度解读)',
    'processor.insights.generating': '(正在生成...)',
    'processor.download': '下载',
    'processor.textToSpeech': '播放音频',
    'processor.textToSpeech.generating': '正在生成音频...',
    'processor.collapse': '收起',
    'processor.expand': '展开',
    
    // Payment Management
    'payment.title': '支付信息',
    'payment.methods': '支付方式',
    'payment.billing': '账单信息',
    'payment.invoices': '发票历史',
    'payment.default': '默认',
    'payment.setAsDefault': '设为默认',
    'payment.remove': '删除',
    'payment.edit': '编辑',
    'payment.save': '保存',
    'payment.saving': '保存中...',
    'payment.cancel': '取消',
    'payment.view': '查看',
    'payment.viewMore': '查看更多',
    'payment.noMethods': '未找到支付方式。',
    'payment.noBilling': '未找到账单信息。',
    'payment.noInvoices': '未找到发票。',
    'payment.addMethodNote': '要添加新的支付方式，请使用 Stripe 账单门户。',
    'payment.name': '姓名',
    'payment.phone': '电话',
    'payment.address': '地址',
    'payment.addressLine1': '地址行 1',
    'payment.addressLine2': '地址行 2',
    'payment.city': '城市',
    'payment.state': '州/省',
    'payment.postalCode': '邮政编码',
    'payment.country': '国家',
    'payment.email': '邮箱',
    'payment.invoice': '发票',
    'payment.paid': '已支付',
    'payment.removeConfirm': '您确定要删除此支付方式吗？',
    
    // Common
    'common.loading': '加载中...',
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  // Load language from localStorage and user preferences on mount
  useEffect(() => {
    const loadLanguage = async () => {
      // First, try to load from localStorage (user's manual selection takes priority)
      const savedLanguage = localStorage.getItem('language') as Language;
      if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'zh')) {
        setLanguageState(savedLanguage);
      } else {
        // If no localStorage preference, try to load from user preferences
        try {
          const response = await fetch('/api/user-preferences');
          if (response.ok) {
            const data = await response.json();
            const defaultLang = data.defaultUILanguage || 'en';
            if (defaultLang === 'en' || defaultLang === 'zh') {
              setLanguageState(defaultLang);
              localStorage.setItem('language', defaultLang);
            } else {
              setLanguageState('en');
              localStorage.setItem('language', 'en');
            }
          } else {
            // Fallback to English if API fails
            setLanguageState('en');
            localStorage.setItem('language', 'en');
          }
        } catch (err) {
          // Fallback to English if API fails
          setLanguageState('en');
          localStorage.setItem('language', 'en');
        }
      }
    };
    loadLanguage();

    // Listen for preference updates
    const handlePreferencesUpdate = () => {
      loadLanguage();
    };
    window.addEventListener('preferencesUpdated', handlePreferencesUpdate);
    return () => {
      window.removeEventListener('preferencesUpdated', handlePreferencesUpdate);
    };
  }, []);

  // Save language to localStorage when it changes
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  // Translation function
  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

