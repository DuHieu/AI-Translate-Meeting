from typing import Literal
import logging
from polar.v2026_10.client import Polar
from app.config.settings import settings

logger = logging.getLogger("ai_service.polar")

def get_polar_environment() -> Literal["production", "sandbox"]:
    server = (settings.POLAR_SERVER or "production").strip().lower()
    return "sandbox" if server == "sandbox" else "production"

# Construct a single SDK client and reuse it across routes
polar_client = Polar(
    access_token=settings.POLAR_ACCESS_TOKEN,
    environment=get_polar_environment(),
)
