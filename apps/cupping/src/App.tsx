import { createClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { defaultScores, LABELS, SCA_V1_KEYS, totalScore, type ScaV1Key, type ScaV1Scores } from './score';

type SessionMeta = {
    inviteId: string;
    roastSessionId: string;
    beanName: string | null;
    profileName: string | null;
    roastLevel: string | null;
    roastedAt: string | null;
    expiresAt: string;
    remainingUses: number;
};

type SubmitResult = { id: string; totalScore: number; cuppedAt: string };

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl ?? '', supabaseAnon ?? '');

function tokenFromPath(): string | null {
    const m = window.location.pathname.match(/^\/c\/([^/]+)\/?$/);
    return m?.[1] ? decodeURIComponent(m[1]) : null;
}

export function App() {
    const token = useMemo(() => tokenFromPath(), []);
    const [meta, setMeta] = useState<SessionMeta | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [scores, setScores] = useState<ScaV1Scores>(() => defaultScores(6));
    const [defects, setDefects] = useState(0);
    const [cuppedBy, setCuppedBy] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [done, setDone] = useState<SubmitResult | null>(null);

    const liveTotal = totalScore(scores, defects);

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
        }
        setLoading(false);
    }, [token]);

    useEffect(() => {
        void load();
    }, [load]);

    const setScore = (key: ScaV1Key, value: number) => {
        setScores((prev) => ({ ...prev, [key]: value }));
    };

    const onSubmit = async () => {
        if (!token) return;
        setSubmitting(true);
        setSubmitError(null);
        const { data, error } = await supabase.functions.invoke<SubmitResult>('submit-cupping', {
            body: {
                token,
                cuppedBy: cuppedBy.trim() || 'Anonymous',
                scores,
                defects,
                notes: notes.trim() || null,
                descriptors: [],
            },
        });
        setSubmitting(false);
        if (error || !data) {
            setSubmitError(error?.message ?? 'submit_failed');
            return;
        }
        setDone(data);
    };

    if (loading) {
        return <Shell title="Cupping">Loading…</Shell>;
    }

    if (!token || loadError || !meta) {
        return (
            <Shell title="Cupping unavailable">
                <p style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
                    This cupping link is invalid, expired, full, or revoked. Ask the roaster for a new QR.
                </p>
            </Shell>
        );
    }

    if (done) {
        return (
            <Shell title="Submitted">
                <p
                    style={{
                        margin: '0 0 8px',
                        fontSize: 28,
                        fontWeight: 600,
                        fontFamily: 'ui-monospace, monospace',
                    }}
                >
                    {Number(done.totalScore).toFixed(2)}
                </p>
                <p style={{ color: 'var(--muted)', margin: 0 }}>Thanks — your score was saved.</p>
            </Shell>
        );
    }

    return (
        <Shell title="Cupping form">
            <header style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--muted)' }}>
                    Session
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>{meta.beanName ?? 'Roast'}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                    {[meta.profileName, meta.roastLevel, meta.roastedAt?.slice(0, 10)].filter(Boolean).join(' · ')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                    {meta.remainingUses} submission(s) remaining
                </div>
            </header>

            <div style={{ display: 'grid', gap: 12 }}>
                {SCA_V1_KEYS.map((key) => (
                    <label key={key} style={{ display: 'grid', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                            <span>{LABELS[key]}</span>
                            <span style={{ fontFamily: 'ui-monospace, monospace' }}>{scores[key].toFixed(2)}</span>
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={10}
                            step={0.25}
                            value={scores[key]}
                            onChange={(e) => setScore(key, Number(e.target.value))}
                            style={{ width: '100%', minHeight: 44 }}
                        />
                    </label>
                ))}

                <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                    Defects
                    <input
                        type="number"
                        min={0}
                        step={1}
                        value={defects}
                        onChange={(e) => setDefects(Math.max(0, Number(e.target.value) || 0))}
                        style={inputStyle}
                    />
                </label>

                <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                    Your name
                    <input
                        type="text"
                        value={cuppedBy}
                        onChange={(e) => setCuppedBy(e.target.value)}
                        placeholder="Optional"
                        style={inputStyle}
                    />
                </label>

                <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                    Notes
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        style={{ ...inputStyle, resize: 'vertical' }}
                    />
                </label>

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 0',
                        fontFamily: 'ui-monospace, monospace',
                        fontSize: 18,
                        fontWeight: 600,
                    }}
                >
                    <span>Total</span>
                    <span>{liveTotal.toFixed(2)}</span>
                </div>

                {submitError ? <div style={{ color: 'var(--danger)', fontSize: 13 }}>{submitError}</div> : null}

                <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void onSubmit()}
                    style={{
                        minHeight: 48,
                        border: 0,
                        borderRadius: 0,
                        background: 'var(--primary)',
                        color: 'var(--bg)',
                        fontSize: 15,
                        fontWeight: 600,
                        cursor: submitting ? 'wait' : 'pointer',
                        opacity: submitting ? 0.7 : 1,
                    }}
                >
                    {submitting ? 'Submitting…' : 'Submit score'}
                </button>
            </div>
        </Shell>
    );
}

const inputStyle: CSSProperties = {
    width: '100%',
    minHeight: 44,
    borderRadius: 0,
    border: '1px solid var(--border)',
    background: 'var(--card)',
    color: 'var(--fg)',
    padding: '10px 12px',
    fontSize: 15,
};

function Shell({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px 48px' }}>
            <div
                style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 0,
                    padding: 20,
                }}
            >
                <h1 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 600 }}>{title}</h1>
                {children}
            </div>
        </div>
    );
}
