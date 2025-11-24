
import React from 'react';
import type { PurchaseRequisition } from '../types';

interface PurchaseRequisitionPrintProps {
    requisition: PurchaseRequisition;
}

const PurchaseRequisitionPrint: React.FC<PurchaseRequisitionPrintProps> = ({ requisition }) => {
    const subtotal = requisition.totalAmount - (requisition.vatAmount || 0);
    const vatAmount = requisition.vatAmount || 0;
    const grandTotal = requisition.totalAmount;
    const vatRate = subtotal > 0 && vatAmount > 0 ? (vatAmount / subtotal) * 100 : 0;

    return (
        <div className="bg-white p-8 font-sarabun text-gray-800">
            {/* Header */}
            <header className="flex justify-between items-start pb-4 border-b-2 border-gray-800">
                <div className="w-2/5">
                    <h1 className="text-4xl font-bold">ใบขอซื้อ</h1>
                    <h2 className="text-xl text-gray-500">Purchase Requisition</h2>
                </div>
                <div className="w-3/5 text-right">
                    <p className="text-xl font-bold">NEOSIAM LOGISTICS & TRANSPORT</p>
                    <p className="text-sm text-gray-600">A 159/9-10 Village No.7 | Bang Muang Sub-district  |  Muang Nakhon Sawan District | Nakhon Sawan 60000 | Thailand</p>
                    <p className="text-sm text-gray-600">T (+66)5627 5841  Fax (+66)5627 5843 info_nw@neosiamlogistics.com</p>
                </div>
            </header>

             {/* Info Section */}
            <section className="grid grid-cols-2 gap-6 my-6 text-sm">
                <div className="border border-gray-300 rounded-lg p-4 space-y-1">
                    <p className="font-bold text-base">ผู้จำหน่าย (Supplier):</p>
                    <p>{requisition.supplier || '-'}</p>
                </div>
                <div className="border border-gray-300 rounded-lg p-4 space-y-1">
                    <p className="font-bold text-base">ข้อมูลการขอซื้อ:</p>
                    <div className="grid grid-cols-2 gap-x-4">
                        <p><span className="font-semibold">เลขที่:</span> {requisition.prNumber}</p>
                        <p><span className="font-semibold">วันที่:</span> {new Date(requisition.createdAt).toLocaleDateString('th-TH')}</p>
                        <p><span className="font-semibold">ผู้ขอซื้อ:</span> {requisition.requesterName}</p>
                        <p><span className="font-semibold">แผนก/สาขา:</span> {requisition.department}</p>
                        <p><span className="font-semibold">วันที่ต้องการใช้:</span> {new Date(requisition.dateNeeded).toLocaleDateString('th-TH')}</p>
                    </div>
                </div>
            </section>

            {/* Items Table */}
            <section>
                <table className="w-full border-collapse">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border text-sm font-semibold text-center w-16">ลำดับ</th>
                            <th className="p-2 border text-sm font-semibold text-left">รายการ</th>
                            <th className="p-2 border text-sm font-semibold text-right w-24">จำนวน</th>
                            <th className="p-2 border text-sm font-semibold text-center w-24">หน่วย</th>
                            <th className="p-2 border text-sm font-semibold text-right w-32">ราคา/หน่วย</th>
                            <th className="p-2 border text-sm font-semibold text-right w-32">จำนวนเงิน</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(Array.isArray(requisition.items) ? requisition.items : []).map((item, index) => (
                            <tr key={index} className="odd:bg-white even:bg-gray-50">
                                <td className="p-2 border text-sm text-center">{index + 1}</td>
                                <td className="p-2 border text-sm">{item.name}</td>
                                <td className="p-2 border text-sm text-right">{item.quantity}</td>
                                <td className="p-2 border text-sm text-center">{item.unit}</td>
                                <td className="p-2 border text-sm text-right">{item.unitPrice.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                <td className="p-2 border text-sm text-right font-medium">{(item.quantity * item.unitPrice).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            {/* Totals */}
             <section className="flex justify-end mt-4">
                <div className="w-2/5 space-y-2 text-sm">
                    <div className="flex justify-between p-2">
                        <span className="font-semibold">ราคารวมอะไหล่</span>
                        <span>{subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                    </div>
                    {vatAmount > 0 && (
                        <div className="flex justify-between p-2">
                            <span className="font-semibold">VAT ({vatRate.toFixed(0)}%)</span>
                            <span>{vatAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                        </div>
                    )}
                    <div className="flex justify-between p-2 border-t-2 border-gray-800 font-bold text-base">
                        <span>ยอดรวมสุทธิ</span>
                        <span>{grandTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                    </div>
                </div>
            </section>

            {/* Notes */}
            <section className="mt-6 border-t pt-4 text-sm">
                <p><strong>หมายเหตุ:</strong> {requisition.notes || '-'}</p>
            </section>

            {/* Signatures */}
            <footer className="grid grid-cols-3 gap-4 mt-24 pt-8 text-sm">
                <div className="text-center">
                    <p className="pt-12 border-b border-dotted border-gray-400"></p>
                    <p className="mt-2">({requisition.requesterName || ' '})</p>
                    <p className="font-semibold">ผู้ขอซื้อ</p>
                </div>
                <div className="text-center">
                     <p className="pt-12 border-b border-dotted border-gray-400"></p>
                     <p className="mt-2">({requisition.approverName || ' '})</p>
                     <p className="font-semibold">ผู้อนุมัติ</p>
                </div>
                <div className="text-center">
                     <p className="pt-12 border-b border-dotted border-gray-400"></p>
                     <p className="mt-2">(.................................................)</p>
                     <p className="font-semibold">ผู้รับสินค้า</p>
                </div>
            </footer>
        </div>
    );
};

export default PurchaseRequisitionPrint;
