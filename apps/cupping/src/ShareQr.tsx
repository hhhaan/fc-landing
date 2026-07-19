import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

type Props = {
    url: string;
    open: boolean;
    onClose: () => void;
};

export function ShareQr({ url, open, onClose }: Props) {
    const [dataUrl, setDataUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setErr(null);
        setCopied(false);
        void QRCode.toDataURL(url, {
            width: 280,
            margin: 2,
            color: { dark: '#080503', light: '#ffffff' },
            errorCorrectionLevel: 'M',
        })
            .then((d) => {
                if (!cancelled) setDataUrl(d);
            })
            .catch(() => {
                if (!cancelled) setErr('Could not render QR');
            });
        return () => {
            cancelled = true;
        };
    }, [open, url]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        } catch {
            setErr('Copy failed');
        }
    };

    const nativeShare = async () => {
        if (!navigator.share) return;
        try {
            await navigator.share({ title: 'Cupping session', url, text: 'Join this cupping session' });
        } catch {
            /* user cancelled */
        }
    };

    return (
        <div className="qr-overlay" role="dialog" aria-modal="true" aria-labelledby="qr-title">
            <button type="button" className="qr-overlay__backdrop" aria-label="Close" onClick={onClose} />
            <div className="qr-sheet">
                <div className="qr-sheet__head">
                    <h2 id="qr-title" className="qr-sheet__title">
                        Share session
                    </h2>
                    <button type="button" className="qr-sheet__close" onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </div>
                <p className="qr-sheet__lead">Show this QR so the person next to you can join the same table link.</p>
                <div className="qr-sheet__code">
                    {dataUrl ? (
                        <img src={dataUrl} alt="Session QR code" width={280} height={280} />
                    ) : err ? (
                        <p className="danger">{err}</p>
                    ) : (
                        <div className="loading__spinner" aria-hidden />
                    )}
                </div>
                <p className="qr-sheet__url" title={url}>
                    {url}
                </p>
                <div className="qr-sheet__actions">
                    <button type="button" className="btn btn--solid" onClick={() => void copy()}>
                        {copied ? 'Copied' : 'Copy link'}
                    </button>
                    {'share' in navigator ? (
                        <button type="button" className="btn btn--outline" onClick={() => void nativeShare()}>
                            Share…
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
