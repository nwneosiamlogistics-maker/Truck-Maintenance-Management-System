import type { Tab } from './types';

export const TABS: Record<Tab, { title: string; subtitle: string }> = {
    dashboard: {
        title: 'แดชบอร์ด',
        subtitle: 'ภาพรวมระบบจัดการซ่อมบำรุงรถบรรทุก'
    },
    analytics: {
        title: 'รายงานและวิเคราะห์',
        subtitle: 'ภาพรวม KPI, ประสิทธิภาพกลุ่มรถ, และสถิติต่างๆ'
    },
     'kpi-management': {
        title: 'จัดการ KPI',
        subtitle: 'เพิ่ม แก้ไข และลบรายการซ่อมมาตรฐาน (KPI)'
    },
    form: {
        title: 'เพิ่มใบแจ้งซ่อม',
        subtitle: 'สร้างใบแจ้งซ่อมใหม่สำหรับรถบรรทุกทุกประเภท'
    },
    list: {
        title: 'รายการใบแจ้งซ่อม',
        subtitle: 'จัดการและติดตามสถานะการซ่อมบำรุง'
    },
     'technician-view': {
        title: 'สำหรับช่าง',
        subtitle: 'มุมมองรายการงานสำหรับทีมช่าง'
    },
    history: {
        title: 'ประวัติการซ่อม',
        subtitle: 'ดูและค้นหาใบแจ้งซ่อมที่เสร็จสิ้นทั้งหมด'
    },
    'vehicle-repair-history': {
        title: 'ประวัติซ่อมรายคัน',
        subtitle: 'ค้นหาและดูประวัติการซ่อมของรถแต่ละคัน'
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
        title: 'วิเคราะห์ประสิทธิภาพ (KPI)',
        subtitle: 'เปรียบเทียบเวลาซ่อมจริงกับเวลาที่ประเมิน'
    },
    maintenance: {
        title: 'วางแผนซ่อมบำรุง',
        subtitle: 'จัดการแผนบำรุงรักษาตามกำหนด'
    },
    'preventive-maintenance': {
        title: 'แผนซ่อมบำรุงเชิงป้องกัน (PM)',
        subtitle: 'จัดการและติดตามแผน PM สำหรับรถทุกคัน'
    },
    'pm-history': {
        title: 'ประวัติแผนซ่อมบำรุง PM',
        subtitle: 'ดูข้อมูลย้อนหลังการบำรุงรักษาตามแผน'
    },
    vehicles: {
        title: 'ข้อมูลรถและประกันภัย',
        subtitle: 'จัดการข้อมูลยานพาหนะและเอกสารสำคัญ'
    },
    'daily-checklist': {
        title: 'รายการตรวจเช็ค (Checklist)',
        subtitle: 'รายการตรวจสอบรถบรรทุก (Checklist รถบรรทุก) ครอบคลุมหลายด้าน ทั้งการตรวจสอบก่อนใช้งาน (Pre-trip inspection), การตรวจสอบประจำวัน ประจำเดือน, และการตรวจสภาพเพื่อต่อภาษี'
    },
    'tire-check': {
        title: 'ตรวจเช็คยาง',
        subtitle: 'บันทึกและตรวจสอบสภาพยางรถบรรทุก'
    },
    'tool-management': {
        title: 'จัดการเครื่องมือ',
        subtitle: 'คลังเครื่องมือและประวัติการยืม-คืนสำหรับช่าง'
    },
    settings: {
        title: 'ตั้งค่าระบบ',
        subtitle: 'จัดการข้อมูลหลัก เช่น วันหยุดบริษัท และการตั้งค่าอื่นๆ'
    },
};