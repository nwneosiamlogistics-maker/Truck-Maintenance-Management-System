
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

    const logoUrl = "https://img2.pic.in.th/pic/logo-neo.png";

    // Target rows for pagination
    const TARGET_ROWS = 12;
    const emptyRowsCount = Math.max(0, TARGET_ROWS - (requisition.items?.length || 0));

    const requestTypeLabel = (() => {
        const map: Record<string, string> = {
            'Product': 'สินค้า',
            'Service': 'บริการ',
            'Equipment': 'อุปกรณ์',
            'Asset': 'ทรัพย์สิน',
            'Others': 'อื่นๆ'
        };
        const label = map[requisition.requestType] || requisition.requestType;
        if (requisition.requestType === 'Others' && requisition.otherRequestTypeDetail) {
            return `${label} (${requisition.otherRequestTypeDetail})`;
        }
        return label;
    })();

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
                    <div className="text-3xl font-bold text-gray-800 tracking-wide">ใบขอซื้อ</div>
                    <div className="text-lg font-bold text-gray-500 tracking-widest">PURCHASE REQUISITION</div>
                </div>
                <div className="w-auto">
                    <div className="border border-gray-400 rounded p-3 bg-gray-50 text-xs min-w-[250px]">
                        <div className="space-y-1">
                            <div className="flex items-baseline">
                                <span className="font-bold w-24 flex-shrink-0 text-left">เลขที่ (PR No.):</span>
                                <span className="font-medium">{requisition.prNumber}</span>
                            </div>
                            <div className="flex items-baseline">
                                <span className="font-bold w-24 flex-shrink-0 text-left">วันที่ (Date):</span>
                                <span className="font-medium">{new Date(requisition.createdAt).toLocaleDateString('th-TH')}</span>
                            </div>
                            <div className="flex items-baseline">
                                <span className="font-bold w-24 flex-shrink-0 text-left">แผนก (Dept):</span>
                                <span className="font-medium">{requisition.department}</span>
                            </div>
                            <div className="flex items-baseline">
                                <span className="font-bold w-24 flex-shrink-0 text-left">ผู้ขอซื้อ:</span>
                                <span className="font-medium">{requisition.requesterName}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- INFO SECTION --- */}
            <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                <div className="border border-gray-300 rounded p-2">
                    <h3 className="font-bold text-gray-700 border-b border-gray-200 pb-1 mb-1">แนะนำผู้จำหน่าย (Suggested Supplier)</h3>
                    <div className="text-sm font-semibold h-6">
                        {requisition.supplier || '-'}
                    </div>
                </div>
                <div className="border border-gray-300 rounded p-2">
                    <h3 className="font-bold text-gray-700 border-b border-gray-200 pb-1 mb-1">ข้อมูลเพิ่มเติม</h3>
                    <div className="grid grid-cols-2 gap-1">
                        <p><strong>วันที่ต้องการ:</strong> {new Date(requisition.dateNeeded).toLocaleDateString('th-TH')}</p>
                        <p><strong>ประเภท:</strong> {requestTypeLabel}</p>
                        <p className="col-span-2"><strong>งบประมาณ:</strong> {requisition.budgetStatus === 'Have Budget' ? 'มีงบประมาณ' : 'ไม่มีงบประมาณ'}</p>
                    </div>
                </div>
            </div>

            {/* --- ITEMS TABLE --- */}
            <div className="flex-grow overflow-hidden flex flex-col">
                <table className="w-full border-collapse text-xs border border-gray-400">
                    <thead className="bg-[#E5E5E5] text-black font-bold">
                        <tr>
                            <th className="border border-gray-400 p-2 w-10 text-center">ลำดับ</th>
                            <th className="border border-gray-400 p-2 text-left">รายการ (Description)</th>
                            <th className="border border-gray-400 p-2 w-20 text-right">จำนวน</th>
                            <th className="border border-gray-400 p-2 w-16 text-center">หน่วย</th>
                            <th className="border border-gray-400 p-2 w-24 text-right">ราคา/หน่วย</th>
                            <th className="border border-gray-400 p-2 w-28 text-right">จำนวนเงิน</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(Array.isArray(requisition.items) ? requisition.items : []).map((item, index) => (
                            <tr key={index}>
                                <td className="border-x border-gray-400 p-1 text-center align-top">{index + 1}</td>
                                <td className="border-x border-gray-400 p-1 align-top">{item.name}</td>
                                <td className="border-x border-gray-400 p-1 text-right align-top">{item.quantity}</td>
                                <td className="border-x border-gray-400 p-1 text-center align-top">{item.unit}</td>
                                <td className="border-x border-gray-400 p-1 text-right align-top">{item.unitPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                <td className="border-x border-gray-400 p-1 text-right font-medium align-top">{(item.quantity * item.unitPrice).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                            </tr>
                        ))}
                        {/* Fill empty rows */}
                        {Array.from({ length: emptyRowsCount }).map((_, i) => (
                            <tr key={`empty-${i}`}>
                                <td className="border-x border-gray-400 p-1">&nbsp;</td>
                                <td className="border-x border-gray-400 p-1"></td>
                                <td className="border-x border-gray-400 p-1"></td>
                                <td className="border-x border-gray-400 p-1"></td>
                                <td className="border-x border-gray-400 p-1"></td>
                                <td className="border-x border-gray-400 p-1"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* --- FOOTER TOTALS & REMARKS --- */}
            <div className="mt-2 border-t border-gray-300 pt-2">
                <div className="flex items-start text-xs">
                    <div className="w-2/3 pr-4">
                        <div className="border border-gray-300 rounded p-2 min-h-[50px]">
                            <span className="font-bold text-gray-700">หมายเหตุ (Remarks):</span>
                            <p className="text-gray-600 ml-2">{requisition.notes || '-'}</p>
                        </div>
                    </div>
                    <div className="w-1/3">
                        <div className="flex justify-between py-1 border-b border-gray-300 border-dotted">
                            <span className="font-semibold">รวมเป็นเงิน</span>
                            <span>{subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                        {vatAmount > 0 && (
                            <div className="flex justify-between py-1 border-b border-gray-300 border-dotted">
                                <span className="font-semibold">VAT ({vatRate.toFixed(0)}%)</span>
                                <span>{vatAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
                        )}
                        <div className="flex justify-between py-2 font-bold text-sm">
                            <span>ยอดรวมสุทธิ</span>
                            <span className="text-base underline">{grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- SIGNATURES --- */}
            <div className="mt-auto pt-8 mb-4">
                <div className="grid grid-cols-3 gap-6 text-xs">
                    <div className="text-center">
                        <div className="border-b border-dotted border-gray-400 w-3/4 mx-auto h-8"></div>
                        <p className="mt-1">({requisition.requesterName || '.......................................'})</p>
                        <p className="font-bold text-gray-500">ผู้ขอซื้อ</p>
                        <p className="text-[10px] text-gray-400">วันที่ ...../...../..........</p>
                    </div>
                    <div className="text-center">
                        <div className="border-b border-dotted border-gray-400 w-3/4 mx-auto h-8"></div>
                        <p className="mt-1">({requisition.approverName || '.......................................'})</p>
                        <p className="font-bold text-gray-500">ผู้อนุมัติ</p>
                        <p className="text-[10px] text-gray-400">วันที่ ...../...../..........</p>
                    </div>
                    <div className="text-center">
                        <div className="border-b border-dotted border-gray-400 w-3/4 mx-auto h-8"></div>
                        <p className="mt-1">(.......................................)</p>
                        <p className="font-bold text-gray-500">ผู้จัดซื้อ/รับเรื่อง</p>
                        <p className="text-[10px] text-gray-400">วันที่ ...../...../..........</p>
                    </div>
                </div>
            </div>
            
            <div className="text-right text-[10px] text-gray-400">
                FM-PC01-01
            </div>
        </div>
    );
};

export default PurchaseRequisitionPrint;
