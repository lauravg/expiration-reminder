import time
import functools
import logging
from typing import Callable, Any
from colorama import Fore, Style, init

# Initialize colorama
init()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def measure_time(func: Callable) -> Callable:
    @functools.wraps(func)
    def wrapper(*args, **kwargs) -> Any:
        start_time = time.perf_counter()
        try:
            result = func(*args, **kwargs)
            return result
        finally:
            end_time = time.perf_counter()
            execution_time_ms = (
                end_time - start_time
            ) * 1000  # Convert to milliseconds
            logger.info(
                f"Function {Fore.YELLOW}{func.__name__}{Style.RESET_ALL} took {Fore.RED}{execution_time_ms:.2f}ms{Style.RESET_ALL} to execute"  # noqa: E501
            )

    return wrapper
