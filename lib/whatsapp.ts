// lib/whatsapp.ts
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} from "baileys";
import { Boom } from "@hapi/boom";
import path from "path";
import fs from "fs/promises";

export type WAStatus =
  | "DISCONNECTED"
  | "CONNECTING"
  | "QR_READY"
  | "PAIRING_CODE"
  | "CONNECTED"
  | "RECONNECTING"
  | "ERROR";

type StartWhatsAppOptions = {
  usePairingCode?: boolean;
  pairingPhoneNumber?: string;
};

declare global {
  var waStatus: WAStatus | undefined;
  var waQrCode: string | undefined;
  var waPairingCode: string | undefined;
  var waSocket: any;
  var waIsStarting: boolean | undefined;
  var waReconnectTimer: NodeJS.Timeout | null | undefined;
  var waLastError: string | undefined;
  var waRequestedPairingCode: boolean | undefined;
  var waStartOptions: StartWhatsAppOptions | undefined;
}

global.waStatus = global.waStatus || "DISCONNECTED";
global.waQrCode = global.waQrCode || "";
global.waPairingCode = global.waPairingCode || "";
global.waSocket = global.waSocket || null;
global.waIsStarting = global.waIsStarting || false;
global.waReconnectTimer = global.waReconnectTimer || null;
global.waLastError = global.waLastError || "";
global.waRequestedPairingCode = global.waRequestedPairingCode || false;
global.waStartOptions = global.waStartOptions || undefined;

const WA_AUTH_FOLDER = path.join(process.cwd(), "wa_auth_session");
const RECONNECT_DELAY_MS = 5000;

function setWAStatus(status: WAStatus, errorMessage?: string) {
  global.waStatus = status;
  global.waLastError = errorMessage || "";
}

function clearReconnectTimer() {
  if (global.waReconnectTimer) {
    clearTimeout(global.waReconnectTimer);
    global.waReconnectTimer = null;
  }
}

function scheduleReconnect() {
  clearReconnectTimer();

  global.waReconnectTimer = setTimeout(() => {
    startWhatsAppBot(global.waStartOptions).catch((err) => {
      console.error("[WA] Reconnect start failed:", err);
    });
  }, RECONNECT_DELAY_MS);
}

function normalizePhone(phone: string): string | null {
  const digits = String(phone || "").replace(/\D/g, "");

  if (!digits) return null;
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;

  return null;
}

