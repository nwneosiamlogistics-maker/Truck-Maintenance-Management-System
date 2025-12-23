import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Package, Truck, User, FileText, ArrowRight } from 'lucide-react';
import type { Tab, Repair, StockItem, Vehicle, Technician } from '../types';

interface SearchResult {
    id: string;
    title: string;
    subtitle: string;
    type: 'repair' | 'stock' | 'vehicle' | 'technician';
    tab: Tab;
}

interface GlobalSearchProps {
    repairs: Repair[];
    stock: StockItem[];
    vehicles: Vehicle[];
    technicians: Technician[];
    onNavigate: (tab: Tab) => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ repairs, stock, vehicles, technicians, onNavigate }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        const q = query.toLowerCase();
        const searchResults: SearchResult[] = [];

        // Search Repairs
        repairs.filter(r =>
            r.repairOrderNo.toLowerCase().includes(q) ||
            r.licensePlate.toLowerCase().includes(q)
        ).slice(0, 3).forEach(r => {
            searchResults.push({
                id: r.id,
                title: r.repairOrderNo,
                subtitle: `รถทะเบียน: ${r.licensePlate}`,
                type: 'repair',
                tab: 'list'
            });
        });

        // Search Stock
        stock.filter(s =>
            s.name.toLowerCase().includes(q) ||
            (s.code && s.code.toLowerCase().includes(q))
        ).slice(0, 3).forEach(s => {
            searchResults.push({
                id: s.id,
                title: s.name,
                subtitle: `รหัส: ${s.code || '-'} | คงเหลือ: ${s.quantity} ${s.unit}`,
                type: 'stock',
                tab: 'stock'
            });
        });

        // Search Vehicles
        vehicles.filter(v =>
            v.licensePlate.toLowerCase().includes(q)
        ).slice(0, 3).forEach(v => {
            searchResults.push({
                id: v.id,
                title: v.licensePlate,
                subtitle: `${v.vehicleType}`,
                type: 'vehicle',
                tab: 'vehicles'
            });
        });

        // Search Technicians
        technicians.filter(t =>
            t.name.toLowerCase().includes(q)
        ).slice(0, 3).forEach(t => {
            searchResults.push({
                id: t.id,
                title: t.name,
                subtitle: `${t.role} | ประสบการณ์ ${t.experience} ปี`,
                type: 'technician',
                tab: 'technicians'
            });
        });

        setResults(searchResults);
    }, [query, repairs, stock, vehicles, technicians]);

    const handleSelect = (tab: Tab) => {
        onNavigate(tab);
        setIsOpen(false);
        setQuery('');
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'repair': return <FileText className="w-5 h-5 text-blue-500" />;
            case 'stock': return <Package className="w-5 h-5 text-purple-500" />;
            case 'vehicle': return <Truck className="w-5 h-5 text-green-500" />;
            case 'technician': return <User className="w-5 h-5 text-orange-500" />;
            default: return <Search className="w-5 h-5 text-slate-400" />;
        }
    };

    return (
        <div ref={searchRef} className="relative w-full max-w-sm hidden md:block">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder="ค้นหาใบซ่อม, อะไหล่, ทะเบียนรถ..."
                    className="block w-full pl-10 pr-10 py-2 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm"
                />
                {query && (
                    <button
                        onClick={() => setQuery('')}
                        title="ล้างการค้นหา"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-slate-600"
                    >
                        <X className="h-4 w-4 text-slate-400" />
                    </button>
                )}
            </div>

            {isOpen && query.trim() && (
                <div className="absolute mt-2 w-full bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2">
                        {results.length > 0 ? (
                            <>
                                <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">ผลการค้นหา</div>
                                {results.map((result) => (
                                    <button
                                        key={result.id}
                                        onClick={() => handleSelect(result.tab)}
                                        className="w-full flex items-center p-3 hover:bg-slate-50 rounded-xl transition-colors group text-left"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mr-3 group-hover:bg-white transition-colors">
                                            {getIcon(result.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-slate-800 truncate">{result.title}</div>
                                            <div className="text-xs text-slate-500 truncate">{result.subtitle}</div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all" />
                                    </button>
                                ))}
                            </>
                        ) : (
                            <div className="p-8 text-center">
                                <Search className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                <p className="text-slate-500 text-sm font-medium">ไม่พบข้อมูลที่ค้นหา</p>
                                <p className="text-slate-400 text-xs">ลองค้นหาด้วยคำอื่นดูนะครับ</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;
