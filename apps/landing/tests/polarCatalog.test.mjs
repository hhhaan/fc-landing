import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const lib = new URL('../src/lib/', import.meta.url);
async function load(name) {
    let source = await readFile(new URL(name, lib), 'utf8');
    source = source.replace("import { POLAR_SERVER } from 'astro:env/server';", "const POLAR_SERVER = 'production';");
    source = source.replace(
        /import \{ type BillingMarket, resolveBillingMarket \} from '\.\/market';/,
        "const resolveBillingMarket = () => 'US';",
    );
    source = source.replace(/from '(\.\/[^']+)'/g, (_, relative) => `from '${new URL(relative + '.ts', lib)}'`);
    const output = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext },
    }).outputText;
    return import('data:text/javascript;base64,' + Buffer.from(output).toString('base64'));
}
const { polarProductId } = await load('polarPlans.ts');
const { resolvePolarProduct } = await load('polarProductCatalog.ts');
const { POLAR_PRODUCT_IDS, LEGACY_POLAR_PRODUCT_IDS } = await import('../src/lib/polarProducts.ts');
let checks = 0;
for (const [key, id] of Object.entries(POLAR_PRODUCT_IDS)) {
    const market = key.match(/_(US|KR|JP)/)[1];
    const plan = (key.includes('PLUS') ? 'pro-plus-' : 'pro-') + (key.endsWith('YEARLY') ? 'yearly' : 'monthly');
    assert.equal(polarProductId(plan, market), id);
    checks++;
    assert.equal(polarProductId(plan, market, { [key]: '' }), '');
    checks++;
    assert.ok(resolvePolarProduct(LEGACY_POLAR_PRODUCT_IDS[key]));
    checks++;
    if (id) {
        assert.ok(resolvePolarProduct(id));
        checks++;
    }
}
for (const suffix of ['', '_SBX', '_PROD']) {
    assert.equal(
        polarProductId('enterprise-monthly', 'US', { ['POLAR_PRICE_ENTERPRISE_MONTHLY' + suffix]: 'unsafe-id' }),
        undefined,
    );
    checks++;
}
assert.equal(resolvePolarProduct('unknown'), null);
checks++;
console.log(`${checks} catalog assertions passed`);
