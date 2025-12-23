import React, { useState } from 'react';
import { MousePointer2, Settings, Truck, Package, Disc, Shield, Maximize2 } from 'lucide-react';

interface HotspotProps {
    position: string;
    label: string;
    icon: React.ReactNode;
    onSelect: (part: string) => void;
    delay?: string;
}

const Hotspot: React.FC<HotspotProps> = ({ position, label, icon, onSelect, delay = 'delay-0' }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className={`absolute z-20 group cursor-pointer transition-all duration-500 animate-scale-in ${delay} ${position}`}
            onClick={() => onSelect(label)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Pulsing Aura */}
            <div className={`absolute -inset-4 bg-blue-500/20 rounded-full blur-xl transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`}></div>

            {/* Target Circle */}
            <div className={`relative w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${isHovered
                ? 'bg-blue-600 border-white scale-110 shadow-xl shadow-blue-500/40'
                : 'bg-white/10 border-white/30 backdrop-blur-md'
                }`}>
                <div className={`transition-colors duration-500 ${isHovered ? 'text-white' : 'text-blue-400'}`}>
                    {icon}
                </div>

                {/* Animated Rings */}
                {!isHovered && (
                    <div className="absolute inset-0 border border-blue-400 rounded-full animate-ping opacity-40"></div>
                )}
            </div>

            {/* Label Tooltip */}
            <div className={`absolute left-1/2 -translate-x-1/2 mt-3 px-4 py-2 bg-slate-900/90 backdrop-blur-xl border border-white/20 rounded-2xl whitespace-nowrap transition-all duration-500 pointer-events-none ${isHovered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95'
                }`}>
                <span className="text-white text-[11px] font-black tracking-widest uppercase">{label}</span>
            </div>
        </div>
    );
};

interface TruckModel3DProps {
    onPartSelect: (part: string) => void;
}

const TruckModel3D: React.FC<TruckModel3DProps> = ({ onPartSelect }) => {
    return (
        <div className="w-full h-[550px] bg-slate-950 rounded-[3.5rem] overflow-hidden shadow-3xl relative border border-white/10 group">
            {/* Background Atmosphere */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(30,58,138,0.2)_0%,transparent_70%)]"></div>
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>

            {/* Header Info */}
            <div className="absolute top-10 left-10 z-30 pointer-events-none">
                <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20 text-white">
                        <Maximize2 size={24} />
                    </div>
                    <div>
                        <h3 className="text-white font-black text-2xl tracking-tighter">
                            ระบบวิเคราะห์โครงสร้างแบบสมาร์ท
                        </h3>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-[0.3em] mt-1">Smart Structural Analysis</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 py-2 px-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
                    <MousePointer2 size={14} className="text-blue-400 animate-bounce" />
                    <span className="text-slate-300 text-[10px] font-black uppercase tracking-widest">
                        คลิกเลือกส่วนที่ต้องการแจ้งซ่อมจากรูปจำลอง (Interactive Diagnostic)
                    </span>
                </div>
            </div>

            {/* Main Truck Display */}
            <div className="absolute inset-0 flex items-center justify-center p-20 transform group-hover:scale-105 transition-transform duration-1000 ease-out">
                <div className="relative w-full h-full flex items-center justify-center">
                    {/* Shadow/Reflection */}
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[80%] h-20 bg-black/40 blur-3xl rounded-full"></div>

                    {/* The Truck Image */}
                    <img
                        src="/truck_reference.png"
                        alt="Truck Model"
                        className="max-w-full max-h-full object-contain relative z-10 drop-shadow-[0_35px_35px_rgba(0,0,0,0.5)]"
                    />

                    {/* Hotspots - Positioned relative to the truck container */}
                    <Hotspot
                        position="top-[30%] left-[68%]"
                        label="ห้องโดยสาร (Cabin)"
                        icon={<Truck size={18} />}
                        onSelect={onPartSelect}
                        delay="delay-100"
                    />
                    <Hotspot
                        position="top-[55%] left-[75%]"
                        label="เครื่องยนต์ (Engine)"
                        icon={<Settings size={18} />}
                        onSelect={onPartSelect}
                        delay="delay-200"
                    />
                    <Hotspot
                        position="top-[35%] left-[35%]"
                        label="ตู้บรรทุก (Cargo Bed)"
                        icon={<Package size={18} />}
                        onSelect={onPartSelect}
                        delay="delay-300"
                    />
                    <Hotspot
                        position="top-[68%] left-[55%]"
                        label="ระบบช่วงล่าง (Chassis)"
                        icon={<Shield size={18} />}
                        onSelect={onPartSelect}
                        delay="delay-400"
                    />
                    <Hotspot
                        position="top-[75%] left-[30%]"
                        label="ยางและล้อ (Tyres/Wheels)"
                        icon={<Disc size={18} />}
                        onSelect={onPartSelect}
                        delay="delay-500"
                    />
                </div>
            </div>

            {/* Status Indicators */}
            <div className="absolute bottom-10 left-10 z-30 flex gap-6 pointer-events-none">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div>
                    <span className="text-white/40 text-[9px] font-black uppercase tracking-widest">System Online</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_#3b82f6]"></div>
                    <span className="text-white/40 text-[9px] font-black uppercase tracking-widest">3D Hardware Accelerated</span>
                </div>
            </div>

            {/* Side Tech Info */}
            <div className="absolute top-1/2 right-10 -translate-y-1/2 flex flex-col gap-4 z-30">
                {[
                    { label: 'VIN', val: 'THX-9982-LM' },
                    { label: 'BATTERY', val: '98%' },
                    { label: 'TEMP', val: '42.5°C' }
                ].map((item, i) => (
                    <div key={i} className={`bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl animate-fade-in-right delay-${(i + 1) * 200}`}>
                        <p className="text-slate-500 text-[8px] font-black uppercase tracking-[0.2em] mb-1">{item.label}</p>
                        <p className="text-white text-xs font-black tracking-widest">{item.val}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TruckModel3D;
