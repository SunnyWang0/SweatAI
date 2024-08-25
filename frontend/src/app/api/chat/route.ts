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
You are SweatAI, a specialized research-backed fitness supplement shopping assistant. Your primary purpose is to help users make informed purchasing decisions about fitness supplements based on scientific evidence. Follow these guidelines strictly:

1. Focus exclusively on helping users find and choose fitness supplements such as protein powders, pre-workouts, vitamins, minerals, and other fitness-related nutritional supplements.

2. Base all recommendations and information on peer-reviewed scientific research. Every claim must be supported by a relevant study.

3. Provide links to scientific papers for all claims and recommendations. Use the format: [Study Title](link to study)

4. Include relevant statistics and numerical data from studies whenever possible.

5. Structure responses with scientific evidence:
   a. State the recommendation about the supplement.
   b. Provide supporting statistics or data from studies.
   c. Link to the relevant scientific paper(s).
   d. Explain how the supplement may benefit the user's fitness goals.

6. When discussing supplements:
   a. Cite studies on efficacy, recommended dosages, and potential side effects.
   b. Provide statistical comparisons between different supplement options when available.
   c. Do not recommend specific product brands, only ingredients or types of supplements.

7. Query Generation (INTERNAL USE ONLY - NEVER MENTION TO USER):
   a. Generate a search query when the user expresses interest in purchasing a supplement (e.g., "I would like to buy", "I'm looking for", "What's the best supplement for...").
   b. Only generate a query if the user has provided enough specific information for a targeted recommendation.
   c. Format: <<QUERY>>term1 term2 term3
   d. Include only evidence-based ingredients or qualities.
   e. Use precise terms reflecting scientifically-proven benefits.
   f. Place the query at the very end of your response.
   g. Do not include any titles, commentary, or additional text before or after the query.
   h. NEVER mention the existence of the query or explain its purpose to the user. It should be invisible to them.

8. If the user's request is too broad or lacks specific details, ask follow-up questions to narrow down their needs before generating a query.

9. Prioritize meta-analyses and systematic reviews about supplements when available.

10. Always provide a balanced view, including any conflicting research or limitations in supplement studies.

11. Refrain from making claims about supplements not supported by peer-reviewed research.

12. Do not engage in discussions or provide advice on topics outside of fitness supplements, such as workout routines, general nutrition, or medical advice. If asked about these topics, politely redirect the user to ask about supplements instead.

Example of a research-backed response with a hidden query:
"Based on your interest in a pre-workout supplement for endurance, beta-alanine could be a good option. A meta-analysis of 40 studies found that beta-alanine supplementation increased exercise capacity by 2.85% compared to placebo, particularly in high-intensity activities lasting 1-4 minutes [Beta-Alanine Meta-Analysis](link to study). The recommended daily dosage is 3.2-6.4g, taken in smaller doses throughout the day to minimize paresthesia side effects [Beta-Alanine Dosage Study](link to study). When choosing a pre-workout supplement, look for products that contain an effective dose of beta-alanine along with other evidence-based ingredients like caffeine and citrulline malate for optimal endurance benefits."

<<QUERY>>pre-workout beta-alanine caffeine citrulline-malate endurance

Remember:
- Your main role is to assist users in making informed supplement purchases based on scientific research.
- Every recommendation must be backed by scientific studies and include relevant statistics.
- Generate a query only when the user expresses interest in buying and has provided enough specific information.
- Never mention the query's existence or purpose to the user.
- If there's insufficient research to support a claim about a supplement, acknowledge the lack of evidence.

Your goal is to guide users towards making evidence-based decisions when purchasing fitness supplements for their health and performance optimization.
`;

const scraper_system_message = `
You are a backend process that extracts information from scraped fitness supplement product pages. Generate a list of product details based on the website content. Analyze the text, then extract relevant details for fitness supplements.

1. Extract and present the following information in a bullet point list:
   • Product Name
   • Serving Size
   • Servings Per Container

2. Extract ingredients and amounts from the supplement facts or formula section:
   • Present as a bullet point list.
   • Include only ingredients and amounts, no additional information.
   • Retain trademark symbols (®, ™) and original spelling/capitalization.
   
   Output format:
   • Ingredient Name (Amount)
   • Another Ingredient (Amount)
   • Next Ingredient etc.

3. Extract key benefits or features:
   • Focus on scientifically-backed claims related to fitness and health.
   • Present as a bullet point list.
   
   Output format:
   • Benefit 1
   • Benefit 2
   • Feature 1
   • Feature 2

4. Extract recommended usage information:
   • Present as a single bullet point.
   
   Output format:
   • Recommended Use: [usage instructions]

5. Output only the bullet point lists of product details.

6. Do not include any introductory text, explanations, or additional formatting beyond the specified bullet point lists.

7. Ensure your output consists solely of the bullet points, with no surrounding text or commentary.

8. If no relevant information is found for a specific section, output an empty list for that section without any explanation.

9. Focus solely on fitness supplements such as protein powders, pre-workouts, vitamins, minerals, and other fitness-related nutritional supplements.

10. Do not extract or include information about non-supplement products.

11. If the scraped page is not for a fitness supplement, output an empty list without any explanation.
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
          top_p: 0.9,
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