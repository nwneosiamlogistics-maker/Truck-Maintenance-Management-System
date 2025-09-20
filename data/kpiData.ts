// data/kpiData.ts

export interface RepairKPI {
    id: string;
    category: string;
    item: string;
    standardHours: number;
}

// Data has been moved to defaultData.ts to be used as initial state
// and will be managed in Firebase.
export const kpiData: RepairKPI[] = [];
