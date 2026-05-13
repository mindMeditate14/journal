import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../api/client';

const EDITOR_DECISION_OPTIONS = [
  { value: 'accept', label: 'Accept for Publication' },
  { value: 'minor-revisions', label: 'Minor Revisions Required' },
  { value: 'major-revisions', label: 'Major Revisions Required' },
  { value: 'reject', label: 'Reject' },
  { value: 'desk-reject', label: 'Desk Reject' },
];

const formatDecisionLabel = (value?: string) => {
  if (!value) return 'N/A';
  const match = EDITOR_DECISION_OPTIONS.find((option) => option.value === value);
  if (match) return match.label;
  return String(value).replace(/-/g, ' ');
};

/** Returns a tag describing WHO needs to act next — the key info for an editor. */
function getActionTag(m: any): { label: string; className: string } {
  const reviews: any[] = m.reviews || [];
  const submittedCount = reviews.filter((r: any) => r.submittedAt).length;
  const totalReviewers = reviews.length;
  const allReviewsDone = totalReviewers > 0 && submittedCount === totalReviewers;

  switch (m.status) {
    case 'submitted':
      return { label: '⚡ Assign Reviewers', className: 'bg-red-100 text-red-700 border border-red-200' };
    case 'under-review':
      if (allReviewsDone)
        return { label: '⚡ Decision Required', className: 'bg-orange-100 text-orange-700 border border-orange-200' };
      return {
        label: `⏳ Reviewers (${submittedCount}/${totalReviewers} done)`,
        className: 'bg-purple-100 text-purple-700 border border-purple-200',
      };
    case 'revision-requested':
      return { label: '⏳ Awaiting Author', className: 'bg-amber-100 text-amber-700 border border-amber-200' };
    case 'accepted':
      return m.finalDocument?.url
        ? { label: '⚡ Ready to Publish', className: 'bg-green-100 text-green-700 border border-green-200' }
        : { label: '⚡ Prepare Final PDF', className: 'bg-teal-100 text-teal-700 border border-teal-200' };
    case 'published':
      return { label: '✅ Published', className: 'bg-emerald-100 text-emerald-700 border border-emerald-200' };
    case 'rejected':
      return { label: 'Rejected', className: 'bg-gray-100 text-gray-500 border border-gray-200' };
    default:
      return { label: m.status, className: 'bg-gray-100 text-gray-600' };
  }
}

