import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("Missing Gemini API key");
}

const genAI = new GoogleGenerativeAI(API_KEY);

export async function initGeminiModel() {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const chat = model.startChat({
    history: [],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  });

  await chat.sendMessage(`
    As Cosmo, a fitness coach, assist users in shopping for fitness items online with tailored recommendations. Learn about users' workout preferences to suggest products aligned with their needs. For preworkout selection, inquire about workout style and preferences to determine suitable formulations. Conduct thorough research, ask follow-up questions, and refine searches based on user preferences, including desired or avoided ingredients.

    Provide detailed explanations for recommended ingredients, their benefits and what it feels like for the user. Respond directly to user requests without unnecessary affirmations.

    Generate search query terms ONLY when the user has provided enough information to narrow down the product search. Do NOT generate query terms if:
    1. The user is asking general questions about products or ingredients
    2. The user is seeking clarification on a topic
    3. The conversation hasn't progressed to a point where specific product recommendations are appropriate

    When appropriate to generate a search query, use the delimiter '<<QUERY>>' followed by a concise, non-repetitive list of search terms based on the user's preferences. This query should:
    1. Be as short and precise as possible
    2. Reflect workout preferences in terms of preworkout ingredients
    3. Use positive or alternative terms instead of negatives (e.g., "caffeine-free" instead of "no caffeine", "jitter-free" instead of "no jitters")
    4. Not contain questions for the user
    5. Not be visible to the user

    Example format (only when appropriate):
    [Your response to the user]
    <<QUERY>>caffeine-free preworkout, beta-alanine, citrulline malate, evening workout

    If no query is needed, simply end your response without the <<QUERY>> section.

    If asked about your capabilities, explain that you're a personalized fitness shopping assistant and encourage users to specify products they're interested in buying.
  `);

  return chat;
}

export async function promptGeminiModel(chat: any, prompt: string) {
  const result = await chat.sendMessage(prompt);
  return result.response.text();
}

export async function scrapeJina(url: string): Promise<string> {
  const response = await fetch(`https://r.jina.ai/${url}`);
  const text = await response.text();
  
  // Use Gemini to extract the formula from the scraped content
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const result = await model.generateContent(`
    Extract ONLY the list of ingredients from the following product description:
    ${text}
    
    Present the information as a numbered list, including only the ingredients and their amounts (if provided). Include trademark symbols if present. Maintain exact spelling and capitalization.
  `);
  
  return result.response.text();
}

export async function getRequestGoogleShopping(query: string) {
  const url = "https://www.searchapi.io/api/v1/search";
  const params = new URLSearchParams({
    engine: "google_shopping",
    q: query,
    location: "California,United States", // You might want to make this dynamic based on user location
    api_key: process.env.GOOGLE_SHOPPING_API_KEY || "",
  });

  const response = await fetch(`${url}?${params}`);
  if (response.ok) {
    const data = await response.json();
    return data.shopping_results || [];
  } else {
    console.error(`Error: API request failed with status code ${response.status}`);
    return null;
  }
}