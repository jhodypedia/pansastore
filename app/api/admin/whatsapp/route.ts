import { NextResponse } from 'next/server';
import { startWhatsAppBot } from '@/lib/whatsapp';
import { auth } from '@/auth';

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!global.waSocket || global.waStatus === 'DISCONNECTED') {
    startWhatsAppBot();
  }
  
  return NextResponse.json({ status: global.waStatus, qr: global.waQrCode });
}