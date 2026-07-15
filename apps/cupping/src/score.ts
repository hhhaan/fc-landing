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

export function defaultScores(fill = 6): ScaV1Scores {
    return Object.fromEntries(SCA_V1_KEYS.map((k) => [k, fill])) as ScaV1Scores;
}

export function totalScore(scores: ScaV1Scores, defects: number): number {
    const sum = SCA_V1_KEYS.reduce((a, k) => a + scores[k], 0);
    return SCA_V1_BASE + sum - Math.max(0, defects) * DEFECT_WEIGHT;
}
