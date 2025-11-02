"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/authProvider'; // Gunakan AuthContext

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const { role } = useAuth(); 
  const router = useRouter();


  useEffect(() => {
    if (role === 'admin') {
      router.push('/admin/dashboard');
    } else if (role === 'tenant') {
      router.push('/tenant/dashboard');
    }
  }, [role, router]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      setMessage(`Login gagal: ${error.message}`);
    } 

    setLoading(false);
  };

  if (role) {
    // Tampilkan loading saat redirect
    return <div className="min-h-screen flex items-center justify-center">Mengalihkan...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-3xl font-extrabold text-center text-gray-900 mb-6">
          Login Cashflow Growpath
        </h2>
        
        <form onSubmit={handleLogin} className="space-y-6">
          
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-black">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="admin@contoh.com atau tenant@contoh.com"
            />
          </div>

          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-black">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Minimal 6 karakter"
            />
          </div>

          {/* Tombol Login */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
            >
              {loading ? 'Memuat...' : 'Login'}
            </button>
          </div>
          
          {/* Pesan Error/Sukses */}
          {message && (
            <p className={`text-center text-sm font-medium ${message.includes('gagal') ? 'text-red-600' : 'text-green-600'}`}>
              {message}
            </p>
          )}

        </form>
      </div>
    </div>
  );
}
