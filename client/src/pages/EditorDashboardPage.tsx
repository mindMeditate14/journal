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

  const [reviewerForm, setReviewerForm] = useState({
    reviewerIds: [],
  });
  const [selectedWorkingDoc, setSelectedWorkingDoc] = useState<File | null>(null);
  const [uploadingWorkingDoc, setUploadingWorkingDoc] = useState(false);
  const [selectedFinalDoc, setSelectedFinalDoc] = useState<File | null>(null);
  const [uploadingFinalDoc, setUploadingFinalDoc] = useState(false);

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
      const response = await apiClient.post(`/manuscripts/${selectedManuscript._id}/publish`);

      toast.success(`Published! DOI: ${response.data.manuscript.doi}`);
      fetchSubmissions();
      setSelectedManuscript(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to publish');
    }
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
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          m.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                          m.status === 'under-review' ? 'bg-purple-100 text-purple-700' :
                          m.status === 'revision-requested' ? 'bg-amber-100 text-amber-700' :
                          m.status === 'accepted' ? 'bg-green-100 text-green-700' :
                          m.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {String(m.status).replace(/-/g, ' ')}
                        </span>
                      </div>
                      {m.authors?.[0]?.name && (
                        <p className="text-xs text-gray-500 mt-1">By: {m.authors[0].name}</p>
                      )}
                      {m.submittedAt && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Submitted: {new Date(m.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                      {m.discipline && (
                        <p className="text-xs text-gray-400 mt-0.5">{m.discipline}</p>
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
                <h2 className="text-2xl font-bold mb-4">{selectedManuscript.title}</h2>

                <div className="space-y-3 mb-6">
                  <div>
                    <p className="text-sm text-gray-600">Authors</p>
                    <p className="text-gray-900">
                      {selectedManuscript.authors.map(a => a.name).join(', ')}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                      {selectedManuscript.status}
                    </span>
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

              {/* Peer Reviews */}
              {selectedManuscript.reviews && selectedManuscript.reviews.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Peer Reviews</h3>

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
                </div>
              )}

              {/* Actions Based on Status */}
              {selectedManuscript.status === 'submitted' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-1">Assign or Re-assign Reviewers</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Select users below and click <strong>Assign Reviewers</strong>. Then share the review link with them:<br/>
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded select-all">
                      {window.location.origin}/peer-review/{selectedManuscript._id}
                    </span>
                  </p>

                  <form onSubmit={handleAssignReviewers} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Reviewers
                      </label>
                      <select
                        multiple
                        value={reviewerForm.reviewerIds}
                        onChange={e =>
                          setReviewerForm({
                            reviewerIds: Array.from(
                              e.target.selectedOptions,
                              option => option.value
                            ),
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {reviewerCandidates.map((candidate) => (
                          <option key={candidate._id} value={candidate._id}>
                            {candidate.name} ({candidate.email})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Hold Ctrl/Cmd to select multiple{reviewerCandidates.length === 0 ? ' (no reviewer accounts found)' : ''}
                      </p>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
                    >
                      Assign Reviewers
                    </button>
                  </form>
                </div>
              )}

              {(selectedManuscript.status === 'under-review' || selectedManuscript.status === 'revision-requested') && (
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
                        Final PDF is required before publishing this paper to search.
                      </p>
                      <div className="flex flex-col md:flex-row gap-2 mb-4">
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
                          className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {uploadingFinalDoc ? 'Uploading...' : 'Upload Final Document'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-700 mb-4">
                      Final document ready. You can publish this accepted paper to search now.
                    </p>
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
