import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AiTipInput {
  topCategory: string | null;
  topShare: number;
  totalMonth: number;
  prevMonthTotal: number;
  predictedMonthEnd: number;
  budget: number;
}

function generateTip(input: AiTipInput): string {
  const {
    topCategory,
    topShare,
    totalMonth,
    prevMonthTotal,
    predictedMonthEnd,
    budget,
  } = input;

  const percentOverBudget = budget > 0 ? ((predictedMonthEnd - budget) / budget) * 100 : 0;
  const monthOverMonthChange = prevMonthTotal > 0
    ? ((totalMonth - prevMonthTotal) / prevMonthTotal) * 100
    : 0;
  const daysLeft = getDaysLeftInMonth();
  const dailyAvg = getSpendingDaysPassed() > 0 ? totalMonth / getSpendingDaysPassed() : 0;
  const safeToSpend = budget > 0
    ? Math.max(0, (budget - totalMonth) / daysLeft)
    : dailyAvg;

  // Budget critical (over 20%)
  if (budget > 0 && percentOverBudget > 20) {
    return `Budget alert: You're projected to exceed by ${Math.round(percentOverBudget)}%. Pause non-essential ${topCategory || 'spending'} now.`;
  }

  // Budget warning (over 10%)
  if (budget > 0 && percentOverBudget > 10) {
    return `Slow down on ${topCategory || 'spending'} to stay under your ${formatCurrency(budget)} budget this month.`;
  }

  // High category concentration
  if (topShare > 0.5 && topCategory) {
    return `${topCategory} is ${Math.round(topShare * 100)}% of your spending. Consider diversifying your expenses.`;
  }

  // Spending increased significantly vs last month
  if (prevMonthTotal > 0 && monthOverMonthChange > 30) {
    return `Spending is up ${Math.round(monthOverMonthChange)}% from last month. Review recent ${topCategory || 'purchases'}.`;
  }

  // Good progress - under budget
  if (budget > 0 && predictedMonthEnd < budget * 0.9) {
    const savings = budget - predictedMonthEnd;
    return `Great job! You're on track to save ${formatCurrency(savings)} this month. Keep it up!`;
  }

  // On track with budget
  if (budget > 0 && predictedMonthEnd <= budget) {
    return `On track! You can safely spend ${formatCurrency(safeToSpend)}/day for the rest of the month.`;
  }

  // Spending decreased vs last month
  if (prevMonthTotal > 0 && monthOverMonthChange < -20) {
    return `Excellent! Spending is down ${Math.abs(Math.round(monthOverMonthChange))}% from last month. Stay disciplined!`;
  }

  // No budget set
  if (budget === 0) {
    return `Set a monthly budget to get personalized spending insights and stay on track.`;
  }

  // Low spending days left
  if (daysLeft <= 5 && budget > 0 && predictedMonthEnd <= budget) {
    return `Final stretch! ${daysLeft} days left. You have ${formatCurrency(budget - totalMonth)} remaining in budget.`;
  }

  // Default tip
  return `Track your ${topCategory || 'daily expenses'} to identify patterns and optimize your budget.`;
}

function formatCurrency(amount: number): string {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  } else if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return `₹${Math.round(amount)}`;
}

function getDaysLeftInMonth(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.getDate() - now.getDate();
}

function getSpendingDaysPassed(): number {
  const now = new Date();
  return now.getDate();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const input: AiTipInput = await req.json();
    const tip = generateTip(input);

    return new Response(JSON.stringify({ tip, error: null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ tip: null, error: "parse-error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
