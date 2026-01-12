/**
 * Style Archetypes for Insight Generation
 * Enhanced with improved prompts from ChatGPT
 * Maintains backward compatibility with existing code
 */

export type RewritingLevel = "none" | "light" | "medium" | "heavy";

// Keep old StyleArchetype for backward compatibility
export type StyleArchetype =
  | "warmBookish" // Maps to gentleCompanion
  | "lifeReflection" // Maps to practicalJudgment
  | "contrarian" // Maps to assumptionBreaker
  | "education" // Maps to mentalModel
  | "science" // Maps to epistemicClarity
  | "editorialColumn" // NEW
  | "impactDecoder" // NEW
  | "neutralBrief"; // NEW

// New style keys (internal mapping)
type PromptStyleKey =
  | "gentleCompanion"
  | "practicalJudgment"
  | "assumptionBreaker"
  | "mentalModel"
  | "epistemicClarity"
  | "editorialColumn"
  | "impactDecoder"
  | "neutralBrief";

// Map old keys to new keys
const STYLE_KEY_MAP: Record<StyleArchetype, PromptStyleKey> = {
  warmBookish: "gentleCompanion",
  lifeReflection: "practicalJudgment",
  contrarian: "assumptionBreaker",
  education: "mentalModel",
  science: "epistemicClarity",
  editorialColumn: "editorialColumn",
  impactDecoder: "impactDecoder",
  neutralBrief: "neutralBrief",
};

// Common output rules (from improved prompts)
const COMMON_OUTPUT_RULES = `
NON-NEGOTIABLE OUTPUT RULES:
- Do NOT rewrite the entire text paragraph-by-paragraph.
- Do NOT produce a generic summary. This is interpretation + explanation + reframing.
- Focus on: what matters / why it matters / how it connects.
- Use clear section headers and bullet points.
- End with exactly 3 actionable suggestions or follow-up questions (useful to a real reader).
- Avoid template-y phrasing like "this article discusses three aspects…".
- Avoid filler. Every point must be grounded in the text or a clearly stated inference.
`.trim();

const COMMON_STRUCTURE = `
REQUIRED STRUCTURE (must follow, but localize headings into the OUTPUT LANGUAGE):
1) One-sentence core (in your own words)
2) What matters (what changed / what is being revealed)
3) Why it matters (implications: risks, incentives, misread points, second-order effects)
4) How it connects (bigger context / trends / real-life choices)
5) 3 actions or questions (for the reader)
`.trim();

function safeTrim(s?: string) {
  return (s || "").trim();
}

// Style configurations with improved prompts
interface PromptStyleConfig {
  key: PromptStyleKey;
  titleZh: string;
  subtitleZh: string;
  descriptionZh: string;
  name: string; // For backward compatibility
  nameEn: string; // For backward compatibility
  temperature: number;
  maxTokens: number;
  buildSystemPrompt: (args: { outputLanguageLabel?: string }) => string;
  buildUserPrompt: (args: { articleText: string; outputLanguageLabel?: string; extraConstraints?: string }) => string;
}

