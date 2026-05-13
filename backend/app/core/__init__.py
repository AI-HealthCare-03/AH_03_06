from __future__ import annotations

from .config import Settings
from .logger import setup_logger

config: Settings = Settings()
default_logger = setup_logger()


def get_config() -> Settings:
    return config


def get_logger():
    return default_logger
