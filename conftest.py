import os

# Tests must never reach the real Groq API, even when a developer .env enables it.
# Set before any app module is imported so Settings picks these up over .env.
os.environ["STT_PROVIDER"] = "local"
os.environ["GROQ_API_KEY"] = ""
