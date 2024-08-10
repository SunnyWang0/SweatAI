from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import google.generativeai as genai
import os
import requests
import json
import uvicorn

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Initialize the Gemini models
def init_models():
    genai.configure(api_key=os.environ.get('GEMINI_API_KEY'))
    
    shopper = genai.GenerativeModel('gemini-1.5-flash')
    shopper_chat = shopper.start_chat(history=[])
    
    shopper_generation_config = genai.GenerationConfig(
        temperature=0.7, 
        top_k=40,
        top_p=0.95,
        max_output_tokens=2048,
    )
    shopper_chat.generation_config = shopper_generation_config
    
    system_message = """
    You are Cosmo, a fitness coach that assist users in shopping for supplement items online with tailored recommendations. Learn about users' workout preferences to suggest products aligned with their needs. For preworkout selection, inquire about workout style and preferences to determine suitable formulations. Conduct thorough research, ask follow-up questions, and refine searches based on user preferences, including desired or avoided ingredients.

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
    """
    
    shopper_chat.send_message(system_message)
    
    scraper = genai.GenerativeModel('gemini-1.5-flash')
    scraper_chat = scraper.start_chat(history=[])
    scraper_generation_config = genai.GenerationConfig(
        temperature=0.1,  # Lower temperature for more focused, precise outputs
        top_k=10,
        top_p=0.7,
        max_output_tokens=1024,
    )
    scraper_chat.generation_config = scraper_generation_config
    
    scraper_system_message = """
    You are an AI assistant specialized in extracting specific information from scraped website content about fitness supplements. Your task is to analyze the provided text and extract ONLY the list of ingredients from the product's formula or composition.

    Instructions:
    1. Identify the section that lists the product's ingredients or formula.
    2. Extract each ingredient along with its amount (if provided).
    3. Present the information as a numbered list.
    4. Include ONLY the ingredients and their amounts. Do not include any additional information or descriptions.
    5. If an ingredient has a trademark symbol (®, ™), include it.
    6. Maintain the exact spelling and capitalization as presented in the original text.

    Your output should look like this:

    1. Ingredient Name (Amount)
    2. Another Ingredient (Amount)
    3. Third Ingredient (Amount)

    If no amount is provided for an ingredient, simply list the ingredient name.

    Do not include any other text, explanations, or formatting beyond this simple numbered list.
    """
    
    scraper_chat.send_message(scraper_system_message)
    
    return shopper_chat, scraper_chat

shopper_chat, scraper_chat = init_models()

def get_request_google_shopping(query):
    url = "https://www.searchapi.io/api/v1/search"
    params = {
        "engine": "google_shopping",
        "q": query,
        "location": "California,United States",  # will need to be set to the user's location
        "api_key": os.environ.get('GOOGLE_SHOPPING_API_KEY')
    }

    response = requests.get(url, params=params)
    if response.status_code == 200:
        data = json.loads(response.text)
        shopping_results = data.get('shopping_results', [])
        return shopping_results
    else:
        print(f"Error: API request failed with status code {response.status_code}")
        return None
 
def scrape_jina(url: str) -> str:
    response = requests.get("https://r.jina.ai/" + url)
    return response.text

class Message(BaseModel):
    role: str
    content: str
    id: Optional[str] = None

class ChatRequest(BaseModel):
    messages: List[Message]

class ShoppingResult(BaseModel):
    title: str
    price: str
    link: str
    thumbnail: str
    formula: str

class ChatResponse(BaseModel):
    response: str
    shopping_results: Optional[List[ShoppingResult]] = None

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    messages = request.messages
    
    # Process messages and get response from Gemini
    response = shopper_chat.send_message(messages[-1].content)
    response_text = response.text
    
    parts = response_text.split('<<QUERY>>')
    response_text = parts[0]
    query = parts[1] if len(parts) > 1 else ""
    
    results = []
    if query:
        shopping_results = get_request_google_shopping(query)
        if shopping_results:
            for item in shopping_results[:1]:  # Only process the first item
                formula = scraper_chat.send_message(scrape_jina(item.get('link'))).text
                results.append(ShoppingResult(
                    title=item.get('title'),
                    price=item.get('price'),
                    link=item.get('link'),
                    thumbnail=item.get('thumbnail'),
                    formula=formula
                ))
    
    return ChatResponse(response=response_text, shopping_results=results)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)