import { NextRequest, NextResponse } from "next/server";
import { Anthropic } from "@anthropic-ai/sdk";
import { ShoppingResult } from "../../../components/chat/chat-layout";
import { Message } from "ai";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const client = new Anthropic({
  apiKey: ANTHROPIC_API_KEY!,
});

const shopper_system_message = `
You are SweatAI, a fitness coach and supplement shopping assistant. Your primary purpose is to help users find suitable supplements and fitness products while answering their questions. Follow these guidelines:

1. Analyze user's needs, preferences, and questions about supplements, ingredients, or fitness products.
2. Respond to users:
a. Be direct and concise.
b. Ask follow-ups if needed.
c. Explain ingredients and benefits when prompted.
d. Tailor recommendations to user's workout style and goals.
e. Use bullet points for lists: • Item 1 • Item 2 • Item 3
f. Minimize line breaks.

3. After your response, silently generate a search query:
a. Format: <<QUERY>>term1, term2, term3
b. Query terms should be precise, reflect preferences, and use positive terms.
c. Include specific recommended ingredients, product types, or qualities.
d. Do not mention or explain the query to the user.

4. For unrelated inputs:
a. Redirect the conversation to fitness, supplements, or healthy living topics.
b. Encourage fitness/supplement-related questions.

5. Focus on recommending ingredients, product types, or qualities to look for, not specific brands.

6. Ensure all your response is before the <<QUERY>> tag, and only query terms follow it.

Remember, your role is to provide helpful information and recommendations to users about fitness and supplements, while seamlessly facilitating product searches behind the scenes.
`;

const scraper_system_message = `
You are an AI assistant extracting information from scraped fitness product content. Analyze text and images, then extract relevant details based on product type. Your output will be used directly in a shopping results component.

1. Identify the product type (supplement, equipment, apparel, etc.).

2. For supplements and food items:
   a. Extract ingredients and amounts from the formula section.
   b. Present as a numbered list.
   c. Include only ingredients and amounts, no additional information.
   d. Retain trademark symbols (®, ™) and original spelling/capitalization.

   Output format:
   1. Ingredient Name (Amount)
   2. Another Ingredient (Amount)
   3. Third Ingredient

3. For non-supplement products:
   a. Generate concise bullet-point description.
   b. Include specific details relevant for purchasing decisions.
   c. Use information from both text and images.
   d. Focus on key features, specifications, materials, and unique selling points.

   Output format:
   • Key Feature 1
   • Key Feature 2
   • Material/Construction
   • Dimensions/Size information
   • Unique characteristics

4. Only print product details/formula. Omit general statements or obvious information.
5. Do not include any text, explanations, or formatting beyond the specified output format for each product type.
6. Ensure your output is consistent and can be easily parsed by the shopping-results component.
`;

async function getRequestGoogleShopping(query: string) {
  const url = "https://www.searchapi.io/api/v1/search";
  const params = new URLSearchParams({
    engine: "google_shopping",
    q: query,
    location: "California,United States",
    api_key: process.env.GOOGLE_SHOPPING_API_KEY || "",
  });

  const response = await fetch(`${url}?${params}`);
  if (response.ok) {
    const data = await response.json();
    return data.shopping_results || [];
  } else {
    console.error(
      `Error: API request failed with status code ${response.status}`
    );
    return null;
  }
}

async function scrapeJina(url: string): Promise<string> {
  const response = await fetch("https://r.jina.ai/" + url);
  return response.text();
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const claudeMessages = messages.map((msg: Message) => ({
          role: msg.role,
          content: msg.content,
        }));
        const stream = await client.messages.stream({
          model: "claude-3-haiku-20240307",
          max_tokens: 2048,
          temperature: 0.6,
          system: shopper_system_message,
          messages: claudeMessages,
        });

        let fullResponse = "";
        let stopStreaming = false;

        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta") {
            if ("text" in chunk.delta) {
              fullResponse += chunk.delta.text;

              if (!stopStreaming) {
                if (chunk.delta.text.includes("<")) {
                  stopStreaming = true;
                  // Send the last part of the response before "<"
                  const lastValidPart = fullResponse.split("<")[0];
                  controller.enqueue(
                    encoder.encode(
                      JSON.stringify({
                        type: "assistant_response",
                        content: lastValidPart.slice(
                          lastValidPart.lastIndexOf("\n") + 1
                        ),
                      }) + "\n"
                    )
                  );
                } else {
                  controller.enqueue(
                    encoder.encode(
                      JSON.stringify({
                        type: "assistant_response",
                        content: chunk.delta.text,
                      }) + "\n"
                    )
                  );
                }
              }
            }
          }
        }

        // Process the full response after streaming is complete
        const parts = fullResponse.split("<<QUERY>>");
        const assistantResponse = parts[0].trim();
        const query = parts.length > 1 ? parts[1].trim() : "";

        if (query) {
          const shoppingResults = await getRequestGoogleShopping(query);
          if (shoppingResults) {
            for (const item of shoppingResults.slice(0, 4)) {
              const scrapedContent = await scrapeJina(item.link);
              const formulaStream = await client.messages.stream({
                model: "claude-3-haiku-20240307",
                max_tokens: 1024,
                temperature: 0.1,
                system: scraper_system_message,
                messages: [
                  {
                    role: "user",
                    content: `Here is the scraped content you need to analyze:\n\n<scraped_content>\n${scrapedContent}\n</scraped_content>`,
                  },
                ],
              });

              let formula = "";
              for await (const chunk of formulaStream) {
                if (chunk.type === "content_block_delta") {
                  if ("text" in chunk.delta) {
                    formula += chunk.delta.text;
                  }
                }
              }

              const result: ShoppingResult = {
                title: item.title,
                price: item.price,
                link: item.link,
                thumbnail: item.thumbnail,
                formula: formula.trim(),
              };
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({ type: "shopping_result", content: result }) +
                    "\n"
                )
              );
            }
          }
        }
      } catch (error) {
        console.error("Error in chat processing:", error);
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: "error",
              content: "An error occurred while processing your request.",
            }) + "\n"
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
    },
  });
}
