import React, { useState } from 'react';
import type { DailyChecklist, Vehicle, Technician, RepairFormSeed, Tab } from '../types';
import TrailerChecklistForm from './TrailerChecklistForm';
import DailyChecklistHistory from './DailyChecklistHistory';

interface TrailerChecklistPageProps {
    checklists: DailyChecklist[];
    setChecklists: React.Dispatch<React.SetStateAction<DailyChecklist[]>>;
    vehicles: Vehicle[];
    technicians: Technician[];
    setRepairFormSeed: (seed: RepairFormSeed | null) => void;
    setActiveTab: (tab: Tab) => void;
    userRole: string;
}

const TrailerChecklistPage: React.FC<TrailerChecklistPageProps> = ({ checklists, setChecklists, vehicles, technicians, setRepairFormSeed, setActiveTab, userRole }) => {
    const [view, setView] = useState<'form' | 'history'>('form');

    const handleSaveChecklist = (newChecklistData: Omit<DailyChecklist, 'id' | 'createdAt'>) => {
        const newChecklist: DailyChecklist = {
            ...newChecklistData,
            id: `TRAILER-${Date.now()}`,
            createdAt: new Date().toISOString(),
        };
        setChecklists(prev => [newChecklist, ...(Array.isArray(prev) ? prev : [])]);
        setView('history');
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-2 rounded-2xl shadow-sm flex items-center justify-center gap-2 max-w-md mx-auto">
                <button
                    onClick={() => setView('form')}
                    className={`px-6 py-2 rounded-lg font-semibold transition-colors w-full ${view === 'form' ? 'bg-amber-600 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                    🚛 สร้างใบตรวจเช็คหาง
                </button>
                <button
                    onClick={() => setView('history')}
                    className={`px-6 py-2 rounded-lg font-semibold transition-colors w-full ${view === 'history' ? 'bg-amber-600 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                    📜 ประวัติการตรวจเช็ค
                </button>
            </div>

            {view === 'form' ? (
                <div>
                    <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-6 rounded-2xl shadow-lg mb-6">
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            <span>🚛</span>
                            ตรวจเช็คหางลาก/หางพ่วง
                        </h1>
                        <p className="mt-2 text-amber-100">
                            รายการตรวจสอบหางลากและหางพ่วง เน้นระบบเบรกลม โครงสร้าง และอุปกรณ์ความปลอดภัย
                        </p>
                    </div>
                    <TrailerChecklistForm 
                        onSave={handleSaveChecklist} 
                        vehicles={vehicles} 
                        technicians={technicians} 
                    />
                </div>
            ) : (
                <DailyChecklistHistory
                    checklists={checklists}
                    setChecklists={setChecklists}
                    userRole={userRole}
                    onNavigateAndCreateRepair={(seedData) => {
                        setRepairFormSeed(seedData);
                        setActiveTab('form');
                    }}
                />
            )}
        </div>
    );
};

export default TrailerChecklistPage;
