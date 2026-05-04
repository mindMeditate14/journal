import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../utils/authStore';
import SidebarLayout from './SidebarLayout';
import PublishedPapersPage from '../pages/PublishedPapersPage';

export default function PublishedPapersWrapper() {
  const user = useAuthStore((state) => state.user);

  // If user is logged in, show sidebar wrapper (renders via Outlet)
  if (user) {
    return <SidebarLayout />;
  }

  // If not logged in, show public version directly
  return <PublishedPapersPage />;
}