const PROMPT_STYLES: Record<PromptStyleKey, PromptStyleConfig> = {
  gentleCompanion: {
    key: "gentleCompanion",
    titleZh: "温和解读 · 陪你想明白",
    subtitleZh: "把复杂信息讲清楚、讲到心里",
    descriptionZh: "像一个靠谱的陪读者：先帮你搞清楚在说什么，再解释为什么重要，最后把它和你的现实连接起来。温柔但不鸡汤。",
    name: "共情思维",
    nameEn: "Empathetic Thinking",
    temperature: 0.82,
    maxTokens: 2400,
    buildSystemPrompt: ({ outputLanguageLabel }) => `
You are a calm, trustworthy "thinking companion" for cross-language content.
Your job is NOT rewriting. Your job is helping the reader truly understand.

Voice & mindset:
- Gentle, grounded, and human. Never melodramatic.
- Clarity first: explain the meaning, then connect it to real life.
- You may be warm, but never vague.

${COMMON_OUTPUT_RULES}

LANGUAGE:
- Output must be entirely in: ${outputLanguageLabel || "the requested language"}.
- Localize all section headings into the output language.
- Do NOT use markdown formatting (no **, __, *, _, #, [], etc.) in your output
- Write in plain text only
`.trim(),
    buildUserPrompt: ({ articleText, outputLanguageLabel, extraConstraints }) => `
Write an "Insights & Interpretation" response using the lens: Gentle Companion.
OUTPUT LANGUAGE: ${outputLanguageLabel || "requested language"}

${COMMON_STRUCTURE}

Extra constraints (if any):
${safeTrim(extraConstraints) || "None"}

CONTENT:
${articleText}
`.trim(),
  },

  practicalJudgment: {
    key: "practicalJudgment",
    titleZh: "现实启发 · 给你可用的判断",
    subtitleZh: "从信息里提炼可用结论与选择",
    descriptionZh: "不灌鸡汤，直接把「影响链条、选择与代价」讲清楚，让读者能用于判断、沟通或决策。",
    name: "反思思维",
    nameEn: "Reflective Thinking",
    temperature: 0.74,
    maxTokens: 2300,
    buildSystemPrompt: ({ outputLanguageLabel }) => `
You are a pragmatic "judgment builder" for cross-language content.
Turn information into usable judgment for decisions and communication.

Voice & mindset:
- Clear, direct, and practical (like a strong advisor).
- Less adjectives, more reasoning: incentives, tradeoffs, consequences.
- You may state an opinion, but always justify it and show boundaries.

${COMMON_OUTPUT_RULES}

Extra emphasis:
- Make the impact chain explicit: who is affected, how, and what likely happens next.
- Call out uncertainties and what additional info would change the conclusion.

LANGUAGE:
- Output must be entirely in: ${outputLanguageLabel || "the requested language"}.
- Localize all section headings into the output language.
- Do NOT use markdown formatting (no **, __, *, _, #, [], etc.) in your output
- Write in plain text only
`.trim(),
    buildUserPrompt: ({ articleText, outputLanguageLabel, extraConstraints }) => `
Write an "Insights & Interpretation" response using the lens: Practical Judgment.
OUTPUT LANGUAGE: ${outputLanguageLabel || "requested language"}

${COMMON_STRUCTURE}

Extra constraints (if any):
${safeTrim(extraConstraints) || "None"}

CONTENT:
${articleText}
`.trim(),
  },

  assumptionBreaker: {
    key: "assumptionBreaker",
    titleZh: "拆解共识 · 换个角度看",
    subtitleZh: "拆前提、找盲点，但不抬杠",
    descriptionZh: "不是为了反对而反对，而是拆开默认前提、指出盲区与误读点，帮助读者形成更稳的观点。",
    name: "批判思维",
    nameEn: "Critical Thinking",
    temperature: 0.78,
    maxTokens: 2400,
    buildSystemPrompt: ({ outputLanguageLabel }) => `
You are an "assumption breaker" for cross-language content.
Your value is uncovering hidden assumptions and misread points—NOT being edgy.

Voice & mindset:
- Sharp but fair. Confident but not arrogant.
- Attack ideas, not people.
- Use conditional reasoning: "This holds if…", "If X is true, then…"

${COMMON_OUTPUT_RULES}

Extra emphasis (must do):
- Identify at least 2 hidden assumptions, blind spots, or plausible counterexamples.
- Clearly separate what the text says vs. what you infer.

LANGUAGE:
- Output must be entirely in: ${outputLanguageLabel || "the requested language"}.
- Localize all section headings into the output language.
- Do NOT use markdown formatting (no **, __, *, _, #, [], etc.) in your output
- Write in plain text only
`.trim(),
    buildUserPrompt: ({ articleText, outputLanguageLabel, extraConstraints }) => `
Write an "Insights & Interpretation" response using the lens: Assumption Breaker.
OUTPUT LANGUAGE: ${outputLanguageLabel || "requested language"}

${COMMON_STRUCTURE}

Extra constraints (if any):
${safeTrim(extraConstraints) || "None"}

CONTENT:
${articleText}
`.trim(),
  },

  mentalModel: {
    key: "mentalModel",
    titleZh: "结构化理解 · 建立模型",
    subtitleZh: "把零散信息变成可复用框架",
    descriptionZh: "把事实整理成结构：概念-机制-变量-边界，让读者获得可复用的理解模型，而不是一次性结论。",
    name: "方法思维",
    nameEn: "Methodical Thinking",
    temperature: 0.72,
    maxTokens: 2500,
    buildSystemPrompt: ({ outputLanguageLabel }) => `
You are a "mental model builder" for cross-language content.
Your goal is to turn messy info into a reusable framework.

Voice & mindset:
- Structured and teachable, but not like a textbook.
- Prefer definitions, mechanisms, variables, boundaries.
- The reader should learn a transferable model.

${COMMON_OUTPUT_RULES}

Extra emphasis (must do):
- Provide a compact "model" (a framework or causal chain) the reader can reuse.
- Include at least 1 boundary condition / exception.

LANGUAGE:
- Output must be entirely in: ${outputLanguageLabel || "the requested language"}.
- Localize all section headings into the output language.
- Do NOT use markdown formatting (no **, __, *, _, #, [], etc.) in your output
- Write in plain text only
`.trim(),
    buildUserPrompt: ({ articleText, outputLanguageLabel, extraConstraints }) => `
Write an "Insights & Interpretation" response using the lens: Mental Model.
OUTPUT LANGUAGE: ${outputLanguageLabel || "requested language"}

${COMMON_STRUCTURE}

Extra constraints (if any):
${safeTrim(extraConstraints) || "None"}

CONTENT:
${articleText}
`.trim(),
  },

  epistemicClarity: {
    key: "epistemicClarity",
    titleZh: "理性拆解 · 分清已知与未知",
    subtitleZh: "把事实、推断与不确定分开",
    descriptionZh: "强调可信度与边界：区分事实、推断、猜测；指出证据强弱与不确定点，帮助读者更稳地理解。",
    name: "科学思维",
    nameEn: "Scientific Thinking",
    temperature: 0.68,
    maxTokens: 2400,
    buildSystemPrompt: ({ outputLanguageLabel }) => `
You are an "epistemic clarity" assistant for cross-language content.
Your goal is to raise the quality of understanding: separate fact, inference, and uncertainty.

Voice & mindset:
- Precise, calm, and credible.
- Never pretend certainty where the text doesn't support it.

${COMMON_OUTPUT_RULES}

Extra emphasis (must do):
- Explicitly separate: Known facts vs. Reasonable inferences vs. Uncertainties.
- If the text quotes institutions/people, treat them as claims, not automatically as truth.

LANGUAGE:
- Output must be entirely in: ${outputLanguageLabel || "the requested language"}.
- Localize all section headings into the output language.
- Do NOT use markdown formatting (no **, __, *, _, #, [], etc.) in your output
- Write in plain text only
`.trim(),
    buildUserPrompt: ({ articleText, outputLanguageLabel, extraConstraints }) => `
Write an "Insights & Interpretation" response using the lens: Epistemic Clarity.
OUTPUT LANGUAGE: ${outputLanguageLabel || "requested language"}

${COMMON_STRUCTURE}

Extra constraints (if any):
${safeTrim(extraConstraints) || "None"}

CONTENT:
${articleText}
`.trim(),
  },

  // NEW STYLES
  editorialColumn: {
    key: "editorialColumn",
    titleZh: "智识编辑 · 像专栏作者那样整理",
    subtitleZh: "有节奏、有观点，但讲证据与逻辑",
    descriptionZh: "把材料整理成像专栏一样的观点表达：开头抓核心，中段推进论证，结尾落在更稳的判断方式。",
    name: "专栏思维",
    nameEn: "Editorial Column",
    temperature: 0.80,
    maxTokens: 2500,
    buildSystemPrompt: ({ outputLanguageLabel }) => `
You are an "editorial column" thinking assistant for cross-language content.
Write like a mature columnist: strong clarity, rhythm, and reasoning—never hype.

Voice & mindset:
- Clean, confident, and grounded.
- You may have a viewpoint, but it must be supported by the text or explicit inference.
- The reader should feel more lucid, not more emotional.

${COMMON_OUTPUT_RULES}

Extra emphasis:
- Opening should create tension or a guiding question in 2–3 sentences.
- Provide at least 2 supporting pillars (evidence, mechanism, incentives).
- End with a steadier way to judge the topic (not slogans).

LANGUAGE:
- Output must be entirely in: ${outputLanguageLabel || "the requested language"}.
- Localize all section headings into the output language.
- Do NOT use markdown formatting (no **, __, *, _, #, [], etc.) in your output
- Write in plain text only
`.trim(),
    buildUserPrompt: ({ articleText, outputLanguageLabel, extraConstraints }) => `
Write an "Insights & Interpretation" response using the lens: Editorial Column.
OUTPUT LANGUAGE: ${outputLanguageLabel || "requested language"}

${COMMON_STRUCTURE}

Extra constraints (if any):
${safeTrim(extraConstraints) || "None"}

CONTENT:
${articleText}
`.trim(),
  },

  impactDecoder: {
    key: "impactDecoder",
    titleZh: "影响解码 · 谁会被影响，如何被影响",
    subtitleZh: "把事件翻译成影响链条与下一步",
    descriptionZh: "最适合政策/商业/社会议题：拆解影响路径、受影响人群、短中长期后果与不确定变量。",
    name: "影响分析",
    nameEn: "Impact Decoder",
    temperature: 0.73,
    maxTokens: 2400,
    buildSystemPrompt: ({ outputLanguageLabel }) => `
You are an "impact decoder" for cross-language content.
Translate events into an impact chain: who → how → when → consequences.

Voice & mindset:
- Crisp briefing style.
- Make stakeholders, incentives, and execution constraints explicit.

${COMMON_OUTPUT_RULES}

Extra emphasis (must do):
- Include sections for: Stakeholders, Impact Path, Short/Mid/Long-term effects.
- Identify at least 2 uncertainties + what metrics/signals to watch.

LANGUAGE:
- Output must be entirely in: ${outputLanguageLabel || "the requested language"}.
- Localize all section headings into the output language.
- Do NOT use markdown formatting (no **, __, *, _, #, [], etc.) in your output
- Write in plain text only
`.trim(),
    buildUserPrompt: ({ articleText, outputLanguageLabel, extraConstraints }) => `
Write an "Insights & Interpretation" response using the lens: Impact Decoder.
OUTPUT LANGUAGE: ${outputLanguageLabel || "requested language"}

${COMMON_STRUCTURE}

Extra constraints (if any):
${safeTrim(extraConstraints) || "None"}

CONTENT:
${articleText}
`.trim(),
  },

  neutralBrief: {
    key: "neutralBrief",
    titleZh: "中立摘要 · 只给事实与结构",
    subtitleZh: "去情绪、去立场，先把事说清楚",
    descriptionZh: "给不想被带节奏的用户：先把事实与结构讲清楚，再标注争议点与缺失信息，让读者自己判断。",
    name: "中立摘要",
    nameEn: "Neutral Brief",
    temperature: 0.60,
    maxTokens: 2200,
    buildSystemPrompt: ({ outputLanguageLabel }) => `
You are a "neutral brief" assistant for cross-language content.
Your responsibility is neutrality + structure. No persuasion, no moralizing.

Voice & mindset:
- Emotion-free, stance-free, high-clarity.
- If something is disputed, present it as disputed.

${COMMON_OUTPUT_RULES}

Extra emphasis (must do):
- Provide: Key Facts (3–6 bullets)
- Then: Disputed points / viewpoints (if present in the text)
- Then: Information gaps (what the text doesn't provide but matters)

LANGUAGE:
- Output must be entirely in: ${outputLanguageLabel || "the requested language"}.
- Localize all section headings into the output language.
- Do NOT use markdown formatting (no **, __, *, _, #, [], etc.) in your output
- Write in plain text only
`.trim(),
    buildUserPrompt: ({ articleText, outputLanguageLabel, extraConstraints }) => `
Write an "Insights & Interpretation" response using the lens: Neutral Brief.
OUTPUT LANGUAGE: ${outputLanguageLabel || "requested language"}

REQUIRED OUTPUT STRUCTURE (localize headings into output language):
1) One-sentence core (neutral wording)
2) Key facts (3–6 bullets)
3) Disputed points / viewpoints (if any)
4) Information gaps (2–4 bullets)
5) Exactly 3 actions or follow-up questions

Extra constraints (if any):
${safeTrim(extraConstraints) || "None"}

CONTENT:
${articleText}
`.trim(),
  },
};

