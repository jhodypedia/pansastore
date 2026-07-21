import prisma from "@/lib/prisma";
import UserTableClient from "./UserTableClient";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return (
    <div className="w-full max-w-full animate-fade-up">
      <UserTableClient initialUsers={users} />
    </div>
  );
}
