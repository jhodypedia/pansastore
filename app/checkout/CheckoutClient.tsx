"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Plus_Jakarta_Sans } from "next/font/google";
import { processCheckout } from "@/actions/checkout";
import QRISInvoice from "@/components/QRISInvoice";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
});

type Product = {
  id: string;
  name: string;
  type?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  description?: string | null;
};

type PaymentData = {
  order_id: string;
  amount: number;
  total_payment: number;
  fee: number;
  payment_number: string;
  expired_at: string;
  qris_image_url?: string | null;
  qr_string?: string | null;
};

type CheckoutSuccessResult = {
  success: true;
  message: string;
  payment: PaymentData | null;
  invoiceId: string;
  invoiceUrl: string;
  amount: number;
  qrisImageUrl?: string | null;
};

type CheckoutErrorResult = {
  success: false;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

type CheckoutResult = CheckoutSuccessResult | CheckoutErrorResult;

interface CheckoutClientProps {
  product: Product;
  variantId?: string | null;
  variantName: string;
  price: number;
  defaultEmail?: string;
  defaultPhone?: string;
}

type FieldErrors = {
  targetId?: string;
  whatsapp?: string;
};

type InvoiceViewData = {
  payment: PaymentData;
  invoiceId: string;
  invoiceUrl: string;
  amount: number;
  qrisImageUrl?: string | null;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formatPrice = (value: number) => value.toLocaleString("id-ID");
const sanitizePhone = (value: string) => value.replace(/[^0-9]/g, "");

const CHECKOUT_STEPS = [
  "Memvalidasi data",
  "Membuat invoice",
  "Menyiapkan pembayaran",
  "Menyelesaikan proses",
] as const;

function ProductVisual({
  product,
  isInviteType,
}: {
  product: Product;
  isInviteType: boolean;
}) {
  if (product.imageUrl) {
    return (
      <img
        src={product.imageUrl}
        alt={product.name}
        loading="lazy"
        width={320}
        height={320}
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-700 via-emerald-800 to-slate-900 text-white">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm">
        <i
          className={`${isInviteType ? "ri-mail-star-fill" : "ri-key-2-fill"} text-2xl`}
        />
      </div>
    </div>
  );
}

export default function CheckoutClient({
  product,
  variantId,
  variantName,
  price,
  defaultEmail = "",
  defaultPhone = "",
}: CheckoutClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [invoiceData, setInvoiceData] = useState<InvoiceViewData | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<string>("");

  const stepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);
  const targetInputRef = useRef<HTMLInputElement | null>(null);
  const whatsappInputRef = useRef<HTMLInputElement | null>(null);

  const productType = useMemo(() => product?.type?.toUpperCase() || "", [product?.type]);
  const isInviteType = productType.includes("INVITE");

  const normalizedVariantId = useMemo(() => {
    const trimmed = variantId?.trim();
    return trimmed ? trimmed : null;
  }, [variantId]);

  const [targetId, setTargetId] = useState(isInviteType ? defaultEmail : "");
  const [whatsapp, setWhatsapp] = useState(sanitizePhone(defaultPhone));

  useEffect(() => {
    if (isInviteType) {
      setTargetId(defaultEmail || "");
    }
  }, [defaultEmail, isInviteType]);

  useEffect(() => {
    setWhatsapp(sanitizePhone(defaultPhone));
  }, [defaultPhone]);

  useEffect(() => {
    return () => {
      if (stepIntervalRef.current) {
        clearInterval(stepIntervalRef.current);
      }
    };
  }, []);

  const startLoadingSteps = () => {
    if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
    setLoadingStep(1);

    stepIntervalRef.current = setInterval(() => {
      setLoadingStep((prev) => (prev < CHECKOUT_STEPS.length ? prev + 1 : prev));
    }, 900);
  };

  const stopLoadingSteps = () => {
    if (stepIntervalRef.current) {
      clearInterval(stepIntervalRef.current);
      stepIntervalRef.current = null;
    }
  };

  const focusFirstInvalidField = (nextErrors: FieldErrors) => {
    if (nextErrors.targetId) {
      targetInputRef.current?.focus();
      return;
    }

    if (nextErrors.whatsapp) {
      whatsappInputRef.current?.focus();
    }
  };

  const clearFieldError = (field: keyof FieldErrors) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = sanitizePhone(e.target.value);
    setWhatsapp(nextValue);

    if (errors.whatsapp) clearFieldError("whatsapp");
    if (formMessage) setFormMessage("");
  };

  const handleTargetIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTargetId(e.target.value);

    if (errors.targetId) clearFieldError("targetId");
    if (formMessage) setFormMessage("");
  };

  const validateFields = () => {
    const nextErrors: FieldErrors = {};
    const trimmedWhatsapp = whatsapp.trim();
    const trimmedTargetId = targetId.trim();

    if (isInviteType) {
      if (!trimmedTargetId) {
        nextErrors.targetId = "Alamat email tujuan wajib diisi.";
      } else if (!EMAIL_REGEX.test(trimmedTargetId)) {
        nextErrors.targetId = "Format email tujuan tidak valid.";
      }
    }

    if (!trimmedWhatsapp) {
      nextErrors.whatsapp = "Nomor WhatsApp wajib diisi.";
    } else if (trimmedWhatsapp.length < 10) {
      nextErrors.whatsapp = "Nomor WhatsApp minimal 10 digit.";
    } else if (trimmedWhatsapp.length > 15) {
      nextErrors.whatsapp = "Nomor WhatsApp terlalu panjang.";
    }

    setErrors(nextErrors);
    return nextErrors;
  };

  useEffect(() => {
    if (Object.keys(errors).some((key) => Boolean(errors[key as keyof FieldErrors])) && errorSummaryRef.current) {
      errorSummaryRef.current.focus();
    }
  }, [errors]);

  const getButtonLabel = () => {
    if (!isLoading) return "Lanjut ke Pembayaran";

    return CHECKOUT_STEPS[
      Math.max(0, Math.min(loadingStep - 1, CHECKOUT_STEPS.length - 1))
    ];
  };

  const handleCheckout = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isLoading) return;

    const validationErrors = validateFields();

    if (Object.keys(validationErrors).length > 0) {
      setFormMessage("Periksa kembali kolom yang masih bermasalah.");
      toast.error("Data belum lengkap.");
      focusFirstInvalidField(validationErrors);
      return;
    }

    const finalTargetId = isInviteType ? targetId.trim() : whatsapp.trim();

    setFormMessage("");
    setErrors({});
    setIsLoading(true);
    startLoadingSteps();

    const formData = new FormData();
    formData.append("productId", product.id);

    if (normalizedVariantId) {
      formData.append("variantId", normalizedVariantId);
    }

    formData.append("targetId", finalTargetId);
    formData.append("whatsapp", whatsapp.trim());
    formData.append("method", "qris");

    try {
      const res = (await processCheckout(formData)) as CheckoutResult;
      stopLoadingSteps();

      if (res.success) {
        if (res.payment) {
          const normalizedPayment: PaymentData = {
            order_id: String(res.payment.order_id),
            amount: Number(res.payment.amount),
            total_payment: Number(res.payment.total_payment),
            fee: Number(res.payment.fee),
            payment_number: String(res.payment.payment_number),
            expired_at: String(res.payment.expired_at),
            qris_image_url: res.payment.qris_image_url || res.qrisImageUrl || null,
            qr_string: res.payment.qr_string || null,
          };

          setLoadingStep(CHECKOUT_STEPS.length);
          toast.success("Invoice berhasil dibuat.");

          setTimeout(() => {
            setInvoiceData({
              payment: normalizedPayment,
              invoiceId: res.invoiceId,
              invoiceUrl: res.invoiceUrl,
              amount: Number(res.amount || normalizedPayment.total_payment || price),
              qrisImageUrl: res.qrisImageUrl || normalizedPayment.qris_image_url || null,
            });
            setIsLoading(false);
          }, 450);

          return;
        }

        toast.success("Invoice aktif ditemukan.");

        if (res.invoiceUrl) {
          window.location.href = res.invoiceUrl;
          return;
        }

        setIsLoading(false);
        setLoadingStep(0);
        return;
      }

      const nextErrors: FieldErrors = {
        targetId: res.fieldErrors?.targetId?.[0],
        whatsapp: res.fieldErrors?.whatsapp?.[0],
      };

      setErrors((prev) => ({ ...prev, ...nextErrors }));
      setFormMessage(res.message || "Gagal memproses transaksi.");
      toast.error(res.message || "Gagal memproses transaksi.");
      focusFirstInvalidField(nextErrors);
      setIsLoading(false);
      setLoadingStep(0);
    } catch (error) {
      console.error("[CheckoutClient] Gagal memproses checkout:", error);
      stopLoadingSteps();
      setFormMessage("Koneksi bermasalah. Silakan coba kembali.");
      toast.error("Koneksi bermasalah. Silakan coba kembali.");
      setIsLoading(false);
      setLoadingStep(0);
    }
  };

  if (invoiceData) {
    return (
      <div
        className={`${fontSans.variable} min-h-screen bg-[#f7f6f2] font-sans text-[#1f2937] selection:bg-emerald-200 selection:text-emerald-950`}
      >
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f7f6f2]/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-emerald-200 hover:text-emerald-800"
            >
              <i className="ri-arrow-left-line text-base" />
              Kembali
            </Link>

            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-800">
              <i className="ri-time-line text-sm" />
              Menunggu Pembayaran
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
          <QRISInvoice
            paymentData={invoiceData.payment}
            invoiceId={invoiceData.invoiceId}
            invoiceUrl={invoiceData.invoiceUrl}
            amount={invoiceData.amount}
            qrisImageUrl={invoiceData.qrisImageUrl || undefined}
          />
        </main>
      </div>
    );
  }

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <div
      className={`${fontSans.variable} min-h-screen bg-[#f7f6f2] font-sans text-[#111827] selection:bg-emerald-200 selection:text-emerald-950`}
    >
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f7f6f2]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-emerald-200 hover:text-emerald-800"
            aria-label="Kembali ke beranda"
          >
            <i className="ri-arrow-left-line text-base" />
            <span className="hidden sm:inline">Kembali</span>
          </Link>

          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-800">
            <i className="ri-shield-check-line text-sm" />
            Checkout QRIS
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-10">
        <section className="mb-8 md:mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-800">
              Checkout
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
            Selesaikan pesanan Anda
          </h1>

          <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-500 md:text-base">
            Lengkapi detail pesanan dan lanjutkan ke pembayaran QRIS. Tampilan dibuat
            lebih nyaman untuk mobile, tetap jelas saat discroll, dan ringkasan
            pembayaran selalu mudah dipantau.
          </p>
        </section>

        <form
          onSubmit={handleCheckout}
          noValidate
          className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8"
        >
          <section className="order-2 space-y-6 lg:order-1 lg:col-span-7">
            {(errorCount > 0 || formMessage) && (
              <div
                ref={errorSummaryRef}
                tabIndex={-1}
                className="rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-4 outline-none"
                aria-live="assertive"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                    <i className="ri-error-warning-line text-lg" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-rose-900">Perlu diperbaiki</h2>
                    <p className="mt-1 text-sm font-medium leading-6 text-rose-800">
                      {formMessage ||
                        "Masih ada data yang belum valid. Periksa kolom di bawah ini."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.04)]">
              <div className="h-1 bg-gradient-to-r from-emerald-700 via-[#c8a24d] to-emerald-700" />
              <div className="p-6 md:p-8">
                <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white">
                    1
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-slate-900">
                      Detail produk
                    </h2>
                    <p className="text-sm font-medium text-slate-500">
                      Ringkasan item yang akan dibayar.
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr]">
                    <div className="relative h-40 min-h-[120px] overflow-hidden sm:h-full">
                      <ProductVisual product={product} isInviteType={isInviteType} />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/25 to-transparent" />
                    </div>

                    <div className="p-5">
                      <div className="mb-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-800/70">
                        {product.category || "Produk Digital"}
                      </div>

                      <h3 className="text-lg font-black tracking-tight text-slate-900">
                        {product.name}
                      </h3>

                      <p className="mt-1 text-sm font-medium text-slate-500">
                        Paket: <span className="font-bold text-slate-800">{variantName}</span>
                      </p>

                      {product.description ? (
                        <p className="mt-3 text-sm font-medium leading-7 text-slate-500">
                          {product.description}
                        </p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-800">
                          {product.type || "Digital"}
                        </span>
                        <span className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">
                          QRIS Ready
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {isInviteType ? (
              <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.04)] md:p-8">
                <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white">
                    2
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-slate-900">
                      Tujuan pengiriman
                    </h2>
                    <p className="text-sm font-medium text-slate-500">
                      Masukkan email tujuan untuk produk tipe invite.
                    </p>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="targetId"
                    className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500"
                  >
                    Email penerima
                  </label>

                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                      <i className="ri-mail-send-line text-lg" />
                    </div>

                    <input
                      ref={targetInputRef}
                      id="targetId"
                      type="email"
                      value={targetId}
                      onChange={handleTargetIdChange}
                      required
                      disabled={isLoading}
                      autoComplete="email"
                      placeholder="contoh@email.com"
                      aria-invalid={errors.targetId ? "true" : "false"}
                      aria-describedby={errors.targetId ? "targetId-error" : "targetId-hint"}
                      className={`w-full rounded-2xl border bg-slate-50 py-4 pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:ring-4 ${
                        errors.targetId
                          ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                          : "border-slate-200 focus:border-emerald-600 focus:ring-emerald-100"
                      } disabled:opacity-60`}
                    />
                  </div>

                  {errors.targetId ? (
                    <p
                      id="targetId-error"
                      role="alert"
                      className="mt-2 text-sm font-semibold text-rose-600"
                    >
                      {errors.targetId}
                    </p>
                  ) : (
                    <p id="targetId-hint" className="mt-2 text-sm font-medium text-slate-500">
                      Invite atau akses akan dikirim ke alamat email ini.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-[30px] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.03)] md:p-8">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-700 text-white">
                    <i className="ri-information-2-fill" />
                  </div>
                  <h2 className="text-lg font-black tracking-tight text-slate-900">
                    Pengiriman otomatis
                  </h2>
                </div>

                <div className="space-y-3 text-sm font-medium leading-7 text-slate-600">
                  <p>
                    Produk ini tidak memerlukan email tujuan tambahan. Setelah pembayaran
                    selesai, detail produk atau akses akan dikirim ke nomor WhatsApp yang
                    Anda masukkan.
                  </p>
                  <p>
                    Tipe produk:{" "}
                    <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-black uppercase tracking-[0.12em] text-emerald-800">
                      {product.type || "Digital"}
                    </span>
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.04)] md:p-8">
              <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white">
                  {isInviteType ? "3" : "2"}
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight text-slate-900">
                    Kontak WhatsApp
                  </h2>
                  <p className="text-sm font-medium text-slate-500">
                    Digunakan untuk invoice dan notifikasi pesanan.
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="whatsapp"
                  className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500"
                >
                  Nomor WhatsApp
                </label>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-emerald-600">
                    <i className="ri-whatsapp-line text-lg" />
                  </div>

                  <input
                    ref={whatsappInputRef}
                    id="whatsapp"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={whatsapp}
                    onChange={handleWhatsappChange}
                    required
                    disabled={isLoading}
                    placeholder="081234567890"
                    aria-invalid={errors.whatsapp ? "true" : "false"}
                    aria-describedby={errors.whatsapp ? "whatsapp-error" : "whatsapp-hint"}
                    className={`w-full rounded-2xl border bg-slate-50 py-4 pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:ring-4 ${
                      errors.whatsapp
                        ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                        : "border-slate-200 focus:border-emerald-600 focus:ring-emerald-100"
                    } disabled:opacity-60`}
                  />
                </div>

                {errors.whatsapp ? (
                  <p
                    id="whatsapp-error"
                    role="alert"
                    className="mt-2 text-sm font-semibold text-rose-600"
                  >
                    {errors.whatsapp}
                  </p>
                ) : (
                  <p id="whatsapp-hint" className="mt-2 text-sm font-medium text-slate-500">
                    Nomor ini akan menerima invoice dan status pembayaran.
                  </p>
                )}
              </div>
            </div>
          </section>

          <aside className="order-1 lg:order-2 lg:col-span-5">
            <div className="lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
                <div className="h-1 bg-gradient-to-r from-emerald-700 via-[#c8a24d] to-emerald-700" />

                <div className="bg-slate-950 px-6 py-6 text-white md:px-7 md:py-7">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">
                        Ringkasan
                      </p>
                      <h2 className="mt-1 text-xl font-black tracking-tight">
                        Pembayaran
                      </h2>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-300">
                      <i className="ri-qr-code-line" />
                      QRIS
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <div className="mb-4 border-b border-dashed border-white/10 pb-4">
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">
                        Produk
                      </div>
                      <div className="mt-1 text-base font-black leading-tight text-white">
                        {product.name}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-white/65">
                        {variantName}
                      </div>
                    </div>

                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">
                          Total pembayaran
                        </div>
                        <div className="mt-2 text-3xl font-black tracking-tight text-emerald-300 md:text-[2.4rem]">
                          <span className="mr-1 text-sm text-emerald-200/70">Rp</span>
                          {formatPrice(price)}
                        </div>
                      </div>

                      <div className="text-right text-[11px] font-bold text-white/45">
                        Termasuk biaya sesuai invoice gateway
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2">
                    {CHECKOUT_STEPS.map((step, index) => {
                      const active = loadingStep >= index + 1;

                      return (
                        <div
                          key={step}
                          className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition ${
                            active ? "bg-white/8 text-white" : "text-white/45"
                          }`}
                        >
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                              active
                                ? "bg-emerald-500 text-white"
                                : "border border-white/10 bg-white/5 text-white/45"
                            }`}
                          >
                            {active ? <i className="ri-check-line" /> : index + 1}
                          </div>
                          <span className="text-sm font-semibold">{step}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div
                  className="overscroll-contain px-6 py-6 md:px-7"
                  style={{ overscrollBehavior: "contain" }}
                >
                  <div className="hidden lg:block">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-6 py-4 text-sm font-black text-white transition-all duration-300 hover:bg-emerald-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-80"
                    >
                      {isLoading ? (
                        <>
                          <i className="ri-loader-4-line animate-spin text-lg" />
                          <span aria-live="polite">{getButtonLabel()}</span>
                        </>
                      ) : (
                        <>
                          <i className="ri-flashlight-fill text-lg" />
                          Lanjut ke Pembayaran
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 lg:mt-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                        Metode
                      </div>
                      <div className="mt-1 text-sm font-black text-slate-900">QRIS</div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                        Status
                      </div>
                      <div className="mt-1 text-sm font-black text-slate-900">
                        {isLoading ? "Diproses" : "Siap"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-900">
                    <i className="ri-shield-check-line mt-0.5 text-base text-emerald-700" />
                    <p>
                      Setelah invoice dibuat, Anda akan langsung masuk ke halaman QRIS
                      untuk menyelesaikan pembayaran.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <div className="sticky bottom-3 z-30 order-3 lg:hidden">
            <div className="rounded-[28px] border border-slate-200 bg-white/95 p-3 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between gap-3 px-2">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Total pembayaran
                  </div>
                  <div className="text-xl font-black tracking-tight text-slate-900">
                    <span className="mr-1 text-xs text-slate-500">Rp</span>
                    {formatPrice(price)}
                  </div>
                </div>

                <div className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-800">
                  QRIS
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-6 py-4 text-sm font-black text-white transition-all duration-300 hover:bg-emerald-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-80"
              >
                {isLoading ? (
                  <>
                    <i className="ri-loader-4-line animate-spin text-lg" />
                    <span aria-live="polite">{getButtonLabel()}</span>
                  </>
                ) : (
                  <>
                    <i className="ri-flashlight-fill text-lg" />
                    Lanjut ke Pembayaran
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
