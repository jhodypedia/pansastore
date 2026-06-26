export async function register() {
  // Next.js memiliki dua environment: Node.js dan Edge.
  // Bot Baileys butuh akses file system (fs) untuk menyimpan sesi, 
  // jadi kita pastikan bot HANYA berjalan di environment Node.js.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    
    // Kita gunakan Dynamic Import agar tidak mengganggu proses build
    const { startWhatsAppBot } = await import('./lib/whatsapp'); // Sesuaikan path ini jika lib kamu ada di dalam folder src: './src/lib/whatsapp'
    
    console.log('\n=============================================');
    console.log('⚡ MENGINISIALISASI SISTEM PANSA GROUP ⚡');
    console.log('=============================================');
    
    // Nyalakan bot WhatsApp
    startWhatsAppBot();
  }
}
