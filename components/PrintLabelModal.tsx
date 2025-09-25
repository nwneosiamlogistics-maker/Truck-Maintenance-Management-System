import React from 'react';
import type { StockItem } from '../types';

interface PrintLabelModalProps {
    item: StockItem;
    onClose: () => void;
}

const PrintLabelModal: React.FC<PrintLabelModalProps> = ({ item, onClose }) => {
    
    const handlePrint = () => {
        window.print();
    };

    return (
        <>
        <style>{`
            @media print {
                body * {
                    visibility: hidden;
                }
                .printable-area, .printable-area * {
                    visibility: visible;
                }
                .printable-area {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
            }
        `}</style>
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center no-print">
                    <h3 className="text-2xl font-bold text-gray-800">พิมพ์ฉลากสินค้า</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                <div className="printable-area p-8">
                    <div className="border-4 border-black p-6 text-center space-y-4 w-full">
                        <p className="text-3xl font-bold break-words">{item.name}</p>
                        <p className="text-5xl font-mono font-extrabold tracking-widest">{item.code}</p>
                    </div>
                </div>

                <div className="p-6 border-t flex justify-end space-x-4 no-print">
                    <button type="button" onClick={onClose} className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">ยกเลิก</button>
                    <button type="button" onClick={handlePrint} className="px-8 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" /></svg>
                        พิมพ์
                    </button>
                </div>
            </div>
        </div>
        </>
    );
};

export default PrintLabelModal;
