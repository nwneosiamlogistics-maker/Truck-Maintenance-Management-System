import React, { useState } from 'react';
import { Truck, Lock, User, Eye, EyeOff, LogIn, Shield, FileText } from 'lucide-react';

interface LoginProps {
    onLogin: (role: string) => void;
    onClose?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onClose }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        setTimeout(() => {
            if (password === '1234') {
                onLogin(username || 'admin');
            } else {
                setError('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่');
                setIsLoading(false);
            }
        }, 800);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row animate-scale-in border border-white/10" onClick={e => e.stopPropagation()}>

                {/* Left Side: BRANDING (Matched to Image #2) */}
                <div className="hidden md:flex md:w-5/12 relative bg-[#101828] overflow-hidden min-h-[600px]">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#101828]/95 via-[#101828]/80 to-blue-900/30 z-10" />
                    <img
                        src="https://images.unsplash.com/photo-1586191582156-ceda08a956c3?q=80&w=2940&auto=format&fit=crop"
                        alt="Truck Maintenance Background"
                        className="absolute inset-0 w-full h-full object-cover transform scale-110 hover:scale-100 transition-transform duration-1000 opacity-40"
                    />

                    <div className="relative z-20 flex flex-col justify-between h-full p-12 text-white items-center text-center">
                        <div className="flex-1 flex flex-col justify-center">
                            {/* Main Title Overlay */}
                            <h1 className="text-4xl lg:text-5xl font-black tracking-tighter leading-[0.9] text-white mb-10 drop-shadow-2xl">
                                NEOSIAM<br />
                                LOGISTICS &<br />
                                TRANSPORT
                            </h1>

                            {/* SubTitle with Blue Accent */}
                            <div className="space-y-1 mb-10">
                                <h2 className="text-3xl font-bold text-white tracking-tight">ระบบบริหารจัดการ</h2>
                                <h3 className="text-4xl font-black text-blue-400 drop-shadow-[0_4px_12px_rgba(96,165,250,0.5)]">งานซ่อมบำรุงรถขนส่ง</h3>
                            </div>

                            {/* Detailed Description */}
                            <p className="text-slate-300 text-xs font-semibold leading-relaxed max-w-xs mx-auto opacity-80 uppercase tracking-wide">
                                บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด <br />
                                ผู้นำการขนส่งสินค้าระดับประเทศ
                            </p>
                        </div>

                        {/* Footer Rights & Links */}
                        <div className="pt-8 border-t border-white/10 w-full">
                            <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                                <span className="whitespace-nowrap">© Paweewat Phosanga 2025</span>
                                <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-600" />
                                <span className="hover:text-blue-400 cursor-pointer transition-colors whitespace-nowrap">Privacy Policy</span>
                                <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-600" />
                                <span className="hover:text-blue-400 cursor-pointer transition-colors whitespace-nowrap">Terms of Service</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: LOGIN FORM (Matched to Image #1) */}
                <div className="flex-1 p-8 md:p-14 bg-white relative flex flex-col justify-center">
                    {onClose && (
                        <button
                            onClick={onClose}
                            title="Close Login"
                            className="absolute top-8 right-8 p-2.5 rounded-full hover:bg-slate-50 text-slate-300 hover:text-slate-600 transition-all active:scale-90"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}

                    <div className="w-full">
                        <div className="text-center mb-10">
                            <div className="relative inline-block mb-6">
                                <img
                                    src="/logo.png"
                                    alt="Neosiam Logo"
                                    className="h-16 mx-auto object-contain drop-shadow-md"
                                />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Sign In (เข้าสู่ระบบ)</h3>
                            <p className="text-slate-400 text-sm mt-2 font-bold italic tracking-wide">Unlock Complete System Features</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-6">
                            {/* Role Select */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-[0.15em]">Username / Role</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-focus-within:text-blue-500 transition-colors">
                                        <User size={18} />
                                    </div>
                                    <select
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        title="Select User Role"
                                        className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-100 rounded-[1.25rem] text-slate-800 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all appearance-none cursor-pointer shadow-sm"
                                        required
                                    >
                                        <option value="" disabled>เลือกบทบาทผู้ใช้งาน...</option>
                                        <option value="manager">Super Admin / Manager</option>
                                        <option value="foreman">Service Advisor / Foreman</option>
                                        <option value="technician">Technician</option>
                                        <option value="inspector">Vehicle Inspector / เจ้าหน้าที่ตรวจเช็ค</option>
                                        <option value="driver">Driver</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Password Input */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-[0.15em]">Password</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-focus-within:text-blue-500 transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-12 pr-14 py-4 bg-slate-50 border border-slate-100 rounded-[1.25rem] text-slate-800 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all placeholder:text-slate-200 shadow-sm"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors p-1"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-[1.25rem] flex items-center gap-3 text-red-600 animate-shake text-xs font-black shadow-inner">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-black py-4.5 rounded-[1.25rem] shadow-xl shadow-indigo-500/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-3 text-sm uppercase tracking-[0.2em] mt-2 group"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Authentication...</span>
                                    </>
                                ) : (
                                    <>
                                        <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
                                        <span>Sign In</span>
                                    </>
                                )}
                            </button>

                            <div className="text-center pt-4">
                                <a href="#" className="text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-colors">
                                    Forgot Password? / Contact IT Admin
                                </a>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
