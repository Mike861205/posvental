"use client";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  return (
    <button onClick={() => signOut({ callbackUrl: "/login" })}
      className="w-full btn-ghost text-sm flex items-center gap-2 justify-center">
      <LogOut size={16} /> Cerrar sesión
    </button>
  );
}
