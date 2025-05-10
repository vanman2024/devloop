#!/usr/bin/env python3
"""
Redis Cache for Feature Creation Agent

This module provides a Redis-based caching system for the feature creation agent,
enabling faster responses and reduced computational load for repeated operations.
"""

import os
import sys
import json
import logging
import time
import hashlib
from typing import Dict, List, Any, Optional, Tuple, Union, Callable

# Add project root to path to allow importing common modules
PROJECT_ROOT = '/mnt/c/Users/angel/Devloop'
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(PROJECT_ROOT, 'logs', 'redis_cache.log'))
    ]
)
logger = logging.getLogger('redis_cache')

class RedisCache:
    """
    Redis cache implementation for feature creation agent.
    Provides caching capabilities for expensive operations.
    
    If Redis is not available, falls back to a simple in-memory cache.
    """
    
    def __init__(self, redis_url: Optional[str] = None, ttl: int = 3600):
        """
        Initialize the Redis cache
        
        Args:
            redis_url: Redis connection URL
            ttl: Time to live for cache entries in seconds (default: 1 hour)
        """
        self.redis_url = redis_url or os.environ.get("REDIS_URL", "redis://localhost:6379/0")
        self.ttl = ttl
        self.is_connected = False
        self.redis_client = None
        
        # In-memory cache fallback
        self.memory_cache = {}
        self.cache_timestamps = {}
        
        # Try to connect
        self._connect()
    
    def _connect(self) -> bool:
        """
        Connect to Redis
        
        Returns:
            True if connection successful, False otherwise
        """
        try:
            # TODO: Replace with actual Redis connection
            # import redis
            # self.redis_client = redis.from_url(self.redis_url)
            # self.redis_client.ping()  # Test connection
            # self.is_connected = True
            
            # For now, just use in-memory cache
            logger.info("Using in-memory cache (Redis not connected)")
            self.is_connected = False
            
            return self.is_connected
        
        except ImportError:
            logger.warning("redis-py not installed, using in-memory cache")
            self.is_connected = False
            return False
            
        except Exception as e:
            logger.error(f"Error connecting to Redis: {str(e)}")
            self.is_connected = False
            return False
    
    def _generate_key(self, prefix: str, args: tuple, kwargs: dict) -> str:
        """
        Generate a cache key from function arguments
        
        Args:
            prefix: Key prefix (usually function name)
            args: Positional arguments
            kwargs: Keyword arguments
            
        Returns:
            Cache key string
        """
        # Create a string representation of args and kwargs manually
        # This avoids JSON serialization issues with complex objects
        try:
            # Try to use JSON for simple types
            arg_str = json.dumps(args, sort_keys=True)
            kwarg_str = json.dumps(kwargs, sort_keys=True)
        except (TypeError, OverflowError, ValueError):
            # Fall back to string representation for complex objects
            arg_str = str(args)
            kwarg_str = str(sorted(kwargs.items()))
        
        # Create a hash of the arguments
        key_hash = hashlib.md5(f"{arg_str}:{kwarg_str}".encode('utf-8')).hexdigest()
        
        # Combine prefix with hash
        return f"{prefix}:{key_hash}"
    
    def _cleanup_memory_cache(self):
        """Clean up expired entries in the memory cache"""
        current_time = time.time()
        expired_keys = []
        
        for key, timestamp in self.cache_timestamps.items():
            if current_time - timestamp > self.ttl:
                expired_keys.append(key)
        
        for key in expired_keys:
            del self.memory_cache[key]
            del self.cache_timestamps[key]
            
        logger.debug(f"Cleaned up {len(expired_keys)} expired cache entries")
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get a value from the cache
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found
        """
        try:
            if self.is_connected:
                # TODO: Replace with actual Redis code
                # value = self.redis_client.get(key)
                # if value:
                #     return json.loads(value)
                # return None
                pass
            
            # Use in-memory cache
            if key in self.memory_cache:
                # Check if expired
                timestamp = self.cache_timestamps.get(key, 0)
                if time.time() - timestamp <= self.ttl:
                    logger.debug(f"Cache hit: {key}")
                    return self.memory_cache[key]
                else:
                    # Expired
                    del self.memory_cache[key]
                    del self.cache_timestamps[key]
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting from cache: {str(e)}")
            return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """
        Set a value in the cache
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Optional time to live in seconds (overrides default)
            
        Returns:
            True if successful, False otherwise
        """
        ttl = ttl or self.ttl
        
        try:
            if self.is_connected:
                # TODO: Replace with actual Redis code
                # return self.redis_client.setex(
                #     key,
                #     ttl,
                #     json.dumps(value)
                # )
                pass
            
            # Use in-memory cache
            self.memory_cache[key] = value
            self.cache_timestamps[key] = time.time()
            
            # Periodically clean up expired entries
            if len(self.memory_cache) % 10 == 0:
                self._cleanup_memory_cache()
                
            logger.debug(f"Stored in cache: {key}")
            return True
            
        except Exception as e:
            logger.error(f"Error setting in cache: {str(e)}")
            return False
    
    def delete(self, key: str) -> bool:
        """
        Delete a value from the cache
        
        Args:
            key: Cache key
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if self.is_connected:
                # TODO: Replace with actual Redis code
                # return bool(self.redis_client.delete(key))
                pass
            
            # Use in-memory cache
            if key in self.memory_cache:
                del self.memory_cache[key]
                if key in self.cache_timestamps:
                    del self.cache_timestamps[key]
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error deleting from cache: {str(e)}")
            return False
    
    def flush(self) -> bool:
        """
        Flush the entire cache
        
        Returns:
            True if successful, False otherwise
        """
        try:
            if self.is_connected:
                # TODO: Replace with actual Redis code
                # self.redis_client.flushdb()
                # return True
                pass
            
            # Use in-memory cache
            self.memory_cache.clear()
            self.cache_timestamps.clear()
            logger.info("Flushed in-memory cache")
            return True
            
        except Exception as e:
            logger.error(f"Error flushing cache: {str(e)}")
            return False
    
    def cached(self, prefix: Optional[str] = None, ttl: Optional[int] = None):
        """
        Decorator for caching function results
        
        Args:
            prefix: Key prefix (defaults to function name)
            ttl: Optional time to live in seconds (overrides default)
            
        Returns:
            Decorator function
        """
        def decorator(func: Callable):
            func_prefix = prefix or func.__name__
            
            def wrapper(*args, **kwargs):
                # Check for no_cache keyword argument
                no_cache = kwargs.pop('no_cache', False)
                if no_cache:
                    return func(*args, **kwargs)
                
                # Generate cache key
                key = self._generate_key(func_prefix, args, kwargs)
                
                # Try to get from cache
                cached_value = self.get(key)
                if cached_value is not None:
                    return cached_value
                
                # Call the function
                result = func(*args, **kwargs)
                
                # Store in cache
                self.set(key, result, ttl)
                
                return result
                
            return wrapper
            
        return decorator

# Singleton instance of the Redis cache
_redis_cache_instance = None

def get_redis_cache() -> RedisCache:
    """
    Get the singleton instance of the Redis cache
    
    Returns:
        RedisCache instance
    """
    global _redis_cache_instance
    if _redis_cache_instance is None:
        _redis_cache_instance = RedisCache()
    return _redis_cache_instance

# Convenience function for using the cache decorator
def cached(prefix: Optional[str] = None, ttl: Optional[int] = None):
    """Convenience function for using the cache decorator"""
    cache = get_redis_cache()
    return cache.cached(prefix, ttl)