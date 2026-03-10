"use client";

import { useRouter } from "next/navigation";
import { logoutUser } from "@/services/auth-api";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await logoutUser();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
    >
      Logout
    </button>
  );
}
