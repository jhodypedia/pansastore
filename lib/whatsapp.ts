import "server-only";

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
  var waManualStop: boolean | undefined;
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
global.waManualStop = global.waManualStop || false;

const WA_AUTH_FOLDER = path.join(process.cwd(), "wa_auth_session");
const RECONNECT_DELAY_MS = 5000;
const PAIRING_REQUEST_DELAY_MS = 2500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setWAStatus(status: WAStatus, errorMessage?: string) {
  global.waStatus = status;
  global.waLastError = errorMessage || "";
}

function resetTransientState() {
  global.waQrCode = "";
  global.waPairingCode = "";
  global.waRequestedPairingCode = false;
}

function clearReconnectTimer() {
  if (global.waReconnectTimer) {
    clearTimeout(global.waReconnectTimer);
    global.waReconnectTimer = null;
  }
}

function scheduleReconnect() {
  if (global.waManualStop) return;

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

function hasText(value: unknown): boolean {
  return String(value || "").trim().length > 0;
}

function formatPairingCode(code: string): string {
  const clean = String(code || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (!clean) return "";
  return clean.match(/.{1,4}/g)?.join("-") || clean;
}

async function removeAuthFolder() {
  try {
    await fs.rm(WA_AUTH_FOLDER, { recursive: true, force: true });
    console.log("[WA] Session folder removed.");
  } catch (err) {
    console.error("[WA] Gagal hapus folder session:", err);
  }
}

async function closeExistingSocket(reason = "Reset existing socket") {
  try {
    if (global.waSocket) {
      const socket = global.waSocket;
      global.waSocket = null;
      await socket.end?.(new Error(reason));
    }
  } catch (err) {
    console.error("[WA] Failed closing previous socket:", err);
  } finally {
    resetTransientState();
  }
}

async function requestPairingCodeIfNeeded(sock: any, options: StartWhatsAppOptions) {
  if (!options.usePairingCode) return;
  if (global.waRequestedPairingCode) return;

  const normalizedPairingPhone = normalizePhone(options.pairingPhoneNumber || "");

  if (!normalizedPairingPhone) {
    setWAStatus("ERROR", "Nomor pairing code tidak valid.");
    return;
  }

  const isRegistered = Boolean(sock?.authState?.creds?.registered);
  if (isRegistered) {
    console.log("[WA] Pairing code dilewati karena device sudah registered.");
    return;
  }

  global.waRequestedPairingCode = true;

  try {
    console.log("[WA] Meminta pairing code...", {
      pairingPhoneNumber: normalizedPairingPhone,
    });

    await sleep(PAIRING_REQUEST_DELAY_MS);

    const code = await sock.requestPairingCode(normalizedPairingPhone);
    const formattedCode = formatPairingCode(code);

    global.waPairingCode = formattedCode || code;
    global.waQrCode = "";
    setWAStatus("PAIRING_CODE");

    console.log("[WA] Pairing code berhasil dibuat:", global.waPairingCode);
  } catch (pairErr: any) {
    global.waRequestedPairingCode = false;
    console.error("[WA] requestPairingCode failed:", {
      message: pairErr?.message,
      stack: pairErr?.stack,
    });
    setWAStatus("ERROR", pairErr?.message || "Gagal membuat pairing code");
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
  global.waStartOptions = options;
  global.waManualStop = false;
  clearReconnectTimer();

  if (global.waIsStarting) {
    return getWhatsAppStatus();
  }

  if (
    global.waStatus === "CONNECTED" &&
    global.waSocket &&
    !options.usePairingCode
  ) {
    return getWhatsAppStatus();
  }

  global.waIsStarting = true;
  resetTransientState();
  setWAStatus("CONNECTING");

  try {
    await closeExistingSocket("Restarting WhatsApp socket");

    const { state, saveCreds } = await useMultiFileAuthState(WA_AUTH_FOLDER);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ["PansaStore", "Chrome", "1.0.0"],
      markOnlineOnConnect: false,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
    });

    global.waSocket = sock;
    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      try {
        const { connection, lastDisconnect, qr } = update;

        console.log("[WA] connection.update:", {
          connection,
          hasQr: Boolean(qr),
          usePairingCode: Boolean(options.usePairingCode),
          registered: Boolean(sock?.authState?.creds?.registered),
        });

        if (options.usePairingCode) {
          if (connection === "connecting" || !!qr) {
            await requestPairingCodeIfNeeded(sock, options);
          }
        } else if (qr) {
          global.waQrCode = qr;
          global.waPairingCode = "";
          setWAStatus("QR_READY");
        }

        if (connection === "open") {
          resetTransientState();
          setWAStatus("CONNECTED");
          global.waIsStarting = false;
          console.log("✅ WhatsApp berhasil terkoneksi.");
          return;
        }

        if (connection === "close") {
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const disconnectMessage =
            (lastDisconnect?.error as any)?.message || "Unknown disconnect";
          const wasManualStop = global.waManualStop;

          global.waSocket = null;
          global.waIsStarting = false;
          resetTransientState();

          console.warn("[WA] Connection closed:", {
            statusCode,
            disconnectMessage,
            wasManualStop,
          });

          if (wasManualStop) {
            setWAStatus("DISCONNECTED", "Disconnected manually");
            return;
          }

          if (statusCode === DisconnectReason.loggedOut) {
            setWAStatus("DISCONNECTED", "Logged out from WhatsApp");
            await removeAuthFolder();
            return;
          }

          setWAStatus("RECONNECTING", disconnectMessage);
          scheduleReconnect();
        }
      } catch (err: any) {
        console.error("[WA] connection.update error:", {
          message: err?.message,
          stack: err?.stack,
        });
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

        if (text.trim().toLowerCase() === "ping") {
          await sock.sendMessage(sender, {
            text: "PansaStore aktif dan berjalan normal.",
            linkPreview: undefined,
          });
        }
      } catch (err) {
        console.error("[WA] Error processing incoming message:", err);
      }
    });

    return getWhatsAppStatus();
  } catch (error: any) {
    global.waSocket = null;
    global.waIsStarting = false;
    resetTransientState();
    setWAStatus("ERROR", error?.message || "Failed to start WhatsApp bot");

    console.error("[WA] Gagal start bot:", {
      message: error?.message,
      stack: error?.stack,
    });

    if (!global.waManualStop) {
      scheduleReconnect();
    }

    return getWhatsAppStatus();
  } finally {
    global.waIsStarting = false;
  }
}

