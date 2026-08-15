// src/components/AdminVerificationPanel.tsx
import React, { useEffect, useState } from 'react';
import { db } from '../services/firebaseConfig';
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { verifyProperty, markUserAsVerifiedSeller } from '../services/propertyService';
import { useToast } from '../context/ToastContext';

export interface VerificationRecord {
  id: string;
  userId: string;
  propertyId?: string;
  titleNumber: string;
  documentUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: any;
}

export const AdminVerificationPanel: React.FC = () => {
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    setError('');

    const q = query(collection(db, 'verifications'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: VerificationRecord[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<VerificationRecord, 'id'>),
        }));
        setVerifications(data);
        setLoading(false);
      },
      (err: any) => {
        console.error('Error in verification stream:', err);
        setError(
          'Failed to load real-time verification queue. If you were just granted admin access, try logging out and back in.'
        );
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (
    verification: VerificationRecord,
    newStatus: 'approved' | 'rejected'
  ) => {
    if (newStatus === 'rejected') {
      const confirmed = window.confirm(
        `Reject title "${verification.titleNumber}"? The user will be able to resubmit.`
      );
      if (!confirmed) return;
    }

    try {
      setProcessingId(verification.id);

      const verRef = doc(db, 'verifications', verification.id);
      await updateDoc(verRef, { status: newStatus });

      if (newStatus === 'approved') {
        if (verification.propertyId) {
          await verifyProperty(verification.propertyId, true);
        }
        await markUserAsVerifiedSeller(verification.userId, true);
        toast.success(
          'Title Approved',
          `Title ${verification.titleNumber} approved. Property verified & seller marked as trusted.`
        );
      } else {
        toast.info(
          'Title Rejected',
          `Title ${verification.titleNumber} marked as rejected. User can resubmit.`
        );
      }

      // No manual state update needed — onSnapshot will push the change.
    } catch (err: any) {
      console.error(`Error marking verification as ${newStatus}:`, err);
      toast.error(
        'Action Failed',
        err.message || 'Permission denied. Could not update verification status.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 my-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">Admin Title Verification Console</h2>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs text-emerald-600 font-semibold tracking-wide uppercase">Live</span>
          </div>
          <p className="text-xs text-gray-500">Real-time stream of incoming land title verification requests.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm text-center">
          {error}
        </div>
      ) : verifications.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm border border-dashed border-gray-200 rounded-lg">
          No title verification submissions found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Title #</th>
                <th className="px-4 py-3">User ID</th>
                <th className="px-4 py-3">Linked Property</th>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {verifications.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-800">{item.titleNumber}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono truncate max-w-[120px]">
                    {item.userId}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {item.propertyId ? (
                      <span className="font-mono truncate max-w-[100px] inline-block">{item.propertyId}</span>
                    ) : (
                      <span className="italic text-gray-400">General (account)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={item.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 hover:underline font-medium text-xs inline-flex items-center gap-1"
                    >
                      📄 View Title File
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${
                        item.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.status === 'pending' ? (
                      <div className="flex justify-end gap-2">
                        <button
                          disabled={processingId === item.id}
                          onClick={() => handleUpdateStatus(item, 'approved')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-xs font-semibold disabled:opacity-50 transition shadow-sm cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          disabled={processingId === item.id}
                          onClick={() => handleUpdateStatus(item, 'rejected')}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-semibold disabled:opacity-50 transition shadow-sm cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Locked</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminVerificationPanel;
