import React, { useState } from 'react';
import type { Driver, DrivingIncident, Vehicle, TrainingPlan } from '../types';
import DriverMatrix from './DriverMatrix';
import IncabAssessmentModal from './IncabAssessmentModal';
import IncabAssessmentPrintModal from './IncabAssessmentPrintModal';
import AddDriverModal from './AddDriverModal';
import { useSafetyChecks } from '../hooks/useSafetyChecks';
import { useSafetyPlan } from '../hooks/useSafetyPlan';
import { useIncabAssessments } from '../hooks/useIncabAssessments';
import { confirmAction } from '../utils';
import { useToast } from '../context/ToastContext';
import type { IncabAssessment } from '../types';

interface DriverMatrixPageProps {
    drivers: Driver[];
    setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>;
    vehicles: Vehicle[];
    incidents: DrivingIncident[];
}

const DriverMatrixPage: React.FC<DriverMatrixPageProps> = ({ drivers, setDrivers, vehicles, incidents }) => {
    const { addToast } = useToast();
    const year = new Date().getFullYear();
    const { checks: safetyChecks } = useSafetyChecks(year);
    const { topics: safetyTopics, plans: trainingPlans, setPlans } = useSafetyPlan(year);
    const { assessments: incabAssessments, addAssessment, updateAssessment } = useIncabAssessments(year);

    const [matrixZoom, setMatrixZoom] = useState(1);
    const matrixZoomLevels = [0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.4];
    const matrixZoomIdx = matrixZoomLevels.indexOf(matrixZoom);

    const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
    const [incabModalDriver, setIncabModalDriver] = useState<Driver | null>(null);
    const [incabPrintAssessment, setIncabPrintAssessment] = useState<IncabAssessment | null>(null);

    const handleDeleteDriver = async (driver: Driver) => {
        const ok = await confirmAction('ยืนยันการลบพนักงาน', `ต้องการลบ "${driver.name}" ออกจากระบบใช่หรือไม่?`, 'ลบออก');
        if (!ok) return;
        setDrivers(prev => prev.filter(d => d.id !== driver.id));
        addToast(`ลบข้อมูล ${driver.name} สำเร็จ`, 'success');
    };

    const handleSaveIncab = (a: IncabAssessment) => {
        const existing = incabAssessments.find(x => x.id === a.id);
        if (existing) {
            updateAssessment(a);
        } else {
            addAssessment(a);
            setIncabPrintAssessment(a);
        }
        setIncabModalDriver(null);
        addToast('บันทึก Incab Coaching สำเร็จ', 'success');
    };

    // ===== Phase 3: Sync Defensive Driving → TrainingPlan =====
    const handleDefensiveTrainingSaved = (driverId: string, patch: Partial<NonNullable<Driver['defensiveDriving']>>) => {
        const now = new Date().toISOString();
        // Find defensive topic for this year
        const defensiveTopic = safetyTopics.find(t =>
            t.isActive && (t.code === 'defensive' || t.code === 'defensive_refresh')
        );
        if (!defensiveTopic) return;

        setPlans((prev: TrainingPlan[]) => {
            const arr = Array.isArray(prev) ? prev : [];
            const existingPlan = arr.find(
                p => p.driverId === driverId
                    && p.topicId === defensiveTopic.id
                    && p.year === year
            );

            if (existingPlan) {
                // Update existing plan
                return arr.map(p => {
                    if (p.id !== existingPlan.id) return p;
                    return {
                        ...p,
                        actualDate: patch.trainingDate || p.actualDate,
                        trainer: patch.trainer || p.trainer,
                        preTest: patch.preTest ?? p.preTest,
                        postTest: patch.postTest ?? p.postTest,
                        status: patch.trainingDate ? 'done' as const : p.status,
                        updatedAt: now,
                    };
                });
            } else {
                // Create new plan
                const newPlan: TrainingPlan = {
                    id: `PLN-${driverId}-${defensiveTopic.id}-${Date.now()}`,
                    year,
                    driverId,
                    topicId: defensiveTopic.id,
                    topicCode: defensiveTopic.code,
                    dueDate: defensiveTopic.windowEnd,
                    status: patch.trainingDate ? 'done' : 'planned',
                    actualDate: patch.trainingDate,
                    trainer: patch.trainer,
                    preTest: patch.preTest,
                    postTest: patch.postTest,
                    evidencePhotos: [],
                    createdAt: now,
                    updatedAt: now,
                };
                return [...arr, newPlan];
            }
        });
        addToast('Sync ข้อมูลอบรมไปยัง Safety Plan สำเร็จ', 'info');
    };

    return (
        <div className="space-y-4 animate-fade-in-up">
            {/* Header */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-800">Driver Matrix</h2>
                        <p className="text-gray-500 mt-1">ตารางสถานะและข้อมูลประจำตัวพนักงานขับรถ</p>
                    </div>
                    {/* Zoom Controls */}
                    <div className="flex items-center gap-1 bg-slate-100 rounded-xl px-2 py-1.5 border border-slate-200 shrink-0">
                        <span className="text-xs text-slate-500 mr-1">ขนาดตัวอักษร:</span>
                        <button
                            onClick={() => setMatrixZoom(matrixZoomLevels[Math.max(0, matrixZoomIdx - 1)])}
                            disabled={matrixZoomIdx === 0}
                            title="ย่อ"
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white disabled:opacity-30 text-slate-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
                        </button>
                        <button
                            onClick={() => setMatrixZoom(1)}
                            title="รีเซ็ต"
                            className="px-2 h-7 text-xs font-bold rounded-lg hover:bg-white text-slate-700 transition-colors min-w-[48px]">
                            {Math.round(matrixZoom * 100)}%
                        </button>
                        <button
                            onClick={() => setMatrixZoom(matrixZoomLevels[Math.min(matrixZoomLevels.length - 1, matrixZoomIdx + 1)])}
                            disabled={matrixZoomIdx === matrixZoomLevels.length - 1}
                            title="ขยาย"
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white disabled:opacity-30 text-slate-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6M7 10h6" /></svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Matrix */}
            <DriverMatrix
                drivers={drivers}
                setDrivers={setDrivers}
                vehicles={vehicles}
                incidents={incidents}
                safetyChecks={safetyChecks}
                safetyTopics={safetyTopics}
                trainingPlans={trainingPlans}
                incabAssessments={incabAssessments}
                zoom={matrixZoom}
                onEditDriver={driver => setEditingDriver(driver)}
                onDeleteDriver={handleDeleteDriver}
                onOpenIncab={driver => setIncabModalDriver(driver)}
                onDefensiveTrainingSaved={handleDefensiveTrainingSaved}
            />

            {/* Edit Driver Modal */}
            {editingDriver && (
                <AddDriverModal
                    driver={editingDriver}
                    onSave={updated => {
                        if ('id' in updated) {
                            setDrivers(prev => prev.map(d => d.id === updated.id ? updated as Driver : d));
                        }
                        setEditingDriver(null);
                        addToast('บันทึกข้อมูลสำเร็จ', 'success');
                    }}
                    onClose={() => setEditingDriver(null)}
                />
            )}

            {/* Incab Modal */}
            {incabModalDriver && (
                <IncabAssessmentModal
                    drivers={drivers}
                    editAssessment={incabAssessments.find(a => a.driverId === incabModalDriver.id) ?? null}
                    onSave={handleSaveIncab}
                    onClose={() => setIncabModalDriver(null)}
                    onToast={(msg, type) => addToast(msg, type)}
                />
            )}

            {/* Incab Print Modal */}
            {incabPrintAssessment && (
                <IncabAssessmentPrintModal
                    assessment={incabPrintAssessment}
                    onClose={() => setIncabPrintAssessment(null)}
                />
            )}
        </div>
    );
};

export default DriverMatrixPage;
