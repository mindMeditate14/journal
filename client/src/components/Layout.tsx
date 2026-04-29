import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../utils/authStore';
import { Menu, LogOut, Search, Home, Plus, Shield } from 'lucide-react';
import { useState } from 'react';
import { Role } from '../types';

const hasRole = (role: Role, roles?: Role[], fallbackRole?: Role) => {
  if (Array.isArray(roles) && roles.length > 0) {
    return roles.includes(role);
  }
  return fallbackRole === role;
};

export default function Layout() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = hasRole('admin', user?.roles, user?.role);
  const isEditor = hasRole('editor', user?.roles, user?.role) || isAdmin;
  const roleBadges = Array.isArray(user?.roles) && user.roles.length > 0
    ? user.roles
    : (user?.role ? [user.role] : []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-indigo-600">NexusJournal</h1>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-gray-700 hover:text-indigo-600"
            >
              <Home size={20} />
              Dashboard
            </button>
            <button
              onClick={() => navigate('/search')}
              className="flex items-center gap-2 text-gray-700 hover:text-indigo-600"
            >
              <Search size={20} />
              Search
            </button>
            <button
              onClick={() => navigate('/manuscripts/create')}
              className="flex items-center gap-2 text-gray-700 hover:text-indigo-600"
            >
              <Plus size={20} />
              Create
            </button>
            <button
              onClick={() => navigate('/practice-data/create')}
              className="flex items-center gap-2 text-gray-700 hover:text-indigo-600"
            >
              <Plus size={20} />
              Practice Data
            </button>
            {isEditor && (
              <button
                onClick={() => navigate('/editor/dashboard')}
                className="flex items-center gap-2 text-gray-700 hover:text-indigo-600"
              >
                <Shield size={20} />
                Editor
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2 text-gray-700 hover:text-indigo-600"
              >
                <Shield size={20} />
                Admin
              </button>
            )}
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">{user?.email}</span>
              {roleBadges.map((role) => (
                <span
                  key={role}
                  className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                    role === 'admin'
                      ? 'bg-amber-100 text-amber-800'
                      : role === 'editor'
                        ? 'bg-violet-100 text-violet-800'
                        : 'bg-indigo-100 text-indigo-800'
                  }`}
                >
                  {role.toUpperCase()}
                </span>
              ))}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-700 hover:text-red-600"
            >
              <LogOut size={20} />
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t p-4 space-y-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full text-left px-4 py-2 hover:bg-gray-100"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate('/search')}
              className="w-full text-left px-4 py-2 hover:bg-gray-100"
            >
              Search
            </button>
            <button
              onClick={() => navigate('/manuscripts/create')}
              className="w-full text-left px-4 py-2 hover:bg-gray-100"
            >
              Create Manuscript
            </button>
            <button
              onClick={() => navigate('/practice-data/create')}
              className="w-full text-left px-4 py-2 hover:bg-gray-100"
            >
              Practice Data
            </button>
            {isEditor && (
              <button
                onClick={() => navigate('/editor/dashboard')}
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Editor Dashboard
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Admin
              </button>
            )}
          </div>
        )}
      </header>

      {/* Main content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}
