import React from 'react';
import ReactDOMServer from 'react-dom/server';
import type { StockItem } from '../types';
import type { GradedSaleData } from './SellFungibleItemModal';
import { numberToThaiWords } from '../utils';
import CashBillPrintLayout from './CashBillPrintLayout';

interface CashBillPrintModalProps {
    item: StockItem;
    saleData: GradedSaleData;
    billNumber: string;
    onClose: () => void;
}

const CashBillPrintModal: React.FC<CashBillPrintModalProps> = ({ item, saleData, billNumber, onClose }) => {
    const billDate = new Date().toLocaleDateString('th-TH', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
    
    const { totalValue } = React.useMemo(() => {
        const tv = saleData.grades.reduce((sum, grade) => sum + (Number(grade.quantity) || 0) * (Number(grade.price) || 0), 0);
        return { totalValue: tv };
    }, [saleData.grades]);
    
    const totalInWords = numberToThaiWords(totalValue);

    // Create an array with a fixed size for the table layout to match the A4 style.
    const tableRows = Array.from({ length: 15 }, (_, i) => saleData.grades[i] || null);

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            const printContent = ReactDOMServer.renderToString(
                <CashBillPrintLayout
                    item={item}
                    saleData={saleData}
                    billNumber={billNumber}
                    billDate={billDate}
                    totalValue={totalValue}
                    totalInWords={totalInWords}
                    tableRows={tableRows}
                />
            );
            
            printWindow.document.write(`
                <html>
                    <head>
                        <title>บิลเงินสด ${billNumber}</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <link rel="preconnect" href="https://fonts.googleapis.com">
                        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
                        <style>
                            @page {
                                size: A4;
                                margin: 1cm;
                            }
                            html, body {
                                margin: 0;
                                padding: 0;
                                font-family: 'Sarabun', sans-serif; 
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                        </style>
                    </head>
                    <body>
                        ${printContent}
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        }
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[130] flex justify-center items-center p-4 no-print" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold">ตัวอย่างบิลเงินสด</h3>
                     <div className="flex items-center gap-2">
                        <button onClick={handlePrint} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">พิมพ์</button>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl px-2">&times;</button>
                    </div>
                </div>
                <div className="p-2 overflow-y-auto bg-gray-200">
                    <div className="printable-area">
                       <CashBillPrintLayout
                            item={item}
                            saleData={saleData}
                            billNumber={billNumber}
                            billDate={billDate}
                            totalValue={totalValue}
                            totalInWords={totalInWords}
                            tableRows={tableRows}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CashBillPrintModal;