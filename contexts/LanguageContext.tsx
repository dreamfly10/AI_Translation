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
    'nav.title': 'AI Translate',
    
    // Home page
    'home.hero.title': 'AI Translation & Analysis',
    'home.hero.description': 'Translate articles into any language and generate in-depth insights with AI-powered analysis. Perfect for researchers, content creators, and anyone who needs high-quality translations with contextual understanding.',
    'home.features.lightning': 'Lightning Fast',
    'home.features.lightning.desc': 'Get accurate translations and insights in seconds with our optimized AI processing.',
    'home.features.smart': 'Smart Analysis',
    'home.features.smart.desc': 'Receive contextual insights and interpretations that help you understand the deeper meaning behind the content.',
    'home.features.tracking': 'Usage Tracking',
    'home.features.tracking.desc': 'Monitor your token usage and manage your translation needs with transparent tracking.',
    'home.usecases.title': 'Perfect for Every Creator',
    'home.usecases.researchers': 'Researchers',
    'home.usecases.researchers.desc': 'Translate academic papers and research articles with accurate terminology preservation.',
    'home.usecases.writers': 'Content Writers',
    'home.usecases.writers.desc': 'Understand foreign content and create localized versions with cultural context.',
    'home.usecases.business': 'Business Professionals',
    'home.usecases.business.desc': 'Analyze international market reports and business documents with AI-powered insights.',
    'home.usecases.students': 'Students',
    'home.usecases.students.desc': 'Learn from global content with translations that maintain original meaning and structure.',
    'home.cta.title': 'Ready to Transform Your Content?',
    'home.cta.description': 'Join users who are already using AI Translate to understand and analyze content in multiple languages.',
    'footer.copyright': '© 2025 AI Translate. All rights reserved.',
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
    'processor.title': 'Multimodal Content',
    'processor.input.url': 'URL',
    'processor.input.url.full': 'URL',
    'processor.input.text': 'Raw Text',
    'processor.input.video': 'Video',
    'processor.input.placeholder.url': 'Enter article URL',
    'processor.rewritingLevel.label': 'Expression Variation',
    'processor.process': 'Process',
    'processor.rewritingLevel.light': 'Light (Same structure, different wording)',
    'processor.rewritingLevel.medium': 'Medium (Structure changes)',
    'processor.rewritingLevel.heavy': 'Heavy (Logic and expression rewritten)',
    'processor.input.placeholder.text': 'Paste your article text here...',
    'processor.input.placeholder.video': 'Enter video/audio URL (YouTube, MP4, MP3, etc.)',
    'processor.style.label': 'Writing Style:',
    'processor.processing': 'Processing...',
    'processor.translation.title': 'Translation',
    'processor.translation.generating': '(Generating...)',
    'processor.insights.title': 'Insights & Interpretation',
    'processor.insights.generating': '(Generating...)',
    'processor.download': 'Download',
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
    'nav.title': 'AI 翻译',
    
    // Home page
    'home.hero.title': 'AI 翻译与分析',
    'home.hero.description': '将文章翻译成任何语言，并通过 AI 驱动的分析生成深度见解。非常适合研究人员、内容创作者以及需要高质量翻译和上下文理解的人。',
    'home.features.lightning': '极速处理',
    'home.features.lightning.desc': '通过我们优化的 AI 处理，在几秒钟内获得准确的翻译和见解。',
    'home.features.smart': '智能分析',
    'home.features.smart.desc': '接收上下文见解和解释，帮助您理解内容背后的深层含义。',
    'home.features.tracking': '使用追踪',
    'home.features.tracking.desc': '监控您的令牌使用情况，并通过透明的追踪管理您的翻译需求。',
    'home.usecases.title': '适合所有创作者',
    'home.usecases.researchers': '研究人员',
    'home.usecases.researchers.desc': '翻译学术论文和研究文章，保持准确的术语。',
    'home.usecases.writers': '内容创作者',
    'home.usecases.writers.desc': '理解外语内容，并创建具有文化背景的本地化版本。',
    'home.usecases.business': '商务专业人士',
    'home.usecases.business.desc': '使用 AI 驱动的见解分析国际市场报告和商务文件。',
    'home.usecases.students': '学生',
    'home.usecases.students.desc': '通过保持原始含义和结构的翻译，从全球内容中学习。',
    'home.cta.title': '准备好转换您的内容了吗？',
    'home.cta.description': '加入已经在使用 AI 翻译来理解和分析多语言内容的用户。',
    'footer.copyright': '© 2025 AI 翻译。保留所有权利。',
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
    'processor.title': '多模态内容',
    'processor.input.url': '网址链接',
    'processor.input.url.full': '网址链接',
    'processor.input.text': '原始文本',
    'processor.input.video': '视频',
    'processor.input.placeholder.url': '文章链接',
    'processor.rewritingLevel.label': '措辞程度',
    'processor.process': '处理',
    'processor.rewritingLevel.light': '轻度（结构相同，措辞不同）',
    'processor.rewritingLevel.medium': '中度（结构变化）',
    'processor.rewritingLevel.heavy': '重度（重写逻辑与表达）',
    'processor.input.placeholder.text': '在此粘贴您的文章文本...',
    'processor.input.placeholder.video': '输入视频/音频 URL（YouTube、MP4、MP3 等）',
    'processor.style.label': '写作风格：',
    'processor.processing': '处理中...',
    'processor.translation.title': 'Translation (中文翻译)',
    'processor.translation.generating': '(正在生成...)',
    'processor.insights.title': 'Insights & Interpretation (深度解读)',
    'processor.insights.generating': '(正在生成...)',
    'processor.download': '下载',
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

  // Load language from localStorage on mount
  // Default to English if no saved preference
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'zh')) {
      setLanguageState(savedLanguage);
    } else {
      // Ensure default is English
      setLanguageState('en');
      localStorage.setItem('language', 'en');
    }
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

