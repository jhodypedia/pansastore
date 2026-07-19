interface PakasirBasePayload {
  project: string;
  api_key: string;
  order_id: string;
  amount: number;
}

export interface PakasirQrisPayload extends PakasirBasePayload {}
export interface PakasirCheckPayload extends PakasirBasePayload {}
export interface PakasirCancelPayload extends PakasirBasePayload {}

export type PakasirApiResult<T = any> = {
  ok: boolean;
  status: number;
  data: T;
};

const PAKASIR_BASE_URL = "https://app.pakasir.com/api";
const DEFAULT_TIMEOUT_MS = 20_000;

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

async function parseJsonSafe(response: Response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {
      message: "Invalid JSON response from Pakasir",
      raw: text,
    };
  }
}

export const pakasirSDK = {
  async createQris(payload: PakasirQrisPayload): Promise<PakasirApiResult> {
    try {
      const response = await fetchWithTimeout(
        `${PAKASIR_BASE_URL}/transactioncreate/qris`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await parseJsonSafe(response);
      return { ok: response.ok, status: response.status, data };
    } catch (error) {
      console.error("[Pakasir SDK] Create QRIS Error:", error);
      throw error;
    }
  },

  async checkTransaction(
    payload: PakasirCheckPayload
  ): Promise<PakasirApiResult> {
    try {
      const queryParams = new URLSearchParams({
        project: payload.project,
        api_key: payload.api_key,
        order_id: payload.order_id,
        amount: String(payload.amount),
      }).toString();

      const response = await fetchWithTimeout(
        `${PAKASIR_BASE_URL}/transactiondetail?${queryParams}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data = await parseJsonSafe(response);
      return { ok: response.ok, status: response.status, data };
    } catch (error) {
      console.error("[Pakasir SDK] Check Transaction Error:", error);
      throw error;
    }
  },

  async cancelTransaction(
    payload: PakasirCancelPayload
  ): Promise<PakasirApiResult> {
    try {
      const response = await fetchWithTimeout(
        `${PAKASIR_BASE_URL}/transactioncancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await parseJsonSafe(response);
      return { ok: response.ok, status: response.status, data };
    } catch (error) {
      console.error("[Pakasir SDK] Cancel Transaction Error:", error);
      throw error;
    }
  },
};
