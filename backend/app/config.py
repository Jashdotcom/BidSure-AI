"""
BidSure AI - Centralized Environment and Application Configuration.
Safely locates and loads .env files across backend, root, and frontend directories.
"""
import os
import sys
from pathlib import Path
from typing import Optional


def load_project_env() -> None:
    """
    Finds and loads .env variables into os.environ.
    Tries python-dotenv if installed, otherwise parses .env files directly.
    Searches in order:
      1. backend/.env
      2. Root project directory .env
      3. Current working directory .env
      4. frontend/.env
    """
    candidates = [
        Path(__file__).resolve().parent.parent / ".env",          # backend/.env
        Path(__file__).resolve().parent.parent.parent / ".env",   # root .env
        Path.cwd() / ".env",                                      # cwd .env
        Path(__file__).resolve().parent.parent.parent / "frontend" / ".env",  # frontend/.env
    ]

    # 1. Try python-dotenv first
    try:
        from dotenv import load_dotenv
        for p in candidates:
            if p.is_file():
                load_dotenv(dotenv_path=p, override=False)
    except ImportError:
        pass

    # 2. Built-in zero-dependency .env parser (ensures variables are loaded even without python-dotenv)
    for p in candidates:
        if p.is_file():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#") or "=" not in line:
                            continue
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k and k not in os.environ:
                            os.environ[k] = v
            except Exception:
                pass


# Execute loading immediately upon importing config
load_project_env()


class Settings:
    @property
    def AI_PROVIDER(self) -> str:
        return os.getenv("AI_PROVIDER", "ollama").strip().lower()

    @property
    def AI_MODEL(self) -> str:
        return os.getenv("AI_MODEL", "qwen3:8b").strip()

    @property
    def AI_BASE_URL(self) -> str:
        return os.getenv("AI_BASE_URL", "http://localhost:11434").strip().rstrip("/")

    @property
    def AI_TIMEOUT(self) -> int:
        try:
            return int(os.getenv("AI_TIMEOUT", "120"))
        except (ValueError, TypeError):
            return 120

    @property
    def DEMO_MODE(self) -> bool:
        return os.getenv("DEMO_MODE", "false").strip().lower() in ("true", "1", "t", "yes")


settings = Settings()
