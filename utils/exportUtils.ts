import * as XLSX from 'xlsx';

/**
 * Utility to export JSON data to CSV and trigger a browser download.
 * Includes BOM (Byte Order Mark) for proper Thai character display in Excel.
 */
export const exportToCSV = (filename: string, data: any[]) => {
    if (!data || data.length === 0) return;

    // Get headers from first object keys
    const headers = Object.keys(data[0]);

    // Create CSV rows
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
        const values = headers.map(header => {
            const val = row[header];
            const escaped = ('' + val).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\n');
    // Add BOM (\uFEFF) so Excel correctly detects UTF-8 encoding for Thai text
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

/**
 * Export data to XLSX format with proper Thai character support.
 * Supports single sheet or multiple sheets.
 */
export interface XLSXSheet {
    sheetName: string;
    data: any[];
    columnWidths?: number[]; // array of column widths (wch)
}

export const exportToXLSX = (filename: string, sheets: XLSXSheet[]) => {
    if (!sheets || sheets.length === 0) return;

    const wb = XLSX.utils.book_new();

    sheets.forEach(sheet => {
        if (!sheet.data || sheet.data.length === 0) return;

        const ws = XLSX.utils.json_to_sheet(sheet.data);

        // Set column widths if provided
        if (sheet.columnWidths && sheet.columnWidths.length > 0) {
            ws['!cols'] = sheet.columnWidths.map(w => ({ wch: w }));
        } else {
            // Auto-calculate column widths based on headers
            const headers = Object.keys(sheet.data[0]);
            ws['!cols'] = headers.map(h => ({
                wch: Math.max(h.length * 2, 12)
            }));
        }

        // Sanitize sheet name (max 31 chars, no special chars)
        const safeName = sheet.sheetName
            .replace(/[\\/*?:\[\]]/g, '')
            .substring(0, 31);

        XLSX.utils.book_append_sheet(wb, ws, safeName);
    });

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `${filename}_${dateStr}.xlsx`);
};

/**
 * Simple single-sheet XLSX export (convenience wrapper)
 */
export const exportSimpleXLSX = (filename: string, data: any[], sheetName: string = 'Sheet1', columnWidths?: number[]) => {
    exportToXLSX(filename, [{ sheetName, data, columnWidths }]);
};
