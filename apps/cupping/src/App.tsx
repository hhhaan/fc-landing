import { createClient } from '@supabase/supabase-js';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DESCRIPTOR_GROUPS } from './descriptors';
import {
    draftFromStore,
    emptyDraft,
    ensureDrafts,
    loadCuppedBy,
    loadSessionDraft,
    persistSessionDraft,
    type SampleDraft,
} from './draft';
import { cuppingSessionUrl } from './publicBase';
import { ShareQr } from './ShareQr';
import {
    clampScore,
    LABELS,
    normalizeDescriptors,
    SCA_V1_KEYS,
    SCORE_MAX,
    SCORE_MIN,
    SCORE_STEP,
    type ScaV1Key,
    totalScore,
} from './score';

type SampleMeta = {
    id: string;
    label: string;
    beanName: string | null;
    beanOrigin?: string | null;
    beanRegion?: string | null;
    beanVariety?: string | null;
    beanProcess?: string | null;
    beanFarm?: string | null;
    beanMeta?: string | null;
};

type SessionMeta = {
    inviteId: string;
    eventId: string | null;
    eventTitle: string | null;
    samples: SampleMeta[];
    expiresAt: string;
    remainingUses: number;
    sampleId?: string | null;
    sampleLabel?: string | null;
    beanName?: string | null;
};

type SubmitResult = { id: string; totalScore: number; cuppedAt: string };

type Toast = { kind: 'sync' | 'info'; text: string };

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl ?? '', supabaseAnon ?? '');

function tokenFromPath(): string | null {
    const m = window.location.pathname.match(/^\/c\/([^/]+)\/?$/);
    return m?.[1] ? decodeURIComponent(m[1]) : null;
}

function sampleBeanLine(s: SampleMeta): string | null {
    if (s.beanMeta) return s.beanMeta;
    const line = [s.beanOrigin, s.beanRegion, s.beanVariety, s.beanProcess, s.beanFarm].filter(Boolean).join(' · ');
    return line || null;
}

function sampleTitle(s: SampleMeta): string {
    return s.beanName || s.label;
}

function draftStatus(d: SampleDraft | undefined): 'empty' | 'draft' | 'synced' | 'dirty' {
    if (!d) return 'empty';
    if (d.remoteId && d.dirty) return 'dirty';
    if (d.remoteId) return 'synced';
    if (d.dirty) return 'draft';
    return 'empty';
}

