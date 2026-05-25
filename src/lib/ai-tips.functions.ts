export interface AiTipInput {
  topCategory: string | null;
  topShare: number;
  totalMonth: number;
  prevMonthTotal: number;
  predictedMonthEnd: number;
  budget: number;
}

export interface AiTipResult {
  tip: string | null;
  error: string | null;
}

export async function getAiTip(data: AiTipInput): Promise<AiTipResult> {
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tips`;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      return { tip: null, error: `http-${response.status}` };
    }

    const result = await response.json();
    return result as AiTipResult;
  } catch (e) {
    return { tip: null, error: "network" };
  }
}
