import { createClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DESCRIPTOR_GROUPS } from './descriptors';
import {
    clampScore,
    defaultScores,
    LABELS,
    normalizeDescriptors,
    SCA_V1_KEYS,
    SCORE_MAX,
    SCORE_MIN,
    SCORE_STEP,
    totalScore,
    type ScaV1Key,
    type ScaV1Scores,
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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl ?? '', supabaseAnon ?? '');

const CUPPED_BY_KEY = 'fc_cupping_cupped_by';

function tokenFromPath(): string | null {
    const m = window.location.pathname.match(/^\/c\/([^/]+)\/?$/);
    return m?.[1] ? decodeURIComponent(m[1]) : null;
}

function sampleBeanLine(s: SampleMeta): string | null {
    if (s.beanMeta) return s.beanMeta;
    const line = [s.beanOrigin, s.beanRegion, s.beanVariety, s.beanProcess, s.beanFarm]
        .filter(Boolean)
        .join(' · ');
    return line || null;
}

function loadCuppedBy(): string {
    try {
        return localStorage.getItem(CUPPED_BY_KEY) ?? '';
    } catch {
        return '';
    }
}

function saveCuppedBy(name: string) {
    try {
        if (name.trim()) localStorage.setItem(CUPPED_BY_KEY, name.trim());
    } catch {
        /* ignore */
    }
}