export function App() {
    const token = useMemo(() => tokenFromPath(), []);
    const pageUrl = useMemo(() => (token ? cuppingSessionUrl(token) : window.location.href.split('?')[0]), [token]);

    const [meta, setMeta] = useState<SessionMeta | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
    const [cuppedBy, setCuppedBy] = useState(loadCuppedBy);
    const [drafts, setDrafts] = useState<Record<string, SampleDraft>>({});
    const [customTag, setCustomTag] = useState('');
    const [syncing, setSyncing] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [toast, setToast] = useState<Toast | null>(null);
    const [qrOpen, setQrOpen] = useState(false);
    const [barVisible, setBarVisible] = useState(false);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const formTopRef = useRef<HTMLElement | null>(null);
    const lastScrollY = useRef(0);
    const draftsRef = useRef(drafts);
    const cuppedByRef = useRef(cuppedBy);

    draftsRef.current = drafts;
    cuppedByRef.current = cuppedBy;

    const samples = useMemo(() => {
        if (!meta) return [] as SampleMeta[];
        if (meta.samples?.length) return meta.samples;
        if (meta.sampleId) {
            return [
                {
                    id: meta.sampleId,
                    label: meta.sampleLabel || meta.beanName || 'Sample',
                    beanName: meta.beanName ?? null,
                },
            ];
        }
        return [];
    }, [meta]);

    const multi = samples.length > 1;
    const selectedSample = samples.find((s) => s.id === selectedSampleId) ?? null;
    const draft = selectedSampleId ? (drafts[selectedSampleId] ?? emptyDraft()) : emptyDraft();
    const liveTotal = totalScore(draft.scores, draft.defects);
    const status = draftStatus(selectedSampleId ? drafts[selectedSampleId] : undefined);
    const syncedCount = samples.filter((s) => drafts[s.id]?.remoteId && !drafts[s.id]?.dirty).length;
    const dirtyCount = samples.filter((s) => drafts[s.id]?.dirty).length;

    const showToast = useCallback((payload: Toast) => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast(payload);
        toastTimer.current = setTimeout(() => setToast(null), 2000);
    }, []);

    const persist = useCallback(
        (nextDrafts: Record<string, SampleDraft>, name: string) => {
            if (!token) return;
            persistSessionDraft(token, { v: 1, cuppedBy: name, drafts: nextDrafts });
        },
        [token],
    );

    const patchDraft = useCallback(
        (sampleId: string, patch: Partial<SampleDraft> | ((d: SampleDraft) => SampleDraft)) => {
            setDrafts((prev) => {
                const cur = prev[sampleId] ?? emptyDraft();
                const nextDraft =
                    typeof patch === 'function' ? patch(cur) : { ...cur, ...patch, dirty: patch.dirty ?? true };
                const next = { ...prev, [sampleId]: nextDraft };
                persist(next, cuppedByRef.current);
                return next;
            });
        },
        [persist],
    );

    const load = useCallback(async () => {
        if (!token) {
            setLoadError('missing_token');
            setLoading(false);
            return;
        }
        setLoading(true);
        setLoadError(null);
        const { data, error } = await supabase.functions.invoke<SessionMeta>('get-cupping-session', {
            body: { token },
        });
        if (error || !data) {
            const msg = error?.message ?? 'load_failed';
            setLoadError(msg.includes('410') ? 'expired_or_full' : msg);
            setMeta(null);
        } else {
            setMeta(data);
            const list = data.samples?.length
                ? data.samples
                : data.sampleId
                  ? [{ id: data.sampleId, label: data.sampleLabel || 'Sample', beanName: data.beanName ?? null }]
                  : [];
            const ids = list.map((s) => s.id);
            const restored = draftFromStore(loadSessionDraft(token), ids, loadCuppedBy());
            setCuppedBy(restored.cuppedBy);
            setDrafts(ensureDrafts(ids, restored.drafts));
            // Single sample → open immediately; multi stays on board (scoresheet list)
            if (list.length === 1) setSelectedSampleId(list[0].id);
        }
        setLoading(false);
    }, [token]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        return () => {
            if (toastTimer.current) clearTimeout(toastTimer.current);
        };
    }, []);

    // Sticky bar: show on scroll down, hide on scroll up / page top
    useEffect(() => {
        if (!selectedSampleId) {
            setBarVisible(false);
            return;
        }
        lastScrollY.current = window.scrollY;
        const canScroll = () => document.documentElement.scrollHeight > window.innerHeight + 24;
        const onScroll = () => {
            if (!canScroll()) {
                setBarVisible(true);
                return;
            }
            const y = window.scrollY;
            const delta = y - lastScrollY.current;
            lastScrollY.current = y;
            if (y < 32) {
                setBarVisible(false);
                return;
            }
            if (delta > 6) setBarVisible(true);
            else if (delta < -6) setBarVisible(false);
        };
        if (!canScroll()) setBarVisible(true);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [selectedSampleId]);

    const openSample = (id: string) => {
        setSubmitError(null);
        setCustomTag('');
        setSelectedSampleId(id);
        requestAnimationFrame(() => {
            formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    };

    const setScore = (key: ScaV1Key, value: number) => {
        if (!selectedSampleId) return;
        patchDraft(selectedSampleId, (d) => ({
            ...d,
            scores: { ...d.scores, [key]: clampScore(value) },
            dirty: true,
        }));
    };

    const nudgeScore = (key: ScaV1Key, delta: number) => {
        if (!selectedSampleId) return;
        patchDraft(selectedSampleId, (d) => ({
            ...d,
            scores: { ...d.scores, [key]: clampScore(d.scores[key] + delta) },
            dirty: true,
        }));
    };

    const toggleDescriptor = (tag: string) => {
        if (!selectedSampleId) return;
        const t = tag.trim().toLowerCase();
        if (!t) return;
        patchDraft(selectedSampleId, (d) => {
            const has = d.descriptors.includes(t);
            const descriptors = has
                ? d.descriptors.filter((x) => x !== t)
                : d.descriptors.length >= 20
                  ? d.descriptors
                  : normalizeDescriptors([...d.descriptors, t]);
            return { ...d, descriptors, dirty: true };
        });
    };

    const addCustomTag = () => {
        if (!selectedSampleId) return;
        const t = customTag.trim().toLowerCase().slice(0, 40);
        if (!t) return;
        patchDraft(selectedSampleId, (d) => ({
            ...d,
            descriptors: normalizeDescriptors([...d.descriptors, t]),
            dirty: true,
        }));
        setCustomTag('');
    };

    const onNameChange = (name: string) => {
        setCuppedBy(name);
        if (token) {
            persistSessionDraft(token, { v: 1, cuppedBy: name, drafts: draftsRef.current });
        }
    };

    const syncSample = async (sampleId: string, opts?: { quiet?: boolean }) => {
        if (!token || syncing) return false;
        const d = draftsRef.current[sampleId] ?? emptyDraft();
        const name = cuppedByRef.current.trim() || 'Anonymous';
        if (!cuppedByRef.current.trim()) {
            setCuppedBy(name);
            onNameChange(name);
        }

        setSubmitError(null);
        setSyncing(true);
        try {
            const { data, error } = await supabase.functions.invoke<SubmitResult>('submit-cupping', {
                body: {
                    token,
                    sampleId,
                    cuppedBy: name,
                    scores: d.scores,
                    defects: d.defects,
                    notes: d.notes.trim() || null,
                    descriptors: normalizeDescriptors(d.descriptors),
                },
            });
            if (error || !data) {
                setSubmitError(error?.message ?? 'sync_failed');
                return false;
            }
            setDrafts((prev) => {
                const next = {
                    ...prev,
                    [sampleId]: {
                        ...(prev[sampleId] ?? emptyDraft()),
                        remoteId: data.id,
                        remoteTotal: Number(data.totalScore),
                        dirty: false,
                    },
                };
                persist(next, name);
                return next;
            });
            if (!opts?.quiet) {
                showToast({ kind: 'sync', text: `${Number(data.totalScore).toFixed(2)} synced` });
            }
            return true;
        } catch (e) {
            setSubmitError(e instanceof Error ? e.message : 'sync_failed');
            return false;
        } finally {
            setSyncing(false);
        }
    };

    const onSync = async () => {
        if (!selectedSampleId) return;
        await syncSample(selectedSampleId);
    };

    if (loading) {
        return (
            <Shell
                title="Cupping"
                pageUrl={pageUrl}
                onShare={() => setQrOpen(true)}
                qrOpen={qrOpen}
                onQrClose={() => setQrOpen(false)}
            >
                <div className="loading" role="status">
                    <div className="loading__spinner" aria-hidden />
                    Loading session…
                </div>
            </Shell>
        );
    }

    if (!token || loadError || !meta) {
        return (
            <Shell title="Cupping unavailable" pageUrl={pageUrl} share={false}>
                <p className="lead">
                    This cupping link is invalid, expired, full, or revoked. Ask the roaster for a new QR.
                </p>
            </Shell>
        );
    }

    if (samples.length === 0) {
        return (
            <Shell
                title="No samples"
                pageUrl={pageUrl}
                onShare={() => setQrOpen(true)}
                qrOpen={qrOpen}
                onQrClose={() => setQrOpen(false)}
            >
                <p className="lead">This session has no samples yet. Ask the roaster to add samples.</p>
            </Shell>
        );
    }

    // Session board — scoresheet overview (multi) or when not drilling into a sample
    if (!selectedSample) {
        return (
            <Shell
                title={meta.eventTitle || 'Cupping session'}
                pageUrl={pageUrl}
                onShare={() => setQrOpen(true)}
                qrOpen={qrOpen}
                onQrClose={() => setQrOpen(false)}
            >
                {toast ? (
                    <div className="toast" role="status" aria-live="polite">
                        <span className="toast__check" aria-hidden>
                            ✓
                        </span>
                        <span className="toast__body">{toast.text}</span>
                    </div>
                ) : null}

                <div className="progress-line">
                    <span>
                        {syncedCount}/{samples.length} synced
                        {dirtyCount > 0 ? ` · ${dirtyCount} local` : ''}
                    </span>
                </div>
                <p className="lead">
                    One table session. Move between samples freely — scores stay on this phone. Sync sends to the
                    roaster without leaving the sheet.
                </p>

                <div className="field field--session-name">
                    <label htmlFor="cuppedByBoard">Your name</label>
                    <input
                        id="cuppedByBoard"
                        type="text"
                        value={cuppedBy}
                        onChange={(e) => onNameChange(e.target.value)}
                        placeholder="So scores can be told apart"
                        autoComplete="name"
                    />
                </div>

                <div className="sample-list">
                    {samples.map((s, i) => {
                        const d = drafts[s.id];
                        const st = draftStatus(d);
                        const total =
                            d?.remoteTotal != null && !d.dirty
                                ? d.remoteTotal
                                : d
                                  ? totalScore(d.scores, d.defects)
                                  : null;
                        const beanLine = sampleBeanLine(s);
                        return (
                            <button
                                key={s.id}
                                type="button"
                                className={`sample-card sample-card--${st}`}
                                onClick={() => openSample(s.id)}
                            >
                                <div>
                                    <div className="sample-card__idx">
                                        #{i + 1}
                                        {total != null && st !== 'empty' ? (
                                            <span className="sample-card__score"> · {Number(total).toFixed(2)}</span>
                                        ) : null}
                                        {st === 'synced' ? (
                                            <span className="sample-card__state"> · synced</span>
                                        ) : st === 'dirty' ? (
                                            <span className="sample-card__state sample-card__state--warn">
                                                {' '}
                                                · unsynced edits
                                            </span>
                                        ) : st === 'draft' ? (
                                            <span className="sample-card__state"> · draft</span>
                                        ) : null}
                                    </div>
                                    <div className="sample-card__name">{sampleTitle(s)}</div>
                                    {beanLine ? <div className="sample-card__meta">{beanLine}</div> : null}
                                    {s.beanName && s.label !== s.beanName ? (
                                        <div className="sample-card__meta">{s.label}</div>
                                    ) : null}
                                </div>
                                <span className="sample-card__chev" aria-hidden>
                                    {st === 'synced' ? '✓' : '›'}
                                </span>
                            </button>
                        );
                    })}
                </div>
                <p className="session-note">
                    Shared session QR — use Share so the next cupper can join from their phone.
                </p>

                <footer className="page-end">
                    <p className="page-end__mark">First Crack</p>
                    <p className="page-end__line">One table · one sheet · sync when ready</p>
                    <a
                        className="page-end__link"
                        href="https://firstcrackiscoming.com"
                        target="_blank"
                        rel="noreferrer"
                    >
                        firstcrackiscoming.com
                    </a>
                </footer>
            </Shell>
        );
    }

    const selectedIdx = samples.findIndex((s) => s.id === selectedSample.id);
    const syncLabel = syncing
        ? 'Syncing…'
        : status === 'synced'
          ? 'Synced'
          : status === 'dirty'
            ? 'Sync changes'
            : 'Sync';

    return (
        <Shell
            title=""
            form
            pageUrl={pageUrl}
            onShare={() => setQrOpen(true)}
            qrOpen={qrOpen}
            onQrClose={() => setQrOpen(false)}
        >
            {toast ? (
                <div className="toast" role="status" aria-live="polite">
                    <span className="toast__check" aria-hidden>
                        ✓
                    </span>
                    <span className="toast__body">{toast.text}</span>
                </div>
            ) : null}

            <header className="form-head" ref={formTopRef}>
                <div className="form-head__nav">
                    {multi ? (
                        <button
                            type="button"
                            className="back-btn"
                            onClick={() => {
                                setSelectedSampleId(null);
                                setSubmitError(null);
                            }}
                        >
                            <span className="back-btn__icon" aria-hidden>
                                ‹
                            </span>
                            Session
                        </button>
                    ) : (
                        <span className="form-head__spacer" />
                    )}
                    <span className="form-head__count">
                        {syncedCount}/{samples.length}
                        {status === 'dirty' || status === 'draft' ? ' · local' : ''}
                    </span>
                </div>

                {multi ? (
                    <div className="sample-strip" role="tablist" aria-label="Samples">
                        {samples.map((s, i) => {
                            const st = draftStatus(drafts[s.id]);
                            const active = s.id === selectedSample.id;
                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    className={`sample-strip__item${active ? ' sample-strip__item--on' : ''} sample-strip__item--${st}`}
                                    onClick={() => {
                                        if (s.id !== selectedSample.id) openSample(s.id);
                                    }}
                                >
                                    <span className="sample-strip__n">{i + 1}</span>
                                    {st === 'synced' ? (
                                        <span className="sample-strip__mark" aria-hidden>
                                            ✓
                                        </span>
                                    ) : st === 'dirty' || st === 'draft' ? (
                                        <span className="sample-strip__dot" aria-hidden />
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>
                ) : null}

                <div className="eyebrow">{meta.eventTitle || 'Sample'}</div>
                <h1 className="form-head__title">
                    {multi ? <span className="form-head__idx">#{selectedIdx + 1} · </span> : null}
                    {sampleTitle(selectedSample)}
                </h1>
                {sampleBeanLine(selectedSample) ? (
                    <div className="form-head__sub">{sampleBeanLine(selectedSample)}</div>
                ) : null}
                {selectedSample.beanName && selectedSample.label !== selectedSample.beanName ? (
                    <div className="form-head__sub">{selectedSample.label}</div>
                ) : null}
                <div
                    className={`form-head__badge${status === 'synced' ? ' form-head__badge--done' : ''}${status === 'dirty' ? ' form-head__badge--warn' : ''}`}
                >
                    {status === 'synced'
                        ? `Synced ${Number(draft.remoteTotal).toFixed(2)} · edit anytime`
                        : status === 'dirty'
                          ? 'Unsynced edits on this phone'
                          : status === 'draft'
                            ? 'Local draft · not sent yet'
                            : 'Session sheet · sync when ready'}
                </div>
            </header>

            <div className="scores">
                {SCA_V1_KEYS.map((key) => (
                    <div key={key} className="score-row">
                        <div className="score-row__top">
                            <span className="score-row__label">{LABELS[key]}</span>
                            <div className="score-row__controls">
                                <button
                                    type="button"
                                    className="step-btn"
                                    aria-label={`Decrease ${LABELS[key]}`}
                                    disabled={draft.scores[key] <= SCORE_MIN || syncing}
                                    onClick={() => nudgeScore(key, -SCORE_STEP)}
                                >
                                    −
                                </button>
                                <span className="score-row__value" aria-live="polite">
                                    {draft.scores[key].toFixed(2)}
                                </span>
                                <button
                                    type="button"
                                    className="step-btn"
                                    aria-label={`Increase ${LABELS[key]}`}
                                    disabled={draft.scores[key] >= SCORE_MAX || syncing}
                                    onClick={() => nudgeScore(key, SCORE_STEP)}
                                >
                                    +
                                </button>
                            </div>
                        </div>
                        <input
                            className="score-row__range"
                            type="range"
                            min={SCORE_MIN}
                            max={SCORE_MAX}
                            step={SCORE_STEP}
                            value={draft.scores[key]}
                            aria-label={LABELS[key]}
                            disabled={syncing}
                            onChange={(e) => setScore(key, Number(e.target.value))}
                        />
                    </div>
                ))}
            </div>

            <div className="fields">
                <div className="field">
                    <label htmlFor="defects">Defects</label>
                    <p className="field-hint">Each defect subtracts 2 from total</p>
                    <input
                        id="defects"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        value={draft.defects}
                        disabled={syncing}
                        onChange={(e) =>
                            selectedSampleId &&
                            patchDraft(selectedSampleId, {
                                defects: Math.max(0, Number(e.target.value) || 0),
                                dirty: true,
                            })
                        }
                    />
                </div>

                <div className="field">
                    <label htmlFor="cuppedBy">Your name</label>
                    <input
                        id="cuppedBy"
                        type="text"
                        value={cuppedBy}
                        disabled={syncing}
                        onChange={(e) => onNameChange(e.target.value)}
                        placeholder="So scores can be told apart"
                        autoComplete="name"
                        enterKeyHint="next"
                    />
                </div>

                <div className="field">
                    <span id="descriptors-label">Descriptors</span>
                    <p className="field-hint">Optional · up to 20 tags</p>
                    <div className="desc-groups" role="group" aria-labelledby="descriptors-label">
                        {DESCRIPTOR_GROUPS.map((group) => (
                            <div key={group.id}>
                                <div className="desc-group__label">{group.label}</div>
                                <div className="desc-chips">
                                    {group.tags.map((tag) => {
                                        const on = draft.descriptors.includes(tag);
                                        return (
                                            <button
                                                key={tag}
                                                type="button"
                                                className={`desc-chip${on ? ' desc-chip--on' : ''}`}
                                                aria-pressed={on}
                                                disabled={syncing || (!on && draft.descriptors.length >= 20)}
                                                onClick={() => toggleDescriptor(tag)}
                                            >
                                                {tag}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="desc-custom">
                        <input
                            type="text"
                            value={customTag}
                            disabled={syncing}
                            onChange={(e) => setCustomTag(e.target.value)}
                            placeholder="Custom tag"
                            maxLength={40}
                            enterKeyHint="done"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addCustomTag();
                                }
                            }}
                        />
                        <button
                            type="button"
                            className="btn btn--outline"
                            disabled={syncing || !customTag.trim() || draft.descriptors.length >= 20}
                            onClick={addCustomTag}
                        >
                            Add
                        </button>
                    </div>
                    {draft.descriptors.length > 0 ? (
                        <div className="desc-selected" aria-live="polite">
                            {draft.descriptors.map((tag) => (
                                <button
                                    key={tag}
                                    type="button"
                                    className="desc-chip desc-chip--on"
                                    disabled={syncing}
                                    onClick={() => toggleDescriptor(tag)}
                                    aria-label={`Remove ${tag}`}
                                >
                                    {tag} ×
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>

                <div className="field">
                    <label htmlFor="notes">Notes</label>
                    <p className="field-hint">Dry · break · flavor · finish</p>
                    <textarea
                        id="notes"
                        value={draft.notes}
                        disabled={syncing}
                        onChange={(e) =>
                            selectedSampleId && patchDraft(selectedSampleId, { notes: e.target.value, dirty: true })
                        }
                        rows={3}
                        placeholder="Short tasting notes"
                        enterKeyHint="done"
                    />
                </div>

                {submitError ? (
                    <div className="danger" role="alert">
                        {submitError}
                    </div>
                ) : null}
            </div>

            <footer className="page-end">
                <p className="page-end__mark">First Crack</p>
                <p className="page-end__line">Table cupping sheet · scores stay on this phone until Sync</p>
                <a className="page-end__link" href="https://firstcrackiscoming.com" target="_blank" rel="noreferrer">
                    firstcrackiscoming.com
                </a>
            </footer>

            <div
                className={`sticky-bar${multi ? ' sticky-bar--multi' : ''}${barVisible ? ' sticky-bar--visible' : ''}`}
                aria-hidden={!barVisible}
            >
                {multi ? (
                    <div className="sticky-bar__samples" role="tablist" aria-label="Samples">
                        <button
                            type="button"
                            className="sticky-bar__step"
                            aria-label="Previous sample"
                            disabled={syncing}
                            onClick={() => {
                                const prev = samples[(selectedIdx - 1 + samples.length) % samples.length];
                                openSample(prev.id);
                            }}
                        >
                            ‹
                        </button>
                        <div className="sticky-bar__strip">
                            {samples.map((s, i) => {
                                const st = draftStatus(drafts[s.id]);
                                const active = s.id === selectedSample.id;
                                return (
                                    <button
                                        key={s.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        aria-label={`Sample ${i + 1}`}
                                        className={`sticky-bar__dot${active ? ' sticky-bar__dot--on' : ''} sticky-bar__dot--${st}`}
                                        disabled={syncing}
                                        onClick={() => {
                                            if (s.id !== selectedSample.id) openSample(s.id);
                                        }}
                                    >
                                        {i + 1}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            type="button"
                            className="sticky-bar__step"
                            aria-label="Next sample"
                            disabled={syncing}
                            onClick={() => {
                                const next = samples[(selectedIdx + 1) % samples.length];
                                openSample(next.id);
                            }}
                        >
                            ›
                        </button>
                    </div>
                ) : null}
                <div className="sticky-bar__inner">
                    <div>
                        <div className="sticky-bar__total-label">
                            {multi ? `${selectedIdx + 1}/${samples.length} · Total` : 'Total'}
                        </div>
                        <div className="sticky-bar__total-value">{liveTotal.toFixed(2)}</div>
                    </div>
                    <button
                        type="button"
                        className={`btn btn--solid${status === 'synced' ? ' btn--synced' : ''}`}
                        disabled={syncing || status === 'synced'}
                        onClick={() => void onSync()}
                    >
                        {syncLabel}
                    </button>
                </div>
            </div>
        </Shell>
    );
}

function Shell({
    title,
    children,
    form = false,
    pageUrl,
    onShare,
    qrOpen = false,
    onQrClose,
    share = true,
}: {
    title: string;
    children: ReactNode;
    form?: boolean;
    pageUrl: string;
    onShare?: () => void;
    qrOpen?: boolean;
    onQrClose?: () => void;
    share?: boolean;
}) {
    return (
        <div className={`shell${form ? ' shell--form' : ''}`}>
            <div className="shell__brand-row">
                <div className="shell__brand">
                    <span className="shell__brand-dot" aria-hidden />
                    First Crack
                </div>
                {share && onShare ? (
                    <button type="button" className="share-btn" onClick={onShare} aria-label="Share session QR">
                        <ShareIcon />
                        QR
                    </button>
                ) : null}
            </div>
            <div className="shell__panel">
                {title ? <h1 className="shell__title">{title}</h1> : null}
                {children}
            </div>
            {share && onQrClose ? <ShareQr url={pageUrl} open={qrOpen} onClose={onQrClose} /> : null}
        </div>
    );
}

function ShareIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" />
            <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" />
            <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" />
            <rect x="14" y="14" width="3" height="3" fill="currentColor" />
            <rect x="18" y="14" width="3" height="3" fill="currentColor" />
            <rect x="14" y="18" width="3" height="3" fill="currentColor" />
            <rect x="18" y="18" width="3" height="3" fill="currentColor" />
        </svg>
    );
}
