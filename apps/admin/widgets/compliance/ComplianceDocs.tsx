import type {
    ComplianceBundle,
    ComplianceDocKind,
    MaterialLedgerRow,
    ProductionLogRow,
    TransactionRow,
} from '@/shared/api/compliance/types';

const DOC_TITLE: Record<ComplianceDocKind, string> = {
    material: '원료수불부',
    production: '생산작업일지',
    transaction: '거래기록서',
};

function Header({ bundle, kind }: { bundle: ComplianceBundle; kind: ComplianceDocKind }) {
    const { subject, period } = bundle;
    return (
        <div className="compliance-doc-header mb-4 text-center">
            <div className="text-[18px] font-bold tracking-[0.2em] text-black">{DOC_TITLE[kind]}</div>
            <div className="mt-1 text-[13px] text-black">
                {period.year}년 {period.month}월분 ({period.from} ~ {period.to})
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border border-black p-2 text-left text-[12px] text-black">
                <div>
                    <span className="font-semibold">상호</span> {subject.businessName || '—'}
                </div>
                <div>
                    <span className="font-semibold">대표</span> {subject.displayName || '—'}
                </div>
                <div>
                    <span className="font-semibold">사업자번호</span> {subject.bizRegNo || '—'}
                </div>
                <div>
                    <span className="font-semibold">계정</span> {subject.email || subject.userId}
                </div>
            </div>
        </div>
    );
}

