import { makeWASocket, useMultiFileAuthState, DisconnectReason } from 'baileys';
import { Boom } from '@hapi/boom';
import path from 'path';

declare global {
  var waStatus: string;
  var waQrCode: string;
  var waSocket: any;
}

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
    browser: ['PansaStore', 'Chrome', '1.0.0'],
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
      console.log('✅ WhatsApp PansaStore Berhasil Terkoneksi!');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
    const sender = msg.key.remoteJid;

    if (text?.toLowerCase() === 'ping') {
      await sock.sendMessage(sender!, { text: '🟢 Sistem *PansaStore* berjalan normal. Siap melayani 24/7!' });
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
// TEMPLATE PESAN WHATSAPP PANSASTORE
// ==========================================
export const WATemplates = {

  // 1. Invoice dibuat, menunggu pembayaran
  invoiceCreated: (
    invoiceId: string,
    productName: string,
    targetId: string,
    price: string,
    paymentUrl: string
  ) => `
╔════════════════════╗
  🛒 *INVOICE PANSASTORE*
╚════════════════════╝

Halo Kak! 👋 Terima kasih telah berbelanja di *PansaStore*.
Berikut rincian pesanan Anda:

🧾 *No. Invoice* : ${invoiceId}
📦 *Produk*      : ${productName}
🎯 *ID Tujuan*   : ${targetId}
💰 *Total*       : Rp ${price}
⏳ *Status*      : MENUNGGU PEMBAYARAN

━━━━━━━━━━━━━━━━━━━━
💳 *LINK PEMBAYARAN:*
${paymentUrl}
━━━━━━━━━━━━━━━━━━━━

⚠️ _Selesaikan pembayaran sebelum link kedaluwarsa. Pesanan akan diproses otomatis oleh sistem kami setelah pembayaran diterima._

Salam,
*PansaStore* 🛒
`,

  // 2. Pembayaran diterima, sedang diproses ke provider
  orderProcessing: (
    invoiceId: string,
    productName: string
  ) => `
╔════════════════════╗
  🚀 *PEMBAYARAN DITERIMA*
╚════════════════════╝

Hore! 🎊 Pembayaran Anda telah berhasil dikonfirmasi.

🧾 *No. Invoice* : ${invoiceId}
📦 *Produk*      : ${productName}
⚙ *Status*      : SEDANG DIPROSES

━━━━━━━━━━━━━━━━━━━━
🤖 Sistem kami sedang mengirimkan produk ke akun Anda secara otomatis. Estimasi waktu *1–3 menit*.

Mohon ditunggu ya Kak, kami akan segera mengirimkan notifikasi setelah pesanan selesai! 💚
━━━━━━━━━━━━━━━━━━━━

*PansaStore* 🛒
`,

  // 3. Pesanan selesai + detail akun/kredensial
  orderCompleted: (
    invoiceId: string,
    productName: string,
    targetId: string,
    accountDetails?: string
  ) => `
╔════════════════════╗
  🎉 *PESANAN SELESAI!*
╚════════════════════╝

Yeaay! Produk Anda telah berhasil dikirimkan! 🎊

🧾 *No. Invoice* : ${invoiceId}
📦 *Produk*      : ${productName}
🎯 *ID Tujuan*   : ${targetId}
✅ *Status*      : BERHASIL / SUCCESS

━━━━━━━━━━━━━━━━━━━━
${accountDetails
    ? `🔐 *DETAIL AKUN / KREDENSIAL:*\n\n${accountDetails}\n\n⚠️ _Simpan kredensial ini dengan aman. Jangan bagikan ke siapapun!_`
    : `✨ _Produk telah aktif di akun Anda. Silakan cek sekarang!_`
  }
━━━━━━━━━━━━━━━━━━━━

📞 Jika produk belum masuk dalam *10 menit*, balas pesan ini untuk menghubungi Admin kami.

Terima kasih telah mempercayakan *PansaStore*! 💚
Ditunggu orderan selanjutnya ya Kak! 🛒
`,

  // 4. Pesanan gagal / terkendala
  orderFailed: (invoiceId: string) => `
╔════════════════════╗
  ⚠️ *PESANAN TERKENDALA*
╚════════════════════╝

Mohon maaf Kak 🙏, pesanan *${invoiceId}* mengalami kendala saat diproses oleh sistem provider kami.

*Kemungkinan penyebab:*
• ID tujuan tidak valid atau salah
• Server provider sedang gangguan
• Stok produk habis sementara

━━━━━━━━━━━━━━━━━━━━
🔄 Tim Admin kami akan segera melakukan *pengecekan manual* dan menghubungi Anda.

Jika tidak ada respons dalam *15 menit*, silakan balas pesan ini untuk bantuan lebih lanjut.

Kami mohon maaf atas ketidaknyamanan ini 🙏
*PansaStore* 🛒
`,

};
