import { createClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { cuppingResultsUrl } from './publicBase';
import { ShareQr } from './ShareQr';

type CupperRow = {
    cuppedBy: string;
    totalScore: number;
    descriptors: string[];
    cuppedAt: string;
};

type SampleResult = {
    id: string;
    label: string;
    beanName: string | null;
    beanMeta: string | null;
    scoreCount: number;
    avgTotal: number | null;
    topDescriptors: { tag: string; count: number }[];
    cuppers: CupperRow[];
};

type ResultsPayload = {
    eventId: string;
    eventTitle: string;
    heldAt: string;
    endedAt: string;
    resultsToken: string;
    scoreCount: number;
    participantCount: number;
    overallAvg: number | null;
    samples: SampleResult[];
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl ?? '', supabaseAnon ?? '');

function formatAvg(n: number | null): string {
    if (n == null) return '—';
    return n.toFixed(2);
}

export function ResultsPage({ token }: { token: string }) {
    const [data, setData] = useState<ResultsPayload | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [qrOpen, setQrOpen] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const pageUrl = cuppingResultsUrl(token);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        const { data: body, error: fnErr } = await supabase.functions.invoke<ResultsPayload & { error?: string }>(
            'get-cupping-results',
            { body: { token } },
        );
        if (fnErr || !body || body.error) {
            const msg = body?.error ?? fnErr?.message ?? 'load_failed';
            setError(msg);
            setData(null);
        } else {
            setData(body);
            // Canonical /r/ URL if we arrived via invite token
            if (body.resultsToken && body.resultsToken !== token) {
                const path = `/r/${encodeURIComponent(body.resultsToken)}`;
                if (window.location.pathname !== path) {
                    window.history.replaceState(null, '', path);
                }
            }
        }
        setLoading(false);
    }, [token]);

    useEffect(() => {
        void load();
    }, [load]);

    if (loading) {
        return (
            <div className="shell">
                <header className="top">
                    <p className="eyebrow">First Crack</p>
                    <h1 className="title">Results</h1>
                </header>
                <div className="loading" role="status">
                    <div className="loading__spinner" aria-hidden />
                    Loading results…
                </div>
            </div>
        );
    }

    if (error || !data) {
        const notEnded = error === 'not_ended' || error?.includes('not_ended');
        return (
            <div className="shell">
                <header className="top">
                    <p className="eyebrow">First Crack</p>
                    <h1 className="title">Results unavailable</h1>
                </header>
                <p className="lead">
                    {notEnded
                        ? 'This session is still open. Results appear after the host ends the session.'
                        : 'This results link is invalid or expired. Ask the host for the results QR.'}
                </p>
            </div>
        );
    }

    return (
        <div className="shell">
            <header className="top">
                <div className="top__row">
                    <div>
                        <p className="eyebrow">Session results</p>
                        <h1 className="title">{data.eventTitle || 'Cupping'}</h1>
                    </div>
                    <button type="button" className="icon-btn" onClick={() => setQrOpen(true)} aria-label="Share">
                        Share
                    </button>
                </div>
                <p className="lead lead--tight">
                    {data.scoreCount} scores · {data.participantCount} cuppers
                    {data.overallAvg != null ? ` · avg ${formatAvg(data.overallAvg)}` : ''}
                </p>
            </header>

            <ShareQr url={pageUrl} open={qrOpen} onClose={() => setQrOpen(false)} />

            {data.samples.length === 0 ? (
                <p className="lead">No samples in this session.</p>
            ) : (
                <ol className="results-list">
                    {data.samples.map((s, i) => {
                        const open = expandedId === s.id;
                        const title = s.beanName || s.label;
                        return (
                            <li key={s.id} className="results-card">
                                <button
                                    type="button"
                                    className="results-card__head"
                                    onClick={() => setExpandedId(open ? null : s.id)}
                                    aria-expanded={open}
                                >
                                    <span className="results-card__rank" aria-hidden>
                                        {i + 1}
                                    </span>
                                    <span className="results-card__main">
                                        <span className="results-card__title">{title}</span>
                                        {s.beanName && s.label !== s.beanName ? (
                                            <span className="results-card__sub">{s.label}</span>
                                        ) : null}
                                        {s.beanMeta ? <span className="results-card__meta">{s.beanMeta}</span> : null}
                                    </span>
                                    <span className="results-card__score">
                                        <span className="results-card__avg">{formatAvg(s.avgTotal)}</span>
                                        <span className="results-card__n">n={s.scoreCount}</span>
                                    </span>
                                </button>

                                {s.topDescriptors.length > 0 ? (
                                    <div className="results-tags">
                                        {s.topDescriptors.map((d) => (
                                            <span key={d.tag} className="chip">
                                                {d.tag}
                                                {d.count > 1 ? ` · ${d.count}` : ''}
                                            </span>
                                        ))}
                                    </div>
                                ) : null}

                                {open ? (
                                    <ul className="results-cuppers">
                                        {s.cuppers.length === 0 ? (
                                            <li className="results-cuppers__empty">No scores</li>
                                        ) : (
                                            s.cuppers.map((c, idx) => (
                                                <li
                                                    key={`${c.cuppedBy}-${c.cuppedAt}-${idx}`}
                                                    className="results-cupper"
                                                >
                                                    <div className="results-cupper__row">
                                                        <span className="results-cupper__name">{c.cuppedBy}</span>
                                                        <span className="results-cupper__total">
                                                            {Number(c.totalScore).toFixed(2)}
                                                        </span>
                                                    </div>
                                                    {c.descriptors.length > 0 ? (
                                                        <div className="results-tags results-tags--dense">
                                                            {c.descriptors.map((tag) => (
                                                                <span key={tag} className="chip chip--muted">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                </li>
                                            ))
                                        )}
                                    </ul>
                                ) : null}
                            </li>
                        );
                    })}
                </ol>
            )}

            <p className="results-footnote">Hosted session summary. Link is private to people who have the token.</p>
        </div>
    );
}
