import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type BuylistBatchItem = {
  sku_key: string;
  quantity: number;
};

type CreateBatchBody = {
  user_id?: string;
  cash_items?: BuylistBatchItem[];
  store_credit_items?: BuylistBatchItem[];
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  cpf: string | null;
  pix_key: string | null;
};

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

function onlyDigits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function hasText(value: string | null | undefined) {
  return String(value ?? "").trim().length > 0;
}

function normalizeItems(items: unknown): BuylistBatchItem[] {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const raw = item as Partial<BuylistBatchItem>;

      return {
        sku_key: String(raw.sku_key ?? "").trim(),
        quantity: Math.max(1, Number(raw.quantity ?? 1) || 1),
      };
    })
    .filter((item) => item.sku_key.length > 0);
}

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, {
        ok: false,
        error: "Missing Supabase server environment variables.",
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const body = (await req.json().catch(() => null)) as CreateBatchBody | null;

    const userId = String(body?.user_id ?? "").trim();
    const cashItems = normalizeItems(body?.cash_items);
    const storeCreditItems = normalizeItems(body?.store_credit_items);

    if (!userId) {
      return json(400, {
        ok: false,
        error: "missing_user_id",
      });
    }

    if (cashItems.length === 0 && storeCreditItems.length === 0) {
      return json(400, {
        ok: false,
        error: "empty_items",
      });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, phone, cpf, pix_key")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      return json(500, {
        ok: false,
        error: "profile_lookup_failed",
        detail: profileError.message,
      });
    }

    const userProfile = profile as ProfileRow | null;

    if (!userProfile) {
      return json(409, {
        ok: false,
        error: "profile_not_found",
        code: "MISSING_REQUIRED_PROFILE",
        redirect_to: "/minha-conta?next=/vender/checkout&missingProfile=1",
      });
    }

    const missingFields: string[] = [];

    if (!hasText(userProfile.full_name)) missingFields.push("full_name");
    if (!hasText(userProfile.phone)) missingFields.push("phone");

    const cpfDigits = onlyDigits(userProfile.cpf);
    if (!cpfDigits || cpfDigits.length !== 11) missingFields.push("cpf");

    if (cashItems.length > 0 && !hasText(userProfile.pix_key)) {
      missingFields.push("pix_key");
    }

    if (missingFields.length > 0) {
      return json(409, {
        ok: false,
        error: "missing_required_profile",
        code: "MISSING_REQUIRED_PROFILE",
        missing_fields: missingFields,
        redirect_to: "/minha-conta?next=/vender/checkout&missingProfile=1",
      });
    }

    const checkoutGroupId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : undefined;

    const offers: unknown[] = [];

    if (cashItems.length > 0) {
      const { data, error } = await supabaseAdmin.rpc(
        "create_buylist_offer_multi",
        {
          p_user_id: userId,
          p_requested_payout_type: "cash",
          p_items: cashItems,
          p_checkout_group_id: checkoutGroupId,
        }
      );

      if (error) {
        return json(400, {
          ok: false,
          error: "cash_offer_failed",
          detail: error.message,
        });
      }

      offers.push(data);
    }

    if (storeCreditItems.length > 0) {
      const { data, error } = await supabaseAdmin.rpc(
        "create_buylist_offer_multi",
        {
          p_user_id: userId,
          p_requested_payout_type: "store_credit",
          p_items: storeCreditItems,
          p_checkout_group_id: checkoutGroupId,
        }
      );

      if (error) {
        return json(400, {
          ok: false,
          error: "store_credit_offer_failed",
          detail: error.message,
        });
      }

      offers.push(data);
    }

    return json(200, {
      ok: true,
      checkout_group_id: checkoutGroupId,
      offers,
    });
  } catch (err: any) {
    return json(500, {
      ok: false,
      error: "unexpected_error",
      detail: err?.message ?? String(err),
    });
  }
}