import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import CheckoutClient from "../CheckoutClient";

type CheckoutPageProps = {
  params: Promise<{
    productId: string;
  }>;
  searchParams: Promise<{
    variantId?: string;
  }>;
};

export default async function CheckoutProductPage({
  params,
  searchParams,
}: CheckoutPageProps) {
  const { productId } = await params;
  const { variantId } = await searchParams;

  if (!productId) {
    notFound();
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      variants: {
        orderBy: {
          price: "asc",
        },
      },
    },
  });

  if (!product) {
    notFound();
  }

  const productVariants = product.variants ?? [];

  const requestedVariant = variantId
    ? productVariants.find((item) => item.id === variantId) ?? null
    : null;

  const fallbackVariant =
    productVariants.find((item) => item.stock > 0) || productVariants[0] || null;

  const selectedVariant = requestedVariant ?? fallbackVariant;

  const finalPrice = selectedVariant?.price ?? product.sellPrice;
  const finalVariantId = selectedVariant?.id ?? null;
  const finalVariantName = selectedVariant?.name ?? product.name;

  return (
    <CheckoutClient
      product={{
        id: product.id,
        name: product.name,
        type: product.type ?? null,
        category: product.category ?? null,
        imageUrl: product.imageUrl ?? null,
        description: product.description ?? null,
      }}
      variantId={finalVariantId}
      variantName={finalVariantName}
      price={finalPrice}
    />
  );
}
