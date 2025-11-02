"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
// html5-qrcode
import {
  Html5Qrcode,
  Html5QrcodeScanner,
  Html5QrcodeSupportedFormats,
} from "html5-qrcode";

const REDIRECT_URL = "https://utygrowpath.site";
const QR_SCANNER_ID = "qr-code-full-region";

export default function QRScannerPage() {
  const [data, setData] = useState("Arahkan kamera ke QR Code atau unggah gambar");
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const router = useRouter();

  // record and redirect (centralized)
  const recordAndRedirect = async (qrData: string) => {
    // prevent double triggers
    setIsScanning(false);
    setIsImageProcessing(true);
    setData("Mencatat kunjungan ke server...");

    // try to clear scanner UI if exists
    if (scannerRef.current) {
      try {
        await scannerRef.current.clear();
      } catch (e) {
        // clear mungkin sudah selesai atau gagal; lanjutkan saja
        console.warn("Gagal clear scanner (tidak kritis):", e);
      }
      scannerRef.current = null;
    }

    try {
      const response = await fetch("/api/record-visitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_code_data: qrData }),
      });

      if (response.ok) {
        // sukses -> redirect
        window.location.href = REDIRECT_URL;
      } else {
        console.error("Gagal mencatat di API. Status:", response.status);
        setData(`Gagal mencatat: ${response.status}. Mengarahkan...`);
        // tetap redirect sesuai logika awal
        setTimeout(() => (window.location.href = REDIRECT_URL), 1200);
      }
    } catch (e) {
      console.error("Fetch API error:", e);
      setData("Error koneksi API. Mengarahkan...");
      setTimeout(() => (window.location.href = REDIRECT_URL), 1200);
    } finally {
      setIsImageProcessing(false);
    }
  };

  // dipanggil saat kamera berhasil decode
  const onScanSuccess = (decodedText: string) => {
    // hindari pemanggilan berulang
    if (!isScanning) return;
    setIsScanning(false); // block further scans immediately
    setData("QR Ditemukan: " + decodedText);
    recordAndRedirect(decodedText);
  };

  const onScanError = (_errorMessage: string) => {
    // non-fatal scan errors — diabaikan supaya console tidak berantakan
    // console.debug(_errorMessage);
  };

  // inisialisasi scanner kamera
  useEffect(() => {
    let mounted = true;

    const initScanner = async () => {
      if (!isScanning) return;
      if (scannerRef.current) return;

      try {
        const scanner = new Html5QrcodeScanner(
          QR_SCANNER_ID,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: true,
            disableFlip: false,
            // supportedFormats: [Html5QrcodeSupportedFormats.QR_CODE], // optional
          },
          false
        );

        // simpan instance
        scannerRef.current = scanner;

        // render with callbacks
        scanner.render(onScanSuccess, onScanError);
      } catch (err) {
        console.error("Error inisialisasi scanner:", err);
        if (!mounted) return;
        setError("Gagal menginisialisasi kamera. Pastikan izin kamera diberikan.");
        setIsScanning(false);
      }
    };

    initScanner();

    // cleanup saat unmount atau ketika kita clear scanner
    return () => {
      mounted = false;
      if (scannerRef.current) {
        // clear() menghapus UI dan menghentikan camera
        scannerRef.current
          .clear()
          .catch((e) => console.warn("Error saat clear scanner di cleanup:", e))
          .finally(() => {
            scannerRef.current = null;
          });
      }
    };
    // hanya bergantung pada isScanning agar re-init ketika kita ingin menyalakan ulang
  }, [isScanning]);

  // handler upload gambar
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsImageProcessing(true);
    setIsScanning(false);
    setData("Memproses gambar...");

    // clear camera scanner jika aktif
    if (scannerRef.current) {
      try {
        await scannerRef.current.clear();
      } catch (e) {
        console.warn("Error menghentikan scanner saat upload:", e);
      } finally {
        scannerRef.current = null;
      }
    }

    // gunakan Html5Qrcode untuk scan dari file
    // perlu element id walau kita tidak menampilkan preview; gunakan id yang sama
    const html5QrCode = new Html5Qrcode(QR_SCANNER_ID);

    try {
      const decodedText = await html5QrCode.scanFile(file, /* showImage= */ true);
      setData("QR Ditemukan dari gambar: " + decodedText);
      await recordAndRedirect(decodedText);
    } catch (err) {
      console.error("Gagal memindai gambar:", err);
      setData("Gagal memindai gambar QR. Coba lagi.");
      setIsImageProcessing(false);
      scannerRef.current = null;
      setTimeout(() => setIsScanning(true), 300); // kecil delay supaya re-init beres
    } finally {
      // kosongkan input agar file yang sama bisa diunggah lagi
      event.target.value = "";
      try {
        await html5QrCode.clear(); // clear internal resources
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-6">Scan atau Unggah QR Code Pengunjung</h1>

      <div className="mb-6 w-full max-w-sm">
        <label
          htmlFor="qr-upload"
          className="block text-center bg-blue-600 text-white p-3 rounded-md cursor-pointer hover:bg-blue-700 disabled:bg-blue-400"
        >
          {isImageProcessing ? "Memproses..." : "Unggah File QR Code (.png/.jpg)"}
        </label>
        <input
          id="qr-upload"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          disabled={isImageProcessing}
          className="hidden"
        />
      </div>

      <div style={{ width: "100%", maxWidth: "400px" }} className="rounded-lg shadow-xl overflow-hidden">
        <div id={QR_SCANNER_ID} className={`${isScanning && !isImageProcessing ? "" : "hidden"}`}>
          {/* Scanner akan di-inject ke div ini oleh Html5QrcodeScanner */}
        </div>

        {(!isScanning || isImageProcessing) && (
          <div className={`p-8 text-center font-semibold ${isImageProcessing ? "bg-yellow-500 text-black" : "bg-gray-300 text-gray-700"}`}>
            {isImageProcessing ? "Memproses pencatatan dan redirect..." : "Kamera dinonaktifkan/QR sudah dipindai."}
          </div>
        )}
      </div>

      <p className="mt-4 text-gray-700">Status: {data}</p>
      {error && <p className="text-red-500 mt-2">Error: {error}</p>}
    </div>
  );
}
