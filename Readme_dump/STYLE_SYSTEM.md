# Writing Style System Documentation

## Overview

The app now supports 5 distinct writing style archetypes for insight generation, making the output more natural, engaging, and less robotic. Each style is inspired by popular Chinese content platforms and produces content that feels human-written.

## Implementation

### Files Created/Modified

1. **`lib/prompt-styles.ts`** (NEW)
   - Defines 5 style archetypes with complete configurations
   - Provides functions to generate style-aware prompts
   - Exports types and constants for use throughout the app

2. **`lib/openai.ts`** (MODIFIED)
   - Updated `generateInsights()` to accept optional `style` parameter
   - Uses style-specific prompts, temperature, and token limits
   - Defaults to "warmBookish" if no style specified

3. **`app/api/process-article/route.ts`** (MODIFIED)
   - Accepts `style` parameter in request body
   - Passes style to `generateInsights()` function
   - Returns selected style in response

4. **`components/ArticleProcessor.tsx`** (MODIFIED)
   - Added style selector dropdown in the form
   - Shows style description to help users choose
   - Sends selected style to API

5. **`Readme_dump/PRD + Tech Spec.md`** (MODIFIED)
   - Added comprehensive documentation about the style system
   - Updated API documentation with style parameter
   - Added style system to development notes

## Available Styles

### 1. 温暖书卷风 (Warm Bookish) - Default
- **Inspired by**: 十点读书
- **Best for**: Emotional, reflective content; personal growth articles
- **Temperature**: 0.85
- **Max Tokens**: 2500

### 2. 人生思考+实用智慧 (Life Reflection)
- **Inspired by**: 有书
- **Best for**: Practical life lessons; actionable advice
- **Temperature**: 0.75
- **Max Tokens**: 2200

### 3. 反直觉评论+犀利逻辑 (Contrarian)
- **Inspired by**: 远方青木
- **Best for**: Challenging conventional wisdom; logical analysis
- **Temperature**: 0.8
- **Max Tokens**: 2300

### 4. 教育/写作/互联网观察 (Education)
- **Inspired by**: 玉树芝兰
- **Best for**: Methodological content; frameworks and models
- **Temperature**: 0.75
- **Max Tokens**: 2400

### 5. 科学解释+怀疑思维 (Science)
- **Inspired by**: 果壳
- **Best for**: Scientific explanations; myth-busting
- **Temperature**: 0.7
- **Max Tokens**: 2500

## Usage

### For Users

1. Select your preferred writing style from the dropdown
2. Process your article as usual
3. The insights will be generated in the selected style

### For Developers

```typescript
import { generateInsights } from '@/lib/openai';
import { StyleArchetype } from '@/lib/prompt-styles';

// Use default style
const insights = await generateInsights(translation);

// Use specific style
const insights = await generateInsights(translation, 'contrarian');
```

## Adding New Styles

To add a new style:

1. Add the style key to `StyleArchetype` type in `lib/prompt-styles.ts`
2. Add the style configuration to `styleArchetypes` object
3. Update the Zod schema in `app/api/process-article/route.ts` if needed
4. The UI will automatically pick up the new style

## Technical Details

- Each style has its own temperature setting (0.7-0.85) for optimal creativity
- Token limits vary by style (2200-2500) based on expected output length
- System prompts are dynamically generated from style configurations
- User prompts include style-specific instructions and examples
- All styles enforce: evidence + boundaries, 3 actionable suggestions, natural writing

## Benefits

1. **Less Robotic**: Content feels more human-written
2. **Engaging**: Different styles appeal to different readers
3. **Flexible**: Easy to add new styles or modify existing ones
4. **Consistent**: Each style follows clear guidelines
5. **Natural**: Uses rhetorical devices and sentence variety

## Future Enhancements

- User preference storage (remember last selected style)
- Style preview/examples
- Custom style creation
- Style recommendations based on article topic
- A/B testing different styles

