import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../api/client';

export function EditorDashboardPage() {
  const [submissions, setSubmissions] = useState([]);
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

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      // Fetch manuscripts where journal owner is current user
      const response = await apiClient.get('/manuscripts?status=submitted,under-review,revision-requested');
      setSubmissions(response.data.manuscripts);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
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

              <div className="divide-y max-h-96 overflow-y-auto">
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
                      <p className="font-medium text-gray-900 line-clamp-2">{m.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {m.status === 'submitted' && '📝 Submitted'}
                        {m.status === 'under-review' && '👥 Under Review'}
                        {m.status === 'revision-requested' && '✏️ Revisions Needed'}
                      </p>
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

                  <div>
                    <p className="text-sm text-gray-600">Manuscript Preview</p>
                    <div className="bg-gray-50 p-4 rounded max-h-60 overflow-y-auto text-sm text-gray-700">
                      {selectedManuscript.body.substring(0, 500)}...
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
                        <div className="flex items-center gap-4 mb-2">
                          <p className="text-sm font-medium text-gray-700">Reviewer {i + 1}</p>
                          {review.submittedAt && (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                              Submitted
                            </span>
                          )}
                        </div>

                        {review.submittedAt ? (
                          <>
                            <div className="mb-2">
                              <p className="text-sm text-gray-600">Score</p>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <span key={s} className={s <= review.score ? '⭐' : '☆'} />
                                ))}
                              </div>
                            </div>

                            <div className="mb-2">
                              <p className="text-sm text-gray-600">Recommendation</p>
                              <p className="font-medium text-gray-900">{review.recommendation}</p>
                            </div>

                            <div>
                              <p className="text-sm text-gray-600">Feedback</p>
                              <p className="text-gray-800 text-sm">{review.feedback}</p>
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-gray-500 italic">Pending review...</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions Based on Status */}
              {selectedManuscript.status === 'submitted' && !selectedManuscript.assignedEditor && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Assign Reviewers</h3>

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
                        {/* TODO: Populate from database */}
                        <option value="reviewer1">Dr. Smith (Ayurveda)</option>
                        <option value="reviewer2">Dr. Johnson (Medicine)</option>
                        <option value="reviewer3">Dr. Williams (Research)</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
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

              {selectedManuscript.status === 'under-review' && (
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
                        <option value="accept">✅ Accept for Publication</option>
                        <option value="minor-revisions">✏️ Accept with Minor Revisions</option>
                        <option value="major-revisions">📝 Major Revisions Required</option>
                        <option value="reject">❌ Reject</option>
                        <option value="desk-reject">⚠️ Desk Reject</option>
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
                  <h3 className="text-lg font-semibold mb-4">Publish Manuscript</h3>
                  <p className="text-gray-700 mb-4">
                    This manuscript is accepted. Publishing will assign a DOI via Zenodo.
                  </p>
                  <button
                    onClick={handlePublish}
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
