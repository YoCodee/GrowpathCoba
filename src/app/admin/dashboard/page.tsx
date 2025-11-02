"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '@/lib/auth/authProvider';
import { useRouter } from 'next/navigation';

// --- Tipe Data ---
interface VisitorData {
    today: number | null;
    total: number | null;
}

interface Tenant {
    id: number;
    store_name: string;
    user_id: string;
    created_at: string;
}

interface GlobalSummary {
    totalIncome: number;
    totalExpense: number;
    netCash: number;
}

// --- Komponen Admin Dashboard Utama ---
export default function AdminDashboardPage() {
    const { user, role, loading: authLoading, signOut } = useAuth();
    const [activeTab, setActiveTab] = useState('summary'); // State untuk navigasi: 'summary', 'tenants', 'global_report'
    const [visitorCount, setVisitorCount] = useState<VisitorData>({ today: null, total: null });
    const [dataLoading, setDataLoading] = useState(true); 
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const userEmail = user?.email || 'Admin';

    // *** LOGIC PROTEKSI RUTE ***
    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.push('/login');
            } else if (role !== 'admin') {
                router.push('/tenant/dashboard'); 
            }
        }
    }, [user, role, authLoading, router]);
    // **************************

    // --- Fetch Data Visitor ---
    const fetchVisitorCounts = async () => {
        if (role !== 'admin') return; 
        setError(null);
        
        // 1. Hitung Total Pengunjung Keseluruhan
        const { count: totalCount, error: totalError } = await supabase
            .from('visitors')
            .select('id', { count: 'exact', head: true });
            
        if (totalError) {
            setError(`RLS/Fetch Error Total: ${totalError.message}`);
            setDataLoading(false);
            return;
        }
        
        // 2. Hitung Total Pengunjung Hari Ini
        const today = new Date();
        // Penting: Pastikan Supabase DB dan server Anda memiliki Timezone yang sinkron
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        const { count: todayCount, error: todayError } = await supabase
            .from('visitors')
            .select('id', { count: 'exact', head: true })
            .gte('arrival_time', startOfDay)
            .lte('arrival_time', endOfDay);

        if (todayError) {
            setError(`RLS/Fetch Error Today: ${todayError.message}`);
            setDataLoading(false);
            return;
        }

        setVisitorCount({ total: totalCount, today: todayCount });
        setDataLoading(false); 
    };

    useEffect(() => {
        if (role === 'admin') {
            fetchVisitorCounts();
        }
    }, [role]); 


    if (authLoading || (user && role !== 'admin')) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-100">Memverifikasi Izin...</div>;
    }
    
    // Tampilkan loading data hanya untuk tab summary
    if (dataLoading && activeTab === 'summary') {
        return (
            <div className="p-8">
                <h1 className="text-3xl font-bold">Dashboard Admin</h1>
                <p className="mt-4">Memuat data visitor...</p>
            </div>
        );
    }
    
    // Tampilkan error (biasanya RLS error pada tabel 'visitors')
    if (error) {
        return (
            <div className="p-8 bg-red-100 border border-red-400 text-red-700 rounded-lg p-4">
                <h1 className="text-3xl font-bold mb-4">Dashboard Admin: ERROR!</h1>
                <p className="font-semibold">Pesan Error Supabase:</p>
                <p className="break-all text-sm mt-2">{error}</p>
                <p className="mt-4 text-xs">SOLUSI: Masalah ini 90% adalah RLS/Izin. Pastikan RLS sudah diatur dengan benar pada tabel **'visitors'** agar Admin bisa membacanya.</p>
            </div>
        );
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'summary':
                // Menggunakan komponen DashboardSummary (di bawah)
                return <DashboardSummary visitorCount={visitorCount} userEmail={userEmail} signOut={signOut} fetchVisitorCounts={fetchVisitorCounts} />;
            case 'tenants':
                return <TenantManagement />;
            case 'global_report':
                return <GlobalCashflowReport />;
            default:
                return <DashboardSummary visitorCount={visitorCount} userEmail={userEmail} signOut={signOut} fetchVisitorCounts={fetchVisitorCounts} />;
        }
    }

    return (
        <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
            {/* Header dan Navigasi */}
            <div className="flex justify-between items-center pb-4 border-b">
                <h1 className="text-3xl font-bold text-gray-800">Halo, Admin! ({userEmail})</h1>
                <button 
                    onClick={signOut}
                    className="py-2 px-4 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition-colors font-semibold"
                >
                    🚪 Logout
                </button>
            </div>
            
            {/* Navigasi Tab */}
            <div className="flex space-x-2 border-b pb-2">
                <button
                    onClick={() => setActiveTab('summary')}
                    className={`py-2 px-4 rounded-t-lg font-semibold transition-colors ${activeTab === 'summary' ? 'bg-white border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    🏠 Ringkasan & Visitor
                </button>
                <button
                    onClick={() => setActiveTab('tenants')}
                    className={`py-2 px-4 rounded-t-lg font-semibold transition-colors ${activeTab === 'tenants' ? 'bg-white border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    👥 Kelola Tenant
                </button>
                <button
                    onClick={() => setActiveTab('global_report')}
                    className={`py-2 px-4 rounded-t-lg font-semibold transition-colors ${activeTab === 'global_report' ? 'bg-white border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    💰 Laporan Cashflow Global
                </button>
            </div>
            
            {/* Konten Aktif */}
            <div className="bg-white p-6 rounded-lg shadow-xl">
                {renderContent()}
            </div>
        </div>
    );
}

// =======================================================
// --- KOMPONEN TURUNAN ---
// =======================================================

// --- Komponen 1: Ringkasan & Visitor (Awal) ---
const DashboardSummary = ({ visitorCount, userEmail, signOut, fetchVisitorCounts }) => {
    return (
        <>
            <h2 className="text-2xl font-semibold mb-4">Statistik Pengunjung & Aksi Cepat</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Card Pengunjung Hari Ini */}
                <div className="bg-blue-50 p-6 rounded-lg shadow border-l-4 border-blue-500">
                    <p className="text-sm font-semibold text-gray-500 uppercase">Pengunjung Hari Ini</p>
                    <p className="text-5xl font-extrabold mt-1 text-blue-800">
                        {visitorCount.today?.toLocaleString() ?? 0}
                    </p>
                    <button onClick={fetchVisitorCounts} className="mt-2 text-blue-500 hover:underline text-xs">
                        Refresh Data
                    </button>
                </div>

                {/* Card Total Pengunjung */}
                <div className="bg-green-50 p-6 rounded-lg shadow border-l-4 border-green-500">
                    <p className="text-sm font-semibold text-gray-500 uppercase">Total Pengunjung</p>
                    <p className="text-5xl font-extrabold mt-1 text-green-800">
                        {visitorCount.total?.toLocaleString() ?? 0}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">Data keseluruhan.</p>
                </div>
                
                {/* Placeholder Aksi Cepat */}
                <div className="bg-yellow-50 p-6 rounded-lg shadow border-l-4 border-yellow-500">
                    <p className="text-sm font-semibold text-gray-500 uppercase">Aksi Cepat</p>
                    <p className="text-lg font-semibold mt-2">
                        Pilih tab untuk Kelola Tenant atau lihat Laporan Global.
                    </p>
                </div>
            </div>
        </>
    );
};

// --- Komponen 2: Kelola Daftar Tenant ---
// --- Komponen 2: Kelola Daftar Tenant (DENGAN CASHFLOW) ---

interface TenantWithSummary extends Tenant {
    total_income: number;
    total_expense: number;
    net_cash: number;
    cashflow_loading: boolean;
    cashflow_error: string | null;
}

const TenantManagement = () => {
    const [tenants, setTenants] = useState<TenantWithSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fungsi untuk mengambil cashflow global satu Tenant
    const fetchTenantCashflow = async (tenantId: number): Promise<{ income: number, expense: number, error: string | null }> => {
        
        // Ambil semua transaksi (income dan expense) untuk tenant spesifik ini
        const { data, error } = await supabase
            .from('transactions')
            .select('amount, type')
            .eq('tenant_id', tenantId);

        if (error) {
            return { income: 0, expense: 0, error: error.message };
        }

        let totalIncome = 0;
        let totalExpense = 0;

        data.forEach(tx => {
            if (tx.type === 'income') {
                totalIncome += tx.amount;
            } else if (tx.type === 'expense') {
                totalExpense += tx.amount;
            }
        });

        return { income: totalIncome, expense: totalExpense, error: null };
    };


    const fetchTenants = async () => {
        setLoading(true);
        setError(null);

        // 1. Ambil semua data tenant
        const { data: tenantData, error: tenantError } = await supabase
            .from('tenants')
            .select('*')
            .order('created_at', { ascending: false });

        if (tenantError) {
            console.error('Error fetching tenants:', tenantError);
            setError(`Gagal memuat daftar tenant: ${tenantError.message}`);
            setLoading(false);
            return;
        }

        const initialTenants = tenantData.map(t => ({
            ...t,
            total_income: 0,
            total_expense: 0,
            net_cash: 0,
            cashflow_loading: true,
            cashflow_error: null,
        })) as TenantWithSummary[];

        setTenants(initialTenants);
        
        // 2. Ambil data cashflow secara paralel (lebih cepat)
        const cashflowPromises = initialTenants.map(t => fetchTenantCashflow(t.id));
        const cashflowResults = await Promise.all(cashflowPromises);

        // 3. Gabungkan hasil cashflow ke data tenant
        const finalTenants = initialTenants.map((t, index) => {
            const result = cashflowResults[index];
            return {
                ...t,
                total_income: result.income,
                total_expense: result.expense,
                net_cash: result.income - result.expense,
                cashflow_loading: false,
                cashflow_error: result.error,
            };
        });

        setTenants(finalTenants);
        setLoading(false);
    };

    useEffect(() => {
        fetchTenants();
    }, []);

    const formatRupiah = (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`;

    if (loading) return <div className="p-4 text-center">Memuat daftar tenant dan ringkasan cashflow...</div>;
    if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

    return (
        <>
            <h2 className="text-2xl font-semibold mb-4">Daftar Tenant Aktif ({tenants.length})</h2>
            
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                    <thead className="bg-gray-100 sticky top-0">
                        <tr>
                            <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">ID</th>
                            <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Nama Toko</th>
                            <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Pemasukan (Total)</th>
                            <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Pengeluaran (Total)</th>
                            <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">**SALDO BERSIH**</th>
                            <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Bergabung Sejak</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tenants.map((tenant) => (
                            <tr key={tenant.id} className="hover:bg-gray-50">
                                <td className="py-2 px-4 border-b text-sm text-gray-800">{tenant.id}</td>
                                <td className="py-2 px-4 border-b font-semibold text-sm text-gray-800">{tenant.store_name}</td>
                                
                                {/* Kolom Cashflow */}
                                <td className="py-2 px-4 border-b text-sm font-medium text-green-700">
                                    {tenant.cashflow_loading ? '...' : formatRupiah(tenant.total_income)}
                                </td>
                                <td className="py-2 px-4 border-b text-sm font-medium text-red-700">
                                    {tenant.cashflow_loading ? '...' : formatRupiah(tenant.total_expense)}
                                </td>
                                <td className="py-2 px-4 border-b text-sm font-extrabold text-blue-700">
                                    {tenant.cashflow_loading ? '...' : formatRupiah(tenant.net_cash)}
                                </td>
                                
                                <td className="py-2 px-4 border-b text-sm text-gray-600">
                                    {new Date(tenant.created_at).toLocaleDateString('id-ID')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {tenants.length === 0 && !loading && (
                <p className="mt-4 text-gray-500">Belum ada tenant yang terdaftar.</p>
            )}
        </>
    );
};

// --- Komponen 3: Laporan Cashflow Global ---
const GlobalCashflowReport = () => {
    const [summary, setSummary] = useState<GlobalSummary>({ totalIncome: 0, totalExpense: 0, netCash: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchGlobalCashflow = async () => {
        setLoading(true);
        setError(null);

        // Mengambil semua data transaksi dari SEMUA tenant
        const { data, error } = await supabase
            .from('transactions')
            .select('amount, type');

        if (error) {
            console.error('Error fetching global transactions:', error);
            setError(`Gagal memuat laporan global: ${error.message}`);
            setLoading(false);
            return;
        }

        let totalIncome = 0;
        let totalExpense = 0;

        data.forEach(tx => {
            if (tx.type === 'income') {
                totalIncome += tx.amount;
            } else if (tx.type === 'expense') {
                totalExpense += tx.amount;
            }
        });

        setSummary({
            totalIncome,
            totalExpense,
            netCash: totalIncome - totalExpense,
        });
        setLoading(false);
    };

    useEffect(() => {
        fetchGlobalCashflow();
    }, []);

    const formatRupiah = (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`;

    if (loading) return <div className="p-4">Memuat Laporan Cashflow Global...</div>;
    if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

    return (
        <>
            <h2 className="text-2xl font-semibold mb-6">Ringkasan Cashflow Seluruh Tenant 🌍</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Total Pemasukan Global */}
                <div className="bg-green-100 p-6 rounded-lg shadow-md border-l-4 border-green-600">
                    <p className="text-sm font-semibold text-green-700 uppercase">Total Pemasukan (Global)</p>
                    <p className="text-3xl font-extrabold mt-1 text-green-800">
                        {formatRupiah(summary.totalIncome)}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Kumulatif semua penjualan dari semua tenant.</p>
                </div>

                {/* Total Pengeluaran Global */}
                <div className="bg-red-100 p-6 rounded-lg shadow-md border-l-4 border-red-600">
                    <p className="text-sm font-semibold text-red-700 uppercase">Total Pengeluaran (Global)</p>
                    <p className="text-3xl font-extrabold mt-1 text-red-800">
                        {formatRupiah(summary.totalExpense)}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Kumulatif semua biaya dari semua tenant.</p>
                </div>

                {/* Saldo Bersih Global */}
                <div className="bg-blue-100 p-6 rounded-lg shadow-md border-l-4 border-blue-600">
                    <p className="text-sm font-semibold text-blue-700 uppercase">Net Cash Global</p>
                    <p className="text-3xl font-extrabold mt-1 text-blue-800">
                        {formatRupiah(summary.netCash)}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Pemasukan dikurangi Pengeluaran.</p>
                </div>
            </div>
            
            {summary.totalIncome === 0 && summary.totalExpense === 0 && !loading && (
                <p className="mt-6 text-gray-500">Belum ada data transaksi tercatat dari semua tenant.</p>
            )}
        </>
    );
};