import { useFirebase } from './useFirebase';
import type { LegalItem } from '../types';

export function useLegalRegister() {
    const [items, setItems] = useFirebase<LegalItem[]>('legal-register/items', []);
    const safe = Array.isArray(items) ? items : [];

    const addItem = (item: LegalItem) =>
        setItems(prev => [...(Array.isArray(prev) ? prev : []), item]);

    const updateItem = (item: LegalItem) =>
        setItems(prev => (Array.isArray(prev) ? prev : []).map(x => x.id === item.id ? item : x));

    const deleteItem = (id: string) =>
        setItems(prev => (Array.isArray(prev) ? prev : []).filter(x => x.id !== id));

    const seedItems = (defaults: LegalItem[]) =>
        setItems(defaults);

    return { items: safe, addItem, updateItem, deleteItem, seedItems };
}
