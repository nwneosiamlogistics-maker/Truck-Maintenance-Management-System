import { useFirebase } from './useFirebase';
import type { IncabAssessment } from '../types';

export function useIncabAssessments(year: number) {
    const [assessments, setAssessments] = useFirebase<IncabAssessment[]>(
        `incab-assessments/${year}`, []
    );
    const safe = Array.isArray(assessments) ? assessments : [];

    const addAssessment = (a: IncabAssessment) =>
        setAssessments(prev => [...(Array.isArray(prev) ? prev : []), a]);

    const updateAssessment = (a: IncabAssessment) =>
        setAssessments(prev => (Array.isArray(prev) ? prev : []).map(x => x.id === a.id ? a : x));

    const deleteAssessment = (id: string) =>
        setAssessments(prev => (Array.isArray(prev) ? prev : []).filter(x => x.id !== id));

    return { assessments: safe, addAssessment, updateAssessment, deleteAssessment };
}
