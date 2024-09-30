import { NextRequest, NextResponse } from "next/server";
import { Anthropic } from "@anthropic-ai/sdk";
import OpenAI from 'openai';
import { ShoppingResult } from "../../../components/chat/chat-layout";
import { Message } from "ai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const analyzerSystemMessage = `
You are an analyzer for SweatAI, a fitness supplement advisor. Your task is to analyze user input and determine which functions should be called next. Output a JSON object with boolean values for the following tags:
- greeting: User is greeting or starting a conversation
- aboutSweat: User is asking about SweatAI
- searchForProduct: User is looking for a specific product or supplement
- refineProductSearch: User wants more specific information about a product
- learnMore: User wants to learn more about supplements in general
- unrelatedRequest: User's request is unrelated to fitness supplements

Example output:
{
  "greeting": false,
  "aboutSweat": false,
  "searchForProduct": true,
  "refineProductSearch": false,
  "learnMore": false,
  "unrelatedRequest": false
}
`;

async function greeting(messages: Message[]) {
  const systemMessage = "You are a friendly greeter for SweatAI. Respond to the user's greeting warmly and ask how you can help with their supplement needs.";
  return PerplexityClient.chat.completions.create({
    model: "llama-3.1-sonar-small-128k-online",
    messages: [
      { role: "system", content: systemMessage },
      ...messages
    ],
    stream: true,
    temperature: 0.7,
    max_tokens: 150,
  });
}

async function aboutSweat(messages: Message[]) {
  const systemMessage = "You provide information about SweatAI. Explain that SweatAI is an AI-powered fitness supplement advisor that helps users find the best supplements based on scientific research.";
  return PerplexityClient.chat.completions.create({
    model: "llama-3.1-sonar-small-128k-online",
    messages: [
      { role: "system", content: systemMessage },
      ...messages
    ],
    stream: true,
    temperature: 0.6,
    max_tokens: 200,
  });
}

async function searchForProduct(messages: Message[]) {
  const systemMessage = "You are a product search expert. Help the user find specific supplements or products based on their needs and preferences.";
  return PerplexityClient.chat.completions.create({
    model: "llama-3.1-sonar-small-128k-online",
    messages: [
      { role: "system", content: systemMessage },
      ...messages
    ],
    stream: true,
    temperature: 0.8,
    max_tokens: 300,
  });
}

async function refineProductSearch(messages: Message[]) {
  const systemMessage = "You help refine product searches. Ask specific questions to narrow down the user's preferences and provide more targeted supplement recommendations.";
  return PerplexityClient.chat.completions.create({
    model: "llama-3.1-sonar-small-128k-online",
    messages: [
      { role: "system", content: systemMessage },
      ...messages
    ],
    stream: true,
    temperature: 0.7,
    max_tokens: 250,
  });
}

async function learnMore(messages: Message[]) {
  const systemMessage = "You are a supplement education expert. Provide detailed, scientific information about various fitness supplements, their benefits, and potential side effects.";
  return PerplexityClient.chat.completions.create({
    model: "llama-3.1-sonar-small-128k-online",
    messages: [
      { role: "system", content: systemMessage },
      ...messages
    ],
    stream: true,
    temperature: 0.6,
    max_tokens: 400,
  });
}

async function unrelatedRequest(messages: Message[]) {
  const systemMessage = "You politely redirect unrelated requests back to fitness supplements. Explain that you're specialized in fitness supplements and offer to help with any supplement-related questions.";
  return PerplexityClient.chat.completions.create({
    model: "llama-3.1-sonar-small-128k-online",
    messages: [
      { role: "system", content: systemMessage },
      ...messages
    ],
    stream: true,
    temperature: 0.6,
    max_tokens: 150,
  });
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Analyze user input
        const analyzerResponse = await ClaudeClient.messages.create({
          model: "claude-3-haiku-20240307",
          max_tokens: 150,
          temperature: 0.1,
          system: analyzerSystemMessage,
          messages: [{ role: "user", content: messages[messages.length - 1].content }],
        });

        const analysis = JSON.parse((analyzerResponse.content[0] as { text: string }).text);

        // Call appropriate function based on analysis
        let functionStream;
        if (analysis.greeting) functionStream = await greeting(messages);
        else if (analysis.aboutSweat) functionStream = await aboutSweat(messages);
        else if (analysis.searchForProduct) functionStream = await searchForProduct(messages);
        else if (analysis.refineProductSearch) functionStream = await refineProductSearch(messages);
        else if (analysis.learnMore) functionStream = await learnMore(messages);
        else if (analysis.unrelatedRequest) functionStream = await unrelatedRequest(messages);
        else throw new Error("No appropriate function found");

        let fullResponse = "";
        let stopStreaming = false;

        for await (const chunk of functionStream) {
          if (chunk.choices[0].delta.content) {
            const content = chunk.choices[0].delta.content;
            fullResponse += content;

            if (!stopStreaming) {
              if (content.includes("<")) {
                stopStreaming = true;
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
            for (const item of shoppingResults.slice(0, 4)) {
              const result: ShoppingResult = {
                title: item.title,
                price: item.price,
                link: item.link,
                thumbnail: item.thumbnail,
                formula: "Coming Soon"
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