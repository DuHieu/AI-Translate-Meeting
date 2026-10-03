from fastapi import APIRouter
from app.translation.glossary import GlossaryManager

router = APIRouter(prefix="/glossary", tags=["glossary"])
glossary_manager = GlossaryManager()


@router.get("/stats")
async def get_glossary_stats():
    """Returns domain glossary metadata, language pairs, and term counts."""
    return glossary_manager.get_stats()


@router.post("/reload")
async def reload_glossary():
    """Hot-reloads the glossary from disk without restarting the container."""
    glossary_manager.load()
    return {
        "status": "reloaded",
        "stats": glossary_manager.get_stats(),
    }
