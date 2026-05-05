import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../api/client';

const REVIEW_RECOMMENDATION_OPTIONS = [
  { value: 'accept', label: 'Accept' },
  { value: 'minor-revisions', label: 'Minor Revisions Required' },
  { value: 'major-revisions', label: 'Major Revisions Required' },
  { value: 'reject', label: 'Reject' },
];

export function PeerReviewPage() {
  const { manuscriptId } = useParams();
  const [manuscript, setManuscript] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [selectedWorkingDoc, setSelectedWorkingDoc] = useState<File | null>(null);
  const [uploadingWorkingDoc, setUploadingWorkingDoc] = useState(false);

  const [formData, setFormData] = useState({
    score: 0,
    recommendation: '',
    feedback: '',
    strengths: '',
    weaknesses: '',
    suggestedImprovements: '',
    shouldCitation: '',
  });

  useEffect(() => {
    fetchManuscript();
  }, [manuscriptId]);

  const fetchManuscript = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/manuscripts/${manuscriptId}`);
      setManuscript(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load manuscript');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.score === 0) {
      toast.error('Please provide a score');
      return;
    }

    if (!formData.recommendation) {
      toast.error('Please select a recommendation');
      return;
    }

    if (formData.feedback.length < 100) {
      toast.error('Feedback must be at least 100 characters');
      return;
    }

    try {
      await apiClient.post(`/manuscripts/${manuscriptId}/reviews`, {
        score: formData.score,
        recommendation: formData.recommendation,
        feedback: formData.feedback,
        strengths: formData.strengths,
        weaknesses: formData.weaknesses,
        suggestedImprovements: formData.suggestedImprovements,
        shouldCitation: formData.shouldCitation,
      });

      setSubmitted(true);
      toast.success('Review submitted successfully!');

      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit review');
    }
  };

  const handleUploadWorkingDocument = async () => {
    if (!manuscriptId) return;
    if (!selectedWorkingDoc) {
      toast.error('Select a Word/PDF document first');
      return;
    }

    const formData = new FormData();
    formData.append('document', selectedWorkingDoc);

    try {
      setUploadingWorkingDoc(true);
      await apiClient.post(`/manuscripts/${manuscriptId}/working-document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Working document updated for author/editor review.');
      setSelectedWorkingDoc(null);
      await fetchManuscript();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload working document');
    } finally {
      setUploadingWorkingDoc(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading manuscript...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!manuscript) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-gray-500">Manuscript not found</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-white rounded-lg shadow p-8">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-green-600 mb-2">Review Submitted</h1>
            <p className="text-gray-600 mb-4">
              Thank you for completing your peer review. Redirecting to dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <a
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 mb-6"
        >
          ← Back to Dashboard
        </a>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Peer Review Form</h1>

        {/* Manuscript Summary */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Manuscript Summary</h2>

          <div className="space-y-3 text-gray-700">
            <div>
              <p className="text-sm text-gray-600">Title</p>
              <p className="font-medium">{manuscript.title}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Authors</p>
              <p>{manuscript.authors.map(a => a.name).join(', ')}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Abstract</p>
              <p>{manuscript.abstract}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Manuscript Preview</p>
              <div className="bg-gray-50 p-4 rounded max-h-48 overflow-y-auto text-sm">
                {manuscript.body && manuscript.body.length > 1000
                  ? manuscript.body.substring(0, 1000) + '...'
                  : manuscript.body || 'No content available'}
              </div>
            </div>

            {(manuscript.workingDocument?.url || manuscript.finalDocument?.url) && (
              <div>
                <p className="text-sm text-gray-600">Working Document</p>
                <a
                  href={manuscript.workingDocument?.url || manuscript.finalDocument?.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-700 underline"
                >
                  Open document for review
                </a>
              </div>
            )}

            {(manuscript.editorDecision || manuscript.editorNotes) && (
              <div className="border border-amber-200 rounded-lg p-3 bg-amber-50">
                <p className="text-sm text-amber-800 font-medium">Editorial Decision</p>
                {manuscript.editorDecision && (
                  <p className="text-sm text-amber-900 mt-1">
                    Decision: {String(manuscript.editorDecision).replace('-', ' ')}
                  </p>
                )}
                {manuscript.editorNotes && (
                  <p className="text-sm text-amber-900 mt-1">Notes: {manuscript.editorNotes}</p>
                )}
              </div>
            )}

            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <p className="text-sm text-gray-700 mb-2">
                Upload corrected Word/PDF document (track changes) for researcher/editor revision cycle.
              </p>
              <div className="flex flex-col md:flex-row gap-2">
                <input
                  type="file"
                  accept="application/pdf,.doc,.docx"
                  onChange={(e) => setSelectedWorkingDoc(e.target.files?.[0] || null)}
                  className="text-sm"
                />
                <button
                  type="button"
                  onClick={handleUploadWorkingDocument}
                  disabled={uploadingWorkingDoc}
                  className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
                >
                  {uploadingWorkingDoc ? 'Uploading...' : 'Upload Corrected Document'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Review Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Score */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Overall Score *
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(score => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setFormData({ ...formData, score })}
                  className={`w-12 h-12 rounded-lg border-2 font-bold transition ${
                    formData.score === score
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>
            <div className="flex gap-4 text-xs text-gray-500 mt-2">
              <div>1 = Reject</div>
              <div>3 = Accept with revisions</div>
              <div>5 = Accept</div>
            </div>
          </div>

          {/* Recommendation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recommendation *
            </label>
            <select
              value={formData.recommendation}
              onChange={e => setFormData({ ...formData, recommendation: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a recommendation...</option>
              {REVIEW_RECOMMENDATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Main Feedback */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overall Assessment *
            </label>
            <textarea
              value={formData.feedback}
              onChange={e => setFormData({ ...formData, feedback: e.target.value })}
              placeholder="Provide your overall assessment of the manuscript. Include your reasoning for the recommendation. (minimum 100 characters)"
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.feedback.length}/1000 characters
            </p>
          </div>

          {/* Strengths */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Strengths of the Manuscript
            </label>
            <textarea
              value={formData.strengths}
              onChange={e => setFormData({ ...formData, strengths: e.target.value })}
              placeholder="What are the main strengths of this manuscript?"
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Weaknesses */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Weaknesses & Concerns
            </label>
            <textarea
              value={formData.weaknesses}
              onChange={e => setFormData({ ...formData, weaknesses: e.target.value })}
              placeholder="What are the main weaknesses or concerns?"
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Suggested Improvements */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Suggested Improvements
            </label>
            <textarea
              value={formData.suggestedImprovements}
              onChange={e => setFormData({ ...formData, suggestedImprovements: e.target.value })}
              placeholder="What improvements would strengthen the manuscript?"
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Should Cite */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Should the Authors Cite...
            </label>
            <textarea
              value={formData.shouldCitation}
              onChange={e => setFormData({ ...formData, shouldCitation: e.target.value })}
              placeholder="Any specific papers or work the authors should cite?"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Reviewer Notes */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              <strong>Thank you for your careful review!</strong> Your feedback helps ensure the quality
              and integrity of our publication. Your assessment will be shared with the authors, and
              the editor will use your input to make the final decision.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold"
          >
            Submit Review
          </button>
        </form>
      </div>
    </div>
  );
}
