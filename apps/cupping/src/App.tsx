import { createClient } from '@supabase/supabase-js';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DESCRIPTOR_GROUPS } from './descriptors';
import {
    draftFromStore,
    emptyDraft,
    ensureDrafts,
    loadCuppedBy,
    loadSessionDraft,
    mergeSubmissions,
    persistSessionDraft,
    publishableSampleIds,
    type RemoteSubmission,
    type SampleDraft,
} from './draft';
import { cuppingResultsUrl, cuppingSessionUrl } from './publicBase';
import { ResultsPage } from './Results';
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
    sessionFull?: boolean;
    participant?: { id: string; publishedAt: string | null } | null;
    submissions?: SubmissionRow[];
    sampleId?: string | null;
    sampleLabel?: string | null;
    beanName?: string | null;
};

type SubmissionRow = RemoteSubmission & { cuppedAt?: string };

type ClaimResult = {
    participantId: string;
    publishedAt: string | null;
    remainingUses?: number;
    submissions?: SubmissionRow[];
    error?: string;
    results?: Array<{ id: string; sampleId: string; totalScore: number }>;
};

type Toast = { kind: 'sync' | 'info'; text: string };

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl ?? '', supabaseAnon ?? '');

type PathRoute = { kind: 'session'; token: string } | { kind: 'results'; token: string } | { kind: 'none' };

function routeFromPath(): PathRoute {
    const path = window.location.pathname;
    const results = path.match(/^\/r\/([^/]+)\/?$/);
    if (results?.[1]) return { kind: 'results', token: decodeURIComponent(results[1]) };
    const session = path.match(/^\/c\/([^/]+)\/?$/);
    if (session?.[1]) return { kind: 'session', token: decodeURIComponent(session[1]) };
    return { kind: 'none' };
}

function sampleBeanLine(s: SampleMeta): string | null {
    if (s.beanMeta) return s.beanMeta;
    const line = [s.beanOrigin, s.beanRegion, s.beanVariety, s.beanProcess, s.beanFarm].filter(Boolean).join(' · ');
    return line || null;
}

function sampleTitle(s: SampleMeta): string {
    return s.beanName || s.label;
}

function draftStatus(d: SampleDraft | undefined, published: boolean): 'empty' | 'draft' | 'published' {
    if (published && d?.remoteId) return 'published';
    if (!d) return 'empty';
    if (d.dirty) return 'draft';
    if (d.remoteId) return 'draft';
    return 'empty';
}

export function App() {
    const route = useMemo(() => routeFromPath(), []);
    if (route.kind === 'results') {
        return <ResultsPage token={route.token} />;
    }

    return <SessionApp token={route.kind === 'session' ? route.token : null} />;
}