export function App() {
    const token = useMemo(() => tokenFromPath(), []);
    const [meta, setMeta] = useState<SessionMeta | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
    const [scores, setScores] = useState<ScaV1Scores>(() => defaultScores(6));
    const [defects, setDefects] = useState(0);
    const [cuppedBy, setCuppedBy] = useState(loadCuppedBy);
    const [notes, setNotes] = useState('');
    const [descriptors, setDescriptors] = useState<string[]>([]);
    const [customTag, setCustomTag] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [done, setDone] = useState<SubmitResult | null>(null);
    const [doneDescriptors, setDoneDescriptors] = useState<string[]>([]);

    const liveTotal = totalScore(scores, defects);

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

    const selectedSample = samples.find((s) => s.id === selectedSampleId) ?? null;

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
            if (list.length === 1) setSelectedSampleId(list[0].id);
        }
        setLoading(false);
    }, [token]);

    useEffect(() => {
        void load();
    }, [load]);

    const setScore = (key: ScaV1Key, value: number) => {
        setScores((prev) => ({ ...prev, [key]: clampScore(value) }));
    };

    const nudgeScore = (key: ScaV1Key, delta: number) => {
        setScores((prev) => ({ ...prev, [key]: clampScore(prev[key] + delta) }));
    };

    const toggleDescriptor = (tag: string) => {
        const t = tag.trim().toLowerCase();
        if (!t) return;
        setDescriptors((prev) => {
            if (prev.includes(t)) return prev.filter((x) => x !== t);
            if (prev.length >= 20) return prev;
            return normalizeDescriptors([...prev, t]);
        });
    };

    const addCustomTag = () => {
        const t = customTag.trim().toLowerCase().slice(0, 40);
        if (!t) return;
        setDescriptors((prev) => normalizeDescriptors([...prev, t]));
        setCustomTag('');
    };

    const resetForm = () => {
        setScores(defaultScores(6));
        setDefects(0);
        setNotes('');
        setDescriptors([]);
        setCustomTag('');
        setSubmitError(null);
        setDone(null);
        setDoneDescriptors([]);
    };

    const onSubmit = async () => {
        if (!token || !selectedSampleId || submitting) return;

        const tags = normalizeDescriptors(descriptors);
        const name = cuppedBy.trim() || 'Anonymous';
        saveCuppedBy(name);

        const optimistic: SubmitResult = {
            id: `opt_${crypto.randomUUID()}`,
            totalScore: liveTotal,
            cuppedAt: new Date().toISOString(),
        };
        const prevMeta = meta;
        const prevDone = done;
        const prevDoneDesc = doneDescriptors;

        setSubmitError(null);
        setDone(optimistic);
        setDoneDescriptors(tags);
        setMeta((prev) =>
            prev ? { ...prev, remainingUses: Math.max(0, prev.remainingUses - 1) } : prev,
        );
        setSubmitting(true);

        try {
            const { data, error } = await supabase.functions.invoke<SubmitResult>('submit-cupping', {
                body: {
                    token,
                    sampleId: selectedSampleId,
                    cuppedBy: name,
                    scores,
                    defects,
                    notes: notes.trim() || null,
                    descriptors: tags,
                },
            });
            if (error || !data) {
                setDone(prevDone);
                setDoneDescriptors(prevDoneDesc);
                setMeta(prevMeta);
                setSubmitError(error?.message ?? 'submit_failed');
                return;
            }
            setDone(data);
        } catch (e) {
            setDone(prevDone);
            setDoneDescriptors(prevDoneDesc);
            setMeta(prevMeta);
            setSubmitError(e instanceof Error ? e.message : 'submit_failed');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Shell title="Cupping">
                <div className="loading" role="status">
                    <div className="loading__spinner" aria-hidden />
                    Loading session…
                </div>
            </Shell>
        );
    }

    if (!token || loadError || !meta) {
        return (
            <Shell title="Cupping unavailable">
                <p className="lead">
                    This cupping link is invalid, expired, full, or revoked. Ask the roaster for a new QR.
                </p>
            </Shell>
        );
    }

    if (samples.length === 0) {
        return (
            <Shell title="No samples">
                <p className="lead">This session has no samples yet. Ask the roaster to add samples.</p>
            </Shell>
        );
    }

    if (done) {
        const confirming = submitting && done.id.startsWith('opt_');
        return (
            <Shell title={confirming ? 'Saving…' : 'Submitted'}>
                {!confirming ? (
                    <div className="success-check">
                        <span aria-hidden>✓</span> Saved
                    </div>
                ) : null}
                <p className="success-score">{Number(done.totalScore).toFixed(2)}</p>
                {doneDescriptors.length > 0 ? (
                    <div className="success-tags">
                        {doneDescriptors.map((tag) => (
                            <span key={tag}>{tag}</span>
                        ))}
                    </div>
                ) : null}
                <p className="success-msg">
                    {confirming
                        ? `Saving score for ${selectedSample?.label ?? 'sample'}…`
                        : `Thanks — score saved for ${selectedSample?.label ?? 'sample'}.`}
                </p>
                {samples.length > 1 && meta.remainingUses > 0 && !confirming ? (
                    <button
                        type="button"
                        className="btn btn--outline"
                        onClick={() => {
                            resetForm();
                            setSelectedSampleId(null);
                        }}
                    >
                        Score another sample
                    </button>
                ) : null}
            </Shell>
        );
    }

    if (!selectedSample) {
        return (
            <Shell title={meta.eventTitle || 'Cupping session'}>
                <p className="lead">
                    Multiple cuppers can use this link at the same time. Pick a sample to score.
                </p>
                <div className="sample-list">
                    {samples.map((s, i) => {
                        const beanLine = sampleBeanLine(s);
                        return (
                            <button
                                key={s.id}
                                type="button"
                                className="sample-card"
                                onClick={() => {
                                    resetForm();
                                    setSelectedSampleId(s.id);
                                }}
                            >
                                <div>
                                    <div className="sample-card__idx">#{i + 1}</div>
                                    <div className="sample-card__name">{s.beanName || s.label}</div>
                                    {beanLine ? <div className="sample-card__meta">{beanLine}</div> : null}
                                    {s.beanName && s.label !== s.beanName ? (
                                        <div className="sample-card__meta">{s.label}</div>
                                    ) : null}
                                </div>
                                <span className="sample-card__chev" aria-hidden>
                                    ›
                                </span>
                            </button>
                        );
                    })}
                </div>
                <p className="session-note">Shared session — everyone scores in parallel from this QR.</p>
            </Shell>
        );
    }

    return (
        <Shell title="" form>
            <header className="form-head">
                {samples.length > 1 ? (
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
                        All samples
                    </button>
                ) : null}
                <div className="eyebrow">{meta.eventTitle || 'Sample'}</div>
                <h1 className="form-head__title">{selectedSample.beanName || selectedSample.label}</h1>
                {sampleBeanLine(selectedSample) ? (
                    <div className="form-head__sub">{sampleBeanLine(selectedSample)}</div>
                ) : null}
                {selectedSample.beanName && selectedSample.label !== selectedSample.beanName ? (
                    <div className="form-head__sub">{selectedSample.label}</div>
                ) : null}
                <div className="form-head__badge">Shared · multi-cupper OK</div>
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
                                    disabled={scores[key] <= SCORE_MIN}
                                    onClick={() => nudgeScore(key, -SCORE_STEP)}
                                >
                                    −
                                </button>
                                <span className="score-row__value" aria-live="polite">
                                    {scores[key].toFixed(2)}
                                </span>
                                <button
                                    type="button"
                                    className="step-btn"
                                    aria-label={`Increase ${LABELS[key]}`}
                                    disabled={scores[key] >= SCORE_MAX}
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
                            value={scores[key]}
                            aria-label={LABELS[key]}
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
                        value={defects}
                        onChange={(e) => setDefects(Math.max(0, Number(e.target.value) || 0))}
                    />
                </div>

                <div className="field">
                    <label htmlFor="cuppedBy">Your name</label>
                    <input
                        id="cuppedBy"
                        type="text"
                        value={cuppedBy}
                        onChange={(e) => setCuppedBy(e.target.value)}
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
                                        const on = descriptors.includes(tag);
                                        return (
                                            <button
                                                key={tag}
                                                type="button"
                                                className={`desc-chip${on ? ' desc-chip--on' : ''}`}
                                                aria-pressed={on}
                                                disabled={!on && descriptors.length >= 20}
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
                            disabled={!customTag.trim() || descriptors.length >= 20}
                            onClick={addCustomTag}
                        >
                            Add
                        </button>
                    </div>
                    {descriptors.length > 0 ? (
                        <div className="desc-selected" aria-live="polite">
                            {descriptors.map((tag) => (
                                <button
                                    key={tag}
                                    type="button"
                                    className="desc-chip desc-chip--on"
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
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
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

            <div className="sticky-bar">
                <div className="sticky-bar__inner">
                    <div>
                        <div className="sticky-bar__total-label">Total</div>
                        <div className="sticky-bar__total-value">{liveTotal.toFixed(2)}</div>
                    </div>
                    <button
                        type="button"
                        className="btn btn--solid"
                        disabled={submitting}
                        onClick={() => void onSubmit()}
                    >
                        {submitting ? 'Submitting…' : 'Submit'}
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
}: {
    title: string;
    children: ReactNode;
    form?: boolean;
}) {
    return (
        <div className={`shell${form ? ' shell--form' : ''}`}>
            <div className="shell__brand">
                <span className="shell__brand-dot" aria-hidden />
                First Crack
            </div>
            <div className="shell__panel">
                {title ? <h1 className="shell__title">{title}</h1> : null}
                {children}
            </div>
        </div>
    );
}
