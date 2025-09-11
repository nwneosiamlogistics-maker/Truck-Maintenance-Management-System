import type { Repair, Technician, StockItem, Report, MaintenancePlan, StockTransaction } from '../types';

export const getDefaultTechnicians = (): Technician[] => [];

export const getDefaultStock = (): StockItem[] => [];

export const getDefaultStockTransactions = (): StockTransaction[] => [];

export const getDefaultRepairs = (): Repair[] => {
    return [];
};

export const getDefaultReports = (): Report[] => [];

export const getDefaultMaintenancePlans = (): MaintenancePlan[] => [];