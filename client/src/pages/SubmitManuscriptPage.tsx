import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../api/client';

export function SubmitManuscriptPage() {
  const { journalId } = useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: Select Journal, 2: Upload, 3: Review, 4: Confirm
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    journalId: journalId || '',
    title: '',
    abstract: '',
    keywords: [],
    authors: [{ name: '', email: '', affiliation: '', orcid: '' }],
    body: '',
    discipline: '',
    methodology: '',
    fundingStatement: '',
    conflictOfInterest: '',
    dataAvailability: '',
  });

  const [markdownContent, setMarkdownContent] = useState('');
  const [parsedMetadata, setParsedMetadata] = useState(null);

  // Handle file upload / paste
  const handleMarkdownPaste = (e) => {
    const text = e.target.value;
    setMarkdownContent(text);

    try {
      const parsed = parseMarkdownWithYAML(text);
      setParsedMetadata(parsed);

      if (parsed.frontmatter) {
        setFormData(prev => ({
          ...prev,
          title: parsed.frontmatter.title || '',
          abstract: parsed.frontmatter.abstract || '',
          keywords: parsed.frontmatter.keywords || [],
          authors: parsed.frontmatter.authors || [{ name: '', email: '', affiliation: '', orcid: '' }],
          discipline: parsed.frontmatter.discipline || '',
          methodology: parsed.frontmatter.methodology || '',
          fundingStatement: parsed.frontmatter.fundingStatement || '',
          conflictOfInterest: parsed.frontmatter.conflictOfInterest || '',
          dataAvailability: parsed.frontmatter.dataAvailability || '',
          body: parsed.body,
        }));
      }
    } catch (err) {
      setError(`Invalid markdown format: ${err.message}`);
    }
  };

  // Submit manuscript
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate
      if (!formData.title || !formData.abstract || !formData.body) {
        throw new Error('Title, abstract, and body are required');
      }

      if (formData.authors.length === 0 || !formData.authors[0].email) {
        throw new Error('At least one author with email is required');
      }

      if (!formData.discipline || !formData.methodology) {
        throw new Error('Discipline and methodology are required');
      }

      const response = await apiClient.post('/manuscripts', {
        journalId: formData.journalId,
        title: formData.title,
        abstract: formData.abstract,
        keywords: formData.keywords,
        authors: formData.authors,
        body: formData.body,
        discipline: formData.discipline,
        methodology: formData.methodology,
        fundingStatement: formData.fundingStatement,
        conflictOfInterest: formData.conflictOfInterest,
        dataAvailability: formData.dataAvailability,
      });

      setSuccess('Manuscript submitted successfully!');
      toast.success('Manuscript submitted! Check your email for confirmation.');

      setTimeout(() => {
        navigate(`/manuscripts/${response.data.manuscript._id}`);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAuthorChange = (index, field, value) => {
    const newAuthors = [...formData.authors];
    newAuthors[index][field] = value;
    setFormData(prev => ({ ...prev, authors: newAuthors }));
  };

  const addAuthor = () => {
    setFormData(prev => ({
      ...prev,
      authors: [...prev.authors, { name: '', email: '', affiliation: '', orcid: '' }],
    }));
  };

  const removeAuthor = (index) => {
    setFormData(prev => ({
      ...prev,
      authors: prev.authors.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Submit Your Manuscript</h1>

        {/* Progress indicator */}
        <div className="mb-8 flex gap-4">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className={`flex-1 h-2 rounded ${
                s <= step ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Errors */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* Step 1: Metadata Form */}
        {step === 1 && (
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Manuscript Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={e => handleFormChange('title', e.target.value)}
                placeholder="Your article title (10-300 characters)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                maxLength={300}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.title.length}/300
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Abstract *
              </label>
              <textarea
                value={formData.abstract}
                onChange={e => handleFormChange('abstract', e.target.value)}
                placeholder="Concise summary (50-1000 characters)"
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                maxLength={1000}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.abstract.length}/1000
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Keywords
              </label>
              <input
                type="text"
                value={formData.keywords.join(', ')}
                onChange={e =>
                  handleFormChange('keywords', e.target.value.split(',').map(k => k.trim()))
                }
                placeholder="keyword1, keyword2, keyword3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discipline *
                </label>
                <select
                  value={formData.discipline}
                  onChange={e => handleFormChange('discipline', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  <option value="Ayurveda">Ayurveda</option>
                  <option value="Traditional Medicine">Traditional Medicine</option>
                  <option value="Medicine">Medicine</option>
                  <option value="Neuroscience">Neuroscience</option>
                  <option value="Psychology">Psychology</option>
                  <option value="Pharmacology">Pharmacology</option>
                  <option value="Health Sciences">Health Sciences</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Methodology *
                </label>
                <select
                  value={formData.methodology}
                  onChange={e => handleFormChange('methodology', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  <option value="case-study">Case Study</option>
                  <option value="qualitative">Qualitative</option>
                  <option value="quantitative">Quantitative</option>
                  <option value="mixed">Mixed Methods</option>
                  <option value="systematic-review">Systematic Review</option>
                  <option value="meta-analysis">Meta-Analysis</option>
                </select>
              </div>
            </div>

            {/* Authors */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Authors *</h3>
              {formData.authors.map((author, index) => (
                <div key={index} className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={author.name}
                      onChange={e => handleAuthorChange(index, 'name', e.target.value)}
                      placeholder="Full name"
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="email"
                      value={author.email}
                      onChange={e => handleAuthorChange(index, 'email', e.target.value)}
                      placeholder="Email address"
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={author.affiliation}
                      onChange={e => handleAuthorChange(index, 'affiliation', e.target.value)}
                      placeholder="Affiliation"
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={author.orcid}
                      onChange={e => handleAuthorChange(index, 'orcid', e.target.value)}
                      placeholder="ORCID (optional)"
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {formData.authors.length > 1 && (
                    <button
                      onClick={() => removeAuthor(index)}
                      className="mt-2 text-red-600 text-sm hover:text-red-700"
                    >
                      Remove author
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addAuthor}
                className="text-blue-600 text-sm hover:text-blue-700 font-medium"
              >
                + Add co-author
              </button>
            </div>

            {/* Additional fields */}
            <div className="border-t pt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Funding Statement
                </label>
                <textarea
                  value={formData.fundingStatement}
                  onChange={e => handleFormChange('fundingStatement', e.target.value)}
                  placeholder="e.g., 'Funded by...' or 'No funding received'"
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conflict of Interest
                </label>
                <textarea
                  value={formData.conflictOfInterest}
                  onChange={e => handleFormChange('conflictOfInterest', e.target.value)}
                  placeholder="Disclose any financial or personal interests"
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Availability
                </label>
                <textarea
                  value={formData.dataAvailability}
                  onChange={e => handleFormChange('dataAvailability', e.target.value)}
                  placeholder="Where data can be accessed or 'Not available'"
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(2)}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
              >
                Next: Upload Manuscript
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Upload Manuscript */}
        {step === 2 && (
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Paste Your Manuscript (Markdown)</h2>
              <p className="text-gray-600 mb-4">
                Paste your complete manuscript in markdown format. Use YAML frontmatter at the top for metadata.
              </p>
              <textarea
                value={markdownContent}
                onChange={handleMarkdownPaste}
                placeholder="Paste your markdown manuscript here..."
                rows={15}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-2">
                Min 1000 characters (~150 words)
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 font-medium"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!markdownContent || markdownContent.length < 1000}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400"
              >
                Next: Review
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Review Your Submission</h2>

              <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Title</p>
                  <p className="font-semibold">{formData.title}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Abstract</p>
                  <p className="text-gray-800">{formData.abstract}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Authors</p>
                  <ul className="text-gray-800">
                    {formData.authors.map((a, i) => (
                      <li key={i}>
                        {a.name} ({a.email})
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Manuscript length</p>
                  <p className="text-gray-800">
                    {Math.round(formData.body.length / 5)} words
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(2)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 font-medium"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm & Submit */}
        {step === 4 && (
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Ready to Submit</h2>
              <p className="text-gray-600 mb-4">
                By submitting, you agree to our publication policies and understand that your manuscript will go through peer review.
              </p>

              <div className="space-y-3 bg-blue-50 p-4 rounded-lg mb-6">
                <label className="flex items-start gap-3">
                  <input type="checkbox" required className="mt-1" />
                  <span className="text-sm text-gray-700">
                    I confirm that all authors have agreed to submit this manuscript
                  </span>
                </label>
                <label className="flex items-start gap-3">
                  <input type="checkbox" required className="mt-1" />
                  <span className="text-sm text-gray-700">
                    I have disclosed all conflicts of interest
                  </span>
                </label>
                <label className="flex items-start gap-3">
                  <input type="checkbox" required className="mt-1" />
                  <span className="text-sm text-gray-700">
                    I agree to the terms of publication
                  </span>
                </label>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(3)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 font-medium"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium disabled:bg-gray-400"
              >
                {loading ? 'Submitting...' : 'Submit Manuscript'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Parse markdown with YAML frontmatter
 */
function parseMarkdownWithYAML(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    throw new Error('No YAML frontmatter found. Ensure markdown starts with --- and frontmatter ends with ---');
  }

  const yamlText = match[1];
  const body = match[2].trim();

  const frontmatter = {};
  const lines = yamlText.split('\n');

  let current = null;
  let inArray = false;

  for (const line of lines) {
    if (line.trim() === '') continue;

    if (line.startsWith('  - ')) {
      // Array item
      if (current && !Array.isArray(frontmatter[current])) {
        frontmatter[current] = [];
      }
      if (current) {
        frontmatter[current].push(line.replace('  - ', '').trim());
      }
    } else if (line.includes(':')) {
      const [key, ...valueParts] = line.split(':');
      const keyTrimmed = key.trim();
      const valueTrimmed = valueParts.join(':').trim();

      if (valueTrimmed && valueTrimmed !== '' && !valueTrimmed.startsWith('[')) {
        frontmatter[keyTrimmed] = valueTrimmed;
        current = keyTrimmed;
      } else {
        frontmatter[keyTrimmed] = [];
        current = keyTrimmed;
      }
    }
  }

  return { frontmatter, body };
}
