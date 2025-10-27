// src/app/api/record-visitor/route.js

import { supabase } from '../../../../lib/supabase'; // Sesuaikan path jika perlu

// Fungsi ini akan menangani permintaan POST dari halaman scanner
export async function POST(req) {
  
  // Karena kita menggunakan App Router, kita tidak menggunakan res.status(200).json
  // tetapi menggunakan objek Response dari Next.js/Web Standard API
  
  try {
    // Mencatat kunjungan di tabel 'visitors'
    const { error } = await supabase
      .from('visitors')
      .insert([ 
          { 
              arrival_time: new Date().toISOString()
          } 
      ]); 
      
    if (error) {
      console.error('Supabase Error:', error.message);
      // Log error, tapi tetap berikan response sukses ke client agar client redirect.
      return Response.json({ message: 'Kunjungan dicatat dengan error Supabase' }, { status: 200 });
    }

    // Jika berhasil, kirim respons 200 OK
    return Response.json({ message: 'Kunjungan berhasil dicatat' }, { status: 200 });

  } catch (error) {
    console.error('General Server Error:', error.message);
    return Response.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// Tambahkan handler untuk method lain (misalnya GET) agar tidak ada error 405
export async function GET(req) {
  return Response.json({ message: 'Method Not Allowed' }, { status: 405 });
}