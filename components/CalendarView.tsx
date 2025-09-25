
import React, { useState, useMemo } from 'react';
import type { EnrichedPlan, PlanStatus } from './PreventiveMaintenance';

interface CalendarViewProps {
    plans: EnrichedPlan[];
    onPlanClick: (plan: EnrichedPlan) => void;
    viewMode: 'month' | 'year';
}

const weekdays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

const getStatusColor = (status: PlanStatus) => {
    switch(status) {
        case 'overdue': return 'bg-red-500';
        case 'due': return 'bg-yellow-400';
        default: return 'bg-blue-500';
    }
};

const formatFrequency = (plan: EnrichedPlan) => {
    const unitMap = { days: 'วัน', weeks: 'สัปดาห์', months: 'เดือน' };
    const timePart = `ทุก ${plan.frequencyValue} ${unitMap[plan.frequencyUnit]}`;
    const mileagePart = ` / ${plan.mileageFrequency.toLocaleString()} กม.`;
    return timePart + mileagePart;
};

// Helper to get local date string, avoiding timezone issues.
const getLocalDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- Mini Month Component for Year View ---
interface MiniMonthProps {
    year: number;
    month: number; // 0-11
    events: Record<string, EnrichedPlan[]>;
}
const MiniMonth: React.FC<MiniMonthProps> = ({ year, month, events }) => {
    const monthName = new Intl.DateTimeFormat('th-TH', { month: 'long' }).format(new Date(year, month));
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    const getHighestPriorityStatus = (dayEvents: EnrichedPlan[]): PlanStatus | null => {
        if (!dayEvents || dayEvents.length === 0) return null;
        if (dayEvents.some(e => e.status === 'overdue')) return 'overdue';
        if (dayEvents.some(e => e.status === 'due')) return 'due';
        return 'ok';
    };

    const cells = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        cells.push(<div key={`empty-${i}`}></div>);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(Date.UTC(year, month, day));
        const dateKey = date.toISOString().split('T')[0];
        const dayEvents = events[dateKey] || [];
        const highestStatus = getHighestPriorityStatus(dayEvents);
        const tooltipText = dayEvents.map(p => `${p.vehicleLicensePlate}: ${p.planName}`).join('\n');

        cells.push(
            <div key={day} className="relative h-8 flex items-center justify-center" title={tooltipText}>
                <span className="text-xs">{day}</span>
                {highestStatus && <div className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${getStatusColor(highestStatus)}`}></div>}
            </div>
        );
    }

    return (
        <div className="border rounded-lg p-2">
            <h4 className="font-bold text-center text-sm mb-2">{monthName}</h4>
            <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-1">
                {weekdays.map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
                {cells}
            </div>
        </div>
    );
};


const CalendarView: React.FC<CalendarViewProps> = ({ plans, onPlanClick, viewMode }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const eventsByDate = useMemo(() => {
        const events: Record<string, EnrichedPlan[]> = {};
        plans.forEach(plan => {
            const dateKey = plan.nextServiceDate.toISOString().split('T')[0];
            if (!events[dateKey]) events[dateKey] = [];
            events[dateKey].push(plan);
        });
        return events;
    }, [plans]);

    const changePeriod = (delta: number) => {
        setCurrentDate(prev => {
            if (viewMode === 'month') {
                return new Date(prev.getFullYear(), prev.getMonth() + delta, 1);
            } else {
                return new Date(prev.getFullYear() + delta, prev.getMonth(), 1);
            }
        });
    };
    
    const renderMonthView = () => {
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        
        const todayKey = getLocalDateKey(new Date());

        const calendarCells = [];
        for (let i = 0; i < firstDayOfMonth; i++) {
            calendarCells.push(<div key={`empty-start-${i}`} className="border-r border-b"></div>);
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(Date.UTC(year, month, day));
            const dateKey = date.toISOString().split('T')[0];
            const dayEvents = eventsByDate[dateKey] || [];
            const localDate = new Date(year, month, day);
            const localDateKey = getLocalDateKey(localDate);
            const isToday = todayKey === localDateKey;

            calendarCells.push(
                <div key={day} className="relative border-r border-b p-2 min-h-[120px]">
                    <div className={`font-semibold ${isToday ? 'bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center' : ''}`}>{day}</div>
                    <div className="mt-1 space-y-1">
                        {dayEvents.map(plan => (
                             <div 
                                key={plan.id} 
                                onClick={() => onPlanClick(plan)} 
                                className={`p-1.5 rounded text-white text-xs cursor-pointer hover:opacity-80 ${getStatusColor(plan.status)}`}
                                title={`คลิกเพื่อบันทึกการซ่อมบำรุงสำหรับ ${plan.vehicleLicensePlate}`}
                            >
                                <p className="font-bold truncate">{plan.vehicleLicensePlate}</p>
                                <p className="text-xs truncate">{plan.planName}</p>
                                <p className="text-xs text-white/80 truncate" title={formatFrequency(plan)}>{formatFrequency(plan)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
         const remainingCells = (7 - (calendarCells.length % 7)) % 7;
         for (let i = 0; i < remainingCells; i++) {
            calendarCells.push(<div key={`empty-end-${i}`} className="border-r border-b"></div>);
        }
        
        return (
             <div className="grid grid-cols-7 border-t border-l">
                {weekdays.map(day => <div key={day} className="p-2 text-center font-semibold bg-gray-50 border-r border-b">{day}</div>)}
                {calendarCells}
            </div>
        );
    };

    const renderYearView = () => {
        const year = currentDate.getFullYear();
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, monthIndex) => (
                    <MiniMonth 
                        key={monthIndex}
                        year={year}
                        month={monthIndex}
                        events={eventsByDate}
                    />
                ))}
            </div>
        );
    };
    
    const headerTitle = useMemo(() => {
        if (viewMode === 'month') {
            return new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(currentDate);
        }
        return new Intl.DateTimeFormat('th-TH', { year: 'numeric' }).format(currentDate);
    }, [currentDate, viewMode]);


    return (
        <div className="bg-white p-4 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => changePeriod(-1)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">&lt; ย้อนกลับ</button>
                <h2 className="text-xl font-bold">{headerTitle}</h2>
                <button onClick={() => changePeriod(1)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">ถัดไป &gt;</button>
            </div>
            {viewMode === 'month' ? renderMonthView() : renderYearView()}
        </div>
    );
};

export default CalendarView;
