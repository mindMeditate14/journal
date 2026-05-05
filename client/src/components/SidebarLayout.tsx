import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../utils/authStore';
import { Menu, X, Home, Search, BookOpen, Plus, Shield, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { ReactNode } from 'react';
import { Role } from '../types';

const hasRole = (role: Role, roles?: Role[], fallbackRole?: Role) => {
  if (Array.isArray(roles) && roles.length > 0) {
    return roles.includes(role);
  }
  return fallbackRole === role;
};

const NavItem = ({ icon: Icon, label, path, isActive, onClick, collapsed }: { 
  icon: any; 
  label: string; 
  path?: string; 
  isActive?: boolean; 
  onClick?: () => void;
  collapsed: boolean;
}) => (
  <button
    onClick={onClick || (() => window.location.href = path)}
    className={`
      w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
      ${isActive 
        ? 'bg-indigo-600 text-white' 
        : 'text-gray-600 hover:bg-gray-100 hover:text-indigo-600'
      }
      ${collapsed ? 'justify-center' : ''}
    `}
  >
    <Icon size={20} />
    {!collapsed && <span className="font-medium">{label}</span>}
  </button>
);

export default function SidebarLayout({ children }: { children?: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = hasRole('admin', user?.roles, user?.role);
  const isEditor = hasRole('editor', user?.roles, user?.role) || isAdmin;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: BookOpen, label: 'Published Papers', path: '/papers' },
    { icon: Plus, label: 'Create Manuscript', path: '/manuscripts/create' },
    ...(isEditor ? [{ icon: Shield, label: 'Editor', path: '/editor/dashboard' }] : []),
    ...(isAdmin ? [{ icon: Shield, label: 'Admin', path: '/admin' }] : []),
  ];

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className={`p-4 border-b ${collapsed ? 'text-center' : ''}`}>
        {!collapsed && (
          <h1 className="text-xl font-bold text-indigo-600">NexusJournal</h1>
        )}
        {collapsed && (
          <span className="text-2xl">📚</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <NavItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            path={item.path}
            isActive={location.pathname === item.path || location.pathname.startsWith(item.path + '/')}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* User & Logout */}
      <div className="p-2 border-t">
        <div className={`flex items-center gap-3 px-4 py-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
              <div className="flex gap-1 mt-1">
                {(user?.roles || [user?.role]).filter(Boolean).map((role: string) => (
                  <span key={role} className="text-xs bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">
                    {role}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-all ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={20} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-4 -right-3 w-6 h-6 bg-white border rounded-full shadow flex items-center justify-center text-gray-600 hover:text-indigo-600"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className={`
        hidden md:flex flex-col bg-white border-r shadow-sm relative
        ${collapsed ? 'w-20' : 'w-64'}
        transition-all duration-300
      `}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl">
            <div className="flex justify-between items-center p-4 border-b">
              <h1 className="text-xl font-bold text-indigo-600">NexusJournal</h1>
              <button onClick={() => setMobileOpen(false)} className="text-gray-500">
                <X size={24} />
              </button>
            </div>
            <nav className="p-2 space-y-1">
              {navItems.map((item) => (
                <NavItem
                  key={item.path}
                  icon={item.icon}
                  label={item.label}
                  path={item.path}
                  isActive={location.pathname === item.path}
                  collapsed={false}
                />
              ))}
            </nav>
            <div className="absolute bottom-0 left-0 right-0 p-2 border-t">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white shadow-sm p-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-indigo-600">NexusJournal</h1>
          <button 
            onClick={() => setMobileOpen(true)}
            className="p-2 text-gray-600"
          >
            <Menu size={24} />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
