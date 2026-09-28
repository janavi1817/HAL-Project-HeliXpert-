import os
import shutil
from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from pydantic import BaseModel
from backend.services.rag_service import rag_service, DOCS_DIR

router = APIRouter(prefix="/api/documents", tags=["Knowledge Base"])

class SearchQuery(BaseModel):
    query: str

@router.get("")
def get_documents(search: str = Query(None)):
    """List all documents, with optional search filter"""
    docs = []
    if os.path.exists(DOCS_DIR):
        for fname in os.listdir(DOCS_DIR):
            if search and search.lower() not in fname.lower():
                continue
            docs.append({
                "id": fname,
                "filename": fname,
                "title": fname.rsplit('.', 1)[0].replace('_', ' ').replace('-', ' '),
                "doc_type": fname.rsplit('.', 1)[-1].upper() if '.' in fname else 'DOC',
                "content": None,
                "keywords": None,
                "section": None
            })
    return docs

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename.endswith(('.pdf', '.txt', '.md', '.doc', '.docx')):
        raise HTTPException(status_code=400, detail="Only PDF, TXT, MD, DOC, DOCX files are supported")
        
    file_path = os.path.join(DOCS_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    result = rag_service.add_document(file.filename, file_path)
    if not result["success"]:
        os.remove(file_path)
        raise HTTPException(status_code=500, detail=result["error"])
        
    return {"message": f"Successfully indexed {file.filename}", "chunks": result["chunks_added"]}

@router.post("/search")
def search_documents(request: SearchQuery):
    results = rag_service.search(request.query)
    return {"results": results}

@router.get("/list")
def list_documents():
    docs = []
    if os.path.exists(DOCS_DIR):
        docs = os.listdir(DOCS_DIR)
    return {"documents": docs}
