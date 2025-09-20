import React, { useState, useMemo } from 'react';
import type { Holiday } from '../types';
import { useToast } from '../context/ToastContext';
import { promptForPassword } from '../utils';

interface SettingsProps {
    holidays: Holiday[];
    setHolidays: React.Dispatch<React.SetStateAction<Holiday[]>>;
}

const Settings: React.FC<SettingsProps> = ({ holidays, setHolidays }) => {
    const { addToast } = useToast();
    const safeHolidays = useMemo(() => Array.isArray(holidays) ? holidays : [], [holidays]);
    
    const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });

    const handleAddHoliday = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newHoliday.date || !newHoliday.name.trim()) {
            addToast('กรุณากรอกวันที่และชื่อวันหยุด', 'warning');
            return;
        }

        const isDuplicate = safeHolidays.some(h => h.date === newHoliday.date);
        if (isDuplicate) {
            addToast('มีวันหยุดในวันที่นี้แล้ว', 'error');
            return;
        }

        const holidayToAdd: Holiday = {
            id: `HOL-${Date.now()}`,
            date: newHoliday.date,
            name: newHoliday.name.trim(),
        };

        setHolidays(prev => [...prev, holidayToAdd]);
        setNewHoliday({ date: '', name: '' });
        addToast(`เพิ่มวันหยุด "${holidayToAdd.name}" สำเร็จ`, 'success');
    };
    
    const handleDeleteHoliday = (holidayId: string) => {
        if (promptForPassword('ลบวันหยุด')) {
            setHolidays(prev => prev.filter(h => h.id !== holidayId));
            addToast('ลบวันหยุดสำเร็จ', 'info');
        }
    };

    const sortedHolidays = useMemo(() => {
        return [...safeHolidays].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [safeHolidays]);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-lg">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-3">จัดการวันหยุดบริษัท</h2>
                
                <form onSubmit={handleAddHoliday} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">วันที่</label>
                        <input
                            type="date"
                            value={newHoliday.date}
                            onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })}
                            className="mt-1 w-full p-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">ชื่อวันหยุด</label>
                        <input
                            type="text"
                            placeholder="เช่น วันปีใหม่"
                            value={newHoliday.name}
                            onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })}
                            className="mt-1 w-full p-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                    <button type="submit" className="px-4 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 h-10">
                        + เพิ่มวันหยุด
                    </button>
                </form>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {sortedHolidays.map(holiday => (
                        <div key={holiday.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                            <div>
                                <p className="font-semibold text-gray-800">{holiday.name}</p>
                                <p className="text-sm text-gray-500">
                                    {new Date(holiday.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                                </p>
                            </div>
                            <button onClick={() => handleDeleteHoliday(holiday.id)} className="text-red-500 hover:text-red-700 font-bold text-xl px-2">
                                &times;
                            </button>
                        </div>
                    ))}
                     {sortedHolidays.length === 0 && (
                        <p className="text-center text-gray-500 py-6">ยังไม่มีการกำหนดวันหยุด</p>
                    )}
                </div>
            </div>
            {/* Other settings can be added here in the future */}
        </div>
    );
};

export default Settings;
