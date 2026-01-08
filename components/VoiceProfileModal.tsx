'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [samples, setSamples] = useState<string[]>(['', '', '']);
  const [fileUploads, setFileUploads] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedRules, setExtractedRules] = useState<any>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setStep('name');
      setProfileName('');
      setSamples(['', '', '']);
      setFileUploads([]);
      setError(null);
      setExtractedRules(null);
      setProfileId(null);
    }
  }, [isOpen]);

  const handleFileUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/voice-profiles/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to upload file');
      }

      const data = await response.json();
      return data.content;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to upload file');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const contents = await Promise.all(files.map(handleFileUpload));
      
      // Add to samples array, filling empty slots first
      const newSamples = [...samples];
      let sampleIndex = 0;
      
      for (const content of contents) {
        while (sampleIndex < newSamples.length && newSamples[sampleIndex].trim() !== '') {
          sampleIndex++;
        }
        if (sampleIndex < newSamples.length) {
          newSamples[sampleIndex] = content;
        } else {
          newSamples.push(content);
        }
        sampleIndex++;
      }
      
      setSamples(newSamples);
      setFileUploads([...fileUploads, ...files]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process files');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
      // Validate samples
      const validSamples = samples.filter(s => s.trim().length >= 200);
      if (validSamples.length < 3) {
        setError('Please provide at least 3 writing samples (200-800 words each)');
        return;
      }
      if (validSamples.length > 10) {
        setError('Maximum 10 samples allowed');
        return;
      }

      // Create profile and extract style
      createProfileAndExtractStyle(validSamples);
    }
  };

  const createProfileAndExtractStyle = async (validSamples: string[]) => {
    setLoading(true);
    setError(null);
    setStep('extracting');

    try {
      // Create voice profile
      const createResponse = await fetch('/api/voice-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName,
          samples: validSamples,
        }),
      });

      if (!createResponse.ok) {
        const data = await createResponse.json();
        throw new Error(data.message || 'Failed to create voice profile');
      }

      const { profile } = await createResponse.json();
      setProfileId(profile.id);

      // Extract style rules
      const extractResponse = await fetch(`/api/voice-profiles/${profile.id}/extract-style`, {
        method: 'POST',
      });

      if (!extractResponse.ok) {
        const data = await extractResponse.json();
        throw new Error(data.message || 'Failed to extract style rules');
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
            {language === 'en' ? 'Create Voice Profile' : '创建语音配置文件'}
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
                  ? 'Give your voice profile a name to identify it later (e.g., "My Blog Voice", "Professional Writing").'
                  : '为您的语音配置文件命名，以便稍后识别（例如："我的博客风格"、"专业写作"）。'}
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
                    ? 'Upload 3-10 pieces of your writing (200-800 words each). You can upload files or paste text directly.'
                    : '上传 3-10 篇您的写作样本（每篇 200-800 字）。您可以上传文件或直接粘贴文本。'}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.doc,.docx"
                  multiple
                  onChange={handleFileSelect}
                  style={{ marginBottom: 'var(--spacing-md)' }}
                />
              </div>

              {samples.map((sample, index) => (
                <div key={index} style={{ marginBottom: 'var(--spacing-md)' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: 'var(--spacing-xs)',
                    fontSize: '0.875rem',
                    color: 'var(--color-text-secondary)'
                  }}>
                    {language === 'en' ? `Sample ${index + 1}` : `样本 ${index + 1}`}
                    {sample.trim() && (
                      <span style={{ marginLeft: 'var(--spacing-xs)', color: 'var(--color-success)' }}>
                        ({sample.split(/\s+/).length} words)
                      </span>
                    )}
                  </label>
                  <textarea
                    value={sample}
                    onChange={(e) => {
                      const newSamples = [...samples];
                      newSamples[index] = e.target.value;
                      setSamples(newSamples);
                    }}
                    placeholder={language === 'en' 
                      ? 'Paste your writing sample here (200-800 words)...'
                      : '在此粘贴您的写作样本（200-800 字）...'}
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
                {language === 'en' ? 'Analyzing Your Writing Style...' : '正在分析您的写作风格...'}
              </h3>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                {language === 'en' 
                  ? 'This may take a few moments. We\'re extracting your unique voice characteristics.'
                  : '这可能需要几分钟。我们正在提取您独特的语音特征。'}
              </p>
            </div>
          )}

          {step === 'review' && extractedRules && (
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

