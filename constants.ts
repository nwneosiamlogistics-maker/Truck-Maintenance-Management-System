import type { Tab } from './types';

export const TABS: Record<Tab, { title: string; subtitle: string }> = {
    dashboard: {
        title: 'แดชบอร์ด',
        subtitle: 'ภาพรวมระบบจัดการซ่อมบำรุงรถบรรทุก'
    },
    form: {
        title: 'เพิ่มใบแจ้งซ่อม',
        subtitle: 'สร้างใบแจ้งซ่อมใหม่สำหรับรถบรรทุกทุกประเภท'
    },
    list: {
        title: 'รายการใบแจ้งซ่อม',
        subtitle: 'จัดการและติดตามสถานะการซ่อมบำรุง'
    },
    history: {
        title: 'ประวัติการซ่อม',
        subtitle: 'ดูและค้นหาใบแจ้งซ่อมที่เสร็จสิ้นทั้งหมด'
    },
    stock: {
        title: 'จัดการสต๊อกอะไหล่',
        subtitle: 'ควบคุมสต๊อกและการเบิกจ่ายอะไหล่'
    },
    'stock-history': {
        title: 'ประวัติการเบิกจ่าย',
        subtitle: 'ตรวจสอบการเคลื่อนไหวของสต๊อกอะไหล่ทั้งหมด'
    },
    requisitions: {
        title: 'ใบขอซื้อ',
        subtitle: 'จัดการการสั่งซื้อ, เติมสต็อก และลบใบขอซื้อ'
    },
    reports: {
        title: 'รายงานและสถิติ',
        subtitle: 'วิเคราะห์ข้อมูลและส่งออกรายงาน'
    },
    technicians: {
        title: 'จัดการช่าง',
        subtitle: 'จัดการข้อมูลช่างและการมอบหมายงาน'
    },
    technicianPerformance: {
        title: 'รายงานประสิทธิภาพช่าง',
        subtitle: 'วิเคราะห์และเปรียบเทียบผลการปฏิบัติงานของช่าง'
    },
    estimation: {
        title: 'ระบบประมาณการณ์',
        subtitle: 'ประมาณเวลาและติดตามความแม่นยำ'
    },
    maintenance: {
        title: 'วางแผนซ่อมบำรุง',
        subtitle: 'จัดการแผนบำรุงรักษาตามกำหนด'
    }
};