"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type FormState = {
  fullName: string;
  email: string;
  whatsapp: string;
  deck: string;
  quantity: string;
};

const initialState: FormState = {
  fullName: "",
  email: "",
  whatsapp: "",
  deck: "",
  quantity: "1",
};

export function ReservaTwinSunsForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isValid = useMemo(() => {
    const fullName = form.fullName ?? "";
    const email = form.email ?? "";
    const deck = form.deck ?? "";
    const quantity = form.quantity ?? "";

    return (
      fullName.trim().length >= 3 &&
      email.trim().length >= 5 &&
      email.includes("@") &&
      deck.trim().length > 0 &&
      (quantity === "1" || quantity === "2")
    );
  }, [form]);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [field]: value ?? "",
    }));
  }

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        setLoadingProfile(true);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          if (mounted) setLoadingProfile(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("email, full_name, phone")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!mounted) return;

        setForm((prev) => ({
          ...prev,
          fullName: profile?.full_name ?? user.user_metadata?.full_name ?? "",
          email: profile?.email ?? user.email ?? "",
          whatsapp: profile?.phone ?? "",
          deck: prev.deck ?? "",
          quantity: prev.quantity ?? "1",
        }));
      } catch (error) {
        console.error("Erro ao carregar profile:", error);
      } finally {
        if (mounted) setLoadingProfile(false);
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");

    if (!isValid) {
      setErrorMessage("Preencha os campos obrigatórios para continuar.");
      return;
    }

    try {
      setSubmitting(true);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        setErrorMessage("Sua sessão expirou. Faça login novamente para continuar.");
        return;
      }

      const response = await fetch("/api/reserva-twin-suns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          whatsapp: form.whatsapp,
          deck: form.deck,
          quantity: form.quantity,
        }),
      });

      const json = await response.json().catch(() => null);

      if (!response.ok || !json?.ok) {
        setErrorMessage(
          json?.error ?? "Não foi possível registrar sua reserva agora."
        );
        return;
      }

      setSuccessMessage(
        `Reserva concluída com sucesso. Seu pedido para o deck "${form.deck}" (${form.quantity} unidade${form.quantity === "1" ? "" : "s"}) foi registrado. Entraremos em contato quando a disponibilidade for confirmada.`
      );

      setForm((prev) => ({
        ...prev,
        deck: "",
        quantity: "1",
      }));
    } catch (error) {
      console.error(error);
      setErrorMessage("Não foi possível registrar sua reserva agora.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {loadingProfile ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/65">
          Carregando seus dados...
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-white">
            Nome completo
          </label>
          <input
            type="text"
            value={form.fullName ?? ""}
            onChange={(e) => updateField("fullName", e.target.value)}
            placeholder="Seu nome"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-orange-400/40"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-white">
            E-mail
          </label>
          <input
            type="email"
            value={form.email ?? ""}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="voce@email.com"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-orange-400/40"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-white">
            WhatsApp
          </label>
          <input
            type="text"
            value={form.whatsapp ?? ""}
            onChange={(e) => updateField("whatsapp", e.target.value)}
            placeholder="(11) 99999-9999"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-orange-400/40"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-white">
            Quantidade desejada
          </label>
          <select
            value={form.quantity ?? "1"}
            onChange={(e) => updateField("quantity", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#111317] px-4 py-3 text-sm text-white outline-none transition focus:border-orange-400/40"
          >
            <option value="1">1 unidade</option>
            <option value="2">2 unidades</option>
          </select>
          <p className="mt-2 text-xs text-white/50">
            Limite de 2 unidades por deck, por cliente.
          </p>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-white">
          Deck
        </label>
        <select
          value={form.deck ?? ""}
          onChange={(e) => updateField("deck", e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-[#111317] px-4 py-3 text-sm text-white outline-none transition focus:border-orange-400/40"
        >
          <option value="">Selecione um deck</option>
          <option value="Aggressive Negotiations">Aggressive Negotiations</option>
          <option value="Master and Apprentice">Master and Apprentice</option>
          <option value="Against the Odds">Against the Odds</option>
          <option value="Blood Brothers">Blood Brothers</option>
        </select>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-white/65">
        Ao enviar este formulário, você demonstra interesse na pré-venda. A
        reserva estará sujeita à disponibilidade de estoque e confirmação
        posterior da equipe da Bodega Galática.
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          {successMessage}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting || loadingProfile}
          className="rounded-full bg-gradient-to-r from-orange-400 to-orange-500 px-6 py-3 text-sm font-semibold text-[#0B0C10] transition hover:from-orange-500 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Enviando..." : "Enviar solicitação"}
        </button>

        <a
          href="/"
          className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Voltar para a home
        </a>
      </div>
    </form>
  );
}