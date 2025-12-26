'use client';

import { useState } from 'react';

interface SupportFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupportForm({ isOpen, onClose }: SupportFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
  }>({});

  if (!isOpen) return null;

  // Email validation function
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Count words in a string
  const countWords = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setValidationErrors({});

    // Client-side validation
    const errors: typeof validationErrors = {};
    let hasErrors = false;

    // Validate name
    if (!formData.name.trim()) {
      errors.name = 'Required';
      hasErrors = true;
    }

    // Validate email
    if (!formData.email.trim()) {
      errors.email = 'Required';
      hasErrors = true;
    } else if (!isValidEmail(formData.email)) {
      errors.email = 'Invalid email address';
      hasErrors = true;
    }

    // Validate subject
    if (!formData.subject.trim()) {
      errors.subject = 'Required';
      hasErrors = true;
    }

    // Validate message - minimum 10 words
    const wordCount = countWords(formData.message);
    if (!formData.message.trim()) {
      errors.message = 'Required';
      hasErrors = true;
    } else if (wordCount < 10) {
      errors.message = 'Message must contain at least 10 words';
      hasErrors = true;
    }

    if (hasErrors) {
      setValidationErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        // Use the detailed message if available, otherwise fall back to error
        const errorMessage = data.message || data.error || 'Failed to send message';
        throw new Error(errorMessage);
      }

      setSuccess(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
      setValidationErrors({});
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: 'var(--spacing-lg)',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
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

        <h2 style={{ marginBottom: 'var(--spacing-lg)', paddingRight: 'var(--spacing-xl)' }}>Contact Support</h2>

        {success && (
          <div style={{
            padding: 'var(--spacing-md)',
            background: 'rgba(16, 185, 129, 0.1)',
            color: 'var(--color-success)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--spacing-lg)',
            border: '1px solid var(--color-success)',
          }}>
            ✅ Message sent successfully! We'll get back to you soon.
          </div>
        )}

        {error && (
          <div style={{
            padding: 'var(--spacing-md)',
            background: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--color-error)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--spacing-lg)',
            border: '1px solid var(--color-error)',
          }}>
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <input
              type="text"
              placeholder="Your Name"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (validationErrors.name) setValidationErrors({ ...validationErrors, name: undefined });
              }}
              style={{ marginBottom: validationErrors.name ? '0.25rem' : '0' }}
              disabled={loading}
            />
            {validationErrors.name && (
              <div style={{ color: 'var(--color-error)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {validationErrors.name}
              </div>
            )}
          </div>
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <input
              type="email"
              placeholder="Your Email"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (validationErrors.email) setValidationErrors({ ...validationErrors, email: undefined });
              }}
              style={{ marginBottom: validationErrors.email ? '0.25rem' : '0' }}
              disabled={loading}
            />
            {validationErrors.email && (
              <div style={{ color: 'var(--color-error)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {validationErrors.email}
              </div>
            )}
          </div>
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <input
              type="text"
              placeholder="Subject"
              value={formData.subject}
              onChange={(e) => {
                setFormData({ ...formData, subject: e.target.value });
                if (validationErrors.subject) setValidationErrors({ ...validationErrors, subject: undefined });
              }}
              style={{ marginBottom: validationErrors.subject ? '0.25rem' : '0' }}
              disabled={loading}
            />
            {validationErrors.subject && (
              <div style={{ color: 'var(--color-error)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {validationErrors.subject}
              </div>
            )}
          </div>
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <textarea
              placeholder="Your Message (minimum 10 words)"
              value={formData.message}
              onChange={(e) => {
                setFormData({ ...formData, message: e.target.value });
                if (validationErrors.message) setValidationErrors({ ...validationErrors, message: undefined });
              }}
              rows={6}
              style={{ marginBottom: validationErrors.message ? '0.25rem' : '0' }}
              disabled={loading}
            />
            {validationErrors.message && (
              <div style={{ color: 'var(--color-error)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {validationErrors.message}
              </div>
            )}
            {!validationErrors.message && formData.message && (
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {countWords(formData.message)} word{countWords(formData.message) !== 1 ? 's' : ''} (minimum 10 words required)
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'flex-end' }}>
            <button 
              type="button" 
              className="outline" 
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="button primary"
            >
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

