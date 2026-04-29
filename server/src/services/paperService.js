import Paper from '../models/Paper.js';
import logger from '../utils/logger.js';

const OPENALEX_BASE_URL = 'https://api.openalex.org/works';
const DEDUPE_TITLE_THRESHOLD = 0.88;

const stripHtml = (text) => (text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const normalizeTitle = (text) =>
  (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (text) => normalizeTitle(text).split(' ').filter(Boolean);

const jaccardSimilarity = (a, b) => {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (!setA.size || !setB.size) return 0;
  let overlap = 0;
  for (const token of setA) {
    if (setB.has(token)) overlap += 1;
  }
  return overlap / (setA.size + setB.size - overlap);
};

const mergeProvenance = (existing = [], incoming = []) => {
  const byKey = new Map();
  for (const item of [...existing, ...incoming]) {
    const key = `${item.source}:${item.sourceId || ''}`;
    byKey.set(key, item);
  }
  return Array.from(byKey.values());
};

const getCandidateWindow = (publicationYear) => {
  if (!publicationYear) return {};
  return { $gte: Number(publicationYear) - 1, $lte: Number(publicationYear) + 1 };
};

const findExistingPaperForDedupe = async (normalized) => {
  if (normalized.doi) {
    const byDoi = await Paper.findOne({ doi: normalized.doi }).lean();
    if (byDoi) return byDoi;
  }

  if (normalized.externalIds?.openAlex) {
    const byOpenAlex = await Paper.findOne({
      'externalIds.openAlex': normalized.externalIds.openAlex,
    }).lean();
    if (byOpenAlex) return byOpenAlex;
  }

  if (normalized.normalizedTitle) {
    const exactTitle = await Paper.findOne({
      normalizedTitle: normalized.normalizedTitle,
      ...(normalized.publicationYear ? { publicationYear: normalized.publicationYear } : {}),
    }).lean();
    if (exactTitle) return exactTitle;
  }

  const firstWords = tokenize(normalized.title).slice(0, 5);
  const fallbackRegex = firstWords.length
    ? new RegExp(firstWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i')
    : null;

  const candidates = await Paper.find({
    ...(fallbackRegex ? { title: fallbackRegex } : {}),
    ...(normalized.publicationYear
      ? { publicationYear: getCandidateWindow(normalized.publicationYear) }
      : {}),
  })
    .sort({ publicationYear: -1, citationsCount: -1 })
    .limit(30)
    .lean();

  let bestCandidate = null;
  let bestScore = 0;
  for (const candidate of candidates) {
    const score = jaccardSimilarity(normalized.title, candidate.title);
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  if (bestCandidate && bestScore >= DEDUPE_TITLE_THRESHOLD) {
    return bestCandidate;
  }

  return null;
};

const normalizeOpenAlexWork = (work) => {
  const doi = (work.doi || '').replace('https://doi.org/', '').toLowerCase().trim();

  const bestOaLocation = work?.best_oa_location || {};
  const source = bestOaLocation?.source || {};

  return {
    title: work.title || 'Untitled paper',
    normalizedTitle: normalizeTitle(work.title || ''),
    abstract: stripHtml(work.abstract || ''),
    doi: doi || undefined,
    externalIds: {
      openAlex: work.id,
      crossref: work.ids?.crossref || undefined,
      pubmed: work.ids?.pmid || undefined,
    },
    authors: (work.authorships || []).map((a) => ({
      name: a.author?.display_name || 'Unknown',
      affiliation: a.institutions?.[0]?.display_name || undefined,
      orcid: a.author?.orcid || undefined,
    })),
    journal: {
      name: source.display_name || work.primary_location?.source?.display_name || undefined,
      issn: source.issn_l || undefined,
      publisher: source.host_organization_name || undefined,
    },
    publishedAt: work.publication_date ? new Date(work.publication_date) : undefined,
    publicationYear: work.publication_year || undefined,
    keywords: (work.keywords || []).map((k) => k.display_name).slice(0, 20),
    topics: (work.topics || []).map((t) => t.display_name).slice(0, 20),
    referencesCount: Number(work.referenced_works_count || 0),
    referencesOpenAlex: (work.referenced_works || []).slice(0, 250),
    citationsCount: Number(work.cited_by_count || 0),
    isOpenAccess: Boolean(work.open_access?.is_oa),
    urls: {
      landing: work.primary_location?.landing_page_url || undefined,
      source: work.id,
      pdf: bestOaLocation?.pdf_url || undefined,
    },
    sourceProvenance: [
      {
        source: 'openalex',
        sourceId: work.id,
        confidence: 0.9,
        fetchedAt: new Date(),
      },
    ],
    qualityScore: Math.min(100, 35 + Math.log10((work.cited_by_count || 0) + 1) * 15),
    trustFlags: [],
  };
};

const getMailto = () => process.env.OPENALEX_EMAIL || 'support@mind-meditate.com';

const fetchOpenAlexSearchPage = async ({ query, page, perPage }) => {
  const mailto = getMailto();
  const url = new URL(OPENALEX_BASE_URL);
  url.searchParams.set('search', query);
  url.searchParams.set('page', String(page));
  url.searchParams.set('per-page', String(perPage));
  url.searchParams.set('mailto', mailto);

  logger.info(`📥 OpenAlex ingest page: ${url.toString()}`);
  const response = await fetch(url, {
    headers: {
      'User-Agent': `NexusJournal/1.0 (${mailto})`,
    },
  });

  if (!response.ok) {
    throw {
      status: 502,
      message: `OpenAlex request failed: ${response.status}`,
    };
  }

  const payload = await response.json();
  return payload.results || [];
};

const fetchOpenAlexWorkById = async (openAlexId) => {
  const mailto = getMailto();
  const idPath = String(openAlexId || '').replace('https://openalex.org/', '');
  if (!idPath) return null;

  const url = new URL(`${OPENALEX_BASE_URL}/${idPath}`);
  url.searchParams.set('mailto', mailto);

  const response = await fetch(url, {
    headers: {
      'User-Agent': `NexusJournal/1.0 (${mailto})`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
};

const upsertNormalizedPaper = async (normalized) => {
  const existing = await findExistingPaperForDedupe(normalized);
  if (existing) {
    const mergedProvenance = mergeProvenance(existing.sourceProvenance, normalized.sourceProvenance);
    await Paper.updateOne(
      { _id: existing._id },
      {
        $set: {
          ...normalized,
          sourceProvenance: mergedProvenance,
        },
      }
    );

    return {
      action: 'updated',
      dedupeMatched:
        normalized.doi &&
        existing.doi !== normalized.doi &&
        existing.normalizedTitle === normalized.normalizedTitle,
    };
  }

  try {
    await Paper.create(normalized);
    return { action: 'inserted', dedupeMatched: false };
  } catch (error) {
    if (error?.code === 11000 && normalized.doi) {
      await Paper.updateOne({ doi: normalized.doi }, { $set: normalized });
      return { action: 'updated', dedupeMatched: false };
    }
    throw error;
  }
};

export const searchPapers = async (query, filters = {}, page = 1, limit = 20) => {
  const searchFilter = {};

  if (filters.openAccess === 'true' || filters.openAccess === true) {
    searchFilter.isOpenAccess = true;
  }

  if (filters.source) {
    searchFilter['sourceProvenance.source'] = filters.source;
  }

  if (filters.yearFrom || filters.yearTo) {
    searchFilter.publicationYear = {};
    if (filters.yearFrom) searchFilter.publicationYear.$gte = Number(filters.yearFrom);
    if (filters.yearTo) searchFilter.publicationYear.$lte = Number(filters.yearTo);
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;

  let papers;
  if (query && query.trim()) {
    papers = await Paper.find(
      {
        ...searchFilter,
        $text: { $search: query.trim() },
      },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' }, citationsCount: -1, publicationYear: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean();
  } else {
    papers = await Paper.find(searchFilter)
      .sort({ publicationYear: -1, citationsCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean();
  }

  const total = await Paper.countDocuments(
    query && query.trim()
      ? {
          ...searchFilter,
          $text: { $search: query.trim() },
        }
      : searchFilter
  );

  return {
    papers,
    total,
    page: safePage,
    limit: safeLimit,
  };
};

export const getPaperById = async (paperId) => {
  const paper = await Paper.findById(paperId).lean();
  if (!paper) {
    throw { status: 404, message: 'Paper not found' };
  }
  return paper;
};

export const ingestOpenAlexBatch = async ({
  query = 'ayurveda',
  page = 1,
  perPage = 25,
  pages = 1,
  includeReferencedWorks = false,
  maxReferencedPerWork = 8,
}) => {
  const safePerPage = Math.min(50, Math.max(1, Number(perPage) || 25));
  const startPage = Math.max(1, Number(page) || 1);
  const safePages = Math.min(10, Math.max(1, Number(pages) || 1));
  const safeMaxReferencedPerWork = Math.min(20, Math.max(1, Number(maxReferencedPerWork) || 8));

  const works = [];
  for (let offset = 0; offset < safePages; offset += 1) {
    const pageWorks = await fetchOpenAlexSearchPage({
      query,
      page: startPage + offset,
      perPage: safePerPage,
    });
    works.push(...pageWorks);

    // Stop early if source page returns less than requested page size.
    if (pageWorks.length < safePerPage) {
      break;
    }
  }

  let inserted = 0;
  let updated = 0;
  let dedupeMatched = 0;
  let referencedFetched = 0;
  let referencedInserted = 0;
  let referencedUpdated = 0;
  let referencedSkipped = 0;

  for (const work of works) {
    const normalized = normalizeOpenAlexWork(work);
    const upsertResult = await upsertNormalizedPaper(normalized);
    if (upsertResult.action === 'inserted') inserted += 1;
    if (upsertResult.action === 'updated') updated += 1;
    if (upsertResult.dedupeMatched) dedupeMatched += 1;

    if (includeReferencedWorks) {
      const refIds = (normalized.referencesOpenAlex || []).slice(0, safeMaxReferencedPerWork);
      for (const refId of refIds) {
        const alreadyExists = await Paper.exists({ 'externalIds.openAlex': refId });
        if (alreadyExists) {
          referencedSkipped += 1;
          continue;
        }

        const refWork = await fetchOpenAlexWorkById(refId);
        if (!refWork) {
          referencedSkipped += 1;
          continue;
        }

        referencedFetched += 1;
        const normalizedRef = normalizeOpenAlexWork(refWork);
        const refUpsert = await upsertNormalizedPaper(normalizedRef);
        if (refUpsert.action === 'inserted') referencedInserted += 1;
        if (refUpsert.action === 'updated') referencedUpdated += 1;
      }
    }
  }

  if (works.length === 0) {
    return {
      source: 'openalex',
      query,
      ingested: 0,
      matched: 0,
      modified: 0,
      upserted: 0,
      dedupeMatched: 0,
      pagesRequested: safePages,
      pagesProcessed: 0,
      includeReferencedWorks,
      referencedFetched: 0,
      referencedInserted: 0,
      referencedUpdated: 0,
      referencedSkipped: 0,
    };
  }

  return {
    source: 'openalex',
    query,
    pagesRequested: safePages,
    pagesProcessed: Math.ceil(works.length / safePerPage),
    ingested: works.length,
    matched: updated,
    modified: updated,
    upserted: inserted,
    dedupeMatched,
    includeReferencedWorks,
    referencedFetched,
    referencedInserted,
    referencedUpdated,
    referencedSkipped,
  };
};

export const getPaperGraph = async (paperId, limit = 20) => {
  const safeLimit = Math.min(50, Math.max(5, Number(limit) || 20));
  const center = await Paper.findById(paperId).lean();
  if (!center) {
    throw { status: 404, message: 'Paper not found' };
  }

  const nodes = [];
  const edges = [];
  nodes.push({
    id: center._id.toString(),
    type: 'paper',
    role: 'center',
    title: center.title,
    publicationYear: center.publicationYear,
    citationsCount: center.citationsCount || 0,
  });

  // --- Reference edges (center → papers it cites) ---
  const refOpenAlexIds = (center.referencesOpenAlex || []).slice(0, safeLimit);
  const centerRefSet = new Set(refOpenAlexIds);

  if (refOpenAlexIds.length > 0) {
    const refPapers = await Paper.find({ 'externalIds.openAlex': { $in: refOpenAlexIds } })
      .limit(safeLimit)
      .lean();

    for (const ref of refPapers) {
      const refId = ref._id.toString();
      // Shared-reference weight: how many of center's refs does this ref also cite?
      const sharedRefCount = (ref.referencesOpenAlex || []).filter(
        (id) => centerRefSet.has(id) && id !== ref.externalIds?.openAlex
      ).length;

      nodes.push({
        id: refId,
        type: 'paper',
        role: 'reference',
        title: ref.title,
        publicationYear: ref.publicationYear,
        citationsCount: ref.citationsCount || 0,
      });
      edges.push({
        source: center._id.toString(),
        target: refId,
        relation: 'references',
        // weight encodes bibliographic coupling strength
        weight: 1 + Math.min(sharedRefCount * 0.4, 3),
        sharedRefCount,
      });
    }
  }

  // --- Citation edges (papers that cite center → center) ---
  const centerOpenAlexId = center.externalIds?.openAlex;
  if (centerOpenAlexId) {
    const citingPapers = await Paper.find({ referencesOpenAlex: centerOpenAlexId })
      .sort({ citationsCount: -1, publicationYear: -1 })
      .limit(safeLimit)
      .lean();

    for (const citing of citingPapers) {
      const citingId = citing._id.toString();
      if (!nodes.some((n) => n.id === citingId)) {
        nodes.push({
          id: citingId,
          type: 'paper',
          role: 'citation',
          title: citing.title,
          publicationYear: citing.publicationYear,
          citationsCount: citing.citationsCount || 0,
        });
      }
      edges.push({
        source: citingId,
        target: center._id.toString(),
        relation: 'cites',
        weight: 1,
        sharedRefCount: 0,
      });
    }
  }

  // --- Co-citation edges between reference-node pairs ---
  // Two reference nodes are co-cited if a third paper (in DB) cites both of them.
  // We compute this efficiently: collect all papers that cite any reference node,
  // then count how many papers cite each PAIR.
  const refNodeOpenAlexIds = nodes
    .filter((n) => n.role === 'reference')
    .map((n) => {
      const paper = edges
        .filter((e) => e.target === n.id && e.relation === 'references')
        .map((e) => e.target)[0];
      return n.id;
    });

  if (refNodeOpenAlexIds.length >= 2) {
    // Find the OpenAlex IDs for our reference nodes
    const refNodePapers = nodes
      .filter((n) => n.role === 'reference')
      .map((n) => n);

    // For each ref node pair, infer co-citation from the citing papers we already fetched
    // (papers that cite center + their referencesOpenAlex overlap with our ref nodes)
    const refNodeIdSet = new Set(refNodeOpenAlexIds);

    const coCircledPapers = await Paper.find({
      _id: { $nin: [center._id] },
      referencesOpenAlex: { $in: refOpenAlexIds },
    })
      .select('referencesOpenAlex')
      .limit(200)
      .lean();

    // For each pair of ref nodes, count how many papers cite both
    const pairCount = new Map();
    for (const p of coCircledPapers) {
      const citedRefIds = (p.referencesOpenAlex || []).filter((id) => centerRefSet.has(id));
      for (let i = 0; i < citedRefIds.length; i++) {
        for (let j = i + 1; j < citedRefIds.length; j++) {
          const key = [citedRefIds[i], citedRefIds[j]].sort().join('||');
          pairCount.set(key, (pairCount.get(key) || 0) + 1);
        }
      }
    }

    // Add co-citation edges for pairs with >= 2 shared citers (meaningful signal)
    const nodeByOpenAlexId = new Map();
    for (const n of nodes) {
      // We need to map OpenAlex IDs back to node IDs
    }
    // Resolve openAlex ID → node ID via the refPapers we already queried
    const refPapersForCoCitation = await Paper.find({
      'externalIds.openAlex': { $in: refOpenAlexIds },
    })
      .select('_id externalIds')
      .lean();

    const oaIdToNodeId = new Map();
    for (const p of refPapersForCoCitation) {
      if (p.externalIds?.openAlex) {
        oaIdToNodeId.set(p.externalIds.openAlex, p._id.toString());
      }
    }

    for (const [key, count] of pairCount) {
      if (count < 2) continue;
      const [oaA, oaB] = key.split('||');
      const nodeA = oaIdToNodeId.get(oaA);
      const nodeB = oaIdToNodeId.get(oaB);
      if (!nodeA || !nodeB) continue;
      if (edges.some((e) => e.source === nodeA && e.target === nodeB && e.relation === 'co-citation')) continue;
      edges.push({
        source: nodeA,
        target: nodeB,
        relation: 'co-citation',
        weight: Math.min(count * 0.5, 4),
        coCitationCount: count,
      });
    }
  }

  return {
    center: center._id,
    nodes,
    edges,
    summary: {
      referencesInGraph: edges.filter((e) => e.relation === 'references').length,
      citationsInGraph: edges.filter((e) => e.relation === 'cites').length,
      coCitationEdges: edges.filter((e) => e.relation === 'co-citation').length,
    },
  };
};

export const getRelatedPapers = async (paperId, limit = 8) => {
  const safeLimit = Math.min(20, Math.max(1, Number(limit) || 8));
  const center = await Paper.findById(paperId).lean();
  if (!center) {
    throw { status: 404, message: 'Paper not found' };
  }

  const centerRefSet = new Set(center.referencesOpenAlex || []);
  const centerOpenAlexId = center.externalIds?.openAlex;

  const keywordPool = [...(center.keywords || []), ...(center.topics || [])]
    .map((k) => k.toLowerCase())
    .slice(0, 20);

  // Co-citation map: centerOAId's co-citers → how many DB papers also reference them
  const coCitationMap = new Map(); // candidateOpenAlexId → count
  if (centerOpenAlexId) {
    // Papers that cite center
    const centerCiters = await Paper.find({ referencesOpenAlex: centerOpenAlexId })
      .select('referencesOpenAlex')
      .limit(300)
      .lean();

    for (const citer of centerCiters) {
      for (const refId of citer.referencesOpenAlex || []) {
        if (refId !== centerOpenAlexId) {
          coCitationMap.set(refId, (coCitationMap.get(refId) || 0) + 1);
        }
      }
    }
  }

  // Candidate query: topic/keyword match, bibliographic match (is referenced by center), or same journal
  const refSample = [...centerRefSet].slice(0, 50); // limit $in size
  const candidates = await Paper.find({
    _id: { $ne: center._id },
    $or: [
      ...(keywordPool.length ? [{ keywords: { $in: keywordPool } }, { topics: { $in: keywordPool } }] : []),
      ...(refSample.length ? [{ 'externalIds.openAlex': { $in: refSample } }] : []),
      ...(center.journal?.name ? [{ 'journal.name': center.journal.name }] : []),
    ],
  })
    .sort({ citationsCount: -1, publicationYear: -1 })
    .limit(150)
    .lean();

  const scored = candidates.map((candidate) => {
    // Topic overlap
    const candidateTerms = new Set(
      [...(candidate.keywords || []), ...(candidate.topics || [])].map((k) => k.toLowerCase())
    );
    let topicOverlap = 0;
    for (const term of keywordPool) {
      if (candidateTerms.has(term)) topicOverlap += 1;
    }

    // Shared references (bibliographic coupling): papers that share many of the same references
    // tend to address the same topic area even if their vocabulary differs.
    const candidateRefSet = new Set(candidate.referencesOpenAlex || []);
    let sharedRefs = 0;
    for (const refId of centerRefSet) {
      if (candidateRefSet.has(refId)) sharedRefs += 1;
    }

    // Co-citation score: count of DB papers that cite BOTH center and this candidate
    const candidateOAId = candidate.externalIds?.openAlex;
    const coCitationCount = candidateOAId ? (coCitationMap.get(candidateOAId) || 0) : 0;

    const sameJournal =
      center.journal?.name &&
      candidate.journal?.name &&
      center.journal.name === candidate.journal.name
        ? 1
        : 0;
    const yearDistance = Math.abs(
      (center.publicationYear || 0) - (candidate.publicationYear || 0)
    );
    const yearBoost = yearDistance <= 2 ? 1 : 0;
    const citationBoost = Math.log10((candidate.citationsCount || 0) + 1) * 0.35;

    const relevanceScore =
      topicOverlap * 1.8 +
      sharedRefs * 2.5 +
      coCitationCount * 1.5 +
      sameJournal * 1.2 +
      yearBoost +
      citationBoost;

    return {
      ...candidate,
      relevanceScore,
      _scoring: { topicOverlap, sharedRefs, coCitationCount },
    };
  });

  return scored.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, safeLimit);
};

// Named exports for unit testing
export { jaccardSimilarity, normalizeTitle };

export default {
  searchPapers,
  getPaperById,
  ingestOpenAlexBatch,
  getPaperGraph,
  getRelatedPapers,
};