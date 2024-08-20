from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import requests
import json
import uvicorn
from fastapi.responses import StreamingResponse
import asyncio
import anthropic

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Initialize the Claude client
claude_client = anthropic.Anthropic(api_key=os.environ.get('ANTHROPIC_API_KEY'))

# Initialize the Claude models
def init_models():
    shopper_system_message = """
    You are Cosmo, a fitness coach and supplement shopping assistant. Your primary purpose is to help users find suitable supplements and fitness products while answering their questions. Follow these guidelines:

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
    """
    
    scraper_system_message = """
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
    """
    
    return shopper_system_message, scraper_system_message

shopper_system_message, scraper_system_message = init_models()

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

@app.post("/chat")
async def chat(request: ChatRequest):
    messages = request.messages
    
    async def generate():
        # Process messages and get response from Claude
        claude_messages = [{"role": msg.role, "content": msg.content} for msg in messages]
        response = claude_client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=2048,
            temperature=0.6,
            system=shopper_system_message,
            messages=claude_messages
        )
        response_text = response.content[0].text.strip()
        parts = response_text.split('<<QUERY>>')
        assistant_response = parts[0].strip()
        query = parts[1] if len(parts) > 1 else ""
        
        # Yield the initial response
        yield json.dumps({"type": "assistant_response", "content": assistant_response}) + "\n"

        if query:
            shopping_results = get_request_google_shopping(query)
            if shopping_results:
                for item in shopping_results[:1]:  # Only process the first item
                    scraped_content = scrape_jina(item.get('link'))
                    formula_response = claude_client.messages.create(
                        model="claude-3-haiku-20240307",
                        max_tokens=1024,
                        temperature=0.1,
                        system=scraper_system_message,
                        messages=[{"role": "user", "content": f"Here is the scraped content you need to analyze:\n\n<scraped_content>\n{scraped_content}\n</scraped_content>"}]
                    )
                    formula = formula_response.content[0].text.strip()
                    result = ShoppingResult(
                        title=item.get('title'),
                        price=item.get('price'),
                        link=item.get('link'),
                        thumbnail=item.get('thumbnail'),
                        formula=formula
                    )
                    yield json.dumps({"type": "shopping_result", "content": result.dict()}) + "\n"

    return StreamingResponse(generate(), media_type="application/x-ndjson")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)