"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export function ReserveNowButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        router.push("/reserva-twin-suns");
        return;
      }

      router.push("/entrar?next=/reserva-twin-suns");
    } catch (error) {
      console.error("Erro ao verificar sessão:", error);
      router.push("/entrar?next=/reserva-twin-suns");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading ? "Verificando..." : "Reservar Agora"}
    </button>
  );
}