import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Technician } from '../types';

interface TechnicianMultiSelectProps {
    allTechnicians: Technician[];
    selectedTechnicianIds: string[];
    onChange: (ids: string[]) => void;
}

const TechnicianMultiSelect: React.FC<TechnicianMultiSelectProps> = ({ allTechnicians, selectedTechnicianIds, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleSelection = (techId: string) => {
        const newSelection = selectedTechnicianIds.includes(techId)
            ? selectedTechnicianIds.filter(id => id !== techId)
            : [...selectedTechnicianIds, techId];
        onChange(newSelection);
    };

    const selectedTechnicians = useMemo(() => {
        return allTechnicians.filter(t => selectedTechnicianIds.includes(t.id));
    }, [allTechnicians, selectedTechnicianIds]);

    const getStatusIndicator = (status: Technician['status']) => {
        switch (status) {
            case 'ว่าง': return 'bg-green-500';
            case 'ไม่ว่าง': return 'bg-yellow-500';
            case 'ลา': return 'bg-gray-400';
            default: return 'bg-gray-300';
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)} 
                className="w-full p-2 border border-gray-300 rounded-lg bg-white cursor-pointer min-h-[42px] flex flex-wrap items-center gap-2"
            >
                {selectedTechnicians.length === 0 && <span className="text-gray-500">-- เลือกช่าง --</span>}
                {selectedTechnicians.map(tech => (
                    <span key={tech.id} className="flex items-center gap-2 bg-blue-100 text-blue-800 text-sm font-semibold px-2 py-1 rounded-full">
                        {tech.name}
                        <button 
                            type="button" 
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleSelection(tech.id);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                        >
                            &times;
                        </button>
                    </span>
                ))}
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    <ul>
                        {allTechnicians.map(tech => (
                            <li 
                                key={tech.id} 
                                onClick={() => toggleSelection(tech.id)}
                                className={`p-3 cursor-pointer hover:bg-gray-100 flex items-center justify-between ${selectedTechnicianIds.includes(tech.id) ? 'bg-blue-50' : ''}`}
                            >
                                <div className="flex items-center">
                                    <input 
                                        type="checkbox" 
                                        readOnly
                                        checked={selectedTechnicianIds.includes(tech.id)} 
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                                    />
                                    <div>
                                        <p className="font-semibold">{tech.name}</p>
                                        <p className="text-xs text-gray-500">{(tech.skills || []).join(', ')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600">{tech.status}</span>
                                    <span className={`w-3 h-3 rounded-full ${getStatusIndicator(tech.status)}`}></span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default TechnicianMultiSelect;
