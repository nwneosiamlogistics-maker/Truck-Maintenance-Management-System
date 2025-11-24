
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

    const logoUrl = "https://img2.pic.in.th/pic/logo-neo.png";

    // Target 12 rows to fit nicely on one page with headers and footers
    const TARGET_ROWS = 12;
    const emptyRowsCount = Math.max(0, TARGET_ROWS - po.items.length);

    return (
        <div 
            className="bg-white font-sarabun text-gray-900 text-sm leading-tight mx-auto relative" 
            style={{ 
                width: '210mm', 
                height: '297mm', 
                padding: '15mm',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* --- HEADER SECTION --- */}
            <div className="flex justify-between items-start mb-4">
                {/* Left: Company Info */}
                <div className="w-3/4 pr-4">
                    <h1 className="text-lg font-bold text-gray-900">บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</h1>
                    <h2 className="text-sm font-bold text-gray-600 mb-1">NEOSIAM LOGISTICS & TRANSPORT CO., LTD.</h2>
                    <div className="text-xs text-gray-600 leading-relaxed">
                        <p>159/9-10 หมู่ 7 ตำบลบางม่วง อำเภอเมืองนครสวรรค์ จังหวัดนครสวรรค์ 60000</p>
                        <p>159/9-10 Village No.7, Bang Muang, Muang Nakhon Sawan, Nakhon Sawan 60000</p>
                        <p><strong>Tax ID:</strong> 0105552087673</p>
                        <p><strong>Tel:</strong> 056-275-841 <strong>Email:</strong> info_nw@neosiamlogistics.com</p>
                    </div>
                </div>
                {/* Right: Logo */}
                <div className="w-1/4 flex justify-end">
                    <img 
                        src={logoUrl} 
                        alt="Neosiam Logo" 
                        className="h-20 w-auto object-contain" 
                        referrerPolicy="no-referrer"
                    />
                </div>
            </div>

            <div className="border-b-2 border-gray-800 mb-4"></div>

            {/* --- DOCUMENT TITLE & DETAILS --- */}
            <div className="flex justify-between items-start mb-4">
                <div>
                    <div className="text-3xl font-bold text-gray-800 tracking-wide">ใบสั่งซื้อ</div>
                    <div className="text-lg font-bold text-gray-500 tracking-widest">PURCHASE ORDER</div>
                </div>
                <div className="w-2/5">
                    <div className="border border-gray-400 rounded p-2 bg-gray-50 text-xs">
                        <div className="grid grid-cols-3 gap-y-1">
                            <div className="font-bold text-right pr-2">เลขที่ (PO No.):</div>
                            <div className="col-span-2 font-medium">{po.poNumber}</div>
                            
                            <div className="font-bold text-right pr-2">วันที่ (Date):</div>
                            <div className="col-span-2 font-medium">{new Date(po.orderDate).toLocaleDateString('th-TH')}</div>
                            
                            <div className="font-bold text-right pr-2">เครดิต (Term):</div>
                            <div className="col-span-2 font-medium">{po.paymentTerms || '-'}</div>
                            
                            <div className="font-bold text-right pr-2">อ้างอิง (Ref):</div>
                            <div className="col-span-2 font-medium truncate">{linkedPrText}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- INFO SECTION --- */}
            <div className="flex gap-4 mb-4 text-xs">
                {/* Supplier Info */}
                <div className="w-1/2 border border-gray-300 rounded p-2">
                    <h3 className="font-bold text-gray-700 border-b border-gray-200 pb-1 mb-1">ผู้จำหน่าย (Supplier)</h3>
                    <p className="font-bold text-sm">{po.supplierName}</p>
                    <p className="h-8 overflow-hidden">{po.supplierAddress || '-'}</p>
                    <p><strong>ผู้ติดต่อ:</strong> {po.contactPerson || '-'}</p>
                    {po.supplierTaxId && <p><strong>Tax ID:</strong> {po.supplierTaxId}</p>}
                </div>
                {/* Delivery Info */}
                <div className="w-1/2 border border-gray-300 rounded p-2">
                    <h3 className="font-bold text-gray-700 border-b border-gray-200 pb-1 mb-1">สถานที่ส่งสินค้า / ข้อมูลเพิ่มเติม</h3>
                    <p><strong>สถานที่ส่ง:</strong> {po.deliveryLocation || 'บริษัท นีโอสยาม โลจิสติกส์ฯ'}</p>
                    <p><strong>กำหนดส่ง:</strong> {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString('th-TH') : '-'}</p>
                    <p><strong>ผู้ขอซื้อ:</strong> {po.requesterName || '-'} ({po.department || '-'})</p>
                    <p><strong>ติดต่อรับของ:</strong> {po.contactReceiver || '-'}</p>
                </div>
            </div>

            {/* --- ITEMS TABLE --- */}
            <div className="flex-grow border border-gray-300 rounded overflow-hidden flex flex-col">
                <table className="w-full border-collapse text-xs">
                    <thead className="bg-gray-100 text-gray-700">
                        <tr>
                            <th className="border-b border-r border-gray-300 p-2 w-10 text-center">ลำดับ</th>
                            <th className="border-b border-r border-gray-300 p-2 text-left">รายการสินค้า / รายละเอียด</th>
                            <th className="border-b border-r border-gray-300 p-2 w-16 text-right">จำนวน</th>
                            <th className="border-b border-r border-gray-300 p-2 w-14 text-center">หน่วย</th>
                            <th className="border-b border-r border-gray-300 p-2 w-20 text-right">ราคา/หน่วย</th>
                            <th className="border-b border-r border-gray-300 p-2 w-16 text-right">ส่วนลด</th>
                            <th className="border-b border-gray-300 p-2 w-24 text-right">จำนวนเงิน</th>
                        </tr>
                    </thead>
                    <tbody>
                        {po.items.map((item, index) => (
                            <tr key={index}>
                                <td className="border-r border-gray-300 p-1 text-center align-top">{index + 1}</td>
                                <td className="border-r border-gray-300 p-1 align-top">{item.name}</td>
                                <td className="border-r border-gray-300 p-1 text-right align-top">{item.quantity}</td>
                                <td className="border-r border-gray-300 p-1 text-center align-top">{item.unit}</td>
                                <td className="border-r border-gray-300 p-1 text-right align-top">{item.unitPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                <td className="border-r border-gray-300 p-1 text-right align-top">{item.discount ? item.discount.toLocaleString() : '-'}</td>
                                <td className="p-1 text-right align-top font-medium">{item.totalPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                            </tr>
                        ))}
                        {/* Fill empty rows */}
                        {Array.from({ length: emptyRowsCount }).map((_, i) => (
                            <tr key={`empty-${i}`}>
                                <td className="border-r border-gray-300 p-1">&nbsp;</td>
                                <td className="border-r border-gray-300 p-1"></td>
                                <td className="border-r border-gray-300 p-1"></td>
                                <td className="border-r border-gray-300 p-1"></td>
                                <td className="border-r border-gray-300 p-1"></td>
                                <td className="border-r border-gray-300 p-1"></td>
                                <td className="p-1"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* --- FOOTER TOTALS & REMARKS --- */}
            <div className="mt-2 border-t border-gray-300 pt-2">
                <div className="flex items-start text-xs">
                    {/* Left: Remarks & Text Total */}
                    <div className="w-2/3 pr-4 flex flex-col justify-between h-full">
                        <div className="mb-2">
                            <span className="font-bold">หมายเหตุ:</span> <span className="ml-1">{po.notes || '-'}</span>
                        </div>
                        <div className="border border-gray-300 bg-gray-50 rounded p-2 text-center font-bold text-sm">
                            ( {totalInWords} )
                        </div>
                    </div>

                    {/* Right: Numeric Totals */}
                    <div className="w-1/3">
                        <div className="flex justify-between py-1 border-b border-gray-300 border-dotted">
                            <span className="font-semibold">รวมเป็นเงิน</span>
                            <span>{po.subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-300 border-dotted">
                            <span className="font-semibold">ภาษีมูลค่าเพิ่ม (VAT 7%)</span>
                            <span>{po.vatAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex justify-between py-2 font-bold text-sm">
                            <span>ยอดเงินสุทธิ</span>
                            <span className="text-base underline">{po.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- SIGNATURES --- */}
            <div className="mt-auto pt-8 mb-4">
                <div className="grid grid-cols-2 gap-12 text-xs">
                    <div className="text-center">
                        <div className="border-b border-dotted border-gray-400 w-3/4 mx-auto h-8"></div>
                        <p className="font-bold mt-1">ผู้จัดทำ</p>
                        <p className="text-gray-500">วันที่ ......../......../............</p>
                    </div>
                    <div className="text-center">
                        <div className="border-b border-dotted border-gray-400 w-3/4 mx-auto h-8"></div>
                        <p className="font-bold mt-1">ผู้มีอำนาจลงนาม / ผู้อนุมัติ</p>
                        <p className="text-gray-500">วันที่ ......../......../............</p>
                    </div>
                </div>
            </div>
            
            <div className="text-right text-[10px] text-gray-400">
                FM-PC01-02
            </div>
        </div>
    );
};

export default PurchaseOrderPrint;
