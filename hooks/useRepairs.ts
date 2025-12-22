import { useState } from 'react';
import { useFirebase } from './useFirebase';
import type { Repair, RepairKPI, Holiday, RepairFormSeed } from '../types';
import { getDefaultRepairs, getDefaultKpiData } from '../data/defaultData';

export const useRepairs = () => {
    const [repairs, setRepairs] = useFirebase<Repair[]>('repairs', getDefaultRepairs);
    const [kpiData, setKpiData] = useFirebase<RepairKPI[]>('kpiData', getDefaultKpiData);
    const [holidays, setHolidays] = useFirebase<Holiday[]>('companyHolidays', []);
    const [repairFormSeed, setRepairFormSeed] = useState<RepairFormSeed | null>(null);

    const addRepair = (newRepairData: Omit<Repair, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'repairOrderNo'>) => {
        const now = new Date();
        const year = now.getFullYear();
        const repairsThisYear = repairs.filter(r => new Date(r.createdAt).getFullYear() === year);
        const nextId = repairsThisYear.length + 1;
        const newRepairOrderNo = `RO-${year}-${String(nextId).padStart(5, '0')}`;

        const newRepair: Repair = {
            ...newRepairData,
            id: `R-${Date.now()}`,
            repairOrderNo: newRepairOrderNo,
            status: 'รอซ่อม',
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            approvalDate: null,
            repairStartDate: null,
            repairEndDate: null,
        };
        setRepairs(prev => [newRepair, ...prev]);
        return newRepair;
    };

    const pendingRepairsCount = (Array.isArray(repairs) ? repairs : []).filter(r =>
        ['รอซ่อม', 'กำลังซ่อม', 'รออะไหล่'].includes(r.status)
    ).length;

    return {
        repairs,
        setRepairs,
        kpiData,
        setKpiData,
        holidays,
        setHolidays,
        repairFormSeed,
        setRepairFormSeed,
        addRepair,
        pendingRepairsCount
    };
};
