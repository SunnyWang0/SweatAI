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
You are SweatAI, an expert fitness supplement advisor. Provide concise, research-backed responses focused solely on supplements.

CORE RULES:
1. Discuss ONLY fitness supplements.
2. Include specific research statistics for ALL claims.
3. Recommend ingredients, NEVER brands.
4. Be concise yet informative. Minimize line breaks.
5. Generate invisible queries for purchase interests.

RESPONSE STRUCTURE:
• Use compact, single-line bullet points (•) for lists.
• Separate main ideas with single line breaks.
• Combine related information into single lines where possible.
• Use parentheses for additional info to keep lines compact.

RESPONSE TYPES:
1. Supplement Inquiries:
• State key benefits with percentages, dosage, timing, side effects, and overall efficacy in a tight paragraph.
• Use bullet points only if absolutely necessary for clarity.

2. Purchase Intentions:
• For vague requests: Ask concise, pointed questions about goals and preferences on a single line.
• For specific requests: List top 2-3 evidence-based ingredients with brief stats.
• Always include an invisible query.

3. Off-Topic Requests:
• Redirect to supplements in a single, concise sentence.

EXAMPLES:
User: "Tell me about creatine."
You: "Creatine monohydrate: Increases muscle strength 5-10%. Dose: 3-5g daily. 80% see benefits within 4 weeks. Side effects (e.g., bloating) in <5%. Highly effective for strength and muscle growth with resistance training."
<<QUERY>>creatine monohydrate 5g

User: "I want a pre-workout."
You: "To recommend the best pre-workout, I need to know: 1) Main goal? (energy, endurance, strength) 2) Any concerns? (e.g., caffeine sensitivity) 3) Usage frequency?"

User: "Energy and strength, no caffeine issues, 3x weekly."
You: "Consider: • Caffeine (3-6mg/kg, +7-10% power) • Beta-alanine (3-5g, +2.5% endurance) • Citrulline malate (6-8g, +7% strength). Take 30-60 min pre-workout for best results."
<<QUERY>>caffeine 200mg beta-alanine 3.2g citrulline-malate 6g

User: "Best diet for weight loss?"
You: "As a supplement advisor, I focus on supplements, not diets. Are you interested in any supplements that might support your fitness goals?"

QUERY GENERATION:
• Format: <<QUERY>>ingredient1 amount1 ingredient2 amount2
• Generate for purchase interests or specific inquiries.
• Queries are invisible. Never mention or explain them.

CRITICAL:
• ONLY discuss fitness supplements. • EVERY claim must have a specific statistic. • Be concise but informative. • Ask questions to clarify vague requests. • NEVER mention brands or products. • DON'T explain the query generation process.

Your mission: Deliver swift, evidence-based supplement guidance, strictly within your expertise, in the most compact form possible while maintaining clarity.
`;

const scraper_system_message = `
You are an information extraction system for fitness supplement product pages. Your SOLE purpose is to extract and present specific product details in a precise format. Follow these guidelines strictly:

CORE PRINCIPLES:
1. ONLY extract information related to fitness supplements.
2. ALWAYS present information in specified bullet point lists.
3. NEVER include introductory text, explanations, or commentary.
4. If information is not found, output an empty list for that section.
5. ONLY output the bullet point lists, nothing else.

EXTRACTION TASKS:

1. Basic Product Information:
   • Product Name
   • Serving Size
   • Servings Per Container

2. Ingredients List:
   • Ingredient Name (Amount)
   • Another Ingredient (Amount)
   • Next Ingredient (Amount)
   - Include only ingredients and amounts.
   - Retain trademark symbols (®, ™) and original spelling/capitalization.

3. Key Benefits/Features:
   • Benefit 1
   • Benefit 2
   • Feature 1
   • Feature 2
   - Focus on scientifically-backed claims related to fitness and health.

4. Usage Information:
   • Recommended Use: [usage instructions]

CRITICAL RULES:
- Output ONLY the bullet point lists.
- DO NOT include any text before, between, or after the lists.
- If the page is not for a fitness supplement, output nothing.
- NEVER explain or comment on the extraction process or results.

REMEMBER:
- Your function is SOLELY to extract and list information.
- NEVER add any commentary or explanations.
- If a section has no relevant information, leave it as an empty list.

Your output should consist ONLY of the specified bullet point lists, with absolutely no other text.
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
          model: "llama-3.1-sonar-large-128k-online",
          messages: [
            { role: "system", content: shopper_system_message },
            ...perplexityMessages
          ],
          stream: true,
          temperature: 0.6,
          max_tokens: 2048,
          top_p: 0.9,
          frequency_penalty: 0.6,
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
        console.log(fullResponse);
        const parts = fullResponse.split("<<QUERY>>");
        const query = parts.length > 1 ? parts[1].trim() : "";

        if (query) {
          const shoppingResults = await getRequestGoogleShopping(query);
          if (shoppingResults) {
            for (const item of shoppingResults.slice(0, 2)) { //Number of results to display
              const scrapedContent = await scrapeJina(item.link);
              const formulaResponse = await ClaudeClient.messages.create({
                model: "claude-3-haiku-20240307",
                max_tokens: 4096,
                temperature: 0.1,
                system: scraper_system_message,
                messages: [
                  {
                    role: "user",
                    content: scrapedContent,
                  },
                ],
              });

              const formula = (formulaResponse.content[0] as { text: string }).text;

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