import { type CuppingFormSchema, defaultScoresForForm, type FormScores, isSliderField, SCA_V1_FORM } from './form';
import { normalizeDescriptors } from './score';

export type SampleDraft = {
    scores: FormScores;
    defects: number;
    notes: string;
    descriptors: string[];
    /** Remote cuppings.id after publish (or legacy sync) */
    remoteId?: string;
    remoteTotal?: number;
    /** Local edits not yet published */
    dirty: boolean;
};

export type SessionDraftStore = {
    v: 1 | 2;
    cuppedBy: string;
    participantId?: string;
    publishedAt?: string | null;
    drafts: Record<string, SampleDraft>;
};

const CUPPED_BY_KEY = 'fc_cupping_cupped_by';

export function draftStorageKey(token: string): string {
    return `fc_cupping_session_${token}`;
}

export function emptyDraft(schema: CuppingFormSchema = SCA_V1_FORM): SampleDraft {
    return {
        scores: defaultScoresForForm(schema, 6),
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
        if ((parsed?.v !== 1 && parsed?.v !== 2) || !parsed.drafts || typeof parsed.drafts !== 'object') {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

export function persistSessionDraft(token: string, store: SessionDraftStore) {
    try {
        localStorage.setItem(draftStorageKey(token), JSON.stringify({ ...store, v: 2 }));
        if (store.cuppedBy.trim()) saveCuppedBy(store.cuppedBy);
    } catch {
        /* ignore */
    }
}

export function publishableSampleIds(sampleIds: string[], drafts: Record<string, SampleDraft>): string[] {
    return sampleIds.filter((id) => Boolean(drafts[id]?.dirty || drafts[id]?.remoteId));
}

export type RemoteSubmission = {
    id: string;
    sampleId: string;
    scores: FormScores | Record<string, unknown>;
    defects: number;
    notes: string | null;
    descriptors: string[];
    totalScore: number;
};

export function mergeSubmissions(
    drafts: Record<string, SampleDraft>,
    submissions: RemoteSubmission[],
    schema: CuppingFormSchema,
    opts: { serverWins: boolean },
): Record<string, SampleDraft> {
    const next = { ...drafts };
    for (const sub of submissions) {
        if (!sub.sampleId) continue;
        const local = next[sub.sampleId];
        if (!opts.serverWins && local?.dirty) continue;
        next[sub.sampleId] = {
            scores: alignScores(schema, sub.scores),
            defects: typeof sub.defects === 'number' ? Math.max(0, sub.defects) : 0,
            notes: typeof sub.notes === 'string' ? sub.notes : '',
            descriptors: normalizeDescriptors(sub.descriptors),
            remoteId: sub.id,
            remoteTotal: sub.totalScore,
            dirty: false,
        };
    }
    return next;
}

export function alignScores(
    schema: CuppingFormSchema,
    scores: FormScores | Record<string, unknown> | undefined,
): FormScores {
    const next = defaultScoresForForm(schema, 6);
    if (!scores) return next;
    for (const field of schema.fields) {
        const v = scores[field.key];
        if (isSliderField(field) && typeof v === 'number' && Number.isFinite(v)) next[field.key] = v;
        else if (field.type === 'pass_fail' && (v === 0 || v === 1)) next[field.key] = v;
        else if (field.type === 'select' && typeof v === 'string' && field.options.includes(v)) next[field.key] = v;
    }
    return next;
}

export function ensureDrafts(
    sampleIds: string[],
    prev: Record<string, SampleDraft>,
    schema: CuppingFormSchema = SCA_V1_FORM,
): Record<string, SampleDraft> {
    const next = { ...prev };
    for (const id of sampleIds) {
        if (!next[id]) next[id] = emptyDraft(schema);
        else next[id] = { ...next[id], scores: alignScores(schema, next[id].scores) };
    }
    return next;
}

export function draftFromStore(
    store: SessionDraftStore | null,
    sampleIds: string[],
    fallbackName: string,
    schema: CuppingFormSchema = SCA_V1_FORM,
): {
    cuppedBy: string;
    drafts: Record<string, SampleDraft>;
    participantId?: string;
    publishedAt: string | null;
} {
    const drafts = ensureDrafts(sampleIds, store?.drafts ?? {}, schema);
    for (const id of Object.keys(drafts)) {
        const d = drafts[id];
        drafts[id] = {
            ...d,
            descriptors: normalizeDescriptors(d.descriptors),
            scores: alignScores(schema, d.scores),
            defects: typeof d.defects === 'number' ? Math.max(0, d.defects) : 0,
            notes: typeof d.notes === 'string' ? d.notes : '',
            dirty: Boolean(d.dirty),
        };
    }
    return {
        cuppedBy: store?.cuppedBy?.trim() || fallbackName,
        drafts,
        participantId: store?.participantId,
        publishedAt: store?.publishedAt ?? null,
    };
}