function sanitizeMessage(message: string): string {
  return String(message || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function removeAuthFolder() {
  try {
    await fs.rm(WA_AUTH_FOLDER, { recursive: true, force: true });
    console.log("[WA] Folder session berhasil dihapus.");
  } catch (err) {
    console.error("[WA] Gagal hapus folder session:", err);
  }
}

export function getWhatsAppStatus() {
  return {
    status: global.waStatus || "DISCONNECTED",
    qrCode: global.waQrCode || "",
    pairingCode: global.waPairingCode || "",
    connected: global.waStatus === "CONNECTED",
    lastError: global.waLastError || "",
  };
}

export async function startWhatsAppBot(options: StartWhatsAppOptions = {}) {
  if (
    global.waIsStarting ||
    global.waStatus === "CONNECTING" ||
    global.waStatus === "CONNECTED"
  ) {
    return getWhatsAppStatus();
  }

  global.waIsStarting = true;
  global.waRequestedPairingCode = false;
  global.waStartOptions = options;
  setWAStatus("CONNECTING");
  clearReconnectTimer();

  try {
    const { state, saveCreds } = await useMultiFileAuthState(WA_AUTH_FOLDER);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ["PansaStore", "Chrome", "1.0.0"],
      markOnlineOnConnect: false,
      syncFullHistory: false,
    });

    global.waSocket = sock;

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      try {
        const { connection, lastDisconnect, qr } = update;

        if (qr && !options.usePairingCode) {
          global.waQrCode = qr;
          global.waPairingCode = "";
          setWAStatus("QR_READY");
        }

        if (
          options.usePairingCode &&
          !global.waRequestedPairingCode &&
          !sock.authState?.creds?.registered
        ) {
          const normalizedPairingPhone = normalizePhone(
            options.pairingPhoneNumber || ""
          );

          if (!normalizedPairingPhone) {
            setWAStatus(
              "ERROR",
              "Nomor pairing code tidak valid. Gunakan format Indonesia yang benar."
            );
            global.waIsStarting = false;
            return;
          }

          if (connection === "connecting" || !!qr) {
            global.waRequestedPairingCode = true;
            const code = await sock.requestPairingCode(normalizedPairingPhone);
            global.waPairingCode = code;
            global.waQrCode = "";
            setWAStatus("PAIRING_CODE");
            console.log("[WA] Pairing code:", code);
          }
        }

        if (connection === "open") {
          global.waQrCode = "";
          global.waPairingCode = "";
          global.waRequestedPairingCode = false;
          setWAStatus("CONNECTED");
          global.waIsStarting = false;
          console.log("✅ WhatsApp berhasil terkoneksi.");
          return;
        }

        if (connection === "close") {
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const disconnectMessage =
            (lastDisconnect?.error as any)?.message || "Unknown disconnect";

          global.waSocket = null;
          global.waQrCode = "";
          global.waPairingCode = "";
          global.waIsStarting = false;
          global.waRequestedPairingCode = false;

          console.warn("[WA] Connection closed:", {
            statusCode,
            disconnectMessage,
          });

          if (statusCode === DisconnectReason.loggedOut) {
            setWAStatus("DISCONNECTED", "Logged out from WhatsApp");
            await removeAuthFolder();
            return;
          }

          if (statusCode === DisconnectReason.restartRequired) {
            setWAStatus("RECONNECTING", "Restart required");
            scheduleReconnect();
            return;
          }

          if (
            statusCode === DisconnectReason.connectionClosed ||
            statusCode === DisconnectReason.connectionLost ||
            statusCode === DisconnectReason.timedOut ||
            statusCode === DisconnectReason.unavailableService ||
            statusCode === DisconnectReason.badSession
          ) {
            setWAStatus("RECONNECTING", disconnectMessage);
            scheduleReconnect();
            return;
          }

          setWAStatus("ERROR", disconnectMessage);
          scheduleReconnect();
        }
      } catch (err: any) {
        console.error("[WA] Error on connection.update:", err);
        setWAStatus("ERROR", err?.message || "connection.update error");
        global.waIsStarting = false;
      }
    });

    sock.ev.on("messages.upsert", async (m) => {
      try {
        const msg = m.messages?.[0];
        if (!msg?.message || msg.key?.fromMe) return;

        const sender = msg.key.remoteJid;
        if (!sender) return;

        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          "";

        const normalizedText = text.trim().toLowerCase();

        if (normalizedText === "ping") {
          await sock.sendMessage(sender, {
            text: "PansaStore aktif dan berjalan normal.",
          });
        }
      } catch (err) {
        console.error("[WA] Error processing incoming message:", err);
      }
    });

    return getWhatsAppStatus();
  } catch (error: any) {
    global.waSocket = null;
    global.waQrCode = "";
    global.waPairingCode = "";
    global.waRequestedPairingCode = false;
    global.waIsStarting = false;
    setWAStatus("ERROR", error?.message || "Failed to start WhatsApp bot");
    console.error("[WA] Gagal start bot:", error);
    scheduleReconnect();
    return getWhatsAppStatus();
  } finally {
    global.waIsStarting = false;
  }
}

export async function disconnectWhatsAppBot(): Promise<void> {
  clearReconnectTimer();

  try {
    if (global.waSocket) {
      await global.waSocket.end?.(new Error("Manual disconnect"));
    }
  } catch (err) {
    console.error("[WA] Error disconnect socket:", err);
  } finally {
    global.waSocket = null;
    global.waQrCode = "";
    global.waPairingCode = "";
    global.waRequestedPairingCode = false;
    setWAStatus("DISCONNECTED");
  }
}

