// src/components/FormWithToasts.tsx
import React, { useState } from 'react';
import { Toast, ToastType } from './Toast';

interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message: string;
}

export const FormWithToasts: React.FC = () => {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addToast = (type: ToastType, title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Example API Trigger: Successful Submission
  const handleSubmitSuccess = async () => {
    setIsSubmitting(true);
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSubmitting(false);

    addToast(
      'success',
      'Submission Successful',
      'Your request has been verified and recorded.'
    );
  };

  // Example API Trigger: Failed Verification
  const handleVerificationFailure = async () => {
    setIsSubmitting(true);
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSubmitting(false);

    addToast(
      'error',
      'Verification Failed',
      'We could not verify the provided details. Please check your inputs and try again.'
    );
  };

  return (
    <div className="p-8 max-w-md mx-auto space-y-4">
      {/* Toast Container Floating Top-Right */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-auto">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            type={toast.type}
            title={toast.title}
            message={toast.message}
            onClose={removeToast}
          />
        ))}
      </div>

      <div className="border rounded-xl p-6 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Actions</h2>
        
        <div className="flex flex-col gap-3">
          <button
            onClick={handleSubmitSuccess}
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm disabled:opacity-50 cursor-pointer"
          >
            Trigger Successful Submission
          </button>

          <button
            onClick={handleVerificationFailure}
            disabled={isSubmitting}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm disabled:opacity-50 cursor-pointer"
          >
            Trigger Failed Verification
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormWithToasts;
