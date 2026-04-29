import { useAuthStore } from '../utils/authStore';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectAPI, journalAPI } from '../services/api';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Role } from '../types';

const hasRole = (target: Role, roles?: Role[], fallbackRole?: Role) => {
  if (Array.isArray(roles) && roles.length > 0) {
    return roles.includes(target);
  }
  return fallbackRole === target;
};

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitJournalId, setSubmitJournalId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await projectAPI.list();
        setProjects(data);
      } catch (error) {
        toast.error('Failed to load projects');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchProjects();
    }
  }, [user]);

  useEffect(() => {
    const loadJournalTarget = async () => {
      if (!user) return;
      try {
        const result = await journalAPI.search('', {}, 1, 1);
        const first = result?.journals?.[0] || result?.items?.[0] || result?.data?.[0] || null;
        if (first?._id) {
          setSubmitJournalId(first._id);
        }
      } catch {
        // Non-blocking for dashboard
      }
    };

    loadJournalTarget();
  }, [user]);

  const isAdmin = hasRole('admin', user?.roles, user?.role);
  const isEditor = hasRole('editor', user?.roles, user?.role) || isAdmin;
  const isResearcher = hasRole('researcher', user?.roles, user?.role) || isAdmin;

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Welcome, {user.profile?.firstName || user.email}
        </h1>
        <p className="text-gray-600 mb-8">
          Manage your research projects and manuscripts
        </p>

        {(isEditor || isResearcher) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {isResearcher && (
              <div className="bg-white rounded-lg shadow p-6 border border-indigo-100">
                <h3 className="text-lg font-semibold text-gray-900">Researcher Actions</h3>
                <p className="text-sm text-gray-600 mt-1 mb-4">
                  Create and submit manuscripts to journals.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/journals')}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                >
                  Open Submission Form
                </button>
              </div>
            )}

            {isEditor && (
              <div className="bg-white rounded-lg shadow p-6 border border-violet-100">
                <h3 className="text-lg font-semibold text-gray-900">Editor Actions</h3>
                <p className="text-sm text-gray-600 mt-1 mb-4">
                  Review submissions, assign reviewers, and publish accepted manuscripts.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/editor/dashboard')}
                  className="bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700"
                >
                  Open Editor Dashboard
                </button>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900">Projects</h3>
            <p className="text-3xl font-bold text-indigo-600 mt-2">{projects.length}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900">Drafts</h3>
            <p className="text-3xl font-bold text-indigo-600 mt-2">0</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900">Published</h3>
            <p className="text-3xl font-bold text-indigo-600 mt-2">0</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">My Projects</h2>
            <button
              onClick={() => navigate('/workspace/projects/new')}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              New Project
            </button>
          </div>

          {loading ? (
            <p className="p-6 text-gray-600">Loading...</p>
          ) : projects.length === 0 ? (
            <p className="p-6 text-gray-600">No projects yet. Create one to get started!</p>
          ) : (
            <div className="divide-y">
              {projects.map((project: any) => (
                <div key={project._id} className="p-6 hover:bg-gray-50 cursor-pointer">
                  <h3 className="text-lg font-semibold text-gray-900">{project.title}</h3>
                  <p className="text-gray-600 mt-1">{project.description}</p>
                  <div className="mt-4 flex gap-2">
                    <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                      {project.manuscripts?.length || 0} manuscripts
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
