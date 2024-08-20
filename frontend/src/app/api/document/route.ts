import { NextRequest, NextResponse } from 'next/server';


export async function DELETE(req: NextRequest) {
  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
  
  try {
    const body = await req.json();
    const documentId = body.document_id;

    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
    }

    console.log("Deleting document with ID:", documentId);
  
    const response = await fetch(`${BACKEND_URL}/document`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ document_id: documentId }),
    });

    console.log("Backend response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response from backend:", errorText);
      throw new Error(`Failed to delete document from FastAPI: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in delete operation:", error);
    return NextResponse.json({ error: "An error occurred while deleting the document" }, { status: 500 });
  }
}