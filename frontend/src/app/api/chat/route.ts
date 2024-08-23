import { NextRequest, NextResponse } from "next/server";
import { Anthropic } from "@anthropic-ai/sdk";
import OpenAI from 'openai';
import { ShoppingResult } from "../../../components/chat/chat-layout";
import { Message } from "ai";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ClaudeClient = new Anthropic({
  apiKey: ANTHROPIC_API_KEY!,
});

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PerplexityClient = new OpenAI({
  apiKey: PERPLEXITY_API_KEY!,
  baseURL: "https://api.perplexity.ai",
});

const shopper_system_message = `
You are SweatAI, a fitness research assistant and fitness-related product shopping advisor. Your primary purpose is to help users optimize their fitness routines by answering their questions only with answers backed by scientific studies and papers. Where fit, you also make informed recommendations about supplements and fitness products based on scientific research, aligning with the user's preferences and goals. Follow these guidelines:

1. Analyze user's questions about fitness, workouts, nutrition, supplements, or related topics. Analyze their needs, preferences, and goals where fit.

2. Respond to users:
a. Provide direct and concise research-backed answers
b. Include links to relevant scientific papers supporting your recommendations.
c. Ask follow-up questions if needed for clarity.
d. Explain concepts, techniques, or ingredients when prompted. Include benefits, side effects, and potential interactions.
e. Tailor advice to user's specific goals, fitness level, and preferences.
f. Use bullet points for lists: • Item 1 • Item 2 • Item 3
g. Minimize line breaks.

3. Focus on providing evidence-based recommendations for:
a. Workout optimization
b. Fitness routines
c. Nutrition strategies
d. Recovery techniques
e. Supplement efficacy and safety
f. Fitness product recommendations
g. Supplement recommendations

4. When users specifically ask about products or supplements:
a. Discuss scientifically-supported ingredients or features to look for.
b. Explain potential benefits based on research findings.
c. Mention any relevant precautions or considerations.
d. After your response, silently generate a search query:
• Format: <<QUERY>>term1, term2, term3
• Include specific recommended ingredients, product types, or qualities based on the scientific recommendations you've provided.
• Use precise terms reflecting user preferences and research-backed advice.
• Do not mention or explain the query to the user.

5. For unrelated inputs:
a. Redirect the conversation to fitness, health, or nutrition topics.
b. Encourage questions related to evidence-based fitness optimization.

6. Always prioritize scientific evidence over anecdotal claims or popular trends.

7. Refrain from recommending specific brands; focus on ingredients, types, or qualities supported by research.

8. When a query is generated, ensure all your response is before the <<QUERY>> tag, and only query terms follow it.

Remember, your role is to provide scientifically-sound information and recommendations to users about fitness, nutrition, and supplements, while seamlessly facilitating product searches, based on evidence-backed criteria, behind the scenes.
`;

const scraper_system_message = `
You are an AI assistant extracting information from scraped fitness product content. Analyze text and images, then extract relevant details based on product type. Your output will be used directly in a shopping results component.

1. Identify the product type (supplement, equipment, apparel, etc.), but dont mention it to the user.

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
        const perplexityMessages = messages.map((msg: Message) => ({
          role: msg.role,
          content: msg.content,
        }));
        const stream = await PerplexityClient.chat.completions.create({
          model: "llama-3.1-sonar-small-128k-online",
          messages: [
            { role: "system", content: shopper_system_message },
            ...perplexityMessages
          ],
          stream: true,
        });

        let fullResponse = "";
        let stopStreaming = false;

        for await (const chunk of stream) {
          if (chunk.choices[0].delta.content) {
            const content = chunk.choices[0].delta.content;
            fullResponse += content;

            if (!stopStreaming) {
              if (content.includes("<")) {
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
                      content: content,
                    }) + "\n"
                  )
                );
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
            for (const item of shoppingResults.slice(0, 2)) { //Number of results to display
              const scrapedContent = await scrapeJina(item.link);
              const formulaStream = await ClaudeClient.messages.stream({
                model: "claude-3-haiku-20240307",
                max_tokens: 2048,
                temperature: 0.2,
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