export async function disconnectWhatsAppBot(): Promise<void> {
  global.waManualStop = true;
  clearReconnectTimer();

  try {
    await closeExistingSocket("Manual disconnect");
  } catch (err) {
    console.error("[WA] Error disconnect socket:", err);
  } finally {
    global.waSocket = null;
    global.waIsStarting = false;
    resetTransientState();
    setWAStatus("DISCONNECTED");
  }
}

export async function logoutWhatsAppBot(): Promise<void> {
  global.waManualStop = true;
  clearReconnectTimer();

  try {
    if (global.waSocket) {
      const socket = global.waSocket;
      global.waSocket = null;
      await socket.logout();
    }
  } catch (err) {
    console.error("[WA] Error logout socket:", err);
  } finally {
    global.waSocket = null;
    global.waIsStarting = false;
    resetTransientState();
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
    await global.waSocket.sendMessage(jid, {
      text: cleanMessage,
      linkPreview: undefined,
    });
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
  imageBuffer: Buffer;
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

  const jid = `${normalizedPhone}@s.whatsapp.net`;

  try {
    await global.waSocket.sendMessage(jid, {
      image: params.imageBuffer,
      caption: params.caption ? sanitizeMessage(params.caption) : undefined,
    });
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
  qrisImageBuffer: Buffer;
}): Promise<boolean> {
  const textSent = await sendWhatsAppMessage(params.phone, params.message);
  if (!textSent) return false;

  return sendWhatsAppImage({
    phone: params.phone,
    imageBuffer: params.qrisImageBuffer,
    caption: "Silakan scan QRIS berikut untuk melakukan pembayaran.",
  });
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
  }: {
    invoiceId: string;
    productName: string;
    targetId: string;
    price: number | string;
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

Silakan scan QRIS yang kami kirim setelah pesan ini untuk melakukan pembayaran.

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
  hasText(accountDetails)
    ? `*Detail akun / kredensial:*\n${sanitizeMessage(
        String(accountDetails).trim()
      )}\n\nMohon simpan data di atas dengan aman dan jangan dibagikan kepada pihak lain.`
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

Silakan coba lakukan pembayaran kembali. Jika Anda merasa pembayaran sudah dilakukan tetapi status belum berubah, balas pesan ini untuk pengecekan manual.

Terima kasih.
_PansaStore_
`,
};
