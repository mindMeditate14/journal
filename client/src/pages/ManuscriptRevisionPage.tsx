import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// Redirects to the unified edit page which handles drafts, revisions, and review feedback
export default function ManuscriptRevisionPage() {
  const { manuscriptId } = useParams<{ manuscriptId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    navigate(`/manuscripts/${manuscriptId}/edit`, { replace: true });
  }, [manuscriptId, navigate]);

  return null;
}
