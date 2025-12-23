import React, { useState } from 'react';
import { Truck, Lock, User, Eye, EyeOff, LogIn } from 'lucide-react';

interface LoginProps {
    onLogin: (role: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simulate network delay
        setTimeout(() => {
            if (password === '1234') {
                // Determine role based on username/selection or default to 'admin'
                // For this demo, we can just pass 'admin' or whatever the username is.
                // If the user wants specific roles mapping, we can add it later.
                onLogin('admin');
            } else {
                setError('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่');
                setIsLoading(false);
            }
        }, 800);
    };

    return (
        <div className="flex h-screen w-full bg-slate-50">
            {/* Left Side - Image & Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 to-blue-900/40 z-10" />
                <img
                    src="https://images.unsplash.com/photo-1586191582156-ceda08a956c3?q=80&w=2940&auto=format&fit=crop"
                    alt="Truck Maintenance"
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="relative z-20 flex flex-col justify-between h-full p-16 text-white items-center text-center">
                    <div>
                        <div className="mb-10">
                            <h1 className="text-4xl lg:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-blue-100 to-blue-400 drop-shadow-2xl leading-none">
                                NEOSIAM<br />LOGISTICS & TRANSPORT
                            </h1>
                        </div>
                        <h2 className="text-5xl font-bold leading-tight mb-6">
                            ระบบบริหารจัดการ<br />
                            <span className="text-blue-400">งานซ่อมบำรุงรถขนส่ง</span>
                        </h2>
                        <p className="text-slate-300 text-lg max-w-md leading-relaxed">
                            บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด ผู้นำการขนส่งสินค้าระดับประเทศ
                        </p>
                    </div>
                    <div className="flex gap-4 text-sm text-slate-400 font-medium">
                        <span>© Paweewat Phosanga 2025</span>
                        <span>•</span>
                        <span>Privacy Policy</span>
                        <span>•</span>
                        <span>Terms of Service</span>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-24 bg-white relative">
                <div className="w-full max-w-md">
                    <div className="text-center mb-10">
                        <img
                            src="/logo.png"
                            alt="Company Logo"
                            className="h-20 mx-auto mb-6 object-contain"
                        />
                        <h3 className="text-2xl font-bold text-slate-800">เข้าสู่ระบบ (Sign In)</h3>
                        <p className="text-slate-500 mt-2">กรุณากรอกข้อมูลเพื่อเข้าใช้งาน</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">ชื่อผู้ใช้งาน (Username) / บทบาท</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                <select
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                    required
                                    aria-label="เลือกชื่อผู้ใช้งานและบทบาท"
                                >
                                    <option value="" disabled>เลือกบทบาทผู้ใช้งาน...</option>
                                    <option value="manager">Super Admin / Manager (ผู้จัดการ/เจ้าของ)</option>
                                    <option value="foreman">Service Advisor / Foreman (หัวหน้าช่าง/ธุรการ)</option>
                                    <option value="technician">Technician (ช่างซ่อมหน้างาน)</option>
                                    <option value="driver">Driver (พนักงานขับรถ)</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between ml-1">
                                <label className="text-sm font-bold text-slate-700">รหัสผ่าน (Password)</label>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-shake">
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                <span className="text-sm font-medium">{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>กำลังเข้าสู่ระบบ...</span>
                                </>
                            ) : (
                                <>
                                    <LogIn size={20} />
                                    <span>เข้าสู่ระบบ</span>
                                </>
                            )}
                        </button>

                        <div className="text-center">
                            <a href="#" className="text-sm font-semibold text-slate-400 hover:text-blue-600 transition-colors">ลืมรหัสผ่าน? / ติดต่อผู้ดูแลระบบ</a>
                        </div>
                    </form>
                </div>

                {/* Footer for mobile/tablet */}
                <div className="absolute bottom-6 text-center text-xs text-slate-300 lg:hidden">
                    © Paweewat Phosanga 2025 Maintenance System
                </div>
            </div>
        </div>
    );
};

export default Login;
