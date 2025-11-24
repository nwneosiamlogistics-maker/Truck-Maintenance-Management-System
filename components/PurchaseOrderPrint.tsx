
import React from 'react';
import type { PurchaseOrder } from '../types';
import { numberToThaiWords } from '../utils';

interface PurchaseOrderPrintProps {
    po: PurchaseOrder;
}

const PurchaseOrderPrint: React.FC<PurchaseOrderPrintProps> = ({ po }) => {
    const totalInWords = numberToThaiWords(po.totalAmount);

    const linkedPrText = (po.linkedPrNumbers && po.linkedPrNumbers.length > 0) 
        ? po.linkedPrNumbers.join(', ') 
        : '-';

    return (
        <div className="bg-white p-6 font-sarabun text-gray-800 text-xs leading-tight print:p-0" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', boxSizing: 'border-box' }}>
            <div className="p-8 h-full flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-start mb-4 border-b-2 border-gray-800 pb-2">
                    <div className="w-3/5">
                        <h1 className="text-2xl font-bold text-gray-900">ใบสั่งซื้อ</h1>
                        <h2 className="text-base text-gray-600">PURCHASE ORDER</h2>
                        <div className="mt-2">
                            <p className="font-bold text-base">NEOSIAM LOGISTICS & TRANSPORT</p>
                            <p>A 159/9-10 Village No.7 | Bang Muang Sub-district</p>
                            <p>Muang Nakhon Sawan District | Nakhon Sawan 60000</p>
                            <p>Tax ID: 0105552087673</p>
                        </div>
                    </div>
                    <div className="w-2/5 text-right">
                        <div className="border border-gray-300 p-2 rounded bg-gray-50 text-left text-xs">
                            <div className="flex mb-1"><span className="font-bold w-28 flex-shrink-0">เลขที่ใบสั่งซื้อ:</span> <span>{po.poNumber}</span></div>
                            <div className="flex mb-1"><span className="font-bold w-28 flex-shrink-0">วันที่:</span> <span>{new Date(po.orderDate).toLocaleDateString('th-TH')}</span></div>
                            <div className="flex mb-1"><span className="font-bold w-28 flex-shrink-0">กำหนดส่ง:</span> <span>{po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString('th-TH') : '-'}</span></div>
                            <div className="flex mb-1"><span className="font-bold w-28 flex-shrink-0">ผู้ติดต่อ:</span> <span>{po.contactPerson || '-'}</span></div>
                            <div className="flex mb-1"><span className="font-bold w-28 flex-shrink-0">ผู้ขอซื้อ (Requester):</span> <span>{po.requesterName || '-'}</span></div>
                            <div className="flex mb-1"><span className="font-bold w-28 flex-shrink-0">แผนก/สาขา (Dept):</span> <span>{po.department || '-'}</span></div>
                            <div className="flex"><span className="font-bold w-28 flex-shrink-0">อ้างอิงใบขอซื้อ:</span> <span>{linkedPrText}</span></div>
                        </div>
                    </div>
                </div>

                {/* Supplier Info & Additional Fields */}
                <div className="mb-4 grid grid-cols-2 gap-4">
                    <div className="border rounded p-3">
                        <h3 className="font-bold border-b mb-1 text-sm">ผู้จำหน่าย (Supplier)</h3>
                        <p className="font-semibold text-base">{po.supplierName}</p>
                        <p className="whitespace-pre-wrap text-xs">{po.supplierAddress || '-'}</p>
                        {po.supplierTaxId && <p className="text-xs">เลขประจำตัวผู้เสียภาษี: {po.supplierTaxId}</p>}
                    </div>
                    <div className="border rounded p-3">
                        <h3 className="font-bold border-b mb-1 text-sm">ข้อมูลเพิ่มเติม</h3>
                        <div className="space-y-1 text-xs">
                            <p><span className="font-semibold">สถานที่ส่งสินค้า:</span> {po.deliveryLocation || '-'}</p>
                            <p><span className="font-semibold">สำหรับโครงการ:</span> {po.project || '-'}</p>
                            <p><span className="font-semibold">ติดต่อบัญชี:</span> {po.contactAccount || '-'}</p>
                            <p><span className="font-semibold">ติดต่อผู้รับสินค้า:</span> {po.contactReceiver || '-'}</p>
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div className="flex-grow">
                    <table className="w-full border-collapse mb-4 text-xs">
                        <thead>
                            <tr className="bg-gray-200 text-gray-700">
                                <th className="border p-1 text-center w-10">ลำดับ</th>
                                <th className="border p-1 text-left">รายการสินค้า / รายละเอียด</th>
                                <th className="border p-1 text-center w-12">จำนวน</th>
                                <th className="border p-1 text-center w-12">หน่วย</th>
                                <th className="border p-1 text-right w-20">ราคา/หน่วย</th>
                                <th className="border p-1 text-right w-16">ส่วนลด</th>
                                <th className="border p-1 text-right w-24">จำนวนเงิน</th>
                            </tr>
                        </thead>
                        <tbody>
                            {po.items.map((item, index) => (
                                <tr key={index}>
                                    <td className="border p-1 text-center">{index + 1}</td>
                                    <td className="border p-1">{item.name}</td>
                                    <td className="border p-1 text-center">{item.quantity}</td>
                                    <td className="border p-1 text-center">{item.unit}</td>
                                    <td className="border p-1 text-right">{item.unitPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                    <td className="border p-1 text-right">{item.discount ? item.discount.toLocaleString() : '-'}</td>
                                    <td className="border p-1 text-right">{item.totalPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                </tr>
                            ))}
                            {/* Ensure minimum rows for layout stability but don't overflow page */}
                            {Array.from({ length: Math.max(0, 12 - po.items.length) }).map((_, i) => (
                                <tr key={`empty-${i}`}>
                                    <td className="border p-1 text-center">&nbsp;</td>
                                    <td className="border p-1"></td>
                                    <td className="border p-1"></td>
                                    <td className="border p-1"></td>
                                    <td className="border p-1"></td>
                                    <td className="border p-1"></td>
                                    <td className="border p-1"></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals & Terms */}
                <div className="mt-auto">
                    <div className="flex justify-between items-start border-t pt-4">
                        <div className="w-3/5 pr-4 space-y-2">
                            <div className="border p-2 rounded">
                                <p className="font-bold mb-1 text-xs">เงื่อนไขการชำระเงิน:</p>
                                <p className="text-xs">{po.paymentTerms || '-'}</p>
                            </div>
                            <div className="border p-2 rounded">
                                <p className="font-bold mb-1 text-xs">หมายเหตุ:</p>
                                <p className="text-xs">{po.notes || '-'}</p>
                            </div>
                            <div className="pt-1">
                                <p className="font-bold text-xs">ตัวอักษร:</p>
                                <p className="italic bg-gray-100 p-1 rounded text-center text-xs">{totalInWords}</p>
                            </div>
                        </div>
                        <div className="w-2/5">
                            <div className="flex justify-between py-1 border-b text-xs">
                                <span>รวมเป็นเงิน</span>
                                <span className="font-semibold">{po.subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b text-xs">
                                <span>ภาษีมูลค่าเพิ่ม (VAT)</span>
                                <span className="font-semibold">{po.vatAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
                            <div className="flex justify-between py-2 text-base font-bold bg-gray-100 px-2 rounded mt-1">
                                <span>จำนวนเงินสุทธิ</span>
                                <span>{po.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
                        </div>
                    </div>

                    {/* Signatures */}
                    <div className="grid grid-cols-2 gap-8 mt-8 pt-4 border-t border-gray-300">
                        <div className="text-center">
                            <div className="border-b border-dotted border-gray-400 w-3/4 mx-auto mb-2 h-8"></div>
                            <p className="text-sm font-semibold">ผู้จัดทำ</p>
                            <p className="text-xs text-gray-500 mt-1">วันที่ .......................................</p>
                        </div>
                        <div className="text-center">
                            <div className="border-b border-dotted border-gray-400 w-3/4 mx-auto mb-2 h-8"></div>
                            <p className="text-sm font-semibold">ผู้มีอำนาจลงนาม / ผู้อนุมัติ</p>
                            <p className="text-xs text-gray-500 mt-1">วันที่ .......................................</p>
                        </div>
                    </div>
                    
                    <div className="mt-4 text-center text-[10px] text-gray-500">
                        <p>ในนาม บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PurchaseOrderPrint;
