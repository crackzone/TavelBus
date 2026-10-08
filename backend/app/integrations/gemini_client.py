"""Google GenAI & Vertex AI integration client with local deterministic fallback."""

import logging
import os

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class GeminiClient:
    """Unified Gemini client supporting google-genai, Vertex AI, and local fallback."""

    def __init__(self) -> None:
        self.project_id = settings.GCP_PROJECT_ID
        self.api_key = (
            settings.GEMINI_API_KEY
            or os.getenv("GEMINI_API_KEY")
            or os.getenv("GOOGLE_API_KEY")
        )
        self.model_name = settings.GEMINI_MODEL or "gemini-2.0-flash"
        self._genai_client = None
        self._vertex_model = None
        self._initialized = False

    def _initialize_client(self) -> None:
        if self._initialized:
            return

        # 1. Try google-genai SDK (with API key or default credentials)
        if self.api_key:
            try:
                from google import genai

                self._genai_client = genai.Client(api_key=self.api_key)
                logger.info("Initialized Google GenAI client with API key.")
                self._initialized = True
                return
            except Exception as exc:
                logger.debug("google.genai with API key failed: %s", exc)

        # 2. Try Google Cloud Vertex AI if running in GCP
        if self.project_id and self.project_id not in ("local-project", "travelbus-manager-dev"):
            try:
                import vertexai
                from vertexai.generative_models import GenerativeModel

                vertexai.init(project=self.project_id, location=settings.GCP_LOCATION)
                self._vertex_model = GenerativeModel("gemini-1.5-flash")
                logger.info(
                    "Initialized Vertex AI Gemini model for project %s",
                    self.project_id,
                )
                self._initialized = True
                return
            except Exception as exc:
                logger.debug("Vertex AI initialization skipped: %s", exc)

        logger.info(
            "Using local intelligent fallback assistant "
            "(no active GEMINI_API_KEY or GCP credentials detected)."
        )
        self._initialized = True

    async def generate_response(self, system_instruction: str, user_prompt: str) -> str | None:
        """Query Gemini API if available, else return None to trigger deterministic fallback."""
        self._initialize_client()

        # 1. Using google-genai client
        if self._genai_client:
            try:
                response = self._genai_client.models.generate_content(
                    model=self.model_name,
                    contents=user_prompt,
                    config={"system_instruction": system_instruction},
                )
                return response.text.strip() if response and response.text else None
            except Exception as exc:
                logger.warning("Google GenAI API call error: %s. Using local fallback.", exc)

        # 2. Using vertexai client
        if self._vertex_model:
            try:
                full_prompt = f"{system_instruction}\n\nUser Question: {user_prompt}"
                response = self._vertex_model.generate_content(full_prompt)
                return response.text.strip() if response and response.text else None
            except Exception as exc:
                logger.warning("Vertex AI call error: %s. Using local fallback.", exc)

        return None


gemini_client = GeminiClient()
