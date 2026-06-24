import { makeWASocket, useMultiFileAuthState, DisconnectReason } from 'baileys';
import { Boom } from '@hapi/boom';
import path from 'path';

// ==========================================
// 1. TAMBAHKAN DEKLARASI GLOBAL INI (OBAT ERROR MERAH)
// ==========================================
declare global {
  var waStatus: string;
  var waQrCode: string;
  var waSocket: any;
}

// ==========================================
// 2. INISIALISASI VARIABEL GLOBAL (Aman dari peringatan Next.js HMR)
// ==========================================
global.waStatus = global.waStatus || 'DISCONNECTED';
global.waQrCode = global.waQrCode || '';
global.waSocket = global.waSocket || null;

export async function startWhatsAppBot() {
  if (global.waStatus === 'CONNECTED' || global.waStatus === 'CONNECTING') return;
  global.waStatus = 'CONNECTING';

  const authFolder = path.join(process.cwd(), 'wa_auth_session');
  const { state, saveCreds } = await useMultiFileAuthState(authFolder);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: ['PANSA GROUP', 'Chrome', '1.0.0'],
  });

  global.waSocket = sock;

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      global.waQrCode = qr; 
      global.waStatus = 'QR_READY';
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      global.waStatus = 'DISCONNECTED';
      global.waQrCode = '';
      if (shouldReconnect) startWhatsAppBot();
    } else if (connection === 'open') {
      global.waStatus = 'CONNECTED';
      global.waQrCode = '';
      console.log('✅ WHATSAPP OTP Berhasil Terkoneksi!');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
    const sender = msg.key.remoteJid;

    if (text?.toLowerCase() === 'ping') {
      await sock.sendMessage(sender!, { text: 'Sistem WHATSAPP OTP berjalan dengan baik.' });
    }
  });
}

export async function sendWhatsAppMessage(phone: string, message: string) {
  if (global.waStatus !== 'CONNECTED' || !global.waSocket) return false;
  
  let formattedPhone = phone.startsWith('0') ? '62' + phone.slice(1) : phone;
  const jid = `${formattedPhone}@s.whatsapp.net`;
  
  try {
    await global.waSocket.sendMessage(jid, { text: message });
    return true;
  } catch (error) {
    return false;
  }
}

// ==========================================
// TEMPLATE PESAN WHATSAPP SUPER PREMIUM
// ==========================================
export const WATemplates = {
  // 1. Pesan saat pelanggan selesai membuat pesanan (Belum Bayar)
  invoiceCreated: (invoiceId: string, productName: string, targetId: string, price: string, paymentUrl: string) => `
*INVOICE PANSASTORE* 🟢
━━━━━━━━━━━━━━━━━━━━
Halo Kak! Terima kasih telah berbelanja di *PansaStore*. Pesanan Anda telah kami catat dengan rincian:

🧾 *No. Invoice:* ${invoiceId}
📦 *Produk:* ${productName}
🎮 *ID Tujuan:* ${targetId}
💰 *Total Tagihan:* Rp ${price}
⏱️ *Status:* MENUNGGU PEMBAYARAN

🔗 *Link Pembayaran (Klik di bawah ini):*
${paymentUrl}

_Harap segera selesaikan pembayaran agar pesanan dapat diproses secara otomatis oleh sistem 24/7 kami._

Terima kasih,
*PansaGroup Labs* ⚡
`,

  // 2. Pesan saat pembayaran berhasil diterima (Sistem sedang Order ke Premify)
  orderProcessing: (invoiceId: string, productName: string) => `
*PEMBAYARAN DITERIMA* 🚀
━━━━━━━━━━━━━━━━━━━━
Hore! Pembayaran untuk pesanan *${invoiceId}* telah berhasil dikonfirmasi.

📦 *Item:* ${productName}
⚙️ *Status:* SEDANG DIPROSES

Sistem kami sedang memproses pengiriman produk ke akun Anda. Proses ini biasanya memakan waktu 1-3 menit. Mohon ditunggu ya kak!

*PansaStore Auto-System* 🤖
`,

  // 3. Pesan saat API Premify menyatakan sukses (Selesai)
  orderCompleted: (invoiceId: string, productName: string, targetId: string) => `
*PESANAN SELESAI!* 🎉
━━━━━━━━━━━━━━━━━━━━
Yeaay! Pesanan Anda telah berhasil dikirimkan.

🧾 *No. Invoice:* ${invoiceId}
📦 *Produk:* ${productName}
🎮 *ID Tujuan:* ${targetId}
✅ *Status:* BERHASIL / SUCCESS

Silakan cek akun/game Anda sekarang. Jika pesanan belum masuk dalam 10 menit, jangan ragu untuk membalas pesan ini untuk menghubungi Admin.

Terima kasih telah mempercayakan *PansaStore*. Ditunggu orderan selanjutnya! 💚
`,

  // 4. Pesan jika Order Premify Gagal (Refund / Cek Manual)
  orderFailed: (invoiceId: string) => `
⚠️ *PESANAN TERKENDALA*
━━━━━━━━━━━━━━━━━━━━
Mohon maaf kak, pesanan *${invoiceId}* gagal diproses oleh server/provider kami (kemungkinan ID salah atau server gangguan).

Tim Admin kami akan segera melakukan pengecekan manual atau memproses *Refund* saldo Anda. Mohon tunggu sebentar ya kak! 🙏
`
};