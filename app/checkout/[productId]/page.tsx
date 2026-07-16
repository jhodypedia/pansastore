import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import CheckoutClient from "../CheckoutClient";

type CheckoutPageProps = {
  params: Promise<{
    productId: string;
  }>;
  searchParams: Promise<{
    variant?: string;
  }>;
};

export default async function CheckoutProductPage({
  params,
  searchParams,
}: CheckoutPageProps) {
  const { productId } = await params;
  const { variant } = await searchParams;

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

  const selectedVariant =
    (variant
      ? productVariants.find((item) => item.id === variant)
      : productVariants.find((item) => item.stock > 0) || productVariants[0]) ?? null;

  if (variant && !selectedVariant) {
    notFound();
  }

  const finalPrice = selectedVariant?.price ?? product.sellPrice;
  const finalVariantId = selectedVariant?.id ?? null;
  const finalVariantName = selectedVariant?.name ?? product.name;
  const finalStock = selectedVariant?.stock ?? product.stock;

  return (
    <CheckoutClient
      product={{
        id: product.id,
        name: product.name,
        type: product.type,
        category: product.category,
        imageUrl: product.imageUrl,
        description: product.description,
      }}
      variantId={finalVariantId}
      variantName={finalVariantName}
      price={finalPrice}
      stock={finalStock}
    />
  );
}
