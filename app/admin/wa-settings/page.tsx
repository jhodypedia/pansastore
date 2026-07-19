import { redirect } from "next/navigation";
import { auth } from "@/auth";
import WASettingsClientPage from "./WASettingsClientPage";

export default async function WASettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (String(session.user.role || "").toUpperCase() !== "ADMIN") {
    redirect("/dashboard");
  }

  return <WASettingsClientPage />;
}
