# TinyKv Bun Server Example

This example demonstrates how to use TinyKv as a caching layer in a Bun HTTP server. The server caches API responses for 5 minutes to improve performance.

## Features

- **Request Caching**: Automatically caches user data requests with 5-minute expiration
- **Cache Statistics**: View cache status and statistics
- **Cache Management**: Clear specific cache entries
- **CORS Support**: Full CORS headers for cross-origin requests
- **Graceful Shutdown**: Proper cleanup on server termination

## Running the Example

```bash
# Install dependencies (if not already installed)
bun install

# Run the server
bun run examples/bun-server.ts
```

The server will start on `http://localhost:3000`.

## API Endpoints

### GET `/`
Health check and API information.

### GET `/users/:id`
Fetches user data with automatic caching. The first request fetches fresh data, subsequent requests within 5 minutes return cached data.

**Example:**
```bash
curl http://localhost:3000/users/123
```

**Response:**
```json
{
  "data": {
    "id": "123",
    "name": "User 123",
    "email": "user123@example.com",
    "createdAt": "2025-11-29T...",
    "lastUpdated": "2025-11-29T..."
  },
  "cached": true,
  "expiresAt": 1701234567890
}
```

### GET `/cache/stats`
View current cache statistics.

**Example:**
```bash
curl http://localhost:3000/cache/stats
```

**Response:**
```json
{
  "storageSize": 3,
  "expirationMapSize": 3,
  "keys": ["user:123", "user:456", "user:789"]
}
```

### DELETE `/cache/:key`
Clear a specific cache entry.

**Example:**
```bash
curl -X DELETE http://localhost:3000/cache/user:123
```

## How It Works

1. **Cache Key Strategy**: Uses `user:${userId}` as cache keys for user data
2. **Cache-Aside Pattern**: 
   - First checks cache for existing data
   - On cache miss, fetches fresh data and stores it
   - On cache hit, returns cached data immediately
3. **Expiration**: All cached entries automatically expire after 5 minutes (300,000ms)
4. **Active Cleanup**: TinyKv's built-in active expiration removes expired entries

## Testing the Cache

1. Make multiple requests to the same user:
   ```bash
   time curl http://localhost:3000/users/123  # First request (slower)
   time curl http://localhost:3000/users/123  # Second request (faster, cached)
   ```

2. Check cache statistics:
   ```bash
   curl http://localhost:3000/cache/stats
   ```

3. Clear cache and test again:
   ```bash
   curl -X DELETE http://localhost:3000/cache/user:123
   curl http://localhost:3000/users/123  # Will fetch fresh data again
   ```

## Real-World Use Cases

This pattern is commonly used for:
- Database query results
- External API responses
- Computed data that doesn't change frequently
- User session data
- Product information in e-commerce

The 5-minute expiration provides a good balance between data freshness and performance for many real-world scenarios.