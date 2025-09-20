// This file defines the structure of different checklists.
// It allows the UI to be dynamically generated based on this data.

interface ChecklistOption {
    label: string;
    hasNotes: boolean;
    notesLabel?: string;
}

interface ChecklistItem {
    id: string; // e.g., 'item_1', 'item_2'
    label: string;
    options: ChecklistOption[];
}

interface ChecklistDefinition {
    title: string;
    subtitle?: string;
    sections: {
        title: string | null;
        items: ChecklistItem[];
    }[];
}

export const checklistDefinitions: Record<string, ChecklistDefinition> = {
    'FM-MN-13': {
        title: 'รายการตรวจสอบรถบรรทุก (Checklist รถบรรทุก)',
        subtitle: 'ครอบคลุมหลายด้าน ทั้งการตรวจสอบก่อนใช้งาน (Pre-trip inspection), การตรวจสอบประจำวัน ประจำเดือน, และการตรวจสภาพเพื่อต่อภาษี',
        sections: [
            {
                title: null,
                items: [
                    { id: 'item_1', label: '1. สภาพตัวถัง/สี', options: [{ label: 'ปกติ', hasNotes: false }, { label: 'ไม่ปกติ', hasNotes: false }, { label: 'มีรอยบุบที่..', hasNotes: true }] },
                    { id: 'item_2', label: '2. ลมยางและสภาพยาง', options: [{ label: 'ปกติ', hasNotes: false }, { label: 'ตรวจเติมแล้ว', hasNotes: false }, { label: 'ชำรุด,มีรอยฉีก,รั่วซึม,แบนที่ล้อข้าง..', hasNotes: true }] },
                    { id: 'item_3', label: '3. น้ำในหม้อน้ำ', options: [{ label: 'ปกติ', hasNotes: false }, { label: 'ตรวจเติมแล้ว', hasNotes: false }, { label: 'เติมบ่อย หรือทุกครั้ง', hasNotes: false }, { label: 'มีสนิมในหม้อน้ำ', hasNotes: false }] },
                    { id: 'item_4', label: '4. ท่อยางหม้อน้ำ', options: [{ label: 'ปกติ', hasNotes: false }, { label: 'ชำรุด,เปื่อย,ฉีกขาด', hasNotes: false }] },
                    { id: 'item_5', label: '5. สายพาน', options: [{ label: 'ปกติ', hasNotes: false }, { label: 'ตึงไป', hasNotes: false }, { label: 'ชำรุด,เปื่อย,ฉีกขาด', hasNotes: false }, { label: 'หย่อนไป', hasNotes: false }] },
                    { id: 'item_6', label: '6. น้ำมันครัช,เบรก', options: [{ label: 'ระดับปกติ', hasNotes: false }, { label: 'ตรวจเติมแล้ว', hasNotes: false }, { label: 'ขาดบ่อย', hasNotes: false }] },
                    { id: 'item_7', label: '7. น้ำกลั่นแบตเตอรี่', options: [{ label: 'ระดับปกติ', hasNotes: false }, { label: 'ตรวจเติมแล้ว', hasNotes: false }, { label: 'ขาดบ่อย', hasNotes: false }] },
                    { id: 'item_8', label: '8. น้ำมันเครื่อง', options: [{ label: 'ระดับปกติ', hasNotes: false }, { label: 'ตรวจเติมแล้ว', hasNotes: false }, { label: 'ขาดบ่อย', hasNotes: false }, { label: 'มีสิ่งอื่นเจือปน', hasNotes: false }] },
                    { id: 'item_9', label: '9. ติดเครื่องยนต์', options: [{ label: 'ปกติ', hasNotes: false }, { label: 'ติดยาก', hasNotes: true }, { label: 'ไม่ติด', hasNotes: false }] },
                    { id: 'item_10', label: '10. เบรก', options: [{ label: 'ปกติ', hasNotes: false }, { label: 'สูงกว่าปกติ', hasNotes: false }, { label: 'ต่ำเกินไป', hasNotes: false }] },
                    { id: 'item_11', label: '11. คลัตช์', options: [{ label: 'ปกติ', hasNotes: false }, { label: 'สูงกว่าปกติ', hasNotes: false }, { label: 'ต่ำเกินไป', hasNotes: false }] },
                    { id: 'item_12', label: '12. พวงมาลัย', options: [{ label: 'ปกติ', hasNotes: false }, { label: 'ไม่ปกติ', hasNotes: false }, { label: 'มีรอยฟรีมาก', hasNotes: false }] },
                    { id: 'item_13', label: '13. แตร', options: [{ label: 'ดัง', hasNotes: false }, { label: 'ไม่ดัง', hasNotes: false }] },
                    { id: 'item_14', label: '14. ดวงไฟสัญญาณต่าง ๆ', options: [{ label: 'ปกติ', hasNotes: false }, { label: 'ไม่ปกติ', hasNotes: false }, { label: 'มีเสียที่..', hasNotes: true }] },
                    { id: 'item_15', label: '15. ที่ปัดน้ำฝน', options: [{ label: 'ปกติ', hasNotes: false }, { label: 'ชำรุด', hasNotes: false }, { label: 'ปัดไม่สะอาด', hasNotes: false }] },
                    { id: 'item_16', label: '16. เลข กม. วันนี้', options: [{ label: '', hasNotes: true, notesLabel: 'กม.' }] },
                    { id: 'item_17', label: '17. น้ำมันเชื้อเพลิง', options: [{ label: 'ต่ำกว่า 1 ใน 4', hasNotes: false }, { label: '1 ใน 4', hasNotes: false }, { label: 'เกือบครึ่งถัง', hasNotes: false }, { label: 'ครึ่งถัง', hasNotes: false }, { label: 'มากกว่าครึ่งถัง', hasNotes: false }] },
                    { id: 'item_18', label: '18. ระบบปรับอากาศ', options: [{ label: 'ปกติ', hasNotes: false }, { label: 'ไม่ปกติ', hasNotes: true, notesLabel: 'อาการ' }] },
                    { id: 'item_19', label: '19. ความสะอาดทั่วไป', options: [{ label: 'ทำแล้ว', hasNotes: false }, { label: 'ยังไม่ได้ทำ', hasNotes: false }] },
                    { id: 'item_20', label: '20. เรื่องอื่นๆ', options: [{ label: 'ไม่มี', hasNotes: false }, { label: 'มี', hasNotes: true, notesLabel: 'ระบุ' }] },
                ]
            }
        ]
    }
};

export const checklistWarnings = [
    "1. รายการใดที่ไม่ปกติ หรือชำรุด ต้องเขียนใบแจ้งซ่อม",
    "2. ตรวจทุกรายการอย่างจริงจัง",
    "3. การรายงานเท็จเป็นการผิดกฎระเบียบบริษัทฯ",
    "4. ข้อบกพร่องที่ตรวจพบเสมอ ได้แก่ น้ำมันเครื่องน้อยกว่าที่ควร น้ำกลั่นแห้งลมยางน้อย ทำความสะอาดไม่ดีพอ ฯลฯ เป็นความผิดของผู้รายงานโปรดระวัง",
];