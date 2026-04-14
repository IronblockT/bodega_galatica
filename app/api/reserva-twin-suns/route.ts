import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const allowedDecks = [
  "Aggressive Negotiations",
  "Master and Apprentice",
  "Against the Odds",
  "Blood Brothers",
] as const;

type AllowedDeck = (typeof allowedDecks)[number];

type ReservationPayload = {
  fullName?: string;
  email?: string;
  whatsapp?: string;
  deck?: string;
  quantity?: string | number;
};

function isValidDeck(deck: string): deck is AllowedDeck {
  return allowedDecks.includes(deck as AllowedDeck);
}

export async function POST(req: Request) {
  try {
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { ok: false, error: "Missing Supabase server environment variables." },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const accessToken = authHeader.replace("Bearer ", "").trim();
    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: authError,
    } = await admin.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "Invalid session." },
        { status: 401 }
      );
    }

    const body = (await req.json()) as ReservationPayload;

    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim();
    const whatsapp = String(body.whatsapp ?? "").trim();
    const deck = String(body.deck ?? "").trim();
    const quantity = Number(body.quantity);

    if (fullName.length < 3) {
      return NextResponse.json(
        { ok: false, error: "Nome inválido." },
        { status: 400 }
      );
    }

    if (email.length < 5 || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "E-mail inválido." },
        { status: 400 }
      );
    }

    if (!isValidDeck(deck)) {
      return NextResponse.json(
        { ok: false, error: "Deck inválido." },
        { status: 400 }
      );
    }

    if (![1, 2].includes(quantity)) {
      return NextResponse.json(
        { ok: false, error: "Quantidade inválida." },
        { status: 400 }
      );
    }

    const { data: existingRows, error: existingError } = await admin
      .from("twin_suns_reservations")
      .select("id, quantity")
      .eq("user_id", user.id)
      .eq("deck", deck)
      .in("status", ["pending", "confirmed"]);

    if (existingError) {
      return NextResponse.json(
        { ok: false, error: "Erro ao validar reserva existente." },
        { status: 500 }
      );
    }

    const alreadyReserved = (existingRows ?? []).reduce(
      (sum, row) => sum + Number(row.quantity ?? 0),
      0
    );

    if (alreadyReserved + quantity > 2) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Você já possui uma reserva deste deck. O limite é de 2 unidades por deck, por cliente.",
        },
        { status: 400 }
      );
    }

    const { data: inserted, error: insertError } = await admin
      .from("twin_suns_reservations")
      .insert({
        user_id: user.id,
        full_name: fullName,
        email,
        phone: whatsapp || null,
        deck,
        quantity,
        status: "pending",
      })
      .select("id, deck, quantity, created_at")
      .single();

    if (insertError) {
      return NextResponse.json(
        { ok: false, error: "Erro ao gravar reserva." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      reservation: inserted,
      message:
        "Reserva registrada com sucesso. Nossa equipe usará seus dados para contato quando a disponibilidade for confirmada.",
    });
  } catch (error) {
    console.error("POST /api/reserva-twin-suns error:", error);

    return NextResponse.json(
      { ok: false, error: "Erro inesperado ao processar a reserva." },
      { status: 500 }
    );
  }
}