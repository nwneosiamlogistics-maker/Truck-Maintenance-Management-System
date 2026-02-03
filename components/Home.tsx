import React from 'react';
import { Shield, Lock, Truck, Wrench, BarChart3, Bell, Clock, ArrowRight } from 'lucide-react';

interface HomeProps {
    user: any;
    onLoginClick: () => void;
    onNavigate: (tab: any) => void;
}

const Home: React.FC<HomeProps> = ({ user, onLoginClick, onNavigate }) => {
    return (
        <div className="min-h-screen bg-slate-50 overflow-x-hidden">
            {/* Hero Section */}
            <header className="relative min-h-[90vh] lg:h-[80vh] flex items-center overflow-hidden py-20 lg:py-0">
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-gradient-to-b lg:bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900/40 z-10" />
                    <img
                        src="/artifacts/modern_truck_workshop_service_v2.png"
                        alt="Truck Workshop"
                        className="w-full h-full object-cover animate-slow-zoom"
                        onError={(e) => {
                            e.currentTarget.src = "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&q=80&w=2070";
                        }}
                    />
                </div>

                <div className="container mx-auto px-6 relative z-30">
                    <div className="max-w-3xl animate-fade-in-up pt-10 lg:pt-0">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-6 backdrop-blur-sm">
                            <Shield size={14} />
                            ระบบบริหารจัดการงานซ่อมบำรุงระดับมืออาชีพ
                        </div>
                        <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white leading-[1.1] mb-6 drop-shadow-2xl">
                            Smart Truck <br className="hidden md:block" />
                            <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent block md:inline mt-2 md:mt-0">Maintenance</span>
                        </h1>
                        <p className="text-base sm:text-xl text-slate-300 mb-10 leading-relaxed font-medium max-w-2xl drop-shadow-md">
                            ยกระดับการจัดการฟลีทรถบรรทุก ด้วยระบบตรวจสอบประสิทธิภาพอัตโนมัติ
                            ติดตามสถานะการซ่อมบำรุงแบบ Real-time และลดค่าใช้จ่ายที่ไม่จำเป็น
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                            {!user ? (
                                <button
                                    onClick={onLoginClick}
                                    className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex justify-center items-center gap-3"
                                >
                                    Login to Unlock System
                                    <ArrowRight size={20} />
                                </button>
                            ) : (
                                <button
                                    onClick={() => onNavigate('dashboard')}
                                    className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex justify-center items-center gap-3"
                                >
                                    เข้าสู่ Dashboard
                                    <ArrowRight size={20} />
                                </button>
                            )}
                            <button
                                onClick={() => user ? onNavigate('daily-checklist') : onLoginClick()}
                                className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl font-bold text-lg transition-all backdrop-blur-md flex justify-center items-center text-center"
                            >
                                รายการตรวจเช็ค (Checklist)
                            </button>
                        </div>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-slate-50 to-transparent z-20" />
            </header>

            {/* Showcase Section with Feature Masking (Layer 3) */}
            <section className="py-24 container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">ระบบที่พร้อมตอบโจทย์คุณทุกด้าน</h2>
                    <p className="text-slate-500 mt-2 font-medium">สัมผัสประสบการณ์การจัดการที่ง่ายและทรงพลัง</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Stat Card 1 */}
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Truck size={28} />
                        </div>
                        <h4 className="text-xl font-bold text-slate-800 mb-2">Fleet Monitoring</h4>
                        <p className="text-slate-500 text-sm mb-6 leading-relaxed">ข้อมูลสภาพรถบรรทุกรายคัน ตรวจสอบรายการอะไหล่และอายุการใช้งานอัตโนมัติ</p>

                        <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Trucks</p>
                                {user ? (
                                    <p className="text-2xl font-black text-slate-800">42 รายการ</p>
                                ) : (
                                    <div className="flex items-center gap-2 text-blue-600">
                                        <Lock size={16} />
                                        <span className="font-black text-xl italic uppercase">Locked</span>
                                    </div>
                                )}
                            </div>
                            <div className="h-10 w-24 bg-blue-100/50 rounded-lg animate-pulse" />
                        </div>
                    </div>

                    {/* Stat Card 2 */}
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Wrench size={28} />
                        </div>
                        <h4 className="text-xl font-bold text-slate-800 mb-2">Smart PM Planning</h4>
                        <p className="text-slate-500 text-sm mb-6 leading-relaxed">วางแผนการบำรุงรักษาเชิงป้องกันรายปีด้วยระบบอัจฉริยะ ล่วงหน้าได้แม่นยำ</p>

                        <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Repairs</p>
                                {user ? (
                                    <p className="text-2xl font-black text-slate-800">12 รายการ</p>
                                ) : (
                                    <div className="flex items-center gap-2 text-emerald-600">
                                        <Lock size={16} />
                                        <span className="font-black text-xl italic uppercase">Locked</span>
                                    </div>
                                )}
                            </div>
                            <div className="h-10 w-24 bg-emerald-100/50 rounded-lg animate-pulse" />
                        </div>
                    </div>

                    {/* Stat Card 3 */}
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <BarChart3 size={28} />
                        </div>
                        <h4 className="text-xl font-bold text-slate-800 mb-2">Fuel Analytics</h4>
                        <p className="text-slate-500 text-sm mb-6 leading-relaxed">วิเคราะห์อัตราสิ้นเปลืองน้ำมันเชื้อเพลิงแบบเจาะลึก รายคนขับและรายเส้นทาง</p>

                        <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fuel Efficiency</p>
                                {user ? (
                                    <p className="text-2xl font-black text-slate-800">3.8 กม./ลิตร</p>
                                ) : (
                                    <div className="flex items-center gap-2 text-amber-600">
                                        <Lock size={16} />
                                        <span className="font-black text-xl italic uppercase">Locked</span>
                                    </div>
                                )}
                            </div>
                            <div className="h-10 w-24 bg-amber-100/50 rounded-lg animate-pulse" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature Teasers */}
            <section className="bg-slate-900 overflow-hidden relative border-y border-slate-800">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-500/5 blur-[120px] rounded-full -mr-64" />
                <div className="container mx-auto px-6 py-16 lg:py-24 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                        <div>
                            <h3 className="text-3xl lg:text-4xl font-black text-white mb-8 text-center lg:text-left">ทำไมถึงต้องเลือกระบบของเรา?</h3>
                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <div className="mt-1 w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                                        <Bell size={20} />
                                    </div>
                                    <div>
                                        <h5 className="text-lg font-bold text-slate-100">ระบบแจ้งเตือนอัจฉริยะ</h5>
                                        <p className="text-slate-400 text-sm mt-1">เตือนเมื่อถึงกำหนดเปลี่ยนถ่ายน้ำมันเครื่อง ประกันภัย หรือใบขับขี่ที่กำลังจะหมดอายุ</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="mt-1 w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                                        <Clock size={20} />
                                    </div>
                                    <div>
                                        <h5 className="text-lg font-bold text-slate-100">บันทึกประวัติ 100%</h5>
                                        <p className="text-slate-400 text-sm mt-1">เก็บบันทึกประวัติการซ่อมบำรุงทุกรายการ เพื่อการวิเคราะห์ TCO (Total Cost of Ownership)</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="mt-1 w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                                        <Shield size={20} />
                                    </div>
                                    <div>
                                        <h5 className="text-lg font-bold text-slate-100">ความปลอดภัยสูงสุด</h5>
                                        <p className="text-slate-400 text-sm mt-1">จัดการคะแนนพฤติกรรมการขับขี่ (Safety Score) เพื่อลดอุบัติเหตุและเพิ่มความปลอดภัย</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="relative">
                            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[3rem] p-2 border border-slate-700 shadow-2xl relative z-10">
                                <img
                                    src="/artifacts/fleet_management_dashboard_preview.png"
                                    className="rounded-[2.5rem] w-full shadow-inner opacity-60 grayscale hover:grayscale-0 transition-all duration-700 hover:opacity-100"
                                    alt="Dashboard Preview"
                                    onError={(e) => {
                                        e.currentTarget.src = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2070";
                                    }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-slate-900/80 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 flex items-center gap-4">
                                        <Lock className="text-amber-500" />
                                        <span className="text-white font-bold uppercase tracking-widest text-sm">Preview only. Login to view data.</span>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
                            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-slate-200">
                <div className="container mx-auto px-6 text-center">
                    <p className="text-slate-400 text-sm">© 2026 NW Neosiam Logistics. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default Home;
