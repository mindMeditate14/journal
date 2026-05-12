import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { DISCIPLINES as FALLBACK_DISCIPLINES, METHODOLOGIES as FALLBACK_METHODOLOGIES } from '../constants/manuscriptOptions';

type ClassificationItem = { value: string; label: string };

interface Classifications {
  disciplines: ClassificationItem[];
  methodologies: ClassificationItem[];
  loading: boolean;
}

let cache: { disciplines: ClassificationItem[]; methodologies: ClassificationItem[] } | null = null;

export function useClassifications(): Classifications {
  const [disciplines, setDisciplines] = useState<ClassificationItem[]>(FALLBACK_DISCIPLINES);
  const [methodologies, setMethodologies] = useState<ClassificationItem[]>(FALLBACK_METHODOLOGIES);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) {
      setDisciplines(cache.disciplines);
      setMethodologies(cache.methodologies);
      return;
    }
    apiClient.get('/config/classifications')
      .then(res => {
        cache = { disciplines: res.data.disciplines, methodologies: res.data.methodologies };
        setDisciplines(cache.disciplines);
        setMethodologies(cache.methodologies);
      })
      .catch(() => { /* silently fall back to hardcoded */ })
      .finally(() => setLoading(false));
  }, []);

  return { disciplines, methodologies, loading };
}

export function invalidateClassificationsCache() {
  cache = null;
}
