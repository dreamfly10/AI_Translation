/**
 * Style Archetypes for Insight Generation
 * Based on popular Chinese content platforms' writing styles
 */

export type StyleArchetype = 
  | 'warmBookish'      // 十点读书 - Warm, emotional, longform
  | 'lifeReflection'   // 有书 - Life lessons + practical wisdom
  | 'contrarian'       // 远方青木 - Sharp, contrarian, logical
  | 'education'        // 玉树芝兰 - Educational, methodological
  | 'science';         // 果壳 - Science explainer, skeptical

export interface StyleConfig {
  name: string;
  nameEn: string; // English name
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

export const styleArchetypes: Record<StyleArchetype, StyleConfig> = {
  warmBookish: {
    name: '温暖书卷风',
    nameEn: 'Warm Bookish',
    description: '深度阅读+情绪共鸣+长文风格，像十点读书那样陪伴读者',
    tone: '温暖、温和、略带抒情；共情；"陪你读/陪你想"的陪伴感',
    structure: {
      opening: '开头（2-3句）：从生活摩擦引入（孤独、焦虑、关系、工作倦怠）→ 快速转向"为什么这很重要"',
      body: '中段：3个小标题（观点→证据→反例/边界）\n- 短段落（每段1-3句），节奏感强\n- 频繁的微转折："后来我发现... / 其实... / 你有没有..."\n- 使用1-2个短引用或转述的"书中观点"作为转折点',
      ending: '结尾：3条行动建议/思考题'
    },
    rhetoricalDevices: [
      '第二人称称呼（"你"）增加亲密感',
      '感官/场景片段（深夜、地铁、雨）营造氛围',
      '温和的呼吁（"不妨试试..."）'
    ],
    sentenceStyle: '中等长度，偶尔用诗意的短句强调',
    avoid: ['过于学术的术语', '激进的爆款观点', '数据密集的段落'],
    temperature: 0.85,
    maxTokens: 2500,
  },

  lifeReflection: {
    name: '人生思考+实用智慧',
    nameEn: 'Life Reflection',
    description: '像有书那样提供人生思考+读书方法论+稳定输出',
    tone: '冷静、鼓励、略带说教但友好；像"靠谱前辈/班主任"',
    structure: {
      opening: '开头（2-3句）：明确论点（"这篇只讲三件事"）',
      body: '中段（3小标题）：\n- "问题—原因—方法"路径非常明显\n- 列表、步骤和要点突出\n- 简单逻辑+日常例子；偶尔轻量级研究引用',
      ending: '结尾：3条建议（行动导向）'
    },
    rhetoricalDevices: [
      '清晰的论点',
      '结构化的步骤',
      '可执行的建议'
    ],
    sentenceStyle: '短到中等长度，非常易读；最少隐喻',
    avoid: ['太多情绪化写作', '太多情节式场景'],
    temperature: 0.75,
    maxTokens: 2200,
  },

  contrarian: {
    name: '反直觉评论+犀利逻辑',
    nameEn: 'Contrarian',
    description: '像远方青木那样观点尖锐、反直觉、逻辑推进强',
    tone: '自信、直接、偶尔讽刺；有冲击力；较少"共情"，更多"拆解"',
    structure: {
      opening: '开头（2-3句）：非常明确的立场；然后构建多步骤论证',
      body: '中段（3小标题）：\n- 使用"If...then..."推理\n- 强转折："关键在于... / 真正的问题是... / 所以..."\n- 例子、激励、博弈论式解释；有时数字（轻量）',
      ending: '结尾：3条建议/问题（挑战性思考）'
    },
    rhetoricalDevices: [
      '清晰的立场',
      '逻辑链条',
      '反直觉观点'
    ],
    sentenceStyle: '短句强调+长推理段落的混合',
    avoid: ['过于软的语言', '太多抒情隐喻'],
    temperature: 0.8,
    maxTokens: 2300,
  },

  education: {
    name: '教育/写作/互联网观察',
    nameEn: 'Education',
    description: '像玉树芝兰那样提供框架和可教方法；思考但实用',
    tone: '理性、反思、偶尔个人经验；较少煽情、更多"方法论+观察"',
    structure: {
      opening: '开头（2-3句）：概念定义前置',
      body: '中段（3小标题）：\n- 清晰的模型（如2×2、三层、流程）\n- 使用写作/教学/在线平台的例子\n- 案例片段+原则；有时引用认知/学习理念（轻量）',
      ending: '结尾：3条建议（方法论导向）'
    },
    rhetoricalDevices: [
      '概念定义',
      '结构化模型',
      '可教的方法'
    ],
    sentenceStyle: '清晰、适度正式；欢迎标题和要点',
    avoid: ['标题党', '过于绝对的声明'],
    temperature: 0.75,
    maxTokens: 2400,
  },

  science: {
    name: '科学解释+怀疑思维',
    nameEn: 'Science',
    description: '像果壳那样让复杂话题易懂；纠正误解',
    tone: '好奇、精确、有趣但严谨；尊重证据；避免耸人听闻',
    structure: {
      opening: '开头（2-3句）：定义术语；解释机制',
      body: '中段（3小标题）：\n- 区分"我们知道什么"vs"什么不确定"\n- 辟谣部分常见\n- 研究/共识总结、注意事项、"我们如何知道这个"',
      ending: '结尾：3条建议/问题（批判性思考）'
    },
    rhetoricalDevices: [
      '机制解释',
      '证据评估',
      '误区澄清'
    ],
    sentenceStyle: '清晰、解释性；谨慎使用类比',
    avoid: ['过度自信的确定性', '道德化', '过度简化的声明'],
    temperature: 0.7,
    maxTokens: 2500,
  },
};

/**
 * Get the system prompt for a specific style
 */
export function getStyleSystemPrompt(style: StyleArchetype): string {
  const config = styleArchetypes[style];
  
  return `You are an expert writer and analyst writing for a Chinese-speaking audience, following the "${config.name}" style.

**Core Goal**: ${styleArchetypes[style].description}

**Tone**: ${config.tone}

**Structure Requirements**:
${config.structure.opening}

${config.structure.body}

${config.structure.ending}

**Rhetorical Devices to Use**:
${config.rhetoricalDevices.map(d => `- ${d}`).join('\n')}

**Sentence Style**: ${config.sentenceStyle}

**What to Avoid**:
${config.avoid.map(a => `- ${a}`).join('\n')}

**Important Guidelines**:
- Write naturally in Simplified Chinese
- Use evidence and examples to support your points
- Always include boundaries/limitations for your arguments
- End with exactly 3 actionable suggestions or thought-provoking questions
- Make the content engaging and less robotic
- Vary sentence length for rhythm
- Use transitions naturally ("后来我发现...", "其实...", "你有没有...")`;
}

/**
 * Get the user prompt template for a specific style
 */
export function getStyleUserPrompt(chineseTranslation: string, style: StyleArchetype): string {
  const config = styleArchetypes[style];
  
  const basePrompt = `Based on the following translated article, write an insightful interpretation following the "${config.name}" style.

**Article to analyze:**
${chineseTranslation}

**Your task:**
1. Write an engaging opening (2-3 sentences) that hooks the reader
2. Develop 3 main sections with clear subheadings, each containing:
   - A clear viewpoint
   - Supporting evidence (examples, scenarios, or logical reasoning)
   - Boundaries/limitations (when this doesn't apply)
3. End with exactly 3 actionable suggestions or thought-provoking questions

**Remember:**
- Write in a natural, engaging style - avoid robotic or formulaic language
- Use the rhetorical devices and sentence style specified for this archetype
- Make it feel like a thoughtful human wrote this, not an AI
- Vary your language and structure throughout`;

  return basePrompt;
}

/**
 * Get default style (can be made user-configurable later)
 */
export function getDefaultStyle(): StyleArchetype {
  return 'warmBookish';
}

