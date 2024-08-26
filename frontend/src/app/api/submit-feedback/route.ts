import { NextResponse } from "next/server";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/xkgwnkdb";

export async function POST(request: Request) {
  try {
    const { feedback } = await request.json();

    const response = await fetch(FORMSPREE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: feedback }),
    });

    if (!response.ok) {
      throw new Error("Failed to submit feedback");
    }

    return NextResponse.json(
      { message: "Feedback sent successfully!" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error sending feedback:", error);
    return NextResponse.json(
      { message: "Error sending feedback" },
      { status: 500 }
    );
  }
}