function SessionApp({ token }: { token: string | null }) {
    const pageUrl = useMemo(() => (token ? cuppingSessionUrl(token) : window.location.href.split('?')[0]), [token]);

    const [meta, setMeta] = useState<SessionMeta | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [endedInfo, setEndedInfo] = useState<{ resultsToken: string | null; eventTitle: string | null } | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
    const [cuppedBy, setCuppedBy] = useState(loadCuppedBy);
    const [drafts, setDrafts] = useState<Record<string, SampleDraft>>({});
    const [customTag, setCustomTag] = useState('');
    const [participantId, setParticipantId] = useState<string | null>(null);
    const [publishedAt, setPublishedAt] = useState<string | null>(null);
    const [sessionFull, setSessionFull] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [confirmPublish, setConfirmPublish] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [toast, setToast] = useState<Toast | null>(null);
    const [qrOpen, setQrOpen] = useState(false);
    const [barVisible, setBarVisible] = useState(false);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const formTopRef = useRef<HTMLElement | null>(null);
    const lastScrollY = useRef(0);
    const draftsRef = useRef(drafts);
    const cuppedByRef = useRef(cuppedBy);
    const participantIdRef = useRef(participantId);
    const publishedAtRef = useRef(publishedAt);

    draftsRef.current = drafts;
    cuppedByRef.current = cuppedBy;
    participantIdRef.current = participantId;
    publishedAtRef.current = publishedAt;
    const published = Boolean(publishedAt);
    const locked = published || publishing;

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
    const status = draftStatus(selectedSampleId ? drafts[selectedSampleId] : undefined, published);
    const scoredIds = publishableSampleIds(
        samples.map((s) => s.id),
        drafts,
    );
    const scoredCount = published ? samples.filter((s) => drafts[s.id]?.remoteId).length : scoredIds.length;

    const showToast = useCallback((payload: Toast) => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast(payload);
        toastTimer.current = setTimeout(() => setToast(null), 2000);
    }, []);

    const persist = useCallback(
        (nextDrafts: Record<string, SampleDraft>, name: string) => {
            if (!token) return;
            persistSessionDraft(token, {
                v: 2,
                cuppedBy: name,
                drafts: nextDrafts,
                participantId: participantIdRef.current ?? undefined,
                publishedAt: publishedAtRef.current,
            });
        },
        [token],
    );

    const patchDraft = useCallback(
        (sampleId: string, patch: Partial<SampleDraft> | ((d: SampleDraft) => SampleDraft)) => {
            if (publishedAtRef.current) return;
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
        setEndedInfo(null);
        const { data, error } = await supabase.functions.invoke<
            SessionMeta & {
                error?: string;
                ended?: boolean;
                resultsToken?: string | null;
                eventTitle?: string | null;
            }
        >('get-cupping-session', {
            body: { token, cuppedBy: loadCuppedBy() || undefined },
        });

        // 410 ended: body may still be present depending on client version
        let endedBody: {
            ended?: boolean;
            resultsToken?: string | null;
            eventTitle?: string | null;
            error?: string;
        } | null = data && (data.ended || data.error === 'ended') ? data : null;
        if (!endedBody && error && 'context' in error && error.context instanceof Response) {
            try {
                endedBody = (await error.context.clone().json()) as typeof endedBody;
            } catch {
                endedBody = null;
            }
        }

        if (endedBody?.ended || endedBody?.error === 'ended') {
            setEndedInfo({
                resultsToken: endedBody.resultsToken ?? null,
                eventTitle: endedBody.eventTitle ?? null,
            });
            setMeta(null);
            setLoadError(null);
            setLoading(false);
            return;
        }

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
            const serverPublished = data.participant?.publishedAt ?? null;
            const publishedAtNext = serverPublished || restored.publishedAt;
            const participantNext = data.participant?.id || restored.participantId || null;
            const merged = mergeSubmissions(ensureDrafts(ids, restored.drafts), data.submissions ?? [], {
                serverWins: Boolean(publishedAtNext),
            });
            setCuppedBy(restored.cuppedBy);
            setParticipantId(participantNext);
            setPublishedAt(publishedAtNext);
            setSessionFull(Boolean(data.sessionFull));
            setDrafts(merged);
            persistSessionDraft(token, {
                v: 2,
                cuppedBy: restored.cuppedBy,
                drafts: merged,
                participantId: participantNext ?? undefined,
                publishedAt: publishedAtNext,
            });
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

    const persistMeta = (name: string, nextParticipantId: string | null, nextPublishedAt: string | null) => {
        if (!token) return;
        persistSessionDraft(token, {
            v: 2,
            cuppedBy: name,
            drafts: draftsRef.current,
            participantId: nextParticipantId ?? undefined,
            publishedAt: nextPublishedAt,
        });
    };

    const onNameChange = (name: string) => {
        if (publishedAtRef.current) return;
        setCuppedBy(name);
        persistMeta(name, participantIdRef.current, publishedAtRef.current);
    };

    const applyClaim = (data: ClaimResult, name: string) => {
        setParticipantId(data.participantId);
        participantIdRef.current = data.participantId;
        if (data.publishedAt) {
            setPublishedAt(data.publishedAt);
            publishedAtRef.current = data.publishedAt;
        }
        if (data.submissions?.length) {
            setDrafts((prev) => {
                const next = mergeSubmissions(prev, data.submissions ?? [], {
                    serverWins: Boolean(data.publishedAt),
                });
                persistSessionDraft(token!, {
                    v: 2,
                    cuppedBy: name,
                    drafts: next,
                    participantId: data.participantId,
                    publishedAt: data.publishedAt,
                });
                return next;
            });
        } else {
            persistMeta(name, data.participantId, data.publishedAt);
        }
    };

    const claimSeat = async (opts?: { force?: boolean }) => {
        if (!token || publishedAtRef.current) return false;
        const name = cuppedByRef.current.trim();
        if (!name && !opts?.force) return false;
        const cuppedByName = name || 'Anonymous';
        try {
            const { data, error } = await supabase.functions.invoke<ClaimResult>('submit-cupping', {
                body: {
                    token,
                    action: 'claim',
                    cuppedBy: cuppedByName,
                    participantId: participantIdRef.current || undefined,
                },
            });
            if (error && 'context' in error && error.context instanceof Response) {
                try {
                    const errBody = (await error.context.clone().json()) as ClaimResult;
                    if (errBody?.error === 'already_published' && errBody.participantId) {
                        applyClaim(errBody, cuppedByName);
                        return true;
                    }
                    if (errBody?.error === 'full') {
                        setSessionFull(true);
                        setSubmitError('This session is full.');
                        return false;
                    }
                } catch {
                    /* fall through */
                }
            }
            if (error || !data?.participantId) return false;
            applyClaim(data, cuppedByName);
            return true;
        } catch {
            return false;
        }
    };

    const publishAll = async () => {
        if (!token || publishing || publishedAtRef.current) return;
        const ids = publishableSampleIds(
            samples.map((s) => s.id),
            draftsRef.current,
        );
        if (!ids.length) return;
        const name = cuppedByRef.current.trim() || 'Anonymous';
        if (!cuppedByRef.current.trim()) {
            setCuppedBy(name);
            persistMeta(name, participantIdRef.current, publishedAtRef.current);
        }
        setSubmitError(null);
        setPublishing(true);
        try {
            const { data, error } = await supabase.functions.invoke<ClaimResult>('submit-cupping', {
                body: {
                    token,
                    action: 'publish',
                    cuppedBy: name,
                    participantId: participantIdRef.current || undefined,
                    samples: ids.map((sampleId) => {
                        const d = draftsRef.current[sampleId] ?? emptyDraft();
                        return {
                            sampleId,
                            scores: d.scores,
                            defects: d.defects,
                            notes: d.notes.trim() || null,
                            descriptors: normalizeDescriptors(d.descriptors),
                        };
                    }),
                },
            });
            let payload = data;
            if (error && 'context' in error && error.context instanceof Response) {
                try {
                    payload = (await error.context.clone().json()) as ClaimResult;
                } catch {
                    payload = data;
                }
            }
            if (payload?.error === 'already_published' && payload.participantId) {
                applyClaim(payload, name);
                setConfirmPublish(false);
                showToast({ kind: 'sync', text: 'Already submitted' });
                return;
            }
            if (payload?.error === 'full') {
                setSessionFull(true);
                setSubmitError('This session is full.');
                return;
            }
            if (error || !payload?.publishedAt) {
                setSubmitError(payload?.error ?? error?.message ?? 'submit_failed');
                return;
            }
            const byId = new Map((payload.results ?? []).map((r) => [r.sampleId, r]));
            setParticipantId(payload.participantId);
            setPublishedAt(payload.publishedAt);
            participantIdRef.current = payload.participantId;
            publishedAtRef.current = payload.publishedAt;
            setDrafts((prev) => {
                const next = { ...prev };
                for (const id of ids) {
                    const r = byId.get(id);
                    next[id] = {
                        ...(next[id] ?? emptyDraft()),
                        remoteId: r?.id ?? next[id]?.remoteId,
                        remoteTotal: r?.totalScore ?? next[id]?.remoteTotal,
                        dirty: false,
                    };
                }
                persistSessionDraft(token, {
                    v: 2,
                    cuppedBy: name,
                    drafts: next,
                    participantId: payload.participantId,
                    publishedAt: payload.publishedAt,
                });
                return next;
            });
            setConfirmPublish(false);
            showToast({ kind: 'sync', text: `${ids.length} submitted` });
        } catch (e) {
            setSubmitError(e instanceof Error ? e.message : 'submit_failed');
        } finally {
            setPublishing(false);
        }
    };

    useEffect(() => {
        if (!meta || publishedAt || !cuppedBy.trim()) return;
        void claimSeat();
    }, [meta]);

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

    if (endedInfo) {
        const resultsHref = endedInfo.resultsToken
            ? cuppingResultsUrl(endedInfo.resultsToken)
            : token
              ? cuppingResultsUrl(token)
              : null;
        return (
            <Shell title={endedInfo.eventTitle || 'Session ended'} pageUrl={pageUrl} share={false}>
                <p className="lead">
                    This session has ended. Scoring is closed — open the results summary to see rankings and averages.
                </p>
                {resultsHref ? (
                    <a className="btn btn--solid" href={resultsHref}>
                        View results
                    </a>
                ) : null}
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
                        {published
                            ? `${scoredCount}/${samples.length} submitted`
                            : `${scoredCount}/${samples.length} scored`}
                    </span>
                </div>
                <p className="lead">
                    {published
                        ? 'Submitted. These scores are locked.'
                        : 'Scores stay on this phone until you submit once at the end.'}
                </p>

                {sessionFull && !participantId && !published ? (
                    <div className="danger" role="status">
                        This session is full. You can still look, but new scores cannot be submitted.
                    </div>
                ) : null}

                <div className="field field--session-name">
                    <label htmlFor="cuppedByBoard">Your name</label>
                    <input
                        id="cuppedByBoard"
                        type="text"
                        value={cuppedBy}
                        onChange={(e) => onNameChange(e.target.value)}
                        onBlur={() => void claimSeat()}
                        placeholder="So scores can be told apart"
                        autoComplete="name"
                        disabled={published}
                    />
                </div>

                <div className="sample-list">
                    {samples.map((s, i) => {
                        const d = drafts[s.id];
                        const st = draftStatus(d, published);
                        const total =
                            published && d?.remoteTotal != null
                                ? d.remoteTotal
                                : d && st !== 'empty'
                                  ? totalScore(d.scores, d.defects)
                                  : null;
                        const beanLine = sampleBeanLine(s);
                        const cardState = st === 'published' ? 'synced' : st;
                        return (
                            <button
                                key={s.id}
                                type="button"
                                className={`sample-card sample-card--${cardState}`}
                                onClick={() => openSample(s.id)}
                            >
                                <div>
                                    <div className="sample-card__idx">
                                        #{i + 1}
                                        {total != null ? (
                                            <span className="sample-card__score"> · {Number(total).toFixed(2)}</span>
                                        ) : null}
                                        {st === 'published' ? (
                                            <span className="sample-card__state"> · submitted</span>
                                        ) : st === 'draft' ? (
                                            <span className="sample-card__state"> · on this phone</span>
                                        ) : null}
                                    </div>
                                    <div className="sample-card__name">{sampleTitle(s)}</div>
                                    {beanLine ? <div className="sample-card__meta">{beanLine}</div> : null}
                                    {s.beanName && s.label !== s.beanName ? (
                                        <div className="sample-card__meta">{s.label}</div>
                                    ) : null}
                                </div>
                                <span className="sample-card__chev" aria-hidden>
                                    {st === 'published' ? '✓' : '›'}
                                </span>
                            </button>
                        );
                    })}
                </div>
                {submitError ? (
                    <div className="danger" role="alert">
                        {submitError}
                    </div>
                ) : null}

                {!published ? (
                    <div className="board-submit">
                        {confirmPublish ? (
                            <>
                                <p className="board-submit__warn">
                                    Submit {scoredCount} score{scoredCount === 1 ? '' : 's'}? You cannot edit after
                                    this.
                                </p>
                                <button
                                    type="button"
                                    className="btn btn--solid"
                                    disabled={publishing || scoredCount === 0}
                                    onClick={() => void publishAll()}
                                >
                                    {publishing ? 'Submitting…' : 'Submit scores'}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn--outline"
                                    disabled={publishing}
                                    onClick={() => setConfirmPublish(false)}
                                >
                                    Back
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                className="btn btn--solid"
                                disabled={publishing || scoredCount === 0 || (sessionFull && !participantId)}
                                onClick={() => setConfirmPublish(true)}
                            >
                                {scoredCount === 0 ? 'Score a sample first' : `Submit ${scoredCount} scores`}
                            </button>
                        )}
                    </div>
                ) : null}

                <p className="session-note">
                    Shared session QR — use Share so the next cupper can join from their phone.
                </p>

                <footer className="page-end">
                    <p className="page-end__mark">First Crack</p>
                    <p className="page-end__line">
                        {published ? 'Submitted · locked' : 'One table · one sheet · submit once'}
                    </p>
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
                        {published
                            ? `${scoredCount}/${samples.length} submitted`
                            : `${scoredCount}/${samples.length} scored`}
                    </span>
                </div>

                {multi ? (
                    <div className="sample-strip" role="tablist" aria-label="Samples">
                        {samples.map((s, i) => {
                            const st = draftStatus(drafts[s.id], published);
                            const active = s.id === selectedSample.id;
                            const stripState = st === 'published' ? 'synced' : st;
                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    className={`sample-strip__item${active ? ' sample-strip__item--on' : ''} sample-strip__item--${stripState}`}
                                    onClick={() => {
                                        if (s.id !== selectedSample.id) openSample(s.id);
                                    }}
                                >
                                    <span className="sample-strip__n">{i + 1}</span>
                                    {st === 'published' ? (
                                        <span className="sample-strip__mark" aria-hidden>
                                            ✓
                                        </span>
                                    ) : st === 'draft' ? (
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
                    className={`form-head__badge${published ? ' form-head__badge--done' : ''}${status === 'draft' ? ' form-head__badge--warn' : ''}`}
                >
                    {published
                        ? `Submitted ${draft.remoteTotal != null ? Number(draft.remoteTotal).toFixed(2) : liveTotal.toFixed(2)} · locked`
                        : status === 'draft'
                          ? 'Saved on this phone · submit from session'
                          : 'Session sheet · submit once at the end'}
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
                                    disabled={draft.scores[key] <= SCORE_MIN || locked}
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
                                    disabled={draft.scores[key] >= SCORE_MAX || locked}
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
                            disabled={locked}
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
                        disabled={locked}
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
                        disabled={locked}
                        onChange={(e) => onNameChange(e.target.value)}
                        onBlur={() => void claimSeat()}
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
                                                disabled={locked || (!on && draft.descriptors.length >= 20)}
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
                            disabled={locked}
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
                            disabled={locked || !customTag.trim() || draft.descriptors.length >= 20}
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
                                    disabled={locked}
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
                        disabled={locked}
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
                {!multi && confirmPublish && !published ? (
                    <p className="board-submit__warn">Submit this score? You cannot edit after this.</p>
                ) : null}
            </div>

            <footer className="page-end">
                <p className="page-end__mark">First Crack</p>
                <p className="page-end__line">
                    {published ? 'Submitted · locked' : 'Scores stay on this phone until you submit once'}
                </p>
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
                            disabled={publishing}
                            onClick={() => {
                                const prev = samples[(selectedIdx - 1 + samples.length) % samples.length];
                                openSample(prev.id);
                            }}
                        >
                            ‹
                        </button>
                        <div className="sticky-bar__strip">
                            {samples.map((s, i) => {
                                const st = draftStatus(drafts[s.id], published);
                                const active = s.id === selectedSample.id;
                                const dotState = st === 'published' ? 'synced' : st;
                                return (
                                    <button
                                        key={s.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        aria-label={`Sample ${i + 1}`}
                                        className={`sticky-bar__dot${active ? ' sticky-bar__dot--on' : ''} sticky-bar__dot--${dotState}`}
                                        disabled={publishing}
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
                            disabled={publishing}
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
                    {published ? (
                        <button type="button" className="btn btn--solid btn--synced" disabled>
                            Submitted
                        </button>
                    ) : multi ? (
                        <button
                            type="button"
                            className="btn btn--solid"
                            disabled={publishing}
                            onClick={() => {
                                setSelectedSampleId(null);
                                setSubmitError(null);
                            }}
                        >
                            Session
                        </button>
                    ) : confirmPublish ? (
                        <button
                            type="button"
                            className="btn btn--solid"
                            disabled={publishing || scoredCount === 0}
                            onClick={() => void publishAll()}
                        >
                            {publishing ? 'Submitting…' : 'Confirm submit'}
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="btn btn--solid"
                            disabled={publishing || scoredCount === 0 || (sessionFull && !participantId)}
                            onClick={() => setConfirmPublish(true)}
                        >
                            {scoredCount === 0 ? 'Score first' : 'Submit'}
                        </button>
                    )}
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
