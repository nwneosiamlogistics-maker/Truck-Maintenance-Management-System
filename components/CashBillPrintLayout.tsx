import React from 'react';
import type { StockItem } from '../types';
import type { GradedSaleData, SaleGrade } from './SellFungibleItemModal';

interface CashBillPrintLayoutProps {
    item: StockItem;
    saleData: GradedSaleData;
    billNumber: string;
    billDate: string;
    totalValue: number;
    totalInWords: string;
    tableRows: (Omit<SaleGrade, 'id'> | null)[];
}

const CashBillPrintLayout: React.FC<CashBillPrintLayoutProps> = ({
    item, saleData, billNumber, billDate, totalValue, totalInWords, tableRows
}) => {
    return (
        <div className="bg-white shadow-lg mx-auto" style={{ width: '210mm', minHeight: '297mm' }}>
            {/* A4 Content */}
            <div className="p-8 font-sarabun text-black" style={{ fontSize: '12pt' }}>
                {/* Header */}
                <header className="flex justify-between items-start mb-4">
                    <div>
                        <h1 className="text-2xl font-bold">NEO SIAM LOGISTICS AND TRANSPORT CO.,LTD</h1>
                        <p>ที่อยู่ 159/9-10 Village No.7 | Bang Muang Sub-district</p>
                        <p>Muang Nakhon Sawan District | Nakhon Sawan 60000 | Thailand</p>
                        <p>เลขประจำตัวผู้เสียภาษีอากร : 0105552087673</p>
                    </div>
                    <div className="text-center">
                        <div className="px-8 py-2 border-2 border-cyan-400 rounded-lg bg-cyan-100 shadow">
                            <h2 className="text-2xl font-bold text-cyan-700">บิลเงินสด</h2>
                        </div>
                    </div>
                </header>

                {/* Info Section */}
                <section className="flex justify-between items-start my-4">
                    <div className="w-3/5 border border-gray-400 rounded p-2 h-24">
                        <p><strong>ชื่อลูกค้า / Customers:</strong> {saleData.buyer}</p>
                        <p><strong>ที่อยู่ / Address:</strong></p>
                        <p><strong>เลขประจำตัวผู้เสียภาษีอากร:</strong></p>
                    </div>
                    <div className="w-2/5 pl-4">
                        <div className="border border-gray-400 rounded p-2">
                            <p><strong>เลขที่ / No.:</strong> {billNumber}</p>
                            <p><strong>วันที่ / Date:</strong> {billDate}</p>
                        </div>
                    </div>
                </section>

                 {/* Items Table */}
                <section className="min-h-[14cm]">
                    <table className="w-full border-collapse border border-gray-400">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-1 border border-gray-400 font-semibold w-16">ลำดับที่<br/>Item</th>
                                <th className="p-1 border border-gray-400 font-semibold text-left">รายการ<br/>Descriptions</th>
                                <th className="p-1 border border-gray-400 font-semibold w-24">จำนวน<br/>Quantity</th>
                                <th className="p-1 border border-gray-400 font-semibold w-32">หน่วยละ<br/>Unit price</th>
                                <th className="p-1 border border-gray-400 font-semibold w-32">จำนวนเงิน<br/>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableRows.map((grade, index) => (
                                <tr key={index}>
                                    <td className="p-1 border-l border-r border-gray-400 text-center">{grade ? index + 1 : <>&nbsp;</>}</td>
                                    <td className="p-1 border-l border-r border-gray-400">{grade ? `ขาย${item.name} (สภาพ: ${grade.condition})` : ''}</td>
                                    <td className="p-1 border-l border-r border-gray-400 text-right">{grade ? grade.quantity.toLocaleString('en-US') : ''}</td>
                                    <td className="p-1 border-l border-r border-gray-400 text-right">{grade ? grade.price.toLocaleString('en-US', {minimumFractionDigits: 2}) : ''}</td>
                                    <td className="p-1 border-l border-r border-gray-400 text-right">{grade ? (grade.quantity * grade.price).toLocaleString('en-US', {minimumFractionDigits: 2}) : ''}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-100">
                                <td colSpan={2} className="p-1 border border-gray-400 text-center font-semibold">( {totalInWords} )</td>
                                <td colSpan={2} className="p-1 border border-gray-400 text-right font-semibold">รวมเงิน / Total</td>
                                <td className="p-1 border border-gray-400 text-right font-bold text-base">{totalValue.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                        </tfoot>
                    </table>
                </section>

                {/* Signature */}
                <footer className="flex justify-end mt-12">
                    <div className="text-center w-64">
                        <p className="border-b border-dotted border-gray-500">&nbsp;</p>
                        <p className="mt-1">ผู้รับเงิน</p>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default CashBillPrintLayout;