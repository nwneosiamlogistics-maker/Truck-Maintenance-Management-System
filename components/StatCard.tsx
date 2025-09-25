
import React from 'react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon?: string;
    theme: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
    trend?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, theme, trend }) => {
    const themes = {
        blue: {
            gradient: 'from-blue-400 to-blue-600',
            shadow: 'hover:shadow-[0_8px_20px_-5px_rgba(59,130,246,0.5)]',
        },
        green: {
            gradient: 'from-green-400 to-emerald-600',
            shadow: 'hover:shadow-[0_8px_20px_-5px_rgba(16,185,129,0.5)]',
        },
        yellow: {
            gradient: 'from-yellow-400 to-amber-500',
            shadow: 'hover:shadow-[0_8px_20px_-5px_rgba(245,158,11,0.5)]',
        },
        red: {
            gradient: 'from-red-400 to-rose-600',
            shadow: 'hover:shadow-[0_8px_20px_-5px_rgba(239,68,68,0.5)]',
        },
        purple: {
            gradient: 'from-purple-400 to-indigo-600',
            shadow: 'hover:shadow-[0_8px_20px_-5px_rgba(139,92,246,0.5)]',
        },
        gray: {
            gradient: 'from-gray-400 to-gray-600',
            shadow: 'hover:shadow-[0_8px_20px_-5px_rgba(107,114,128,0.5)]',
        }
    };
    
    const currentTheme = themes[theme] || themes.gray;

    return (
        <div className={`bg-gradient-to-br ${currentTheme.gradient} text-white p-6 rounded-2xl shadow-lg transition-all duration-300 hover:-translate-y-1 ${currentTheme.shadow}`}>
            <div className="flex justify-between items-start">
                <div className="flex flex-col">
                    <p className="text-base font-medium opacity-80">{title}</p>
                    <p className="text-4xl font-bold mt-1">{value}</p>
                    {trend && <p className="text-sm opacity-90 mt-2">{trend}</p>}
                </div>
                {icon && <div className="text-4xl opacity-50">{icon}</div>}
            </div>
        </div>
    );
};

export default StatCard;
