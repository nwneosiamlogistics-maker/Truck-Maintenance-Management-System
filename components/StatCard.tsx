import React from 'react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon?: string;
    bgColor: string;
    textColor: string;
    trend?: string;
    trendDirection?: 'up' | 'down';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, bgColor, textColor, trend, trendDirection }) => {
    const trendColor = trendDirection === 'up' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';

    return (
        <div className={`${bgColor} p-6 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}>
            <div className="flex justify-between items-start">
                <div className="flex flex-col">
                    <p className={`text-base font-medium ${textColor} opacity-80`}>{title}</p>
                    <p className={`text-4xl font-bold ${textColor} mt-1`}>{value}</p>
                </div>
                {icon && <div className="text-4xl opacity-50">{icon}</div>}
            </div>
            {trend && (
                 <div className="mt-4">
                     <span className={`text-sm font-semibold px-2 py-1 rounded-full ${trendColor}`}>
                        {trendDirection === 'up' ? '▲' : '▼'} {trend}
                    </span>
                </div>
            )}
        </div>
    );
};

export default StatCard;