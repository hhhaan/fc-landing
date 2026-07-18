import type { ComplianceBundle, ComplianceDocKind, MaterialLedgerRow, ProductionLogRow, TransactionRow } from './types';

const esc = (v: string | number | null | undefined): string => {
    const s = v == null ? '' : String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
};

const join = (cells: (string | number | null | undefined)[]) => cells.map(esc).join(',');

function materialCsv(rows: MaterialLedgerRow[]): string {
    const header = join(['일자', '원료', '원산지', '전일재고(kg)', '입고(kg)', '출고(kg)', '재고(kg)', '유형', '비고']);
    const body = rows.map((r) =>
        join([r.date, r.beanName, r.origin, r.openingKg, r.inKg, r.outKg, r.closingKg, r.eventType, r.note]),
    );
    return `\uFEFF${[header, ...body].join('\n')}\n`;
}

function productionCsv(rows: ProductionLogRow[]): string {
    const header = join([
        '작업일자',
        '생두 Lot',
        '투입(kg)',
        '생산(kg)',
        '감모(kg)',
        '감모율(%)',
        '계량',
        '프로파일',
        '레벨',
        '비고',
    ]);
    const body = rows.map((r) =>
        join([
            r.date,
            r.beanLot,
            r.inputKg,
            r.outputKg,
            r.lossKg,
            r.lossRate,
            r.measured ? '실측' : '추정',
            r.profile,
            r.roastLevel,
            r.note,
        ]),
    );
    return `\uFEFF${[header, ...body].join('\n')}\n`;
}

function transactionCsv(rows: TransactionRow[]): string {
    const header = join(['일자', '구분', '거래처', '품목', '수량(kg)', '단가', '금액', '통화', '비고']);
    const body = rows.map((r) =>
        join([r.date, r.kindLabel, r.counterparty, r.item, r.qtyKg, r.unitPrice, r.amount, r.currency, r.note]),
    );
    return `\uFEFF${[header, ...body].join('\n')}\n`;
}

export function complianceToCsv(bundle: ComplianceBundle, kind: ComplianceDocKind): string {
    if (kind === 'material') return materialCsv(bundle.materialLedger);
    if (kind === 'production') return productionCsv(bundle.productionLog);
    return transactionCsv(bundle.transactions);
}

export function complianceFilename(bundle: ComplianceBundle, kind: ComplianceDocKind): string {
    const range = `${bundle.period.from}_${bundle.period.to}`;
    const who = (bundle.subject.businessName || bundle.subject.email || bundle.subject.userId).replace(
        /[^\w가-힣.-]+/g,
        '_',
    );
    const label = kind === 'material' ? '원료수불부' : kind === 'production' ? '생산작업일지' : '거래기록서';
    return `${label}_${who}_${range}.csv`;
}

export function downloadText(text: string, filename: string, mime = 'text/csv;charset=utf-8;'): void {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
