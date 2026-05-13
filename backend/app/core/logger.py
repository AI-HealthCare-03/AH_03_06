import logging
import sys

def setup_logger(
    name: str = "Viva",
    level: int = logging.INFO,
) -> logging.Logger:
    _logger = logging.getLogger(name)

    if _logger.handlers:
        return _logger

    _logger.setLevel(level)

    formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s")

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)

    _logger.addHandler(console_handler)
    _logger.propagate = False

    return _logger
