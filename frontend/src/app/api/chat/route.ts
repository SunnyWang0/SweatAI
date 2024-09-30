import { NextRequest, NextResponse } from "next/server";
import OpenAI from 'openai';
import { ShoppingResult } from "../../../components/chat/chat-layout";
import { Message } from "ai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const analyzerSystemMessage = `
You are an analyzer for SweatAI, a fitness supplement advisor. Your task is to analyze user input and determine which functions should be called next. Output a JSON object with boolean values for the following tags:
- greeting: User is greeting or starting a conversation. e.g. "Hello", "Hi", "Hey"
- aboutSweat: User is asking about SweatAI or its capabilities e.g. "What is SweatAI?", "How does SweatAI work?", "What can SweatAI do?"
- searchForProduct: User is looking for a specific product or supplement, they have an intent to purchase. e.g. "Where can I buy [product name]?", "Is [product name] available?", "I'm looking for [product name]"
- refineProductSearch: User wants to fine tune their search for a product e.g. "I am looking for a cheaper alternative to [product name]", "I want less caffiene", "Maybe something with L-theanine?"
- learnMore: User wants to learn more about supplements in general e.g. "What supplements are best for [training goal]?", "What are the benefits of [supplement name]?"
- unrelatedRequest: User's request is unrelated to fitness supplements e.g. "What is the weather in [city]?", "What's the latest news?", "What's the stock price of [company name]?"

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

async function callOpenAI(systemMessage: string, messages: Message[], model: string, stream: boolean, temperature: number, max_tokens: number) {
  return openai.chat.completions.create({
    model: model,
    messages: [
      { role: "system", content: systemMessage },
      ...messages
    ],
    stream: stream,
    temperature: temperature,
    max_tokens: max_tokens,
  });
}

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

async function greeting(messages: Message[]) {
  const systemMessage = "You are a friendly greeter for SweatAI. Respond to the user's greeting warmly and ask how you can help with their supplement research needs. You are SweatAI, an AI-powered fitness supplement advisor and personal shopper.";
  return callOpenAI(systemMessage, messages, "gpt-4o-mini", true, 0.7, 300);
}

async function aboutSweat(messages: Message[]) {
  const systemMessage = "You provide information about SweatAI. Explain that SweatAI is an AI-powered fitness supplement advisor and personal shopper that helps users find the best supplements for their specific needs based on scientific research. SweatAI is not a chatbot, but a sophisticated AI system designed to assist with supplement research, product discovery, and personalized recommendations.";
  return callOpenAI(systemMessage, messages, "gpt-4o-mini", true, 0.7, 300);
}

async function searchForProduct(messages: Message[]) {
  const systemMessage = `You are a product search expert. You have access to the Google Shopping API and can search online 
  for specific supplements or products based on user needs and preferences. Help the user find specific supplements or products 
  based on their needs, preferences, personal profile, and goals. Use any context or restrictions mentioned in any of the past 
  user messages. Do not suggest any products yourself, simply generate query terms that can be used to search for the product. These
  query terms should be concise and specific to the user's needs, preferences, personal profile, and goals. Avoid generic or vague terms.
  
  Query terms should be formatted as follows: user text <<QUERY>> ingredient1 amount1 ingredient2 amount2
  DO not include any text after the <<QUERY>> terms.
  
  Example output: 

  User: "I want preworkout for energy and strength, I don't have any caffeine issues, and I want to use it 3x a week."
  You: "Consider: • Caffeine (3-6mg/kg, +7-10% power) • Beta-alanine (3-5g, +2.5% endurance) • Citrulline malate (6-8g, +7% strength). Take 30-60 min pre-workout for best results."
  <<QUERY>>caffeine 200mg beta-alanine 3.2g citrulline-malate 6g

  User: "Tell me about creatine."
  You: "Creatine monohydrate: Increases muscle strength 5-10%. Dose: 3-5g daily. 80% see benefits within 4 weeks. Side effects (e.g., bloating) in <5%. Highly effective for strength and muscle growth with resistance training."
  <<QUERY>>creatine monohydrate 5g
  `;
  return callOpenAI(systemMessage, messages, "o1-mini", true, 0.7, 300);
}

