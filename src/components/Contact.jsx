import React, { useState } from 'react';
import SectionContainer from './SectionContainer';
import Success from './Success';
import { toast } from 'sonner';
import { useLoadingStore } from '@/store/loading';
import FormErrorSummary from '@/components/forms/FormErrorSummary';
import { normalizeFormError, parseErrorResponse } from '@/lib/form-client';

const initialForm = { name: '', email: '', message: '' };

const sanitizeInput = (value) => value.replace(/[<>]/g, '').replace(/\s+/g, ' ').trimStart();

const Contact = () => {
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState(initialForm);
  const [formError, setFormError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const startGlobalLoading = useLoadingStore((state) => state.startLoading);
  const stopGlobalLoading = useLoadingStore((state) => state.stopLoading);

  const validateForm = ({ name, email, message }) => {
    const nextErrors = { ...initialForm };

    if (!/^[A-Za-z\s]{3,60}$/.test(name.trim())) {
      nextErrors.name = 'Enter a valid name (3-60 letters).';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (message.trim().length < 10 || message.trim().length > 800) {
      nextErrors.message = 'Message must be between 10 and 800 characters.';
    }

    return nextErrors;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: sanitizeInput(value) }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateForm(formData);
    setErrors(validationErrors);
    setFormError('');

    const hasErrors = Object.values(validationErrors).some(Boolean);
    if (hasErrors) {
      return;
    }

    setLoading(true);
    startGlobalLoading('Sending your message');
    try {
      const promise = fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      }).then(async (res) => {
        if (!res.ok) {
          throw await parseErrorResponse(res, 'Failed to send message');
        }
        const data = await res.json();
        return data;
      });

      toast.promise(promise, {
        loading: 'Sending message...',
        success: (data) => {
          if (data.success) return 'Message sent successfully!';
          throw new Error('Failed');
        },
        error: (error) => (error instanceof Error ? error.message : 'Failed to send message'),
      });

      const data = await promise;
      if (data.success) {
        setIsSubmitted(true);
        setFormData(initialForm);
      }
    } catch (submitError) {
      const nextError = normalizeFormError(submitError, 'Failed to send message');
      setFormError(nextError.formError);
      setErrors((prev) => ({
        ...prev,
        name: nextError.fieldErrors?.name?.[0] || prev.name,
        email: nextError.fieldErrors?.email?.[0] || prev.email,
        message: nextError.fieldErrors?.message?.[0] || prev.message,
      }));
    } finally {
      setLoading(false);
      stopGlobalLoading();
    }
  };

  return (
    <SectionContainer name="contact" title="Contact" subtitle="Let’s build something great together">
      <div className="mx-auto max-w-xl">
        {!isSubmitted ? (
          <form className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900" onSubmit={handleSubmit} noValidate>
            <FormErrorSummary error={formError} fieldErrors={{}} />
            <div>
              <input
                className="w-full rounded-lg border border-slate-300 bg-transparent px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-400 dark:border-slate-700 dark:text-slate-100"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your name"
                maxLength={60}
                required
              />
              {errors.name ? <p className="mt-1 text-sm text-red-500">{errors.name}</p> : null}
            </div>

            <div>
              <input
                className="w-full rounded-lg border border-slate-300 bg-transparent px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-400 dark:border-slate-700 dark:text-slate-100"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                maxLength={120}
                required
              />
              {errors.email ? <p className="mt-1 text-sm text-red-500">{errors.email}</p> : null}
            </div>

            <div>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={7}
                maxLength={800}
                placeholder="Tell me about your project..."
                className="w-full rounded-lg border border-slate-300 bg-transparent px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-400 dark:border-slate-700 dark:text-slate-100"
                required
              />
              {errors.message ? <p className="mt-1 text-sm text-red-500">{errors.message}</p> : null}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 px-6 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/30"
            >
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        ) : (
          <Success />
        )}
      </div>
    </SectionContainer>
  );
};

export default Contact;
