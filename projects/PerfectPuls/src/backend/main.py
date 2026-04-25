from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import time
from datetime import datetime
import logging
import os
import uuid
from pathlib import Path

# Local imports
from models.api_models import (
    PDFProcessResponse, AnalyzeRequest, AnalyzeResponse, 
    HealthResponse, ExtractionSummary, GraphPreview
)
from config.settings import settings
from services.gemini_service import gemini_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    logger.info("🚀 Policy Pilot Backend starting up...")
    
    # Ensure upload directory exists
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    logger.info(f"📁 Upload directory: {upload_dir.absolute()}")
    logger.info(f"🔑 Gemini configured: {'✅' if settings.google_ai_api_key else '❌'}")
    
    yield
    logger.info("🔄 Policy Pilot Backend shutting down...")

app = FastAPI(
    title="Policy Pilot API",
    description="AI-powered insurance policy analysis backend",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        message="Policy Pilot API is running",
        timestamp=datetime.now()
    )

@app.post("/api/process-pdf", response_model=PDFProcessResponse)
async def process_pdf(
    file: UploadFile = File(...),
    policy_name: str = Form(...),
    upload_source: str = Form("frontend")
):
    start_time = time.time()
    temp_path = None
    
    try:
        # 1. Validation
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
        # 2. Save file temporarily (Required for Gemini Files API)
        file_id = str(uuid.uuid4())
        temp_filename = f"{file_id}_{file.filename}"
        temp_path = Path(settings.upload_dir) / temp_filename
        
        # Write the file to disk
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        logger.info(f"📄 Processing PDF: {file.filename} saved to {temp_path}")
        
        # 3. Call the new Graph-ready Service
        metadata = {
            "policy_name": policy_name,
            "upload_source": upload_source,
            "original_filename": file.filename
        }
        
        # Using the rewritten method from the new GeminiService
        processing_result = await gemini_service.process_policy_to_graph(str(temp_path), metadata)
        
        if processing_result.get("status") == "failed":
             raise Exception(processing_result.get("error"))

        # 4. Map Graph Data to the API Response
        # The new service returns { "nodes": [...], "edges": [...] }
        graph_data = processing_result.get("graph_data", {})
        nodes = graph_data.get("nodes", [])
        edges = graph_data.get("edges", [])

        # Filter nodes for preview (e.g., just the Services)
        services = [n.get("properties", {}).get("name") for n in nodes if n.get("label") == "Service"]
        perks = [n.get("properties", {}).get("name") for n in nodes if n.get("label") == "Benefit"]
        networks = [n.get("properties", {}).get("name") for n in nodes if n.get("label") == "Network"]
        
        processing_time = int((time.time() - start_time) * 1000)
        
        return PDFProcessResponse(
            policy_id=processing_result["policy_id"],
            status="completed",
            extraction_summary=ExtractionSummary(
                pages_processed=1, 
                entities_extracted=len(nodes),
                nodes_created=len(nodes),
                relationships_created=len(edges),
                embeddings_generated=len(nodes)
            ),
            graph_preview=GraphPreview(
                coverage_types=services[:5],
                key_entities=perks[:3],
                provider_networks=networks[:3] if networks else ["Provider Network"]
            ),
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        logger.error(f"❌ PDF processing error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"PDF processing failed: {str(e)}"
        )
    finally:
        # Solo Hack: Clean up the temp file after processing to save disk space
        if temp_path and temp_path.exists():
            os.remove(temp_path)
            logger.info(f"Cleaned up temp file: {temp_path}")

@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_website(request: AnalyzeRequest):
    # This will be your Chrome Extension endpoint
    # Logic: Receive URL -> Scrape -> Vector Search in Neo4j -> Gemini Advice
    raise HTTPException(
        status_code=501,
        detail="Website analysis endpoint implementation is the next phase."
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=settings.debug)