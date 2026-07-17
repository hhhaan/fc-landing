export const SCA_V1_KEYS = [
    'fragrance',
    'aroma',
    'flavor',
    'aftertaste',
    'acidity',
    'body',
    'balance',
    'overall',
] as const;

export type ScaV1Key = (typeof SCA_V1_KEYS)[number];
export type ScaV1Scores = Record<ScaV1Key, number>;

export const SCA_V1_BASE = 36;
export const DEFECT_WEIGHT = 2;
export const SCORE_MIN = 0;
export const SCORE_MAX = 10;
export const SCORE_STEP = 0.25;

export const LABELS: Record<ScaV1Key, string> = {
    fragrance: 'Fragrance',
    aroma: 'Aroma',
    flavor: 'Flavor',
    aftertaste: 'Aftertaste',
    acidity: 'Acidity',
    body: 'Body',
    balance: 'Balance',
    overall: 'Overall',
};

export function isValidScoreStep(value: number): boolean {
    if (!Number.isFinite(value) || value < SCORE_MIN || value > SCORE_MAX) return false;
    return Math.abs(value * 4 - Math.round(value * 4)) < 1e-9;
}

export function clampScore(value: number): number {
    const stepped = Math.round(value / SCORE_STEP) * SCORE_STEP;
    return Math.min(SCORE_MAX, Math.max(SCORE_MIN, stepped));
}

export function defaultScores(fill = 6): ScaV1Scores {
    return Object.fromEntries(SCA_V1_KEYS.map((k) => [k, fill])) as ScaV1Scores;
}

/** Alias aligned with desktop / edge. */
export const defaultScaV1Scores = defaultScores;

export function totalScore(scores: Partial<ScaV1Scores>, defects: number): number {
    const sum = SCA_V1_KEYS.reduce((a, k) => a + (scores[k] ?? 0), 0);
    return SCA_V1_BASE + sum - Math.max(0, defects) * DEFECT_WEIGHT;
}

export const totalScoreScaV1 = totalScore;

export function parseScaV1Scores(input: unknown): ScaV1Scores {
    if (!input || typeof input !== 'object') {
        throw new Error('scores must be an object');
    }
    const obj = input as Record<string, unknown>;
    const out = {} as ScaV1Scores;
    for (const key of SCA_V1_KEYS) {
        const v = obj[key];
        if (typeof v !== 'number' || !isValidScoreStep(v)) {
            throw new Error(`invalid score: ${key}`);
        }
        out[key] = v;
    }
    return out;
}

/** Match edge `submit-cupping` normalize: lowercase, ≤40 chars, max 20 tags. */
export function normalizeDescriptors(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const x of raw) {
        if (typeof x !== 'string') continue;
        const tag = x.trim().toLowerCase().slice(0, 40);
        if (!tag || seen.has(tag)) continue;
        seen.add(tag);
        out.push(tag);
        if (out.length >= 20) break;
    }
    return out;
}
