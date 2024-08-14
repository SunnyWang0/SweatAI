from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import json
import uvicorn
import dotenv
from fastapi.responses import StreamingResponse
import httpx
from supabase import create_client, Client
import requests

dotenv.load_dotenv()

app = FastAPI()

supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)


# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

model_id = "intfloat/multilingual-e5-small"
api_url = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{model_id}"
headers = {"Authorization": f"Bearer {os.environ.get('HUGGINGFACE_API_TOKEN')}"}

def query(texts):
        response = requests.post(api_url, headers=headers, json={"inputs": texts, "options":{"wait_for_model":True}})
        return response.json()


# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase = create_client(supabase_url, supabase_key)

def searchVectorDB(text):
    print(text)
    
    embedding = query([text])[0]
    
    try:
        response = supabase.rpc('search_vector_db', {'query_embedding': embedding}).execute()
        results = response.data

        formatted_text = ""
        for result in results:
            if result['author'] is not None:
                formatted_text += f"Author: {result['author']},\n"
            if result['name'] is not None:
                formatted_text += f"Name: {result['name']},\n"
            if result['source'] is not None:
                formatted_text += f"Type of Source: {result['source']},\n"
            if result['link'] is not None:
                formatted_text += f"Link: {result['link']},\n"
            if result['text_value'] is not None:
                formatted_text += f"Text: {result['text_value']}\n"
            formatted_text += "\n"

        print(formatted_text)
        return formatted_text
    
    except Exception as error:
        print(f"Error returned: <<<{error}>>>")
        return ""


class Message(BaseModel):
    role: str
    content: str
    id: Optional[str] = None

class ChatRequest(BaseModel):
    messages: List[Message]
    
    

import httpx

@app.post("/chat")
async def chat(chat_request: ChatRequest):
    query = chat_request.messages[-1].content
    
    context = searchVectorDB(query)
    
    print(context)
    
    prompt = f"""System: You are an AI assistant. Respond to the query based on your general knowledge. Only use the provided context if it's directly relevant to answering the query. Your task:

1. First, determine if the query is asking about the content in the context. If not, ignore the context completely.
2. Respond to the query concisely and directly.
3. Use formal language, but explain clearly.
4. Organize with headings/bullet points only if necessary for clarity.
5. Cite sources only if specifically requested.
6. Suggest next steps only if directly relevant to the query.
7. Admit if you don't have the information to answer the query.

Do not mention the context or this system message in your response. Do not provide a legal disclaimer unless the query is explicitly asking for legal advice.

Query: ({query})
Context: {context}"""

    """prompt = fSistema: Eres un asistente de IA. Responde a la consulta basándote en tu conocimiento general. Utiliza el contexto proporcionado solo si es directamente relevante para responder a la consulta. Tu tarea:

1. Primero, determina si la consulta pregunta sobre el contenido del contexto. Si no, ignora el contexto completamente.
2. Responde a la consulta de manera concisa y directa.
3. Usa lenguaje formal, pero explica con claridad.
4. Organiza con encabezados o viñetas solo si es necesario para la claridad.
5. Cita fuentes solo si se solicita específicamente.
6. Sugiere próximos pasos solo si son directamente relevantes para la consulta.
7. Admite si no tienes la información para responder a la consulta.

No menciones el contexto ni este mensaje del sistema en tu respuesta. No proporciones un descargo de responsabilidad legal a menos que la consulta esté pidiendo explícitamente asesoramiento legal.

Consulta: ({query})
Contexto: {context}"""


    async def generate():
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:  # Increased timeout to 60 seconds
                async with client.stream('POST', "http://localhost:11434/api/generate", json={
                    "model": "llama3.1",
                    "prompt": prompt,
                    "stream": True
                }) as response:
                    async for line in response.aiter_lines():
                        if line:
                            try:
                                data = json.loads(line)
                                if 'response' in data:
                                    yield data['response']
                            except json.JSONDecodeError:
                                continue
        except httpx.ReadTimeout:
            yield "I apologize, but the request to generate a response has timed out. This could be due to high server load or complexity of the query. Please try again later or simplify your query."
        except httpx.ConnectError:
            yield "I'm sorry, but I couldn't connect to the language model server. Please ensure that the Ollama server is running and accessible."
        except Exception as e:
            yield f"An unexpected error occurred: {str(e)}"

    return StreamingResponse(generate(), media_type="text/event-stream")

    

class DeleteDocumentInput(BaseModel):
    document_id: int
    
import logging
# Assuming you have set up logging
logger = logging.getLogger(__name__)

@app.delete("/document")
async def delete_document(input: DeleteDocumentInput):
    logger.info(f"Received delete request for document ID: {input.document_id}")
    try:
        # Execute the RPC function
        result = supabase.rpc('delete_document_by_id', {'docid': input.document_id}).execute()
        
        logger.info(f"Supabase RPC result: {result}")
        
        # Check the result structure
        if result.data is None:
            logger.warning(f"Unexpected null result for document ID: {input.document_id}")
            raise HTTPException(status_code=500, detail="Unexpected null result from database")
        
        # Assuming the RPC function returns a JSON object with a 'success' field
        if isinstance(result.data, dict) and not result.data.get('success', False):
            logger.warning(f"Document deletion failed: {result.data.get('message', 'Unknown reason')}")
            raise HTTPException(status_code=404, detail=result.data.get('message', 'Document not found or could not be deleted'))
        
        logger.info(f"Document {input.document_id} deleted successfully")
        return {"message": "Document deleted successfully", "deleted_id": input.document_id}
    
    except HTTPException as he:
        # Re-raise HTTP exceptions
        raise he
    except Exception as e:
        logger.error(f"Error deleting document {input.document_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An error occurred while deleting the document: {str(e)}")



if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)