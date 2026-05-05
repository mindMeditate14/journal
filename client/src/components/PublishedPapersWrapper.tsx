import { useAuthStore } from '../utils/authStore';
import SidebarLayout from './SidebarLayout';
import PublishedPapersPage from '../pages/PublishedPapersPage';

export default function PublishedPapersWrapper() {
  const user = useAuthStore((state) => state.user);

  if (user) {
    return (
      <SidebarLayout>
        <PublishedPapersPage />
      </SidebarLayout>
    );
  }

  return <PublishedPapersPage />;
}
