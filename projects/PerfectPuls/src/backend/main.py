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
from services.neo4j_service import neo4j_service

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
    logger.info(f"🔑 Gemini: {'✅' if settings.google_ai_api_key else '❌'}")
    logger.info(f"🗄️ Neo4j configured: {'✅' if settings.neo4j_uri and settings.neo4j_password else '❌'}")
    
    yield
    
    # Cleanup on shutdown
    logger.info("🔄 Policy Pilot Backend shutting down...")
    await neo4j_service.close()

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

        # 5. Ingest into Neo4j Knowledge Graph
        try:
            neo4j_success = await neo4j_service.ingest_policy_graph(
                policy_id=processing_result["policy_id"],
                graph_data=graph_data,
                metadata=metadata
            )
            if neo4j_success:
                logger.info(f"✅ Policy {processing_result['policy_id']} ingested into Neo4j")
            else:
                logger.warning(f"⚠️ Neo4j ingestion failed for {processing_result['policy_id']}")
        except Exception as neo4j_error:
            logger.error(f"❌ Neo4j ingestion error: {str(neo4j_error)}")
            # Continue processing even if Neo4j fails

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
    """
    Chrome Extension endpoint: Analyzes website content for healthcare services
    """
    try:
        logger.info(f"🔍 Analyzing website: {request.basic_info.url}")
        
        # 1. Extract potential services from website content
        website_text = f"{request.basic_info.title} {request.page_content}".lower()
        
        # Common healthcare service keywords to look for
        service_keywords = {
            "physiotherapy": "Physical Therapy",
            "physical therapy": "Physical Therapy", 
            "massage therapy": "Massage Therapy",
            "acupuncture": "Acupuncture",
            "chiropractic": "Chiropractic Care",
            "spinal manipulation": "Spinal Manipulation",
            "occupational therapy": "Occupational Therapy",
            "speech therapy": "Speech Therapy",
            "cognitive therapy": "Cognitive Therapy",
            "primary care": "Primary Care Visit",
            "specialist": "Specialist Visit",
            "mental health": "Mental Health Services",
            "counseling": "Counseling Services",
            "dermatologist": "Dermatology"
        }
        
        detected_services = []
        for keyword, service_name in service_keywords.items():
            if keyword in website_text:
                detected_services.append(service_name)
        
        # 2. Use semantic search to find similar services in Neo4j (all policies)
        coverage_checklist = []
        
        if detected_services:
            # Search for each detected service
            for service in detected_services[:3]:  # Limit to top 3 services
                try:
                    # Semantic search across all policies (no specific policy_id)
                    semantic_results = await neo4j_service.semantic_search(
                        query_text=service,
                        policy_id=None,  # Search all policies
                        limit=2
                    )
                    
                    if semantic_results:
                        # Found similar services in knowledge graph
                        coverage_checklist.append({
                            "item": service,
                            "status": "✅",
                            "details": f"Similar services found in uploaded policies (similarity: {semantic_results[0].get('similarity', 0):.2f})"
                        })
                    else:
                        # No similar services found
                        coverage_checklist.append({
                            "item": service,
                            "status": "❓",
                            "details": "Upload your insurance policy to check coverage"
                        })
                        
                except Exception as e:
                    logger.error(f"Error searching for service {service}: {str(e)}")
                    coverage_checklist.append({
                        "item": service,
                        "status": "ℹ️",
                        "details": "Analysis requires uploaded policy document"
                    })
        
        # 3. Add general recommendations based on detected services
        if not coverage_checklist:
            coverage_checklist.append({
                "item": "General Healthcare Services",
                "status": "ℹ️",
                "details": "Upload your insurance policy for personalized coverage analysis"
            })
        
        # 4. Calculate feasibility based on detected services
        if detected_services:
            feasibility = {
                "score": 75,  # Moderate score when services detected
                "color": "Yellow",
                "message": f"Found {len(detected_services)} healthcare services - Upload policy for detailed coverage"
            }
        else:
            feasibility = {
                "score": 50,
                "color": "Yellow", 
                "message": "No specific healthcare services detected on this page"
            }
        
        # 5. Generate example cost breakdown
        cost_breakdown = {
            "session_cost": "$100-$300",
            "your_cost": "Varies by plan",
            "insurance_pays": "Upload policy to see",
            "savings_per_visit": "Unknown without policy",
            "potential_annual_savings": "Upload policy for estimates"
        }
        
        # 6. Generate service details (example)
        primary_service = detected_services[0] if detected_services else "Healthcare Services"
        service_details = {
            "service_name": primary_service,
            "coverage_type": "Upload policy to check",
            "copay": "Varies by plan",
            "renewal_date": "Check your policy document"
        }
        
        # 7. Generate recommendations
        recommendations = [
            "Upload your insurance policy document for personalized coverage analysis",
            "Contact your insurance provider to verify coverage for specific services",
            "Ask the provider about payment plans and insurance acceptance"
        ]
        
        if detected_services:
            recommendations.insert(0, f"This page mentions {len(detected_services)} healthcare services that may be covered by insurance")
        
        return AnalyzeResponse(
            summary=f"Found {len(detected_services)} potential healthcare services on this page. Upload your insurance policy for detailed coverage analysis.",
            match_checklist=coverage_checklist,
            feasibility=feasibility,
            money_saved=cost_breakdown,
            benefits_services=service_details,
            recommendations=recommendations
        )
        
    except Exception as e:
        logger.error(f"❌ Website analysis failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=settings.debug)