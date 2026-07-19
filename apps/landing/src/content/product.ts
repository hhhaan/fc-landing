/**
 * Product messaging SSOT for landing.
 * Align with docs: apps/docs service/plans + machines.
 * Pricing numbers live in markets.ts — not here.
 */

export const DOCS_BASE = 'https://docs.firstcrackiscoming.com';

export const DOCS = {
    plans: `${DOCS_BASE}/service/plans/`,
    machines: `${DOCS_BASE}/machines/`,
    installMac: `${DOCS_BASE}/start/install-mac/`,
    installWindows: `${DOCS_BASE}/start/install-windows/`,
    systemRequirements: `${DOCS_BASE}/start/system-requirements/`,
    support: `${DOCS_BASE}/support/contact/`,
} as const;

/** Batch / trial limits — keep in sync with Polar checkout + docs. */
export const LIMITS = {
    freeBatchesPerMonth: 20,
    trialDays: 14,
    trialBatches: 20,
    proBatchesPerMonth: 200,
} as const;

/**
 * Canonical plan model (one source of wording):
 * - Free: always available at 20 batches/month (basic floor tools)
 * - Trial: 14-day Pro/Pro+ checkout trial (20 batches); cancel before end to avoid charge
 * - Pro / Pro+ / Enterprise: paid
 */
export const PLAN_COPY = {
    freeShort: 'Free · 20 batches / month',
    freeBody: 'Desktop app with basic roast tools — 20 batches per month. No card required to stay on Free.',
    trialShort: '14-day Pro trial · 20 batches',
    trialBadge: '14-day Pro trial · 20 batches',
    trialLead:
        'Start a 14-day Pro or Pro+ trial (20 batches). Cancel before the trial ends to avoid the first charge. After trial you can stay on Free (20 batches/mo) or continue paid.',
    trialFine: '14-day Pro trial · 20 batches · then Free (20/mo) or paid · Cancel before trial ends',
    trialCtaLabel: 'Start 14-day trial',
    trialHeroTrust: '14-day Pro trial · 20 batches',
    pricingLead:
        'Start a 14-day Pro trial (20 batches). Cancel before the trial ends. After trial: Free at 20 batches/mo, or keep Pro / Pro+.',
    freeAccountBlurb:
        'Free plan — 20 batches per month on the floor. Start a 14-day Pro trial when you need higher limits and cloud plan features.',
    signupLead: '14-day Pro trial, 20 batches. Desktop app for macOS & Windows.',
    downloadTrialNote: '14-day Pro trial · 20 batches · then Free (20/mo) or paid',
    proFeatureBatches: '200 batches / billing month',
    proPlusFeatureBatches: 'Unlimited batches',
    freeFeatureBatches: '20 batches / month',
} as const;

export const HARDWARE = [
    {
        tag: 'Protocol',
        name: 'Modbus',
        desc: 'RTU/TCP — PLC and controller links (e.g. Probat, Giesen, gas roasters)',
    },
    {
        tag: 'Sensors',
        name: 'Phidget',
        desc: 'Thermocouple & probe interfaces (e.g. Diedrich-style setups)',
    },
    {
        tag: 'Ecosystem',
        name: 'Artisan-ready',
        desc: 'Reuse familiar machine configs from Artisan / Cropster-class setups',
    },
    {
        tag: 'Platform',
        name: 'Desktop-native',
        desc: 'macOS & Windows installers — works offline on the floor',
    },
] as const;

export const MACHINE_BRANDS =
    'Probat · Giesen · Diedrich · Delta / Autonics controllers · and Artisan-compatible machines';

export const PROOFS = [
    { label: 'Desktop-native', detail: 'macOS & Windows' },
    { label: 'Floor-ready', detail: 'Modbus · Phidget · Artisan' },
    { label: 'Live curves', detail: 'BT · ET · RoR' },
    { label: 'Try risk-free', detail: PLAN_COPY.trialBadge },
] as const;

export const FAQ_ITEMS = [
    {
        q: 'What’s Free vs the 14-day trial?',
        a: 'Free is always available: 20 batches per month with basic desktop tools. The 14-day trial is for Pro or Pro+ at checkout (20 batches during the trial). Cancel before the trial ends to avoid the first paid charge; you can keep using Free afterward.',
    },
    {
        q: 'Which roasting machines work?',
        a: `First Crack connects via Modbus RTU/TCP, Phidget, and Artisan-ready paths. Typical gear includes ${MACHINE_BRANDS}. If your machine works with Artisan or Cropster, it usually works here — see the machines docs or contact us with your model.`,
    },
    {
        q: 'Does it work offline?',
        a: 'Yes. The desktop app is built for the roast floor with low-latency hardware links. Cloud sync is for when you’re back online — not required mid-roast.',
    },
    {
        q: 'What’s the difference between Pro and Pro+?',
        a: 'Pro covers live roast, history, profiles, greens/blends, and schedule — 200 batches per billing month, 1 seat. Pro+ adds unlimited batches and commerce connectors (Shopify, Naver, Cafe24, and similar).',
    },
    {
        q: 'macOS or Windows?',
        a: 'Both. Apple Silicon and Intel Macs (macOS 12+), and Windows 10/11 64-bit. Download installers on the download page; system requirements are in the docs.',
    },
    {
        q: 'How do seats and Enterprise work?',
        a: 'Pro and Pro+ include 1 seat. Enterprise adds multi-seat teams, custom work, FDE support, and contract billing — contact sales for pricing (from about $300/mo + per-seat).',
    },
    {
        q: 'Can I cancel or get a refund?',
        a: 'Cancel anytime; access continues until the end of the billing period. Trial: cancel before it ends to avoid the first charge. Fees are generally non-refundable except where law requires or for clear duplicate charges — see Terms.',
    },
] as const;

export const ABOUT = {
    stats: [
        { label: 'HQ', value: 'Seoul' },
        { label: 'Team', value: 'Remote-first' },
        { label: 'Ship', value: 'Weekly' },
        { label: 'Platforms', value: 'macOS & Windows' },
    ],
    values: [
        {
            n: '01',
            title: 'Floor-first',
            body: 'Desktop-native, low-latency, offline-capable — built for the machine room, not a browser tab.',
        },
        {
            n: '02',
            title: 'Reproducible',
            body: 'Every batch logged, searchable, and comparable. Consistency is the product.',
        },
        {
            n: '03',
            title: 'Ship weekly',
            body: 'Small team, short loops. Features reach roasters in days, not quarters.',
        },
        {
            n: '04',
            title: 'Craft matters',
            body: "Every hire learns to roast. You build tools for a craft you've practiced yourself.",
        },
    ],
} as const;