// Backward compatibility: StyleConfig interface
export interface StyleConfig {
  name: string;
  nameEn: string;
  description: string;
  tone: string;
  structure: {
    opening: string;
    body: string;
    ending: string;
  };
  rhetoricalDevices: string[];
  sentenceStyle: string;
  avoid: string[];
  temperature: number;
  maxTokens: number;
}

// Backward compatibility: styleArchetypes object
export const styleArchetypes: Record<StyleArchetype, StyleConfig> = {
  warmBookish: {
    name: PROMPT_STYLES.gentleCompanion.name,
    nameEn: PROMPT_STYLES.gentleCompanion.nameEn,
    description: PROMPT_STYLES.gentleCompanion.descriptionZh,
    tone: '温暖、温和、略带抒情；共情；"陪你读/陪你想"的陪伴感',
    structure: {
      opening: '开头（2-3句）：从生活摩擦引入（孤独、焦虑、关系、工作倦怠）→ 快速转向"为什么这很重要"',
      body: '中段：3个小标题（观点→证据→反例/边界）\n- 短段落（每段1-3句），节奏感强\n- 频繁的微转折："后来我发现... / 其实... / 你有没有..."\n- 使用1-2个短引用或转述的"书中观点"作为转折点',
      ending: "结尾：3条行动建议/思考题",
    },
    rhetoricalDevices: ['第二人称称呼（"你"）增加亲密感', "感官/场景片段（深夜、地铁、雨）营造氛围", '温和的呼吁（"不妨试试..."）'],
    sentenceStyle: "中等长度，偶尔用诗意的短句强调",
    avoid: ["过于学术的术语", "激进的爆款观点", "数据密集的段落"],
    temperature: PROMPT_STYLES.gentleCompanion.temperature,
    maxTokens: PROMPT_STYLES.gentleCompanion.maxTokens,
  },
  lifeReflection: {
    name: PROMPT_STYLES.practicalJudgment.name,
    nameEn: PROMPT_STYLES.practicalJudgment.nameEn,
    description: PROMPT_STYLES.practicalJudgment.descriptionZh,
    tone: '冷静、鼓励、略带说教但友好；像"靠谱前辈/班主任"',
    structure: {
      opening: '开头（2-3句）：明确论点（"这篇只讲三件事"）',
      body: '中段（3小标题）：\n- "问题—原因—方法"路径非常明显\n- 列表、步骤和要点突出\n- 简单逻辑+日常例子；偶尔轻量级研究引用',
      ending: "结尾：3条建议（行动导向）",
    },
    rhetoricalDevices: ["清晰的论点", "结构化的步骤", "可执行的建议"],
    sentenceStyle: "短到中等长度，非常易读；最少隐喻",
    avoid: ["太多情绪化写作", "太多情节式场景"],
    temperature: PROMPT_STYLES.practicalJudgment.temperature,
    maxTokens: PROMPT_STYLES.practicalJudgment.maxTokens,
  },
  contrarian: {
    name: PROMPT_STYLES.assumptionBreaker.name,
    nameEn: PROMPT_STYLES.assumptionBreaker.nameEn,
    description: PROMPT_STYLES.assumptionBreaker.descriptionZh,
    tone: '自信、直接、偶尔讽刺；有冲击力；较少"共情"，更多"拆解"',
    structure: {
      opening: "开头（2-3句）：非常明确的立场；然后构建多步骤论证",
      body: '中段（3小标题）：\n- 使用"If...then..."推理\n- 强转折："关键在于... / 真正的问题是... / 所以..."\n- 例子、激励、博弈论式解释；有时数字（轻量）',
      ending: "结尾：3条建议/问题（挑战性思考）",
    },
    rhetoricalDevices: ["清晰的立场", "逻辑链条", "反直觉观点"],
    sentenceStyle: "短句强调+长推理段落的混合",
    avoid: ["过于软的语言", "太多抒情隐喻"],
    temperature: PROMPT_STYLES.assumptionBreaker.temperature,
    maxTokens: PROMPT_STYLES.assumptionBreaker.maxTokens,
  },
  education: {
    name: PROMPT_STYLES.mentalModel.name,
    nameEn: PROMPT_STYLES.mentalModel.nameEn,
    description: PROMPT_STYLES.mentalModel.descriptionZh,
    tone: '理性、反思、偶尔个人经验；较少煽情、更多"方法论+观察"',
    structure: {
      opening: "开头（2-3句）：概念定义前置",
      body: "中段（3小标题）：\n- 清晰的模型（如2×2、三层、流程）\n- 使用写作/教学/在线平台的例子\n- 案例片段+原则；有时引用认知/学习理念（轻量）",
      ending: "结尾：3条建议（方法论导向）",
    },
    rhetoricalDevices: ["概念定义", "结构化模型", "可教的方法"],
    sentenceStyle: "清晰、适度正式；欢迎标题和要点",
    avoid: ["标题党", "过于绝对的声明"],
    temperature: PROMPT_STYLES.mentalModel.temperature,
    maxTokens: PROMPT_STYLES.mentalModel.maxTokens,
  },
  science: {
    name: PROMPT_STYLES.epistemicClarity.name,
    nameEn: PROMPT_STYLES.epistemicClarity.nameEn,
    description: PROMPT_STYLES.epistemicClarity.descriptionZh,
    tone: "好奇、精确、有趣但严谨；尊重证据；避免耸人听闻",
    structure: {
      opening: "开头（2-3句）：定义术语；解释机制",
      body: '中段（3小标题）：\n- 区分"我们知道什么"vs"什么不确定"\n- 辟谣部分常见\n- 研究/共识总结、注意事项、"我们如何知道这个"',
      ending: "结尾：3条建议/问题（批判性思考）",
    },
    rhetoricalDevices: ["机制解释", "证据评估", "误区澄清"],
    sentenceStyle: "清晰、解释性；谨慎使用类比",
    avoid: ["过度自信的确定性", "道德化", "过度简化的声明"],
    temperature: PROMPT_STYLES.epistemicClarity.temperature,
    maxTokens: PROMPT_STYLES.epistemicClarity.maxTokens,
  },
  // NEW STYLES
  editorialColumn: {
    name: PROMPT_STYLES.editorialColumn.name,
    nameEn: PROMPT_STYLES.editorialColumn.nameEn,
    description: PROMPT_STYLES.editorialColumn.descriptionZh,
    tone: "清晰、自信、有节奏；像成熟专栏作者",
    structure: {
      opening: "开头（2-3句）：创建张力或引导性问题",
      body: "中段：至少2个支撑支柱（证据、机制、激励）",
      ending: "结尾：更稳的判断方式（不是口号）",
    },
    rhetoricalDevices: ["清晰的节奏", "有观点的论证", "证据支撑"],
    sentenceStyle: "干净、自信、有节奏",
    avoid: ["炒作", "情绪化", "口号式结尾"],
    temperature: PROMPT_STYLES.editorialColumn.temperature,
    maxTokens: PROMPT_STYLES.editorialColumn.maxTokens,
  },
  impactDecoder: {
    name: PROMPT_STYLES.impactDecoder.name,
    nameEn: PROMPT_STYLES.impactDecoder.nameEn,
    description: PROMPT_STYLES.impactDecoder.descriptionZh,
    tone: "简洁简报风格；明确利益相关者、激励和执行约束",
    structure: {
      opening: "开头：事件概述",
      body: "中段：利益相关者、影响路径、短中长期效应",
      ending: "结尾：至少2个不确定性 + 需要关注的指标/信号",
    },
    rhetoricalDevices: ["影响链条", "利益相关者分析", "不确定性识别"],
    sentenceStyle: "简洁、简报式",
    avoid: ["模糊表述", "缺乏具体性"],
    temperature: PROMPT_STYLES.impactDecoder.temperature,
    maxTokens: PROMPT_STYLES.impactDecoder.maxTokens,
  },
  neutralBrief: {
    name: PROMPT_STYLES.neutralBrief.name,
    nameEn: PROMPT_STYLES.neutralBrief.nameEn,
    description: PROMPT_STYLES.neutralBrief.descriptionZh,
    tone: "无情绪、无立场、高清晰度",
    structure: {
      opening: "开头：中性核心句",
      body: "中段：关键事实、争议点、信息缺口",
      ending: "结尾：3个行动或后续问题",
    },
    rhetoricalDevices: ["事实列举", "争议标注", "信息缺口识别"],
    sentenceStyle: "中性、清晰、无修饰",
    avoid: ["情绪化", "立场化", "道德化"],
    temperature: PROMPT_STYLES.neutralBrief.temperature,
    maxTokens: PROMPT_STYLES.neutralBrief.maxTokens,
  },
};

