// src/components/LandTitleUploadModal.tsx
import React, { useState, useEffect } from 'react';
import { auth, db, storage } from '../firebaseConfig';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { getUserProperties, Property } from '../services/propertyService';
import { useToast } from '../context/ToastContext';

export interface LandTitleUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// 🇳🇬 Regex pattern for standard Nigerian C of O, Governor's Consent & Registry Numbers
// Examples: LA/CofO/2026/88910, COFO-12345-2024, IKJ/GC/2025/1029, LND/2026/00123
const NIGERIAN_TITLE_REGEX = /^(?:[A-Z]{2,4}\/(?:COFO|CofO|GC|SURV|REG)\/\d{4}\/\d{3,6}|COFO-\d{4,6}-\d{4}|[A-Z]{3,4}\/\d{4}\/\d{4,6})$/i;

export const LandTitleUploadModal: React.FC<LandTitleUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [titleNumber, setTitleNumber] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [userProperties, setUserProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const toast = useToast();

  useEffect(() => {
    if (!isOpen) return;
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setLoadingProperties(true);
    getUserProperties(currentUser.uid)
      .then(setUserProperties)
      .catch((err) => console.error('Failed to load properties for selector:', err))
      .finally(() => setLoadingProperties(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 15 * 1024 * 1024) {
        setErrorMessage('File size exceeds 15MB limit.');
        return;
      }
      setErrorMessage('');
      setFile(selectedFile);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setErrorMessage('You must be logged in to submit verification documents.');
      return;
    }
    if (!file) {
      setErrorMessage('Please select a valid PDF or image file.');
      return;
    }

    const formattedTitle = titleNumber.trim().toUpperCase();
    if (!NIGERIAN_TITLE_REGEX.test(formattedTitle)) {
      setErrorMessage(
        'Invalid land title format. Expected e.g. LA/CofO/2026/88910, COFO-12345-2024, or IKJ/GC/2025/1029.'
      );
      return;
    }

    setIsUploading(true);
    setErrorMessage('');

    const fileExtension = file.name.split('.').pop();
    const fileName = `title_${Date.now()}.${fileExtension}`;
    const storageRef = ref(storage, `titles/${currentUser.uid}/${fileName}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(Math.round(progress));
      },
      (error) => {
        console.error('Storage Upload Error:', error);
        setErrorMessage(
          error.code === 'storage/unauthorized'
            ? 'Upload not allowed. Your previous submission may already be approved.'
            : 'Upload failed. Check your connection and try again.'
        );
        setIsUploading(false);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          const verRef = await addDoc(collection(db, 'verifications'), {
            userId: currentUser.uid,
            titleNumber: formattedTitle,
            documentUrl: downloadURL,
            status: 'pending',
            ...(selectedPropertyId ? { propertyId: selectedPropertyId } : {}),
            createdAt: serverTimestamp(),
          });

          await updateDoc(doc(db, 'users', currentUser.uid), {
            currentVerificationId: verRef.id,
          });

          setIsUploading(false);
          toast.success(
            'Title Submitted Successfully',
            `Document ${formattedTitle} has been uploaded and queued for admin verification.`
          );
          if (onSuccess) onSuccess();
          onClose();
        } catch (err: any) {
          console.error('Verification record creation failed:', err);
          const errorMsg = 'File uploaded but the verification record could not be created. Please try again.';
          setErrorMessage(errorMsg);
          toast.error('Submission Failed', errorMsg);
          setIsUploading(false);
          try {
            await deleteObject(uploadTask.snapshot.ref);
          } catch (cleanupErr) {
            console.error('Failed to clean up orphaned file:', cleanupErr);
          }
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl my-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Upload Land Title Document</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl cursor-pointer">
            &times;
          </button>
        </div>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-4 text-xs">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Title / C of O Number *
            </label>
            <input
              type="text"
              required
              value={titleNumber}
              onChange={(e) => {
                setTitleNumber(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="e.g. LA/CofO/2026/88910"
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Supports C of O, Governor's Consent (GC), and State Registry reference numbers.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link to a Property (Optional)
            </label>
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              disabled={loadingProperties}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
            >
              <option value="">
                {loadingProperties ? 'Loading your properties...' : 'General account verification (no specific property)'}
              </option>
              {userProperties.map((p) => {
                const locText = typeof p.location === 'object' 
                  ? (p.location.address || p.location.area || 'Lagos') 
                  : p.location;
                return (
                  <option key={p.id} value={p.id}>
                    {p.title} — {locText}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document File (PDF or Image, max 15MB) *
            </label>
            <input
              type="file"
              accept="image/*,application/pdf"
              required
              onChange={handleFileChange}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
            />
          </div>

          {isUploading && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-600 h-2.5 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm cursor-pointer"
            >
              {isUploading ? `Uploading (${uploadProgress}%)` : 'Submit Title'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LandTitleUploadModal;
