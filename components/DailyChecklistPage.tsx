import React, { useState } from 'react';
import type { DailyChecklist, Vehicle, Technician, RepairFormSeed, Tab } from '../types';
import DailyChecklistForm from './DailyChecklistForm';
import DailyChecklistHistory from './DailyChecklistHistory';

interface DailyChecklistPageProps {
    checklists: DailyChecklist[];
    setChecklists: React.Dispatch<React.SetStateAction<DailyChecklist[]>>;
    vehicles: Vehicle[];
    technicians: Technician[];
    setRepairFormSeed: (seed: RepairFormSeed | null) => void;
    setActiveTab: (tab: Tab) => void;
}

const DailyChecklistPage: React.FC<DailyChecklistPageProps> = ({ checklists, setChecklists, vehicles, technicians, setRepairFormSeed, setActiveTab }) => {
    const [view, setView] = useState<'form' | 'history'>('form');

    const handleSaveChecklist = (newChecklistData: Omit<DailyChecklist, 'id'>) => {
        const newChecklist: DailyChecklist = {
            ...newChecklistData,
            id: `CHK-${Date.now()}`,
        };
        setChecklists(prev => [newChecklist, ...(Array.isArray(prev) ? prev : [])]);
        setView('history'); // Switch to history view after saving
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-2 rounded-2xl shadow-sm flex items-center justify-center gap-2 max-w-md mx-auto">
                <button
                    onClick={() => setView('form')}
                    className={`px-6 py-2 rounded-lg font-semibold transition-colors w-full ${view === 'form' ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                    📝 สร้างใบตรวจเช็คใหม่
                </button>
                <button
                    onClick={() => setView('history')}
                    className={`px-6 py-2 rounded-lg font-semibold transition-colors w-full ${view === 'history' ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                    📜 ประวัติการตรวจเช็ค
                </button>
            </div>

            {view === 'form' ? (
                <DailyChecklistForm onSave={handleSaveChecklist} vehicles={vehicles} technicians={technicians} />
            ) : (
                <DailyChecklistHistory 
                    checklists={checklists} 
                    setChecklists={setChecklists}
                    onNavigateAndCreateRepair={(seedData) => {
                        setRepairFormSeed(seedData);
                        setActiveTab('form');
                    }}
                />
            )}
        </div>
    );
};

export default DailyChecklistPage;