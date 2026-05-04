import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import toast from 'react-hot-toast';

export default function ManuscriptRevisionPage() {
  const { manuscriptId } = useParams<{ manuscriptId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [manuscript, setManuscript] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchManuscript = async () => {
      if (!manuscriptId) return;
      try {
        const response = await apiClient.get(`/manuscripts/${manuscriptId}`);
        setManuscript(response.data);
      } catch (error) {
        toast.error('Failed to load manuscript');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchManuscript();
  }, [manuscriptId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a document to upload');
      return;
    }

    const formData = new FormData();
    formData.append('document', selectedFile);

    setSubmitting(true);
    try {
      await apiClient.patch(`/manuscripts/${manuscriptId}`, {
        status: manuscript.status === 'revision-requested' ? 'submitted' : manuscript.status,
      });
      
      await apiClient.post(`/manuscripts/${manuscriptId}/working-document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Manuscript updated and submitted for review');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!manuscript) {
    return null;
  }

  const statusColor = {
    draft: 'bg-purple-100 text-purple-800',
    submitted: 'bg-blue-100 text-blue-800',
    'under-review': 'bg-amber-100 text-amber-800',
    'revision-requested': 'bg-orange-100 text-orange-800',
    accepted: 'bg-green-100 text-green-800',
    published: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  }[manuscript.status] || 'bg-gray-100 text-gray-800';

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-indigo-600 hover:underline"
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {manuscript.status === 'revision-requested' ? 'Revise Manuscript' : 'Edit Manuscript'}
        </h1>

        {/* Manuscript Details (Read-only) */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="mb-3">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium capitalize ${statusColor}`}>
              {manuscript.status?.replace('-', ' ')}
            </span>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-2">{manuscript.title}</h2>
          
          {manuscript.journalId?.title && (
            <p className="text-gray-600 mb-2">
              <span className="font-medium">Journal:</span> {manuscript.journalId.title}
            </p>
          )}

          {manuscript.abstract && (
            <div className="mt-4">
              <p className="font-medium text-gray-700 mb-1">Abstract:</p>
              <p className="text-gray-600 text-sm">{manuscript.abstract}</p>
            </div>
          )}

          {manuscript.editorNotes && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
              <p className="font-medium text-amber-700 mb-1">Editor Notes:</p>
              <p className="text-amber-600 text-sm">{manuscript.editorNotes}</p>
            </div>
          )}
        </div>

        {/* Current Document */}
        {manuscript.workingDocument?.url && (
          <div className="mb-6">
            <p className="font-medium text-gray-700 mb-2">Current Document:</p>
            <a
              href={manuscript.workingDocument.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline"
            >
              📄 {manuscript.workingDocument.originalName}
            </a>
          </div>
        )}

        {/* Upload New Version */}
        <form onSubmit={handleSubmit}>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-6">
            <input
              type="file"
              id="document"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <label htmlFor="document" className="cursor-pointer">
              <div className="text-gray-600">
                {selectedFile ? (
                  <div>
                    <p className="text-green-600 font-medium">✅ {selectedFile.name}</p>
                    <p className="text-sm text-gray-500 mt-1">Click to change</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-4xl mb-2">📄</p>
                    <p className="font-medium">Click to upload</p>
                    <p className="text-sm text-gray-500">PDF or Word document</p>
                  </div>
                )}
              </div>
            </label>
          </div>

          {manuscript.status === 'revision-requested' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <p className="text-amber-800 text-sm">
                ⚠️ Upload your revised document. It will be resubmitted to the editor for review.
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting || !selectedFile}
              className="flex-1 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : manuscript.status === 'revision-requested' ? 'Submit Revised Version' : 'Save & Submit'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
