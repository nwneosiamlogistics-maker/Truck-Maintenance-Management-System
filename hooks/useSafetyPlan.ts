import { useFirebase } from './useFirebase';
import type { SafetyTopic, TrainingSession, TrainingPlan, Driver } from '../types';

const DEFAULT_TOPICS: SafetyTopic[] = [];
const DEFAULT_SESSIONS: TrainingSession[] = [];
const DEFAULT_PLANS: TrainingPlan[] = [];

export const useSafetyPlan = (year: number) => {
    const [topics, setTopics] = useFirebase<SafetyTopic[]>(`training/topics/${year}`, DEFAULT_TOPICS);
    const [sessions, setSessions] = useFirebase<TrainingSession[]>(`training/sessions/${year}`, DEFAULT_SESSIONS);
    const [plans, setPlans] = useFirebase<TrainingPlan[]>(`training/plans/${year}`, DEFAULT_PLANS);

    return {
        topics: Array.isArray(topics) ? topics : [],
        setTopics,
        sessions: Array.isArray(sessions) ? sessions : [],
        setSessions,
        plans: Array.isArray(plans) ? plans : [],
        setPlans,
    };
};

// ==================== HELPERS ====================

/** ตรวจสอบว่าเป็นพนักงานใหม่หรือไม่ (hireDate ≤ 120 วันจากวันนี้) */
export const isNewEmployee = (driver: Driver): boolean => {
    if (!driver.hireDate) return false;
    const hire = new Date(driver.hireDate);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - hire.getTime()) / 86400000);
    return diffDays <= 120;
};

export const computePlanStatus = (plan: TrainingPlan): TrainingPlan['status'] => {
    if (plan.actualDate) return 'done';
    if (plan.bookingDate || plan.sessionId) return 'booked';
    if (new Date() > new Date(plan.dueDate)) return 'overdue';
    return 'planned';
};

/** คำนวณ dueDate สำหรับ Defensive Driving */
export const computeDefensiveDueDate = (driver: Driver, lastDoneDate?: string): string => {
    if (lastDoneDate) {
        const d = new Date(lastDoneDate);
        d.setFullYear(d.getFullYear() + 1);
        return d.toISOString().split('T')[0];
    }
    // พนักงานใหม่ = hireDate + 120 วัน
    if (driver.hireDate) {
        const d = new Date(driver.hireDate);
        d.setDate(d.getDate() + 120);
        return d.toISOString().split('T')[0];
    }
    // fallback: today + 120 days
    const d = new Date();
    d.setDate(d.getDate() + 120);
    return d.toISOString().split('T')[0];
};

/** สร้าง TrainingPlan ทั้งหมดของปีให้ driver คนหนึ่ง */
export const generatePlansForDriver = (
    driver: Driver,
    topics: SafetyTopic[],
    existingPlans: TrainingPlan[],
    year: number
): TrainingPlan[] => {
    const now = new Date().toISOString();
    const newPlans: TrainingPlan[] = [];

    for (const topic of topics) {
        if (!topic.isActive) continue;

        // ข้าม new_employee ถ้าไม่ใช่พนักงานใหม่ (hireDate ≤ 120 วันจากวันนี้)
        if (topic.target === 'new_employee') {
            if (!isNewEmployee(driver)) continue;
        }
        if (topic.target === 'existing_employee') {
            if (isNewEmployee(driver)) continue;
        }

        // ตรวจว่ามีแผนนี้อยู่แล้วหรือไม่
        const exists = existingPlans.some(
            p => p.driverId === driver.id && p.topicId === topic.id && p.year === year
        );
        if (exists) continue;

        let dueDate = topic.windowEnd;
        if ((topic.code === 'defensive' || topic.code === 'defensive_refresh')) {
            const lastDone = existingPlans
                .filter(p => p.driverId === driver.id && (p.topicCode === 'defensive' || p.topicCode === 'defensive_refresh') && p.status === 'done' && p.actualDate)
                .sort((a, b) => (b.actualDate ?? '').localeCompare(a.actualDate ?? ''))
            [0]?.actualDate;
            dueDate = computeDefensiveDueDate(driver, lastDone);
        }

        newPlans.push({
            id: `PLN-${driver.id}-${topic.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            year,
            driverId: driver.id,
            topicId: topic.id,
            topicCode: topic.code,
            dueDate,
            status: 'planned',
            evidencePhotos: [],
            createdAt: now,
            updatedAt: now,
        });
    }

    return newPlans;
};

/** สร้าง default topics สำหรับปีใหม่ */
export const generateDefaultTopicsForYear = (year: number): SafetyTopic[] => {
    const now = new Date().toISOString();
    return [
        {
            id: `TOPIC-${year}-induction_q1`,
            year,
            code: 'induction_q1',
            name: 'อบรมความปลอดภัย Q1',
            target: 'all',
            windowStart: `${year}-01-01`,
            windowEnd: `${year}-03-31`,
            isMandatory: true,
            sortOrder: 1,
            isActive: true,
            createdAt: now,
        },
        {
            id: `TOPIC-${year}-induction_q2`,
            year,
            code: 'induction_q2',
            name: 'อบรมความปลอดภัย Q2',
            target: 'all',
            windowStart: `${year}-04-01`,
            windowEnd: `${year}-06-30`,
            isMandatory: true,
            sortOrder: 2,
            isActive: true,
            createdAt: now,
        },
        {
            id: `TOPIC-${year}-induction_q3`,
            year,
            code: 'induction_q3',
            name: 'อบรมความปลอดภัย Q3',
            target: 'all',
            windowStart: `${year}-07-01`,
            windowEnd: `${year}-09-30`,
            isMandatory: true,
            sortOrder: 3,
            isActive: true,
            createdAt: now,
        },
        {
            id: `TOPIC-${year}-induction_q4`,
            year,
            code: 'induction_q4',
            name: 'อบรมความปลอดภัย Q4',
            target: 'all',
            windowStart: `${year}-10-01`,
            windowEnd: `${year}-12-31`,
            isMandatory: true,
            sortOrder: 4,
            isActive: true,
            createdAt: now,
        },
        {
            id: `TOPIC-${year}-defensive`,
            year,
            code: 'defensive',
            name: 'Defensive Driving (พนักงานใหม่ ภายใน 120 วัน)',
            target: 'new_employee',
            windowStart: `${year}-01-01`,
            windowEnd: `${year}-12-31`,
            isMandatory: true,
            sortOrder: 5,
            isActive: true,
            createdAt: now,
        },
        {
            id: `TOPIC-${year}-defensive_refresh`,
            year,
            code: 'defensive_refresh',
            name: 'Defensive Driving Refresh (พนักงานเดิม ทุก 12 เดือน)',
            target: 'existing_employee',
            windowStart: `${year}-01-01`,
            windowEnd: `${year}-12-31`,
            isMandatory: true,
            sortOrder: 6,
            isActive: true,
            createdAt: now,
        },
    ];
};
