#!/usr/bin/env node
/**
 * Ensure Starlight docs locales stay in sync: root (ko), en, ja.
 * Usage: node scripts/check-docs-i18n.mjs
 * Exit 1 if any locale is missing a sibling page.
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const LOCALES = ['en', 'ja'];
const CONTENT_ROOT = join(fileURLToPath(new URL('..', import.meta.url)), 'apps/docs/src/content/docs');
const EXT = /\.(md|mdx)$/;

/** @param {string} dir @param {string[]} acc */
function walk(dir, acc = []) {
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        const st = statSync(full);
        if (st.isDirectory()) {
            // locale roots are handled separately
            if (dir === CONTENT_ROOT && LOCALES.includes(name)) continue;
            walk(full, acc);
        } else if (EXT.test(name)) {
            acc.push(full);
        }
    }
    return acc;
}

/** @param {string} file @param {string} base */
function toSlug(file, base) {
    return relative(base, file).replace(EXT, '').split(sep).join('/');
}

function main() {
    const rootFiles = walk(CONTENT_ROOT);
    const rootSlugs = new Set(rootFiles.map((f) => toSlug(f, CONTENT_ROOT)));

    /** @type {Map<string, Set<string>>} */
    const localeSlugs = new Map();
    for (const locale of LOCALES) {
        const base = join(CONTENT_ROOT, locale);
        try {
            statSync(base);
        } catch {
            console.error(`[docs-i18n] missing locale directory: ${locale}/`);
            process.exit(1);
        }
        const files = walk(base);
        localeSlugs.set(locale, new Set(files.map((f) => toSlug(f, base))));
    }

    /** @type {string[]} */
    const errors = [];

    for (const slug of rootSlugs) {
        for (const locale of LOCALES) {
            if (!localeSlugs.get(locale)?.has(slug)) {
                errors.push(`missing ${locale}/${slug}.{md,mdx} (has root ${slug})`);
            }
        }
    }

    for (const locale of LOCALES) {
        for (const slug of localeSlugs.get(locale) ?? []) {
            if (!rootSlugs.has(slug)) {
                errors.push(`missing root ${slug}.{md,mdx} (has ${locale}/${slug})`);
            }
            for (const other of LOCALES) {
                if (other === locale) continue;
                if (!localeSlugs.get(other)?.has(slug)) {
                    errors.push(`missing ${other}/${slug}.{md,mdx} (has ${locale}/${slug})`);
                }
            }
        }
    }

    // de-dupe
    const unique = [...new Set(errors)].sort();

    if (unique.length > 0) {
        console.error(`[docs-i18n] ${unique.length} mismatch(es):\n`);
        for (const line of unique) console.error(`  - ${line}`);
        console.error('\nAdd the missing locale page(s) under apps/docs/src/content/docs/{en,ja}/');
        process.exit(1);
    }

    console.log(`[docs-i18n] ok — ${rootSlugs.size} pages × locales: root(ko), ${LOCALES.join(', ')}`);
}

main();
