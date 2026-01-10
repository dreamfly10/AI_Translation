'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';

interface VoiceProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileCreated?: () => void;
}

interface VoiceProfile {
  id: string;
  name: string;
  styleRules?: any;
  sampleCount: number;
}

export function VoiceProfileModal({ isOpen, onClose, onProfileCreated }: VoiceProfileModalProps) {
  const { data: session } = useSession();
  const { t, language } = useLanguage();
  const [step, setStep] = useState<'name' | 'samples' | 'extracting' | 'review'>('name');
  const [profileName, setProfileName] = useState('');
  const [profileType, setProfileType] = useState<'samples' | 'prompt' | 'both'>('samples');
  const [samples, setSamples] = useState<string[]>(['']);
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedRules, setExtractedRules] = useState<any>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setStep('name');
      setProfileName('');
      setProfileType('samples');
      setSamples(['']);
      setCustomPrompt('');
      setError(null);
      setExtractedRules(null);
      setProfileId(null);
    }
  }, [isOpen]);

  const handleAddMoreSamples = () => {
    setSamples([...samples, '']);
  };

  const handleRemoveSample = (index: number) => {
    if (samples.length > 1) {
      const newSamples = samples.filter((_, i) => i !== index);
      setSamples(newSamples);
    }
  };

  const handleNext = () => {
    if (step === 'name') {
      if (!profileName.trim()) {
        setError('Please enter a name for your voice profile');
        return;
      }
      setStep('samples');
      setError(null);
    } else if (step === 'samples') {
      // Validate based on profile type
      if (profileType === 'prompt') {
        // For prompt-only, require custom prompt
        if (!customPrompt.trim()) {
          setError(language === 'en' 
            ? 'Please provide a custom prompt' 
            : '请提供自定义提示');
          return;
        }
        // Create profile with custom prompt only
        createProfileWithPrompt();
      } else if (profileType === 'samples') {
        // For samples-only, require at least one sample
        const validSamples = samples.filter(s => s.trim().length > 0);
        if (validSamples.length === 0) {
          setError(language === 'en' 
            ? 'Please provide at least one writing sample' 
            : '请提供至少一个写作样本');
          return;
        }
        if (validSamples.length > 10) {
          setError(language === 'en' 
            ? 'Maximum 10 samples allowed' 
            : '最多允许 10 个样本');
          return;
        }
        // Create profile and extract style
        createProfileAndExtractStyle(validSamples);
      } else if (profileType === 'both') {
        // For both, require at least one sample and custom prompt
        const validSamples = samples.filter(s => s.trim().length > 0);
        if (validSamples.length === 0) {
          setError(language === 'en' 
            ? 'Please provide at least one writing sample' 
            : '请提供至少一个写作样本');
          return;
        }
        if (!customPrompt.trim()) {
          setError(language === 'en' 
            ? 'Please provide a custom prompt' 
            : '请提供自定义提示');
          return;
        }
        if (validSamples.length > 10) {
          setError(language === 'en' 
            ? 'Maximum 10 samples allowed' 
            : '最多允许 10 个样本');
          return;
        }
        // Create profile with both samples and prompt
        createProfileWithBoth(validSamples);
      }
    }
  };

  const createProfileAndExtractStyle = async (validSamples: string[]) => {
    setLoading(true);
    setError(null);
    setStep('extracting');

    try {
      // Create voice profile with samples only
      const createResponse = await fetch('/api/voice-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName,
          samples: validSamples,
          profileType: 'samples',
        }),
      });

      if (!createResponse.ok) {
        const data = await createResponse.json();
        throw new Error(data.userMessage || data.message || 'Failed to create voice profile');
      }

      const { profile } = await createResponse.json();
      setProfileId(profile.id);

      // Extract style rules
      const extractResponse = await fetch(`/api/voice-profiles/${profile.id}/extract-style`, {
        method: 'POST',
      });

      if (!extractResponse.ok) {
        const data = await extractResponse.json();
        throw new Error(data.userMessage || data.message || 'Failed to extract style rules');
      }

      const { styleRules } = await extractResponse.json();
      setExtractedRules(styleRules);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create voice profile');
      setStep('samples');
    } finally {
      setLoading(false);
    }
  };

  const createProfileWithPrompt = async () => {
    setLoading(true);
    setError(null);
    setStep('extracting');

    try {
      // Create voice profile with custom prompt only
      const createResponse = await fetch('/api/voice-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName,
          customPrompt: customPrompt.trim(),
          profileType: 'prompt',
        }),
      });

      if (!createResponse.ok) {
        const data = await createResponse.json();
        throw new Error(data.userMessage || data.message || 'Failed to create voice profile');
      }

      const { profile } = await createResponse.json();
      setProfileId(profile.id);
      setExtractedRules(null); // No style rules for prompt-only
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create voice profile');
      setStep('samples');
    } finally {
      setLoading(false);
    }
  };

  const createProfileWithBoth = async (validSamples: string[]) => {
    setLoading(true);
    setError(null);
    setStep('extracting');

    try {
      // Create voice profile with both samples and prompt
      const createResponse = await fetch('/api/voice-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName,
          samples: validSamples,
          customPrompt: customPrompt.trim(),
          profileType: 'both',
        }),
      });

      if (!createResponse.ok) {
        const data = await createResponse.json();
        throw new Error(data.userMessage || data.message || 'Failed to create voice profile');
      }

      const { profile } = await createResponse.json();
      setProfileId(profile.id);

      // Extract style rules (will be combined with custom prompt)
      const extractResponse = await fetch(`/api/voice-profiles/${profile.id}/extract-style`, {
        method: 'POST',
      });

      if (!extractResponse.ok) {
        const data = await extractResponse.json();
        throw new Error(data.userMessage || data.message || 'Failed to extract style rules');
      }

      const { styleRules } = await extractResponse.json();
      setExtractedRules(styleRules);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create voice profile');
      setStep('samples');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('voiceProfileUpdated'));
    
    if (onProfileCreated) {
      onProfileCreated();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '2rem',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 'var(--spacing-md)',
            right: 'var(--spacing-md)',
            background: 'transparent',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: 'var(--color-text-secondary)',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-sm)',
            transition: 'background var(--transition-base)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-background-secondary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          ×
        </button>

        <div style={{ padding: 'var(--spacing-xl)' }}>
          <h2 style={{ margin: '0 0 var(--spacing-lg) 0', color: 'var(--color-text-primary)' }}>
            {language === 'en' ? 'Create Profile' : '创建配置文件'}
          </h2>

          {error && (
            <div style={{
              padding: 'var(--spacing-md)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--color-error)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--spacing-lg)',
              border: '1px solid var(--color-error)',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          {step === 'name' && (
            <div>
              <label style={{
                display: 'block',
                marginBottom: 'var(--spacing-sm)',
                fontWeight: 500,
                color: 'var(--color-text-primary)'
              }}>
                {language === 'en' ? 'Profile Name' : '配置文件名称'}
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder={language === 'en' ? 'e.g., My Blog Voice' : '例如：我的博客风格'}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-md)',
                  background: 'var(--color-background-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-primary)',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                  marginBottom: 'var(--spacing-lg)'
                }}
              />
              <div style={{
                padding: 'var(--spacing-md)',
                background: 'var(--color-background-secondary)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--spacing-lg)'
              }}>
                {language === 'en' 
                  ? 'Give your profile a name to identify it later (e.g., "My Blog Voice", "Professional Writing").'
                  : '为您的配置文件命名，以便稍后识别（例如："我的博客风格"、"专业写作"）。'}
              </div>
              <button
                onClick={handleNext}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-md)',
                  background: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '1rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                {language === 'en' ? 'Next' : '下一步'}
              </button>
            </div>
          )}

          {step === 'samples' && (
            <div>
              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <label style={{
                  display: 'block',
                  marginBottom: 'var(--spacing-sm)',
                  fontWeight: 500,
                  color: 'var(--color-text-primary)'
                }}>
                  {language === 'en' ? 'Profile Type' : '配置文件类型'}
                </label>
                <select
                  value={profileType}
                  onChange={(e) => setProfileType(e.target.value as 'samples' | 'prompt' | 'both')}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-md)',
                    background: 'var(--color-background-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text-primary)',
                    fontSize: '1rem',
                    marginBottom: 'var(--spacing-md)',
                    cursor: 'pointer'
                  }}
                >
                  <option value="samples">
                    {language === 'en' ? 'Writing Samples (extract style from samples)' : '写作样本（从样本提取风格）'}
                  </option>
                  <option value="prompt">
                    {language === 'en' ? 'Custom Prompt (direct instructions)' : '自定义提示（直接指令）'}
                  </option>
                  <option value="both">
                    {language === 'en' ? 'Both (samples + custom prompt)' : '两者（样本 + 自定义提示）'}
                  </option>
                </select>
              </div>

              {(profileType === 'samples' || profileType === 'both') && (
                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: 'var(--spacing-sm)',
                    fontWeight: 500,
                    color: 'var(--color-text-primary)'
                  }}>
                    {language === 'en' ? 'Writing Samples' : '写作样本'}
                  </label>
                  <div style={{
                    padding: 'var(--spacing-md)',
                    background: 'var(--color-background-secondary)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    color: 'var(--color-text-secondary)',
                    marginBottom: 'var(--spacing-md)'
                  }}>
                    {language === 'en'
                      ? 'You can add multiple samples to help Expression Copilot learn your style better.'
                      : '您可以添加多个样本来帮助 Expression Copilot 更好地学习您的风格。'}
                  </div>
                </div>
              )}

              {(profileType === 'prompt' || profileType === 'both') && (
                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: 'var(--spacing-sm)',
                    fontWeight: 500,
                    color: 'var(--color-text-primary)'
                  }}>
                    {language === 'en' ? 'Custom Prompt / Instructions' : '自定义提示 / 指令'}
                  </label>
                  <div style={{
                    padding: 'var(--spacing-md)',
                    background: 'var(--color-background-secondary)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    color: 'var(--color-text-secondary)',
                    marginBottom: 'var(--spacing-md)'
                  }}>
                    {language === 'en'
                      ? 'Enter your custom instructions for how you want ideas to be explained and written. This will be used directly when generating insights.'
                      : '输入您希望如何解释和写作想法的自定义说明。这将在生成见解时直接使用。'}
                  </div>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder={language === 'en'
                      ? 'Example: Write in a conversational, warm tone. Use short paragraphs and questions to engage readers. Avoid jargon and overly formal language. Focus on practical examples and real-world applications...'
                      : '示例：以对话、温暖的语调写作。使用短段落和问题吸引读者。避免行话和过于正式的语言。专注于实际例子和现实应用...'}
                    style={{
                      width: '100%',
                      minHeight: '200px',
                      padding: 'var(--spacing-md)',
                      background: 'var(--color-background-secondary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-text-primary)',
                      fontSize: '0.875rem',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      marginBottom: 'var(--spacing-md)'
                    }}
                  />
                </div>
              )}

              {(profileType === 'samples' || profileType === 'both') && samples.map((sample, index) => (
                <div key={index} style={{ marginBottom: 'var(--spacing-md)' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 'var(--spacing-xs)'
                  }}>
                    <label style={{
                      fontSize: '0.875rem',
                      color: 'var(--color-text-secondary)'
                    }}>
                      {language === 'en' ? `Sample ${index + 1}` : `样本 ${index + 1}`}
                    </label>
                    {samples.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSample(index)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-error)',
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                          padding: 'var(--spacing-xs)',
                          borderRadius: 'var(--radius-sm)',
                          transition: 'background var(--transition-base)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        {language === 'en' ? 'Remove' : '删除'}
                      </button>
                    )}
                  </div>
                  <textarea
                    value={sample}
                    onChange={(e) => {
                      const newSamples = [...samples];
                      newSamples[index] = e.target.value;
                      setSamples(newSamples);
                    }}
                    placeholder={language === 'en' 
                      ? 'Paste your writing sample here...'
                      : '在此粘贴您的写作样本...'}
                    style={{
                      width: '100%',
                      minHeight: '120px',
                      padding: 'var(--spacing-md)',
                      background: 'var(--color-background-secondary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-text-primary)',
                      fontSize: '0.875rem',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              ))}

              {(profileType === 'samples' || profileType === 'both') && (
                <button
                  type="button"
                  onClick={handleAddMoreSamples}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-md)',
                    background: 'transparent',
                    border: '1px dashed var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text-secondary)',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    marginBottom: 'var(--spacing-md)',
                    transition: 'all var(--transition-base)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-background-secondary)';
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                    e.currentTarget.style.color = 'var(--color-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.color = 'var(--color-text-secondary)';
                  }}
                >
                  + {language === 'en' ? 'Add More Samples' : '添加更多样本'}
                </button>
              )}

              <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
                <button
                  onClick={() => setStep('name')}
                  className="outline"
                  style={{
                    flex: 1,
                    padding: 'var(--spacing-md)',
                    fontSize: '1rem',
                    fontWeight: 500
                  }}
                >
                  {language === 'en' ? 'Back' : '返回'}
                </button>
                <button
                  onClick={handleNext}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: 'var(--spacing-md)',
                    background: loading ? 'var(--color-background-secondary)' : 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '1rem',
                    fontWeight: 500,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {loading 
                    ? (language === 'en' ? 'Processing...' : '处理中...')
                    : (language === 'en' ? 'Create Profile' : '创建配置文件')}
                </button>
              </div>
            </div>
          )}

          {step === 'extracting' && (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl) 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-lg)' }}>✨</div>
              <h3 style={{ margin: '0 0 var(--spacing-md) 0', color: 'var(--color-text-primary)' }}>
                {profileType === 'prompt' 
                  ? (language === 'en' ? 'Creating Your Profile...' : '正在创建您的配置文件...')
                  : (language === 'en' ? 'Analyzing Your Writing Style...' : '正在分析您的写作风格...')}
              </h3>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                {profileType === 'prompt'
                  ? (language === 'en' 
                      ? 'Your profile is being created with your custom prompt.'
                      : '正在使用您的自定义提示创建配置文件。')
                  : (language === 'en' 
                      ? 'This may take a few moments. We\'re extracting your unique voice characteristics.'
                      : '这可能需要几分钟。我们正在提取您独特的语音特征。')}
              </p>
            </div>
          )}

          {step === 'review' && (
            <div>
              <div style={{
                padding: 'var(--spacing-md)',
                background: 'rgba(16, 185, 129, 0.1)',
                color: 'var(--color-success)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--spacing-lg)',
                border: '1px solid var(--color-success)',
                fontSize: '0.875rem'
              }}>
                ✅ {language === 'en' ? 'Voice profile created successfully!' : '语音配置文件创建成功！'}
              </div>

              {extractedRules && (profileType === 'samples' || profileType === 'both') && (
                <>
                  <h3 style={{ margin: '0 0 var(--spacing-md) 0', color: 'var(--color-text-primary)' }}>
                    {language === 'en' ? 'Extracted Style Rules' : '提取的风格规则'}
                  </h3>

                  <div style={{
                    padding: 'var(--spacing-md)',
                    background: 'var(--color-background-secondary)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--spacing-lg)',
                    fontSize: '0.875rem',
                    color: 'var(--color-text-secondary)',
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}>
                    <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                      <strong style={{ color: 'var(--color-text-primary)' }}>Tone:</strong> {extractedRules.tone || 'N/A'}
                    </div>
                    <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                      <strong style={{ color: 'var(--color-text-primary)' }}>Sentence Patterns:</strong> {extractedRules.sentencePatterns || 'N/A'}
                    </div>
                    {extractedRules.avoid && extractedRules.avoid.length > 0 && (
                      <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                        <strong style={{ color: 'var(--color-text-primary)' }}>Things to Avoid:</strong>
                        <ul style={{ margin: 'var(--spacing-xs) 0', paddingLeft: 'var(--spacing-lg)' }}>
                          {extractedRules.avoid.map((item: string, i: number) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              )}

              {profileType === 'prompt' && (
                <div style={{
                  padding: 'var(--spacing-md)',
                  background: 'var(--color-background-secondary)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--spacing-lg)',
                  fontSize: '0.875rem',
                  color: 'var(--color-text-secondary)'
                }}>
                  <strong style={{ color: 'var(--color-text-primary)' }}>
                    {language === 'en' ? 'Custom Prompt Profile' : '自定义提示配置文件'}
                  </strong>
                  <p style={{ marginTop: 'var(--spacing-sm)', whiteSpace: 'pre-wrap' }}>
                    {language === 'en' 
                      ? 'Your profile uses your custom prompt directly. Style extraction is not needed.'
                      : '您的配置文件直接使用您的自定义提示。不需要风格提取。'}
                  </p>
                </div>
              )}

              <button
                onClick={handleFinish}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-md)',
                  background: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '1rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                {language === 'en' ? 'Done' : '完成'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