export async function logoutWhatsAppBot(): Promise<void> {
  clearReconnectTimer();

  try {
    if (global.waSocket) {
      await global.waSocket.logout();
    }
  } catch (err) {
    console.error("[WA] Error logout socket:", err);
  } finally {
    global.waSocket = null;
    global.waQrCode = "";
    global.waPairingCode = "";
    global.waRequestedPairingCode = false;
    await removeAuthFolder();
    setWAStatus("DISCONNECTED");
  }
}

export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<boolean> {
  if (global.waStatus !== "CONNECTED" || !global.waSocket) {
    console.warn("[WA] Gagal kirim pesan: socket belum connected.");
    return false;
  }

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    console.warn("[WA] Gagal kirim pesan: nomor tidak valid.", { phone });
    return false;
  }

  const cleanMessage = sanitizeMessage(message);
  if (!cleanMessage) {
    console.warn("[WA] Gagal kirim pesan: isi pesan kosong.");
    return false;
  }

  const jid = `${normalizedPhone}@s.whatsapp.net`;

  try {
    await global.waSocket.sendMessage(jid, { text: cleanMessage });
    return true;
  } catch (error: any) {
    console.error("[WA] sendMessage failed:", {
      phone,
      jid,
      message: error?.message,
    });
    return false;
  }
}

export async function sendWhatsAppImage(params: {
  phone: string;
  imageUrl?: string;
  imageBuffer?: Buffer;
  caption?: string;
}): Promise<boolean> {
  if (global.waStatus !== "CONNECTED" || !global.waSocket) {
    console.warn("[WA] Gagal kirim image: socket belum connected.");
    return false;
  }

  const normalizedPhone = normalizePhone(params.phone);
  if (!normalizedPhone) {
    console.warn("[WA] Gagal kirim image: nomor tidak valid.", {
      phone: params.phone,
    });
    return false;
  }

  if (!params.imageUrl && !params.imageBuffer) {
    console.warn("[WA] Gagal kirim image: imageUrl/imageBuffer kosong.");
    return false;
  }

  const jid = `${normalizedPhone}@s.whatsapp.net`;

  try {
    const payload: any = {
      caption: sanitizeMessage(params.caption || ""),
    };

    if (params.imageBuffer) {
      payload.image = params.imageBuffer;
    } else if (params.imageUrl) {
      payload.image = { url: params.imageUrl };
    }

    await global.waSocket.sendMessage(jid, payload);
    return true;
  } catch (error: any) {
    console.error("[WA] sendImage failed:", {
      phone: params.phone,
      jid,
      message: error?.message,
    });
    return false;
  }
}

export async function sendInvoiceWithQris(params: {
  phone: string;
  message: string;
  qrisImageUrl: string;
}): Promise<boolean> {
  const textSent = await sendWhatsAppMessage(params.phone, params.message);
  if (!textSent) return false;

  const imageSent = await sendWhatsAppImage({
    phone: params.phone,
    imageUrl: params.qrisImageUrl,
    caption: "Silakan scan QRIS berikut untuk melakukan pembayaran.",
  });

  return imageSent;
}

function formatRupiah(amount: number | string) {
  const value = Number(amount || 0);
  return new Intl.NumberFormat("id-ID").format(value);
}

