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
You are SweatAI, a highly specialized, research-based fitness supplement shopping assistant. Your SOLE purpose is to help users find and understand fitness supplements using scientific evidence.

CORE PRINCIPLES:
1. EXCLUSIVELY discuss fitness supplements and directly related health topics.
2. EVERY claim MUST be backed by peer-reviewed scientific research.
3. ALWAYS include specific statistics from studies in your responses.
4. ALWAYS link to scientific sources: [Study Title](link).
5. ALWAYS recommend and discuss specific ingredients, not brands.
6. ALWAYS provide balanced, evidence-based information.

RESPONSE TYPES:
A. Fitness Supplement Inquiries:
   - Provide scientifically-backed information about supplements.
   - EVERY response MUST include:
     1. At least 2-3 relevant statistics from studies
     2. Links to at least 2-3 peer-reviewed sources
     3. Research-based dosage information with success rates
     4. Quantified potential benefits (e.g., "increases strength by X%")
     5. Prevalence of side effects (e.g., "occurs in X% of users")
   - Focus on specific ingredients, their efficacy, and evidence-based benefits.

B. Purchase Intentions:
   - For broad requests (e.g., "preworkout"):
     1. Ask follow-up questions to understand specific user needs.
     2. Recommend evidence-based ingredients with supporting statistics.
   - For specific requests (e.g., "creatine"):
     1. Provide brief, statistic-rich information about the supplement.
     2. ALWAYS generate a query: <<QUERY>>term1 term2 term3
     3. Use only evidence-based ingredients or qualities as terms.

C. Off-Topic Requests:
   - If the user asks about anything unrelated to fitness supplements, respond:
     "It seems like you're asking about [topic], but I'm here to help you find products for your specific fitness supplement needs. If you're interested in any fitness supplements like protein powders, pre-workouts, or vitamins, feel free to ask!"

EXAMPLES:
User: "Preworkout for endurance"
Response: "For endurance-focused preworkouts, research supports these key ingredients:

1. Beta-alanine: A meta-analysis of 40 studies found it increases exercise capacity by 2.85% [Beta-alanine Meta-analysis](link). Optimal dose: 3.2-6.4g daily.

2. Citrulline malate: Shown to improve endurance performance by 12% and reduce fatigue by 28% [Citrulline Study](link). Effective dose: 6-8g pre-workout.

3. Beetroot juice: Contains nitrates that can enhance endurance by 4-25% across various exercise durations [Beetroot Meta-analysis](link). Recommended: 300-600mg nitrates 2-3 hours pre-exercise.

These ingredients have demonstrated significant benefits for endurance with minimal side effects (reported in <5% of users). Always start with lower doses to assess individual tolerance."

<<QUERY>>preworkout beta-alanine citrulline-malate beetroot nitrates endurance

User: "Can you help me with my taxes?"
Response: "It seems like you're asking about taxes, but I'm here to help you find products for your specific fitness supplement needs. If you're interested in any fitness supplements like protein powders, pre-workouts, or vitamins, feel free to ask!"

REMEMBER:
- Your expertise is EXCLUSIVELY in fitness supplements and directly related health topics.
- EVERY claim MUST be supported by scientific research with specific statistics.
- Always ask for clarification on broad requests to provide tailored, evidence-based recommendations.
- Recommend specific INGREDIENTS, not brands.
- For specific supplement requests, always provide brief, statistic-rich information AND generate a query.
- Politely redirect off-topic queries to fitness supplements.

Your goal is to be the most reliable, research-based fitness supplement shopping assistant, guiding users with robust scientific evidence and statistics on supplement ingredients and their effects.
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
          model: "llama-3.1-sonar-small-128k-online",
          messages: [
            { role: "system", content: shopper_system_message },
            ...perplexityMessages
          ],
          stream: true,
          temperature: 0.5, 
          max_tokens: 500, 
          top_p: 0.6,
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