import os
import json
import logging

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VECTORSTORE_DIR = os.path.join(BASE_DIR, 'data', 'vectorstore')
DOCS_DIR = os.path.join(BASE_DIR, 'data', 'documents')

os.makedirs(VECTORSTORE_DIR, exist_ok=True)
os.makedirs(DOCS_DIR, exist_ok=True)

class RAGService:
    def __init__(self):
        self.model = None
        self.index = None
        self.metadata = []
        self._loaded = False

    def _lazy_load(self):
        if self._loaded:
            return
        self._loaded = True
        try:
            import faiss
            import numpy as np
            from sentence_transformers import SentenceTransformer
            logging.info("Loading embedding model (all-MiniLM-L6-v2)...")
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            index_path = os.path.join(VECTORSTORE_DIR, 'index.faiss')
            meta_path = os.path.join(VECTORSTORE_DIR, 'metadata.json')
            if os.path.exists(index_path) and os.path.exists(meta_path):
                self.index = faiss.read_index(index_path)
                with open(meta_path, 'r') as f:
                    self.metadata = json.load(f)
            else:
                self.index = faiss.IndexFlatL2(384)
                self.metadata = []
        except Exception as e:
            logging.error(f"RAG service load error: {e}")

    def _save_index(self):
        import faiss
        faiss.write_index(self.index, os.path.join(VECTORSTORE_DIR, 'index.faiss'))
        with open(os.path.join(VECTORSTORE_DIR, 'metadata.json'), 'w') as f:
            json.dump(self.metadata, f)

    def extract_text(self, file_path):
        text = ""
        if file_path.endswith('.pdf'):
            try:
                from PyPDF2 import PdfReader
                reader = PdfReader(file_path)
                for i, page in enumerate(reader.pages):
                    t = page.extract_text()
                    if t:
                        text += f"\n--- Page {i+1} ---\n{t}"
            except Exception as e:
                logging.error(f"PDF read error: {e}")
        elif file_path.endswith('.txt'):
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
        return text

    def chunk_text(self, text, chunk_size=500, overlap=50):
        words = text.split()
        chunks = []
        for i in range(0, len(words), chunk_size - overlap):
            chunks.append(" ".join(words[i:i + chunk_size]))
        return chunks

    def add_document(self, file_name, file_path):
        self._lazy_load()
        if self.model is None:
            return {"success": False, "error": "Embedding model not loaded"}
        import numpy as np
        text = self.extract_text(file_path)
        if not text:
            return {"success": False, "error": "No text extracted"}
        chunks = self.chunk_text(text)
        embeddings = self.model.encode(chunks)
        import faiss
        faiss.normalize_L2(embeddings)
        self.index.add(embeddings.astype("float32"))
        for i, chunk in enumerate(chunks):
            self.metadata.append({"source": file_name, "chunk_id": i, "text": chunk})
        self._save_index()
        return {"success": True, "chunks_added": len(chunks)}

    def search(self, query, top_k=3):
        self._lazy_load()
        if self.index is None or self.index.ntotal == 0:
            return []
        import numpy as np
        import faiss
        q_emb = self.model.encode([query]).astype("float32")
        faiss.normalize_L2(q_emb)
        distances, indices = self.index.search(q_emb, top_k)
        results = []
        for i, idx in enumerate(indices[0]):
            if 0 <= idx < len(self.metadata):
                meta = dict(self.metadata[idx])
                meta['distance'] = float(distances[0][i])
                results.append(meta)
        return results

rag_service = RAGService()
