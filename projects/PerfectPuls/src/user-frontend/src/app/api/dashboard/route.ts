import { NextResponse } from "next/server";

export async function GET() {
  const backendBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:8000";

  try {
    const response = await fetch(`${backendBaseUrl}/api/dashboard-data`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    } else {
      const errorText = await response.text();
      return NextResponse.json({
        status: "error",
        message: `Backend dashboard request failed: ${errorText}`,
        availableMonths: [],
        monthlyData: {},
        yearData: {
          totalSaved: 0,
          outOfPocketAvoided: 0,
          categories: [],
          recentActivity: [],
        },
      });
    }
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({
      status: "error",
      message: "Backend connection failed while loading dashboard data",
      availableMonths: [],
      monthlyData: {},
      yearData: {
        totalSaved: 0,
        outOfPocketAvoided: 0,
        categories: [],
        recentActivity: [],
      },
    });
  }
}