function safeText(value: unknown, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export const WATemplates = {
  invoiceCreated: ({
    invoiceId,
    productName,
    targetId,
    price,
    paymentUrl,
  }: {
    invoiceId: string;
    productName: string;
    targetId: string;
    price: number | string;
    paymentUrl: string;
  }) => `
*PansaStore*
_Notifikasi Invoice_

Halo,
Terima kasih. Pesanan Anda sudah kami terima dengan rincian berikut:

• Invoice: *${safeText(invoiceId)}*
• Produk: *${safeText(productName)}*
• Tujuan: *${safeText(targetId)}*
• Total Pembayaran: *Rp ${formatRupiah(price)}*
• Status: *Menunggu Pembayaran*

*Tautan pembayaran:*
${safeText(paymentUrl)}

Silakan selesaikan pembayaran sebelum tautan kedaluwarsa. Anda juga dapat scan QRIS yang kami kirim setelah pesan ini. Setelah pembayaran berhasil dikonfirmasi, pesanan akan diproses otomatis oleh sistem.

Terima kasih.
_PansaStore_
`,

  orderProcessing: ({
    invoiceId,
    productName,
  }: {
    invoiceId: string;
    productName: string;
  }) => `
*PansaStore*
_Pembayaran Berhasil Diterima_

Halo,
Pembayaran untuk pesanan berikut sudah berhasil kami terima:

• Invoice: *${safeText(invoiceId)}*
• Produk: *${safeText(productName)}*
• Status: *Sedang Diproses*

Pesanan Anda saat ini sedang diteruskan ke sistem provider. Estimasi proses sekitar *1–3 menit*.

Mohon menunggu. Kami akan mengirim pembaruan lagi setelah proses selesai.

Terima kasih.
_PansaStore_
`,

  orderCompleted: ({
    invoiceId,
    productName,
    targetId,
    accountDetails,
  }: {
    invoiceId: string;
    productName: string;
    targetId: string;
    accountDetails?: string;
  }) => `
*PansaStore*
_Pesanan Selesai_

Halo,
Pesanan Anda telah berhasil diproses.

• Invoice: *${safeText(invoiceId)}*
• Produk: *${safeText(productName)}*
• Tujuan: *${safeText(targetId)}*
• Status: *Berhasil*

${
  accountDetails
    ? `*Detail akun / kredensial:*\n${sanitizeMessage(accountDetails)}\n\nMohon simpan data di atas dengan aman dan jangan dibagikan kepada pihak lain.`
    : `Produk telah aktif dan siap digunakan. Silakan lakukan pengecekan pada akun tujuan Anda.`
}

Apabila produk belum diterima dalam *10 menit*, balas pesan ini agar tim kami dapat membantu pengecekan lebih lanjut.

Terima kasih atas kepercayaan Anda.
_PansaStore_
`,

  orderFailed: ({
    invoiceId,
    productName,
  }: {
    invoiceId: string;
    productName?: string;
  }) => `
*PansaStore*
_Pesanan Memerlukan Penanganan_

Halo,
Pesanan berikut sedang mengalami kendala saat diproses:

• Invoice: *${safeText(invoiceId)}*
• Produk: *${safeText(productName || "Produk Digital")}*
• Status: *Terkendala*

Kemungkinan penyebab:
• Data tujuan tidak valid
• Stok provider sedang tidak tersedia
• Sistem provider sedang mengalami gangguan

Tim kami akan melakukan pengecekan lanjutan. Jika dalam *15 menit* belum ada pembaruan, silakan balas pesan ini.

Mohon maaf atas ketidaknyamanannya.
_PansaStore_
`,

  paymentFailed: ({
    invoiceId,
    productName,
  }: {
    invoiceId: string;
    productName?: string;
  }) => `
*PansaStore*
_Pembayaran Tidak Berhasil_

Halo,
Pembayaran untuk pesanan berikut belum berhasil kami konfirmasi:

• Invoice: *${safeText(invoiceId)}*
• Produk: *${safeText(productName || "Produk Digital")}*
• Status: *Belum Berhasil*

Silakan coba lakukan pembayaran kembali menggunakan tautan atau metode yang tersedia. Jika Anda merasa pembayaran sudah dilakukan tetapi status belum berubah, balas pesan ini untuk pengecekan manual.

Terima kasih.
_PansaStore_
`,
};
