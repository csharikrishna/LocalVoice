import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Loader2, CheckCircle2, Wrench, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Complaint } from '../../types';

export function MyReportsView() {
  const [reports, setReports] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMyReports() {
      try {
        const stored = localStorage.getItem('localVoice_my_reports');
        if (!stored) {
          setLoading(false);
          return;
        }

        const reportIds: string[] = JSON.parse(stored);
        if (!Array.isArray(reportIds) || reportIds.length === 0) {
          setLoading(false);
          return;
        }

        // Firestore 'in' query supports up to 30 items max
        const chunks = [];
        for (let i = 0; i < reportIds.length; i += 30) {
          chunks.push(reportIds.slice(i, i + 30));
        }

        let fetchedReports: Complaint[] = [];
        for (const chunk of chunks) {
          const q = query(collection(db, 'complaints'), where(documentId(), 'in', chunk));
          const snapshot = await getDocs(q);
          const chunkData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Complaint));
          fetchedReports = [...fetchedReports, ...chunkData];
        }

        // Sort newest first
        fetchedReports.sort((a, b) => {
          const tA = a.timestamp?.toMillis?.() || 0;
          const tB = b.timestamp?.toMillis?.() || 0;
          return tB - tA;
        });

        setReports(fetchedReports);

        // Check for recently resolved
        const hasResolved = fetchedReports.some(r => r.status === 'closed');
        if (hasResolved) {
          const confettiShown = sessionStorage.getItem('localVoice_confetti_shown');
          if (!confettiShown) {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#22c55e', '#3b82f6', '#f59e0b']
            });
            sessionStorage.setItem('localVoice_confetti_shown', 'true');
          }
        }
      } catch (err) {
        console.error("Failed to fetch my reports:", err);
        setError("Could not load your reports.");
      } finally {
        setLoading(false);
      }
    }

    fetchMyReports();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-8 text-center bg-red-50 rounded-xl">{error}</div>;
  }

  if (reports.length === 0) {
    return (
      <div className="text-center p-12 bg-gray-50 rounded-2xl border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-700">No Reports Yet</h3>
        <p className="text-gray-500 mt-2 text-sm">
          Reports you submit on this device will appear here so you can securely track their status.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <div key={report.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {report.category}
                </span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
                  {report.token || report.id.slice(0, 6)}
                </span>
              </div>
              <p className="text-gray-900 font-medium line-clamp-2 text-sm mt-1">{report.description}</p>
              <p className="text-xs text-gray-500 mt-2 truncate max-w-xs" title={report.location}>
                {report.location}
              </p>
            </div>

            <div className="flex-shrink-0">
              {report.status === 'open' && (
                <div className="flex flex-col items-center gap-1 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  <AlertCircle size={18} />
                  <span className="text-[10px] font-bold uppercase">Pending</span>
                </div>
              )}
              {report.status === 'working' && (
                <div className="flex flex-col items-center gap-1 text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                  <Wrench size={18} />
                  <span className="text-[10px] font-bold uppercase">Working</span>
                </div>
              )}
              {report.status === 'closed' && (
                <div className="flex flex-col items-center gap-1 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg ring-1 ring-emerald-200">
                  <CheckCircle2 size={18} />
                  <span className="text-[10px] font-bold uppercase">Resolved</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
