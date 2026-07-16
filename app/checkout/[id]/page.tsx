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
  const { variant: variantId } = await searchParams;

  if (!id) {
    redirect("/");
  }

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      variants: true,
    },
  });

  if (!product) {
    notFound();
  }

  const selectedVariant =
    variantId && product.variants?.length
      ? product.variants.find((item) => item.id === variantId) ?? null
      : product.variants?.find((item) => item.stock > 0) ?? product.variants?.[0] ?? null;

  const variantName = selectedVariant?.name || "Paket Reguler";
  const checkoutPrice = selectedVariant?.price ?? product.sellPrice;

  return (
    <CheckoutClient
      product={product}
      variantId={selectedVariant?.id}
      variantName={variantName}
      price={checkoutPrice}
    />
  );
}
