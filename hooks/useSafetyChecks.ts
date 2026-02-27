import { useFirebase } from './useFirebase';
import type { SafetyCheck } from '../types';

export function useSafetyChecks(year: number) {
    const [checks, setChecks] = useFirebase<SafetyCheck[]>(`safety-checks/${year}`, []);

    const safeChecks = Array.isArray(checks) ? checks : [];

    const addCheck = (check: SafetyCheck) => {
        setChecks(prev => {
            const list = Array.isArray(prev) ? prev : [];
            return [...list, check];
        });
    };

    const updateCheck = (updated: SafetyCheck) => {
        setChecks(prev => {
            const list = Array.isArray(prev) ? prev : [];
            return list.map(c => c.id === updated.id ? updated : c);
        });
    };

    const deleteCheck = (id: string) => {
        setChecks(prev => {
            const list = Array.isArray(prev) ? prev : [];
            return list.filter(c => c.id !== id);
        });
    };

    return { checks: safeChecks, addCheck, updateCheck, deleteCheck };
}
