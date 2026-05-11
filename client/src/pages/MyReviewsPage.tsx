import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import { useAuthStore } from '../utils/authStore';

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-700',
  'under-review': 'bg-purple-100 text-purple-700',
  'revision-requested': 'bg-amber-100 text-amber-700',
  accepted: 'bg-green-100 text-green-700',
  published: 'bg-emerald-100 text-emerald-700',
};

export function MyReviewsPage() {
  const navigate = useNavigate();
  const userId = useAuthStore((state) => state.user?._id);
  const [manuscripts, setManuscripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await apiClient.get('/manuscripts', {
          params: { status: 'submitted,under-review,revision-requested,accepted,published', limit: 50 },
        });
        // Filter to only manuscripts where this user is an assigned reviewer
        const mine = (data.manuscripts || []).filter((m: any) =>
          Array.isArray(m.reviews) &&
          m.reviews.some(
            (r: any) =>
              r.reviewerId === userId ||
              r.reviewerId?._id === userId ||
              r.reviewerId?.toString() === userId
          )
        );
        setManuscripts(mine);
      } catch {
        toast.error('Failed to load assigned reviews');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const getMyReview = (m: any) => {
    if (!Array.isArray(m.reviews)) return null;
    return m.reviews.find(
      (r: any) =>
        r.reviewerId === userId ||
        r.reviewerId?._id === userId ||
        r.reviewerId?.toString() === userId
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading your reviews…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">My Assigned Reviews</h1>
        <p className="text-sm text-gray-500 mb-6">
          Manuscripts assigned to you for peer review. Click <strong>Open Review Form</strong> to read the manuscript and submit your evaluation.
        </p>

        {manuscripts.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
            <p className="text-gray-400 text-lg mb-2">No manuscripts assigned to you yet.</p>
            <p className="text-gray-400 text-sm">
              The editor will notify you when a manuscript is ready for your review.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {manuscripts.map((m) => {
              const myReview = getMyReview(m);
              const isDone = !!myReview?.submittedAt;
              return (
                <div
                  key={m._id}
                  className="bg-white rounded-lg border border-gray-200 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[m.status] || 'bg-gray-100 text-gray-600'}`}>
                          {String(m.status).replace(/-/g, ' ')}
                        </span>
                        {isDone ? (
                          <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 font-medium">✓ Review submitted</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 font-medium">⏳ Awaiting your review</span>
                        )}
                      </div>
                      <h2 className="text-base font-semibold text-gray-900 line-clamp-2">{m.title}</h2>
                      {m.authors?.length > 0 && (
                        <p className="text-sm text-gray-500 mt-1">
                          By: {m.authors.map((a: any) => a.name).join(', ')}
                        </p>
                      )}
                      {m.abstract && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{m.abstract}</p>
                      )}
                      {m.discipline && (
                        <p className="text-xs text-gray-400 mt-1">{m.discipline}</p>
                      )}
                    </div>

                    <div className="shrink-0 flex flex-col gap-2">
                      {!isDone && (
                        <button
                          type="button"
                          onClick={() => navigate(`/peer-review/${m._id}`)}
                          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
                        >
                          Open Review Form →
                        </button>
                      )}
                      {isDone && (
                        <button
                          type="button"
                          onClick={() => navigate(`/peer-review/${m._id}`)}
                          className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
                        >
                          View Manuscript
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Show submitted review summary */}
                  {isDone && myReview && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-xs font-semibold text-green-700 mb-1">Your Review</p>
                      <div className="flex flex-wrap gap-4 text-sm text-green-800">
                        <span>Score: {myReview.score}/5</span>
                        <span>Recommendation: {String(myReview.recommendation || '').replace(/-/g, ' ')}</span>
                        {myReview.submittedAt && (
                          <span>Submitted: {new Date(myReview.submittedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