async function refineProductSearch(messages: Message[]) {
  const systemMessage = `You help refine product queries when the user provides a revision to their previous query. 
  Ask specific questions to narrow down the user's preferences and provide more targeted supplement recommendations.
  Generate query terms that are drawing from your previous query terms and the user's revision.

  Query terms should be formatted as follows: user text <<QUERY>> ingredient1 amount1 ingredient2 amount2
  Do not include any text after the <<QUERY>> terms.
  
  Example output: 

  User: "How about somethign with more caffiene"
  You: "Consider: • Caffeine (3-6mg/kg, +7-10% power) • Beta-alanine (3-5g, +2.5% endurance) • Citrulline malate (6-8g, +7% strength). Take 30-60 min pre-workout for best results."
  <<QUERY>>caffeine 200mg beta-alanine 3.2g citrulline-malate 6g

  User: "I want something with more protein and cheaper overall price"
  You: "Here is something with more protein and cheaper overall price <<QUERY>>protein powder 30g, cheap, high protein"
  `;
  return callOpenAI(systemMessage, messages, "o1-mini", true, 0.7, 300);
}

async function learnMore(messages: Message[]) {
  const systemMessage = "You are a supplement education expert. Provide detailed, scientific information about various fitness supplements, their benefits, and potential side effects. Include as many statistics and metrics as possible.";
  return callOpenAI(systemMessage, messages, "o1-mini", true, 0.7, 300);
}

async function unrelatedRequest(messages: Message[]) {
  const systemMessage = "Do not respond to the user's request. You politely redirect unrelated requests back to fitness supplements. Explain that you're specialized in fitness supplements and offer to help with any supplement-related questions.";
  return callOpenAI(systemMessage, messages, "gpt-4o-mini", true, 0.7, 300);
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Analyze user input
        const analyzerResponse = await callOpenAI(
          analyzerSystemMessage,
          [
            { role: "user", content: messages[messages.length - 1].content },
            { role: "assistant", content: "Here is the requested JSON with the boolean values:" }
          ],
          "gpt-4o-mini",
          false,
          0.1,  
          150
        );
        
        const responseContent = analyzerResponse.choices[0]?.message?.content || "";

        let cleanedJson = responseContent.trim();
        // Remove any text before the first '{'
        const jsonStartIndex = cleanedJson.indexOf('{');
        if (jsonStartIndex !== -1) {
          cleanedJson = cleanedJson.substring(jsonStartIndex);
        }

        let analysis = {};
        try {
          analysis = JSON.parse(cleanedJson);
          console.log("Parsed analysis:", analysis);
        } catch (error) {
          console.error("Error parsing JSON:", error);
          console.error("Attempted to parse:", cleanedJson);
        }

        // Call appropriate function based on analysis
        let functionStream;
        let calledFunction = "unknown";
        if (analysis.greeting) {
          functionStream = await greeting(messages);
          calledFunction = "greeting";
        } else if (analysis.aboutSweat) {
          functionStream = await aboutSweat(messages);
          calledFunction = "aboutSweat";
        } else if (analysis.searchForProduct) {
          functionStream = await searchForProduct(messages);
          calledFunction = "searchForProduct";
        } else if (analysis.refineProductSearch) {
          functionStream = await refineProductSearch(messages);
          calledFunction = "refineProductSearch";
        } else if (analysis.learnMore) {
          functionStream = await learnMore(messages);
          calledFunction = "learnMore";
        } else if (analysis.unrelatedRequest) {
          functionStream = await unrelatedRequest(messages);
          calledFunction = "unrelatedRequest";
        } else {
          functionStream = await unrelatedRequest(messages); // Default fallback
          calledFunction = "unrelatedRequest (default)";
        }

        console.log("Called function:", calledFunction);

        let fullResponse = "";
        let stopStreaming = false;

        for await (const chunk of functionStream) {
          if (chunk.choices[0]?.delta?.content) {
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