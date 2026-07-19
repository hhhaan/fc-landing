import { defaultScores, normalizeDescriptors, type ScaV1Scores } from './score';

export type SampleDraft = {
    scores: ScaV1Scores;
    defects: number;
    notes: string;
    descriptors: string[];
    /** Remote cuppings.id after sync */
    remoteId?: string;
    remoteTotal?: number;
    /** Differs from last successful sync / never synced after edit */
    dirty: boolean;
};

export type SessionDraftStore = {
    v: 1;
    cuppedBy: string;
    drafts: Record<string, SampleDraft>;
};

const CUPPED_BY_KEY = 'fc_cupping_cupped_by';

export function draftStorageKey(token: string): string {
    return `fc_cupping_session_${token}`;
}

export function emptyDraft(): SampleDraft {
    return {
        scores: defaultScores(6),
        defects: 0,
        notes: '',
        descriptors: [],
        dirty: false,
    };
}

export function loadCuppedBy(): string {
    try {
        return localStorage.getItem(CUPPED_BY_KEY) ?? '';
    } catch {
        return '';
    }
}

export function saveCuppedBy(name: string) {
    try {
        if (name.trim()) localStorage.setItem(CUPPED_BY_KEY, name.trim());
    } catch {
        /* ignore */
    }
}

export function loadSessionDraft(token: string): SessionDraftStore | null {
    try {
        const raw = localStorage.getItem(draftStorageKey(token));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as SessionDraftStore;
        if (parsed?.v !== 1 || !parsed.drafts || typeof parsed.drafts !== 'object') return null;
        return parsed;
    } catch {
        return null;
    }
}

export function persistSessionDraft(token: string, store: SessionDraftStore) {
    try {
        localStorage.setItem(draftStorageKey(token), JSON.stringify(store));
        if (store.cuppedBy.trim()) saveCuppedBy(store.cuppedBy);
    } catch {
        /* ignore */
    }
}

export function ensureDrafts(sampleIds: string[], prev: Record<string, SampleDraft>): Record<string, SampleDraft> {
    const next = { ...prev };
    for (const id of sampleIds) {
        if (!next[id]) next[id] = emptyDraft();
    }
    return next;
}

export function draftFromStore(
    store: SessionDraftStore | null,
    sampleIds: string[],
    fallbackName: string,
): { cuppedBy: string; drafts: Record<string, SampleDraft> } {
    const drafts = ensureDrafts(sampleIds, store?.drafts ?? {});
    // Normalize descriptors in restored drafts
    for (const id of Object.keys(drafts)) {
        const d = drafts[id];
        drafts[id] = {
            ...d,
            descriptors: normalizeDescriptors(d.descriptors),
            scores: d.scores ?? defaultScores(6),
            defects: typeof d.defects === 'number' ? Math.max(0, d.defects) : 0,
            notes: typeof d.notes === 'string' ? d.notes : '',
            dirty: Boolean(d.dirty),
        };
    }
    return {
        cuppedBy: store?.cuppedBy?.trim() || fallbackName,
        drafts,
    };
}