export function EditorDashboardPage() {
  const [submissions, setSubmissions] = useState([]);
  const [reviewerCandidates, setReviewerCandidates] = useState([]);
  const [selectedManuscript, setSelectedManuscript] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [reviewForm, setReviewForm] = useState({
    score: 0,
    recommendation: '',
    feedback: '',
  });

  const [decisionForm, setDecisionForm] = useState({
    decision: '',
    editorNotes: '',
  });

  const [reviewerForm, setReviewerForm] = useState<{ reviewerIds: string[] }>({
    reviewerIds: [],
  });
  const [selectedWorkingDoc, setSelectedWorkingDoc] = useState<File | null>(null);
  const [uploadingWorkingDoc, setUploadingWorkingDoc] = useState(false);
  const [selectedFinalDoc, setSelectedFinalDoc] = useState<File | null>(null);
  const [uploadingFinalDoc, setUploadingFinalDoc] = useState(false);
  const [promotingToFinal, setPromotingToFinal] = useState(false);
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [triggeringAiReview, setTriggeringAiReview] = useState(false);

  useEffect(() => {
    fetchSubmissions();
    fetchReviewerCandidates();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      // Fetch manuscripts where journal owner is current user
      const response = await apiClient.get('/manuscripts?status=submitted,under-review,revision-requested,accepted,published');
      setSubmissions(response.data.manuscripts);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewerCandidates = async () => {
    try {
      const response = await apiClient.get('/manuscripts/reviewer-candidates', {
        params: { limit: 100 },
      });
      setReviewerCandidates(response.data?.candidates || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load reviewer options');
    }
  };

  const handleSelectManuscript = async (id) => {
    try {
      const response = await apiClient.get(`/manuscripts/${id}`);
      setSelectedManuscript(response.data);
    } catch (err) {
      toast.error('Failed to load manuscript');
    }
  };

  const refreshSelectedManuscript = async () => {
    if (!selectedManuscript?._id) return;
    await handleSelectManuscript(selectedManuscript._id);
    await fetchSubmissions();
    toast.success('Refreshed');
  };

  const handleAssignReviewers = async (e) => {
    e.preventDefault();

    if (!reviewerForm.reviewerIds || reviewerForm.reviewerIds.length === 0) {
      toast.error('Select at least one reviewer');
      return;
    }

    try {
      await apiClient.post(`/manuscripts/${selectedManuscript._id}/assign-reviewers`, {
        reviewerIds: reviewerForm.reviewerIds,
      });

      toast.success('Reviewers assigned successfully');
      setReviewerForm({ reviewerIds: [] });
      fetchSubmissions();
      setSelectedManuscript(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign reviewers');
    }
  };

  const handleMakeDecision = async (e) => {
    e.preventDefault();

    if (!decisionForm.decision) {
      toast.error('Select a decision');
      return;
    }

    try {
      await apiClient.patch(`/manuscripts/${selectedManuscript._id}/decision`, {
        decision: decisionForm.decision,
        editorNotes: decisionForm.editorNotes,
      });

      toast.success('Decision recorded');
      setDecisionForm({ decision: '', editorNotes: '' });
      fetchSubmissions();
      setSelectedManuscript(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to make decision');
    }
  };

  const handlePublish = async () => {
    if (!window.confirm('Publish this manuscript and assign DOI?')) {
      return;
    }

    try {
      const response = await apiClient.post(`/manuscripts/${selectedManuscript._id}/publish`, {}, { timeout: 120000 });

      toast.success(`Published! DOI: ${response.data.manuscript.doi}`);
      fetchSubmissions();
      setSelectedManuscript(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to publish');
    }
  };

  const handlePromoteToFinal = async () => {
    if (!selectedManuscript?._id) return;
    try {
      setPromotingToFinal(true);
      await apiClient.post(`/manuscripts/${selectedManuscript._id}/promote-to-final`);
      toast.success('Working document promoted to final PDF');
      await handleSelectManuscript(selectedManuscript._id);
      await fetchSubmissions();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to promote document');
    } finally {
      setPromotingToFinal(false);
    }
  };

  const handleSendFeedbackToAuthor = async () => {
    if (!selectedManuscript?._id) return;
    try {
      setSendingFeedback(true);
      const res = await apiClient.post(`/manuscripts/${selectedManuscript._id}/send-feedback`, { editorNote: feedbackNote });
      toast.success(res.data.message || 'Feedback sent to author');
      setFeedbackNote('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send feedback');
    } finally {
      setSendingFeedback(false);
    }
  };

  const handleTriggerAiReview = async () => {
    if (!selectedManuscript?._id) return;
    try {
      setTriggeringAiReview(true);
      const res = await apiClient.post(`/manuscripts/${selectedManuscript._id}/ai-review`, {}, { timeout: 90000 });
      // Response contains the completed report directly
      setSelectedManuscript((prev: any) => ({
        ...prev,
        aiReviewReport: res.data.aiReviewReport,
      }));
      if (res.data.aiReviewReport?.status === 'done') {
        toast.success('AI review complete');
      } else {
        toast.error('AI review failed — check manuscript content');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to run AI review');
    } finally {
      setTriggeringAiReview(false);
    }
  };

  const handleDownloadAiReviewPdf = async () => {
    const air = selectedManuscript?.aiReviewReport;
    if (!air || air.status !== 'done') return;

    const journalName = selectedManuscript.journalId?.title || 'TradMed International';
    const manuscriptTitle = selectedManuscript.title || 'Untitled';
    const generatedAt = air.generatedAt ? new Date(air.generatedAt).toLocaleString() : new Date().toLocaleString();
    const recLabel: Record<string, string> = {
      'accept': '✅ Accept',
      'minor-revisions': '🔵 Minor Revisions',
      'major-revisions': '⚡ Major Revisions',
      'reject': '❌ Reject',
    };
    const dimLabel: Record<string, string> = {
      methodology: 'Methodology',
      clarity: 'Clarity',
      originality: 'Originality',
      completeness: 'Completeness',
      ethicsAndCitations: 'Ethics & Citations',
    };
    const dims = ['methodology', 'clarity', 'originality', 'completeness', 'ethicsAndCitations'] as const;

    const html = `
      <div style="font-family: Georgia, serif; max-width: 740px; margin: 0 auto; padding: 40px; color: #1a1a1a;">
        <div style="border-bottom: 3px solid #4338ca; padding-bottom: 16px; margin-bottom: 24px;">
          <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.05em;">Pre-Review Report — Internal Use Only</p>
          <h1 style="font-size: 20px; font-weight: bold; color: #1e1b4b; margin: 0 0 6px 0;">${manuscriptTitle}</h1>
          <p style="font-size: 13px; color: #4b5563; margin: 0 0 3px 0;">Journal: <strong>${journalName}</strong></p>
          <p style="font-size: 13px; color: #4b5563; margin: 0;">Author(s): <strong>${(selectedManuscript.authors || []).map((a: any) => a.name).filter(Boolean).join(', ') || 'Unknown'}</strong></p>
          <p style="font-size: 12px; color: #9ca3af; margin: 6px 0 0 0;">Generated: ${generatedAt}</p>
        </div>

        <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 24px; background: #f5f3ff; padding: 16px; border-radius: 8px; border: 1px solid #e0e7ff;">
          <div style="text-align: center;">
            <span style="font-size: 36px; font-weight: bold; color: #4338ca;">${air.overallScore}</span>
            <span style="font-size: 14px; color: #6b7280;">/10</span>
            <p style="font-size: 11px; color: #6b7280; margin: 2px 0 0 0;">Overall Score</p>
          </div>
          <div>
            <p style="font-size: 14px; font-weight: 600; color: #374151; margin: 0 0 4px 0;">Recommendation</p>
            <p style="font-size: 16px; font-weight: bold; color: #4338ca; margin: 0;">${recLabel[air.recommendation] || air.recommendation}</p>
          </div>
        </div>

        <div style="margin-bottom: 20px; background: #f9fafb; padding: 14px; border-left: 4px solid #4338ca; border-radius: 0 6px 6px 0;">
          <p style="font-size: 12px; font-weight: 700; color: #374151; margin: 0 0 6px 0; text-transform: uppercase;">Summary</p>
          <p style="font-size: 13px; color: #4b5563; font-style: italic; margin: 0;">"${air.summary}"</p>
        </div>

        <div style="margin-bottom: 20px;">
          <p style="font-size: 12px; font-weight: 700; color: #374151; margin: 0 0 10px 0; text-transform: uppercase;">Dimension Scores</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            ${dims.map(dim => {
              const d = (air as any)[dim];
              if (!d) return '';
              return `<tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 8px 6px; font-weight: 600; width: 38%;">${dimLabel[dim]}</td>
                <td style="padding: 8px 6px; font-weight: bold; color: #4338ca; width: 12%; text-align: center;">${d.score}/10</td>
                <td style="padding: 8px 6px; color: #6b7280;">${d.comments}</td>
              </tr>`;
            }).join('')}
          </table>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px;">
          <div style="background: #f0fdf4; padding: 12px; border-radius: 6px; border: 1px solid #bbf7d0;">
            <p style="font-size: 11px; font-weight: 700; color: #15803d; margin: 0 0 6px 0;">KEY STRENGTHS</p>
            ${(air.keyStrengths || []).map((s: string) => `<p style="font-size: 12px; color: #374151; margin: 3px 0;">• ${s}</p>`).join('')}
          </div>
          <div style="background: #fef2f2; padding: 12px; border-radius: 6px; border: 1px solid #fecaca;">
            <p style="font-size: 11px; font-weight: 700; color: #b91c1c; margin: 0 0 6px 0;">KEY WEAKNESSES</p>
            ${(air.keyWeaknesses || []).map((w: string) => `<p style="font-size: 12px; color: #374151; margin: 3px 0;">• ${w}</p>`).join('')}
          </div>
          <div style="background: #eff6ff; padding: 12px; border-radius: 6px; border: 1px solid #bfdbfe;">
            <p style="font-size: 11px; font-weight: 700; color: #1d4ed8; margin: 0 0 6px 0;">SUGGESTED ACTIONS</p>
            ${(air.suggestedActions || []).map((a: string) => `<p style="font-size: 12px; color: #374151; margin: 3px 0;">• ${a}</p>`).join('')}
          </div>
        </div>

        <p style="font-size: 10px; color: #9ca3af; text-align: center; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 12px;">
          This report is for editorial assistance only. It is confidential and not shared with authors.
        </p>
      </div>
    `;

    const html2pdf = (await import('html2pdf.js')).default;
    const container = document.createElement('div');
    container.innerHTML = html;
    const safeTitle = manuscriptTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
    await html2pdf().set({
      margin: 0,
      filename: `AI_Review_${safeTitle}.pdf`,
      image: { type: 'jpeg', quality: 0.97 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(container).save();
  };

  const handleUploadFinalDocument = async () => {
    if (!selectedManuscript?._id) return;
    if (!selectedFinalDoc) {
      toast.error('Select a PDF/Word document first');
      return;
    }

    const formData = new FormData();
    formData.append('document', selectedFinalDoc);

    try {
      setUploadingFinalDoc(true);
      await apiClient.post(`/manuscripts/${selectedManuscript._id}/final-document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Final document uploaded');
      await handleSelectManuscript(selectedManuscript._id);
      await fetchSubmissions();
      setSelectedFinalDoc(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload final document');
    } finally {
      setUploadingFinalDoc(false);
    }
  };

  const handleUploadWorkingDocument = async () => {
    if (!selectedManuscript?._id) return;
    if (!selectedWorkingDoc) {
      toast.error('Select a Word/PDF document first');
      return;
    }

    const formData = new FormData();
    formData.append('document', selectedWorkingDoc);

    try {
      setUploadingWorkingDoc(true);
      await apiClient.post(`/manuscripts/${selectedManuscript._id}/working-document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Working document uploaded');
      await handleSelectManuscript(selectedManuscript._id);
      await fetchSubmissions();
      setSelectedWorkingDoc(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload working document');
    } finally {
      setUploadingWorkingDoc(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Editor Dashboard</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Submissions List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">Submissions ({submissions.length})</h2>
              </div>

              <div className="divide-y max-h-[600px] overflow-y-auto">
                {submissions.length === 0 ? (
                  <p className="p-4 text-gray-500 text-center">No submissions</p>
                ) : (
                  submissions.map(m => (
                    <button
                      key={m._id}
                      onClick={() => handleSelectManuscript(m._id)}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition ${
                        selectedManuscript?._id === m._id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                      }`}
                    >
                      <p className="font-medium text-gray-900 line-clamp-2 text-sm">{m.title}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {(() => {
                          const tag = getActionTag(m);
                          return (
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${tag.className}`}>
                              {tag.label}
                            </span>
                          );
                        })()}
                        {m.revisionRound > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                            Round {m.revisionRound + 1}
                          </span>
                        )}
                      </div>
                      {m.authors?.[0]?.name && (
                        <p className="text-xs text-gray-500 mt-1">By: {m.authors[0].name}</p>
                      )}
                      {(() => {
                        const reviews: any[] = m.reviews || [];
                        const isFinished = ['accepted', 'published', 'rejected'].includes(m.status);
                        if (isFinished || reviews.length === 0) return null;
                        const reviewerNames = reviews
                          .map((r: any) => r.reviewerId?.name || r.reviewerName)
                          .filter(Boolean);
                        if (reviewerNames.length === 0) return null;
                        return (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {reviewerNames.join(' · ')}
                          </p>
                        );
                      })()}
                      {m.submittedAt && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(m.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Manuscript Details */}
          {selectedManuscript && (
            <div className="lg:col-span-2 space-y-6">
              {/* Manuscript Info */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h2 className="text-2xl font-bold">{selectedManuscript.title}</h2>
                  <button
                    type="button"
                    onClick={refreshSelectedManuscript}
                    className="shrink-0 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
                    title="Reload latest data from server"
                  >
                    ↻ Refresh
                  </button>
                </div>

                <div className="space-y-3 mb-6">
                  <div>
                    <p className="text-sm text-gray-600">Authors</p>
                    <p className="text-gray-900">
                      {selectedManuscript.authors.map(a => a.name).join(', ')}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      {(() => {
                        const tag = getActionTag(selectedManuscript);
                        return (
                          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${tag.className}`}>
                            {tag.label}
                          </span>
                        );
                      })()}
                      {selectedManuscript.revisionRound > 0 && (
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                          Round {selectedManuscript.revisionRound + 1}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Abstract</p>
                    <p className="text-gray-800">{selectedManuscript.abstract}</p>
                  </div>

                  {selectedManuscript.workingDocument?.url && (
                    <div>
                      <p className="text-sm text-gray-600">Working Document</p>
                      <a
                        href={selectedManuscript.workingDocument.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-700 underline"
                      >
                        Open editable working document
                      </a>
                    </div>
                  )}

                  {selectedManuscript.finalDocument?.url && (
                    <div>
                      <p className="text-sm text-gray-600">Final Publication PDF</p>
                      <a
                        href={selectedManuscript.finalDocument.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-700 underline"
                      >
                        Open final PDF
                      </a>
                    </div>
                  )}

                  <div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="bg-gray-100 px-4 py-2 flex justify-between items-center">
                                          <p className="text-sm font-medium text-gray-700">Full Manuscript Content</p>
                                          <button
                                            onClick={() => window.open(`/manuscripts/${selectedManuscript._id}/edit`, '_blank')}
                                            className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
                                          >
                                            📝 Edit in New Tab
                                          </button>
                                        </div>
                                        <div className="bg-white p-4 max-h-[500px] overflow-y-auto text-sm text-gray-800 whitespace-pre-wrap">
                                          {selectedManuscript.body || 'No content available'}
                                        </div>
                                      </div>
                  </div>
                </div>
              </div>

              {/* AI Pre-Review Report (editor-only) */}
              {(() => {
                const air = selectedManuscript.aiReviewReport;
                const recColour: Record<string, string> = {
                  'accept': 'bg-green-100 text-green-700 border-green-200',
                  'minor-revisions': 'bg-blue-100 text-blue-700 border-blue-200',
                  'major-revisions': 'bg-amber-100 text-amber-700 border-amber-200',
                  'reject': 'bg-red-100 text-red-700 border-red-200',
                };
                const recLabel: Record<string, string> = {
                  'accept': '✅ Accept',
                  'minor-revisions': '🔵 Minor Revisions',
                  'major-revisions': '⚡ Major Revisions',
                  'reject': '❌ Reject',
                };
                const dimLabel: Record<string, string> = {
                  methodology: '🔬 Methodology',
                  clarity: '✍️ Clarity',
                  originality: '💡 Originality',
                  completeness: '📋 Completeness',
                  ethicsAndCitations: '⚖️ Ethics & Citations',
                };
                return (
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">🤖 AI Pre-Review Report</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Internal use only — not visible to authors</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {air?.status === 'done' && (
                          <button
                            type="button"
                            onClick={handleDownloadAiReviewPdf}
                            className="px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                          >
                            ⬇ Download PDF
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleTriggerAiReview}
                          disabled={triggeringAiReview}
                          className="px-3 py-1.5 text-xs font-medium border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 disabled:opacity-50"
                        >
                          {triggeringAiReview ? '⏳ Analysing…' : air?.status === 'done' ? '↺ Re-run AI Review' : '▶ Run AI Review'}
                        </button>
                      </div>
                    </div>

                    {!air && !triggeringAiReview && (
                      <p className="text-sm text-gray-500 italic">No AI review yet. Click "Run AI Review" to analyse the latest uploaded manuscript.</p>
                    )}

                    {triggeringAiReview && (
                      <div className="flex items-center gap-2 text-indigo-600 text-sm">
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Analysing manuscript — this may take 20–30 seconds…
                      </div>
                    )}

                    {air?.status === 'failed' && (
                      <p className="text-sm text-red-600">⚠️ AI review failed. Click "Re-run AI Review" to retry.</p>
                    )}

                    {air?.status === 'done' && (
                      <>
                        {/* Header scores */}
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <span className="text-3xl font-bold text-indigo-700">{air.overallScore}<span className="text-base text-gray-400">/10</span></span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${recColour[air.recommendation] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                            {recLabel[air.recommendation] || air.recommendation}
                          </span>
                          {air.generatedAt && (
                            <span className="text-xs text-gray-400 ml-auto">Generated {new Date(air.generatedAt).toLocaleString()}</span>
                          )}
                        </div>

                        {/* Summary */}
                        <p className="text-sm text-gray-800 bg-gray-50 rounded p-3 mb-4 italic">"{air.summary}"</p>

                        {/* Dimension scores */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                          {(['methodology', 'clarity', 'originality', 'completeness', 'ethicsAndCitations'] as const).map(dim => {
                            const d = (air as any)[dim];
                            if (!d) return null;
                            const pct = (d.score / 10) * 100;
                            const barColour = d.score >= 7 ? 'bg-green-500' : d.score >= 5 ? 'bg-amber-400' : 'bg-red-400';
                            return (
                              <div key={dim} className="border border-gray-100 rounded p-3">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-semibold text-gray-700">{dimLabel[dim]}</span>
                                  <span className="text-sm font-bold text-indigo-700">{d.score}/10</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                                  <div className={`h-1.5 rounded-full ${barColour}`} style={{ width: `${pct}%` }} />
                                </div>
                                <p className="text-xs text-gray-600">{d.comments}</p>
                              </div>
                            );
                          })}
                        </div>

                        {/* Strengths / Weaknesses / Actions */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="bg-green-50 rounded p-3">
                            <p className="text-xs font-semibold text-green-700 mb-1">✅ Key Strengths</p>
                            <ul className="list-disc list-inside space-y-0.5">
                              {(air.keyStrengths || []).map((s: string, i: number) => (
                                <li key={i} className="text-xs text-gray-700">{s}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="bg-red-50 rounded p-3">
                            <p className="text-xs font-semibold text-red-700 mb-1">⚠️ Key Weaknesses</p>
                            <ul className="list-disc list-inside space-y-0.5">
                              {(air.keyWeaknesses || []).map((w: string, i: number) => (
                                <li key={i} className="text-xs text-gray-700">{w}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="bg-blue-50 rounded p-3">
                            <p className="text-xs font-semibold text-blue-700 mb-1">📌 Suggested Actions</p>
                            <ul className="list-disc list-inside space-y-0.5">
                              {(air.suggestedActions || []).map((a: string, i: number) => (
                                <li key={i} className="text-xs text-gray-700">{a}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Peer Reviews */}
              {selectedManuscript.reviews && selectedManuscript.reviews.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <h3 className="text-lg font-semibold">Peer Reviews</h3>
                    {(() => {
                      const submittedCount = selectedManuscript.reviews.filter((r: any) => r.submittedAt).length;
                      if (submittedCount === 0) return null;
                      return (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-medium">
                          {submittedCount} of {selectedManuscript.reviews.length} submitted
                        </span>
                      );
                    })()}
                  </div>

                  <div className="space-y-4">
                    {selectedManuscript.reviews.map((review, i) => (
                      <div key={i} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center gap-4 mb-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-700">
                            Reviewer {i + 1}
                            {review.reviewerId?.name && ` — ${review.reviewerId.name}`}
                          </p>
                          {review.submittedAt ? (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                              Submitted {new Date(review.submittedAt).toLocaleDateString()}
                            </span>
                          ) : ['accepted', 'published'].includes(selectedManuscript.status) ? (
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded">
                              Review bypassed — decision made
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                              Pending — reviewer has not submitted yet
                            </span>
                          )}
                        </div>

                        {review.submittedAt ? (
                          <>
                            <div className="mb-2">
                              <p className="text-sm text-gray-600">Score</p>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <span key={s} className={s <= (review.score || 0) ? '⭐' : '☆'} />
                                ))}
                              </div>
                            </div>

                            <div className="mb-2">
                              <p className="text-sm text-gray-600">Recommendation</p>
                              <p className="font-medium text-gray-900">{formatDecisionLabel(review.recommendation)}</p>
                            </div>

                            <div>
                              <p className="text-sm text-gray-600">Feedback</p>
                              <p className="text-gray-800 text-sm">{review.feedback}</p>
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-gray-500 italic">
                            {['accepted', 'published'].includes(selectedManuscript.status)
                              ? 'This review was not formally submitted through the system.'
                              : 'Awaiting reviewer submission. Share the review link: /peer-review/' + selectedManuscript._id}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Send feedback to author */}
                  {selectedManuscript.reviews.some((r: any) => r.submittedAt) && !['accepted', 'published', 'rejected'].includes(selectedManuscript.status) && (
                    <div className="mt-5 pt-5 border-t border-gray-200">
                      <p className="text-sm font-semibold text-gray-700 mb-1">📧 Send Reviewer Feedback to Author</p>
                      <p className="text-xs text-gray-500 mb-3">
                        This emails the author all submitted reviewer comments without making a formal decision. Useful when you want the author to start revising while you finalize your decision.
                      </p>
                      <textarea
                        value={feedbackNote}
                        onChange={e => setFeedbackNote(e.target.value)}
                        placeholder="Optional note from editor to accompany the feedback…"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 mb-2"
                      />
                      <button
                        type="button"
                        onClick={handleSendFeedbackToAuthor}
                        disabled={sendingFeedback}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
                      >
                        {sendingFeedback ? 'Sending…' : '📧 Send Feedback to Author'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Actions Based on Status */}
              {(selectedManuscript.status === 'submitted' || selectedManuscript.status === 'under-review') && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-1">Assign or Re-assign Reviewers</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Tick one or more reviewers below, then click <strong>Assign Reviewers</strong>. Each reviewer will receive an email invitation with a direct link.
                  </p>

                  <form onSubmit={handleAssignReviewers} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Reviewers
                        {reviewerForm.reviewerIds.length > 0 && (
                          <span className="ml-2 text-indigo-600 font-semibold">{reviewerForm.reviewerIds.length} selected</span>
                        )}
                      </label>
                      {reviewerCandidates.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No reviewer accounts found. Assign users the reviewer role in Admin first.</p>
                      ) : (
                        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-64 overflow-y-auto">
                          {reviewerCandidates.map((candidate: any) => {
                            const checked = reviewerForm.reviewerIds.includes(candidate._id);
                            return (
                              <label
                                key={candidate._id}
                                className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 ${checked ? 'bg-indigo-50' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    setReviewerForm(prev => ({
                                      reviewerIds: checked
                                        ? prev.reviewerIds.filter((id: string) => id !== candidate._id)
                                        : [...prev.reviewerIds, candidate._id],
                                    }))
                                  }
                                  className="w-4 h-4 text-indigo-600 rounded border-gray-300"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{candidate.name}</p>
                                  <p className="text-xs text-gray-500 truncate">{candidate.email}</p>
                                </div>
                                {candidate.affiliation && (
                                  <span className="text-xs text-gray-400 hidden md:block truncate max-w-[140px]">{candidate.affiliation}</span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={reviewerForm.reviewerIds.length === 0}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Assign {reviewerForm.reviewerIds.length > 1 ? `${reviewerForm.reviewerIds.length} Reviewers` : 'Reviewer'}
                    </button>
                  </form>
                </div>
              )}

              {(selectedManuscript.status === 'submitted' || selectedManuscript.status === 'under-review' || selectedManuscript.status === 'revision-requested') && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Make Editorial Decision</h3>

                  <form onSubmit={handleMakeDecision} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Decision
                      </label>
                      <select
                        value={decisionForm.decision}
                        onChange={e => setDecisionForm({ ...decisionForm, decision: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select decision...</option>
                        {EDITOR_DECISION_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Editor Notes (optional)
                      </label>
                      <textarea
                        value={decisionForm.editorNotes}
                        onChange={e =>
                          setDecisionForm({ ...decisionForm, editorNotes: e.target.value })
                        }
                        placeholder="Comments for the author..."
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 font-medium"
                    >
                      Record Decision
                    </button>
                  </form>
                </div>
              )}

              {/* Editorial history timeline — always visible when there is history */}
              {Array.isArray(selectedManuscript.decisionHistory) && selectedManuscript.decisionHistory.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Editorial History</h3>
                  <div className="space-y-4">
                    {[...selectedManuscript.decisionHistory].reverse().map((h: any, i: number) => {
                      const decisionLabel = h.decision === 'accept' ? '✅ Accepted'
                        : h.decision === 'minor-revisions' ? '📝 Minor Revisions'
                        : h.decision === 'major-revisions' ? '📝 Major Revisions'
                        : h.decision === 'reject' ? '❌ Rejected'
                        : h.decision === 'desk-reject' ? '❌ Desk Rejected'
                        : String(h.decision).replace(/-/g, ' ');
                      const borderColor = h.decision === 'accept' ? 'border-green-300'
                        : ['minor-revisions','major-revisions'].includes(h.decision) ? 'border-amber-300'
                        : 'border-red-300';
                      return (
                        <div key={i} className={`border-l-4 ${borderColor} pl-4`}>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-medium">Round {(h.round || 0) + 1}</span>
                            <span className="text-sm font-semibold text-gray-800">{decisionLabel}</span>
                            {h.decidedAt && (
                              <span className="text-xs text-gray-400 ml-auto">{new Date(h.decidedAt).toLocaleString()}</span>
                            )}
                          </div>
                          {h.editorNotes && (
                            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded px-2 py-1.5 mt-1">
                              <span className="font-medium">Editor note: </span>{h.editorNotes}
                            </p>
                          )}
                          {Array.isArray(h.reviewerSummary) && h.reviewerSummary.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {h.reviewerSummary.map((r: any, ri: number) => (
                                <div key={ri} className="bg-gray-50 rounded px-3 py-2 text-sm">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-semibold text-gray-600">Reviewer {ri + 1}</span>
                                    {r.score != null && <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">Score: {r.score}/5</span>}
                                    {r.recommendation && (
                                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                        r.recommendation === 'accept' ? 'bg-green-100 text-green-700' :
                                        r.recommendation === 'reject' ? 'bg-red-100 text-red-700' :
                                        'bg-amber-100 text-amber-700'
                                      }`}>{String(r.recommendation).replace(/-/g, ' ')}</span>
                                    )}
                                  </div>
                                  {r.feedback && <p className="text-gray-700 whitespace-pre-line">{r.feedback}</p>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedManuscript.status === 'accepted' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-3">Document Workflow</h3>
                  <div className="mb-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <p className="text-gray-700 mb-3">
                      Working document (Word/PDF) is used for reviewer/editor corrections before publication.
                    </p>
                    <div className="flex flex-col md:flex-row gap-2 mb-2">
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
                        {uploadingWorkingDoc ? 'Uploading...' : 'Upload Working Document'}
                      </button>
                    </div>
                    {selectedManuscript.workingDocument?.url && (
                      <a
                        href={selectedManuscript.workingDocument.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-700 underline text-sm"
                      >
                        Open current working document
                      </a>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold mb-4">Publish Manuscript</h3>
                  {!selectedManuscript.finalDocument?.url ? (
                    <>
                      <p className="text-gray-700 mb-3">
                        A final PDF is required before publishing. Choose one of the options below:
                      </p>

                      {/* Option 1: promote working doc if it's already a PDF */}
                      {selectedManuscript.workingDocument?.url && selectedManuscript.workingDocument?.mimeType === 'application/pdf' && (
                        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                          <p className="text-sm text-emerald-800 font-medium mb-2">
                            ✅ The working document is already a PDF — use it as the final version:
                          </p>
                          <button
                            type="button"
                            onClick={handlePromoteToFinal}
                            disabled={promotingToFinal}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
                          >
                            {promotingToFinal ? 'Promoting...' : '⚡ Use Working Document as Final PDF'}
                          </button>
                        </div>
                      )}

                      {/* Option 2: upload a separate (typeset/formatted) final PDF */}
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-sm text-gray-600 mb-2">
                          Or upload a typeset / formatted final PDF:
                        </p>
                        <div className="flex flex-col md:flex-row gap-2">
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => setSelectedFinalDoc(e.target.files?.[0] || null)}
                            className="text-sm"
                          />
                          <button
                            type="button"
                            onClick={handleUploadFinalDocument}
                            disabled={uploadingFinalDoc}
                            className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
                          >
                            {uploadingFinalDoc ? 'Uploading...' : 'Upload Final PDF'}
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between gap-3">
                      <p className="text-green-800 text-sm font-medium">✅ Final PDF ready</p>
                      <a
                        href={selectedManuscript.finalDocument.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 underline text-sm"
                      >
                        Preview
                      </a>
                    </div>
                  )}
                  <button
                    onClick={handlePublish}
                    disabled={!selectedManuscript.finalDocument?.url}
                    className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium"
                  >
                    📤 Publish & Assign DOI
                  </button>
                </div>
              )}

              {selectedManuscript.status === 'published' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <p className="text-green-700 font-medium">✅ Published</p>
                  <p className="text-sm text-gray-600 mt-1">DOI: {selectedManuscript.doi}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