function MaterialTable({ rows }: { rows: MaterialLedgerRow[] }) {
    return (
        <table className="compliance-table w-full border-collapse text-[11px] text-black">
            <thead>
                <tr className="bg-neutral-100">
                    {['일자', '원료', '원산지', '전일재고', '입고', '출고', '재고', '유형', '비고'].map((h) => (
                        <th key={h} className="border border-black px-1.5 py-1 font-semibold">
                            {h}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.length === 0 ? (
                    <tr>
                        <td colSpan={9} className="border border-black px-2 py-6 text-center">
                            해당 기간 원료 수불 기록 없음
                        </td>
                    </tr>
                ) : (
                    rows.map((r, i) => (
                        <tr key={`${r.date}-${r.beanName}-${i}`}>
                            <td className="border border-black px-1.5 py-1 text-center">{r.date}</td>
                            <td className="border border-black px-1.5 py-1">{r.beanName}</td>
                            <td className="border border-black px-1.5 py-1">{r.origin ?? '—'}</td>
                            <td className="border border-black px-1.5 py-1 text-right">{r.openingKg.toFixed(3)}</td>
                            <td className="border border-black px-1.5 py-1 text-right">{r.inKg.toFixed(3)}</td>
                            <td className="border border-black px-1.5 py-1 text-right">{r.outKg.toFixed(3)}</td>
                            <td className="border border-black px-1.5 py-1 text-right">{r.closingKg.toFixed(3)}</td>
                            <td className="border border-black px-1.5 py-1 text-center">{r.eventType}</td>
                            <td className="border border-black px-1.5 py-1">{r.note ?? ''}</td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
    );
}

function ProductionTable({ rows }: { rows: ProductionLogRow[] }) {
    const sumIn = rows.reduce((s, r) => s + r.inputKg, 0);
    const sumOut = rows.reduce((s, r) => s + r.outputKg, 0);
    const sumLoss = sumIn - sumOut;
    const avgLoss = sumIn > 0 ? (sumLoss / sumIn) * 100 : 0;
    const estimated = rows.filter((r) => !r.measured).length;

    return (
        <>
            <table className="compliance-table w-full border-collapse text-[11px] text-black">
                <thead>
                    <tr className="bg-neutral-100">
                        {[
                            'No',
                            '작업일자',
                            '생두 Lot',
                            '투입(kg)',
                            '생산(kg)',
                            '감모(kg)',
                            '감모율(%)',
                            '프로파일',
                            '레벨',
                            '비고',
                        ].map((h) => (
                            <th key={h} className="border border-black px-1.5 py-1 font-semibold">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 ? (
                        <tr>
                            <td colSpan={10} className="border border-black px-2 py-6 text-center">
                                해당 기간 생산 기록 없음
                            </td>
                        </tr>
                    ) : (
                        rows.map((r, i) => (
                            <tr key={`${r.date}-${i}`}>
                                <td className="border border-black px-1.5 py-1 text-center">{i + 1}</td>
                                <td className="border border-black px-1.5 py-1 text-center">{r.date}</td>
                                <td className="border border-black px-1.5 py-1">{r.beanLot}</td>
                                <td className="border border-black px-1.5 py-1 text-right">{r.inputKg.toFixed(2)}</td>
                                <td className="border border-black px-1.5 py-1 text-right">{r.outputKg.toFixed(2)}</td>
                                <td className="border border-black px-1.5 py-1 text-right">{r.lossKg.toFixed(2)}</td>
                                <td className="border border-black px-1.5 py-1 text-right">
                                    {r.lossRate.toFixed(1)}
                                    {!r.measured ? '*' : ''}
                                </td>
                                <td className="border border-black px-1.5 py-1">{r.profile}</td>
                                <td className="border border-black px-1.5 py-1 text-center">{r.roastLevel}</td>
                                <td className="border border-black px-1.5 py-1">{r.note ?? ''}</td>
                            </tr>
                        ))
                    )}
                    {rows.length > 0 && (
                        <tr className="bg-neutral-100 font-semibold">
                            <td className="border border-black px-1.5 py-1 text-center" colSpan={3}>
                                합계
                            </td>
                            <td className="border border-black px-1.5 py-1 text-right">{sumIn.toFixed(2)}</td>
                            <td className="border border-black px-1.5 py-1 text-right">{sumOut.toFixed(2)}</td>
                            <td className="border border-black px-1.5 py-1 text-right">{sumLoss.toFixed(2)}</td>
                            <td className="border border-black px-1.5 py-1 text-right">{avgLoss.toFixed(1)}</td>
                            <td className="border border-black px-1.5 py-1" colSpan={3} />
                        </tr>
                    )}
                </tbody>
            </table>
            {estimated > 0 && (
                <p className="mt-2 text-[11px] text-black">
                    * 배출량 미계량 {estimated}건 — 생산량/감모는 로스팅 레벨 기반 추정치
                </p>
            )}
        </>
    );
}

function TransactionTable({ rows }: { rows: TransactionRow[] }) {
    return (
        <table className="compliance-table w-full border-collapse text-[11px] text-black">
            <thead>
                <tr className="bg-neutral-100">
                    {['일자', '구분', '거래처', '품목', '수량(kg)', '단가', '금액', '통화', '비고'].map((h) => (
                        <th key={h} className="border border-black px-1.5 py-1 font-semibold">
                            {h}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.length === 0 ? (
                    <tr>
                        <td colSpan={9} className="border border-black px-2 py-6 text-center">
                            해당 기간 거래 기록 없음
                        </td>
                    </tr>
                ) : (
                    rows.map((r, i) => (
                        <tr key={`${r.date}-${r.kind}-${i}`}>
                            <td className="border border-black px-1.5 py-1 text-center">{r.date}</td>
                            <td className="border border-black px-1.5 py-1 text-center">{r.kindLabel}</td>
                            <td className="border border-black px-1.5 py-1">{r.counterparty}</td>
                            <td className="border border-black px-1.5 py-1">{r.item}</td>
                            <td className="border border-black px-1.5 py-1 text-right">
                                {r.qtyKg != null ? r.qtyKg.toFixed(3) : '—'}
                            </td>
                            <td className="border border-black px-1.5 py-1 text-right">
                                {r.unitPrice != null ? r.unitPrice.toLocaleString() : '—'}
                            </td>
                            <td className="border border-black px-1.5 py-1 text-right">
                                {r.amount != null ? r.amount.toLocaleString() : '—'}
                            </td>
                            <td className="border border-black px-1.5 py-1 text-center">{r.currency ?? '—'}</td>
                            <td className="border border-black px-1.5 py-1">{r.note ?? ''}</td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
    );
}

export function ComplianceDocView({ bundle, kind }: { bundle: ComplianceBundle; kind: ComplianceDocKind }) {
    return (
        <div data-compliance-doc="true" className="compliance-doc bg-white p-6 text-black">
            <Header bundle={bundle} kind={kind} />
            {kind === 'material' && <MaterialTable rows={bundle.materialLedger} />}
            {kind === 'production' && <ProductionTable rows={bundle.productionLog} />}
            {kind === 'transaction' && <TransactionTable rows={bundle.transactions} />}
            <div className="mt-6 border-t border-black pt-2 text-center text-[10px] text-neutral-600">
                본 문서는 First Crack 로스팅 기록에 의거하여 작성되었습니다. · 작성일{' '}
                {new Date().toLocaleDateString('ko-KR')}
            </div>
        </div>
    );
}
