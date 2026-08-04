export type SendOrderConfirmationEmailResult = {
  ok: boolean
  email_sent: boolean
  already_sent: boolean
  provider_message_id: string | null
  recipient_email: string | null
  warning: string | null
}

type EdgeFunctionResponse = {
  ok?: boolean
  email_sent?: boolean
  already_sent?: boolean
  provider_message_id?: string | null
  recipient_email?: string | null
  warning?: string | null
  error?: string | null
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Variável de ambiente ausente: ${name}`)
  }

  return value
}

function validateOrderId(orderId: string) {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  if (!uuidPattern.test(orderId)) {
    throw new Error(
      "order_id inválido para envio da confirmação de compra."
    )
  }
}

export async function sendOrderConfirmationEmail(
  rawOrderId: string
): Promise<SendOrderConfirmationEmailResult> {
  const orderId = String(rawOrderId ?? "").trim()

  validateOrderId(orderId)

  const supabaseUrl = requiredEnv("SUPABASE_URL")
    .replace(/\/+$/, "")

  const serviceRoleKey = requiredEnv(
    "SUPABASE_SERVICE_ROLE_KEY"
  )

  let response: Response

  try {
    response = await fetch(
      `${supabaseUrl}/functions/v1/send-order-confirmation-email`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: orderId,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      }
    )
  } catch (error) {
    throw new Error(
      `Não foi possível conectar ao serviço de confirmação de compra: ${
        error instanceof Error
          ? error.message
          : String(error)
      }`
    )
  }

  const responseText = await response.text()

  let responseBody: EdgeFunctionResponse = {}

  try {
    responseBody = responseText
      ? JSON.parse(responseText)
      : {}
  } catch {
    responseBody = {
      error:
        responseText ||
        "Resposta inválida do serviço de confirmação de compra.",
    }
  }

  if (!response.ok || responseBody.ok !== true) {
    throw new Error(
      String(
        responseBody.error ??
          `Falha ao enviar confirmação de compra. HTTP ${response.status}.`
      )
    )
  }

  return {
    ok: true,
    email_sent: responseBody.email_sent === true,
    already_sent:
      responseBody.already_sent === true,
    provider_message_id:
      responseBody.provider_message_id ?? null,
    recipient_email:
      responseBody.recipient_email ?? null,
    warning: responseBody.warning ?? null,
  }
}