import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { description, categories } = await request.json();

    if (!description || !categories?.length) {
      return NextResponse.json(
        { error: "description and categories required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a Finnish construction cost categorization assistant. Given a cost description and a list of budget categories, return the best matching category as JSON:
{
  "category_name": "matched category name",
  "confidence": 0.95
}
If no category matches well, return { "category_name": null, "confidence": 0 }.`,
          },
          {
            role: "user",
            content: `Kuvaus: "${description}"\n\nKategoriat: ${categories.join(", ")}`,
          },
        ],
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Categorization failed" }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return NextResponse.json({ category_name: null, confidence: 0 });
    }

    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (error) {
    console.error("Categorize error:", error);
    return NextResponse.json({ error: "Categorization failed" }, { status: 500 });
  }
}
