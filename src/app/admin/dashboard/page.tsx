"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase'; 

interface VisitorData {
  today: number | null;
  total: number | null;
}

export default function AdminDashboardPage() {
  const [visitorCount, setVisitorCount] = useState<VisitorData>({ today: null, total: null });
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState<string | null>(null);

  const fetchVisitorCounts = async () => {
    setError(null);
    
    // 1. Hitung Total Pengunjung Keseluruhan
    const { count: totalCount, error: totalError } = await supabase
      .from('visitors')
      .select('id', { count: 'exact', head: true });
      
    // --- DEBUGGING CONSOLE ---
    console.log("--- DEBUGGING SUPABASE FETCH ---");
    console.log("1. Total Count (Tanpa Filter Waktu):", totalCount);
    if (totalError) {
        console.error("1. Total Count Error:", totalError);
    }
    console.log("----------------------------------");
    // -------------------------
      
    if (totalError) {
      setError(`RLS/Fetch Error: ${totalError.message}`); // Menampilkan error RLS
      setLoading(false);
      return;
    }

    // 2. Hitung Total Pengunjung Hari Ini
    
    // Dapatkan tanggal hari ini (ISO String untuk filter GTE/LTE)
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    const { count: todayCount, error: todayError } = await supabase
      .from('visitors')
      .select('id', { count: 'exact', head: true })
      .gte('arrival_time', startOfDay) 
      .lte('arrival_time', endOfDay); 
      
    // --- DEBUGGING CONSOLE ---
    console.log("2. Today Count (Dengan Filter Waktu):", todayCount);
    if (todayError) {
        console.error("2. Today Count Error:", todayError);
    }
    console.log("----------------------------------");
    // -------------------------

    if (todayError) {
      setError(`Timezone/Filter Error: ${todayError.message}`);
      setLoading(false);
      return;
    }

    // 3. Update State
    setVisitorCount({
      total: totalCount,
      today: todayCount,
    });
    setLoading(false); 
  };

  useEffect(() => {
    fetchVisitorCounts();
  }, []); 

  // --- Rendering UI ---
  
  if (loading) {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold">Dashboard Admin</h1>
            <p className="mt-4">Memuat data visitor...</p>
        </div>
    );
  }

  if (error) {
    // Tampilan error lebih informatif
    return (
        <div className="p-8 bg-red-100 border border-red-400 text-red-700 rounded-lg p-4">
            <h1 className="text-3xl font-bold mb-4">Dashboard Admin: ERROR!</h1>
            <p className="font-semibold">Pesan Error:</p>
            <p className="break-all text-sm mt-2">{error}</p>
            <p className="mt-4 text-xs">SOLUSI: Masalah ini 90% adalah RLS/Izin. Pastikan Anda sudah login sebagai Admin dan RLS sudah diatur dengan benar pada tabel .</p>
        </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Dashboard Admin Growpath Cashflow</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card Pengunjung Hari Ini */}
        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-blue-500">
          <p className="text-sm font-semibold text-gray-500 uppercase">Pengunjung Hari Ini</p>
          <p className="text-5xl font-extrabold mt-1 text-blue-800">
            {visitorCount.today?.toLocaleString() ?? 0}
          </p>
        </div>

        {/* Card Total Pengunjung */}
        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-green-500">
          <p className="text-sm font-semibold text-gray-500 uppercase">Total Pengunjung (Keseluruhan)</p>
          <p className="text-5xl font-extrabold mt-1 text-green-800">
            {visitorCount.total?.toLocaleString() ?? 0}
          </p>
        </div>
        
      </div>
      
      {/* Tambahkan Tautan untuk Kelola Tenant di sini */}
    </div>
  );
}
