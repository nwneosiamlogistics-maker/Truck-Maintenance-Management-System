import { useFirebase } from './useFirebase';
import type { Vehicle, MaintenancePlan, AnnualPMPlan, PMHistory } from '../types';
import { getDefaultVehicles, getDefaultMaintenancePlans, getDefaultAnnualPMPlans } from '../data/defaultData';

export const useFleet = () => {
    const [vehicles, setVehicles] = useFirebase<Vehicle[]>('vehicles', getDefaultVehicles);
    const [maintenancePlans, setMaintenancePlans] = useFirebase<MaintenancePlan[]>('maintenancePlans', getDefaultMaintenancePlans);
    const [annualPlans, setAnnualPlans] = useFirebase<AnnualPMPlan[]>('annualPlans', getDefaultAnnualPMPlans);
    const [pmHistory, setPmHistory] = useFirebase<PMHistory[]>('pmHistory', []);
    const [checklists, setChecklists] = useFirebase('dailyChecklists', []);
    const [tireInspections, setTireInspections] = useFirebase('tireInspections', []);

    const dueMaintenanceCount = (Array.isArray(maintenancePlans) ? maintenancePlans : []).filter(plan => {
        const nextServiceDate = new Date(plan.lastServiceDate);
        if (plan.frequencyUnit === 'days') nextServiceDate.setDate(nextServiceDate.getDate() + plan.frequencyValue);
        else if (plan.frequencyUnit === 'weeks') nextServiceDate.setDate(nextServiceDate.getDate() + plan.frequencyValue * 7);
        else nextServiceDate.setMonth(nextServiceDate.getMonth() + plan.frequencyValue);
        const daysUntil = (nextServiceDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24);
        return daysUntil <= 30;
    }).length;

    return {
        vehicles,
        setVehicles,
        maintenancePlans,
        setMaintenancePlans,
        annualPlans,
        setAnnualPlans,
        pmHistory,
        setPmHistory,
        checklists,
        setChecklists,
        tireInspections,
        setTireInspections,
        dueMaintenanceCount
    };
};