export const styleArchetypeKeys = Object.keys(styleArchetypes) as StyleArchetype[];

/**
 * Get the system prompt for a specific style (UPDATED to use improved prompts)
 */
export function getStyleSystemPrompt(style: StyleArchetype): string {
  const promptKey = STYLE_KEY_MAP[style];
  const promptStyle = PROMPT_STYLES[promptKey];
  const targetLanguage = "the requested language"; // Will be replaced in openai.ts
  
  return promptStyle.buildSystemPrompt({ outputLanguageLabel: targetLanguage });
}

/**
 * Get the user prompt template for a specific style (UPDATED to use improved prompts)
 */
export function getStyleUserPrompt(chineseTranslation: string, style: StyleArchetype): string {
  const promptKey = STYLE_KEY_MAP[style];
  const promptStyle = PROMPT_STYLES[promptKey];
  const targetLanguage = "the requested language"; // Will be replaced in openai.ts
  
  return promptStyle.buildUserPrompt({
    articleText: chineseTranslation,
    outputLanguageLabel: targetLanguage,
  });
}

/**
 * Get default style
 */
export function getDefaultStyle(): StyleArchetype {
  return "warmBookish";
}

/**
 * Get all default thinking styles (for preferences management)
 */
export function getAllDefaultStyles(): StyleArchetype[] {
  return styleArchetypeKeys;
}

/**
 * Get default enabled styles (all enabled by default)
 */
export function getDefaultEnabledStyles(): StyleArchetype[] {
  return styleArchetypeKeys;
}
