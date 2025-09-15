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
    suppliers: {
        title: 'จัดการผู้จำหน่าย',
        subtitle: 'ข้อมูลร้านค้าและผู้ให้บริการ'
    },
    'used-part-buyers': {
        title: 'จัดการผู้รับซื้อ',
        subtitle: 'ข้อมูลผู้รับซื้ออะไหล่เก่า'
    },
    'used-part-report': {
        title: 'รายงานอะไหล่เก่า',
        subtitle: 'สรุปและวิเคราะห์ข้อมูลอะไหล่เก่าทั้งหมด'
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
    technicianWorkLog: {
        title: 'ประวัติงานซ่อมช่าง',
        subtitle: 'บันทึกการปฏิบัติงานของช่างแต่ละคนโดยละเอียด'
    },
    estimation: {
        title: 'ระบบประมาณการณ์',
        subtitle: 'ประมาณเวลาและติดตามความแม่นยำ'
    },
    maintenance: {
        title: 'วางแผนซ่อมบำรุง',
        subtitle: 'จัดการแผนบำรุงรักษาตามกำหนด'
    },
    vehicles: {
        title: 'ข้อมูลรถและประกันภัย',
        subtitle: 'จัดการข้อมูลยานพาหนะและเอกสารสำคัญ'
    }
};