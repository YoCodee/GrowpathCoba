// src/app/scanner/page.tsx

"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; 
import { QrReader } from 'react-qr-reader';

// URL tujuan setelah pencatatan sukses
const REDIRECT_URL = 'https://utygrowpath.site';

export default function QRScannerPage() {
  const [data, setData] = useState('Arahkan kamera ke QR Code atau unggah gambar');
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(true);
  const [isImageProcessing, setIsImageProcessing] = useState(false); // State baru untuk unggah
  const router = useRouter();

  // Fungsi terpusat untuk mencatat kunjungan dan melakukan redirect
  const recordAndRedirect = async (qrData) => {
      // 1. Panggil API Route untuk mencatat kunjungan
      try {
        const response = await fetch('/api/record-visitor', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          // Gunakan data yang dipindai (dari kamera atau unggahan)
          body: JSON.stringify({ qr_code_data: qrData }), 
        });
        
        if (response.ok) {
          // 2. Jika pencatatan di API sukses, lakukan redirect
          console.log("Pencatatan sukses, mengarahkan ke halaman utama...");
          // Gunakan window.location.href untuk redirect keluar dari subdomain
          window.location.href = REDIRECT_URL; 
        } else {
          console.error("Gagal mencatat di API, tapi tetap redirect.");
          window.location.href = REDIRECT_URL;
        }

      } catch (e) {
        console.error("Fetch API error:", e);
        window.location.href = REDIRECT_URL;
      }
  };


  // Fungsi yang dipanggil ketika QR Code berhasil dipindai (dari kamera)
  const handleScan = async (result, error) => {
    if (!!result && isScanning) {
      // Menghentikan pemindaian setelah hasil pertama didapat
      setIsScanning(false); 
      setData(result.text);

      // Lakukan pencatatan dan redirect
      await recordAndRedirect(result.text);
    }

    if (!!error) {
      console.info(error);
    }
  };
  
  // Fungsi baru untuk menangani unggahan file gambar
  const handleImageUpload = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      setIsImageProcessing(true);
      setIsScanning(false);
      setData("Memproses gambar...");
      setError(null);

      const reader = new FileReader();
      reader.onload = async (e) => {
        
          
          const QR_DATA_STATIS = "http://localhost:3000/scanner"; 

    
          setData("Memproses gambar (Simulasi)...");
          await new Promise(resolve => setTimeout(resolve, 3000)); 
          
          
          setData("QR Ditemukan: " + QR_DATA_STATIS);
          await recordAndRedirect(QR_DATA_STATIS);
          
      };
      reader.readAsDataURL(file);
  }


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-6">Scan atau Unggah QR Code Pengunjung</h1>
      
     
      <div className="mb-6 w-full max-w-sm">
        <label htmlFor="qr-upload" className="block text-center bg-blue-600 text-white p-3 rounded-md cursor-pointer hover:bg-blue-700">
            {isImageProcessing ? 'Memproses...' : 'Unggah File QR Code (.png/.jpg) untuk Uji Coba'}
        </label>
        <input
            id="qr-upload"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={isImageProcessing}
            className="hidden" // Sembunyikan input file asli
        />
      </div>

      <div style={{ width: '100%', maxWidth: '400px' }} className="rounded-lg shadow-xl overflow-hidden">
        {(isScanning && !isImageProcessing) ? (
          <QrReader
            onResult={handleScan}
            constraints={{ facingMode: 'environment' }} // Gunakan kamera belakang
            style={{ width: '100%' }}
            videoStyle={{ objectFit: 'cover' }}
            scanDelay={300}
          />
        ) : (
          <div className={`p-8 text-center font-semibold ${isImageProcessing ? 'bg-yellow-500 text-black' : 'bg-gray-300 text-gray-700'}`}>
             {isImageProcessing ? 'Kamera dinonaktifkan. Menunggu pemrosesan gambar...' : 'Kamera dinonaktifkan/QR sudah dipindai.'}
          </div>
        )}
      </div>

      <p className="mt-4 text-gray-700">Status: {data}</p>
      {error && <p className="text-red-500 mt-2">Error Kamera: {error.name}</p>}
    </div>
  );
}