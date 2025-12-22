import { useFirebase } from './useFirebase';
import type { Technician, Driver, DrivingIncident, MaintenanceBudget, FuelRecord, PartWarranty, InsuranceClaim, Report, Notification } from '../types';
import { getDefaultTechnicians, getDefaultDrivers, getDefaultBudgets, getDefaultFuelRecords, getDefaultReports } from '../data/defaultData';

export const useAdmin = () => {
    const [technicians, setTechnicians] = useFirebase<Technician[]>('technicians', getDefaultTechnicians);
    const [drivers, setDrivers] = useFirebase<Driver[]>('drivers', getDefaultDrivers);
    const [drivingIncidents, setDrivingIncidents] = useFirebase<DrivingIncident[]>('drivingIncidents', []);
    const [budgets, setBudgets] = useFirebase<MaintenanceBudget[]>('budgets', []);
    const [fuelRecords, setFuelRecords] = useFirebase<FuelRecord[]>('fuelRecords', []);
    const [partWarranties, setPartWarranties] = useFirebase<PartWarranty[]>('partWarranties', []);
    const [insuranceClaims, setInsuranceClaims] = useFirebase<InsuranceClaim[]>('insuranceClaims', []);
    const [reports, setReports] = useFirebase<Report[]>('reports', getDefaultReports);
    const [notifications, setNotifications] = useFirebase<Notification[]>('notifications', []);
    const [tools, setTools] = useFirebase('tools', []);
    const [toolTransactions, setToolTransactions] = useFirebase('toolTransactions', []);

    const unreadNotificationCount = (Array.isArray(notifications) ? notifications : []).filter(n => !n.isRead).length;

    return {
        technicians,
        setTechnicians,
        drivers,
        setDrivers,
        drivingIncidents,
        setDrivingIncidents,
        budgets,
        setBudgets,
        fuelRecords,
        setFuelRecords,
        partWarranties,
        setPartWarranties,
        insuranceClaims,
        setInsuranceClaims,
        reports,
        setReports,
        notifications,
        setNotifications,
        tools,
        setTools,
        toolTransactions,
        setToolTransactions,
        unreadNotificationCount
    };
};
