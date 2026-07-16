import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import CheckoutClient from "../CheckoutClient";

export const dynamic = "force-dynamic";

interface CheckoutPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ variant?: string }>;
}

export default async function CheckoutPage({
  params,
  searchParams,
}: CheckoutPageProps) {
  const { id } = await params;
  const { variant: rawVariantId } = await searchParams;

  const productId = String(id || "").trim();
  const variantId = String(rawVariantId || "").trim();

  if (!productId) {
    redirect("/");
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      variants: {
        orderBy: [{ price: "asc" }, { stock: "desc" }],
      },
    },
  });

  if (!product) {
    notFound();
  }

  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;

  let selectedVariant =
    hasVariants && variantId
      ? product.variants.find((item) => item.id === variantId) ?? null
      : null;

  if (variantId && !selectedVariant) {
    notFound();
  }

  if (!selectedVariant && hasVariants) {
    selectedVariant =
      product.variants.find((item) => (item.stock ?? 0) > 0) ??
      product.variants[0] ??
      null;
  }

  const variantName =
    selectedVariant?.name?.trim() ||
    product.type?.trim() ||
    "Paket Reguler";

  const checkoutPrice = Number(selectedVariant?.price ?? product.sellPrice ?? 0);

  if (!Number.isFinite(checkoutPrice) || checkoutPrice <= 0) {
    notFound();
  }

  const normalizedProduct = {
    ...product,
    sellPrice: Number(product.sellPrice),
    stock: Number(product.stock ?? 0),
    variants: (product.variants || []).map((variant) => ({
      ...variant,
      price: Number(variant.price),
      stock: Number(variant.stock ?? 0),
    })),
  };

  return (
    <CheckoutClient
      product={normalizedProduct}
      variantId={selectedVariant?.id ?? null}
      variantName={variantName}
      price={checkoutPrice}
    />
  );
}
