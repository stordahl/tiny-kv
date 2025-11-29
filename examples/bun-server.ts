import { TinyKv } from '../tiny-kv';
import { serve } from 'bun';

// Initialize TinyKv instance for caching
const cache = new TinyKv();

// Simulate an expensive API call
async function fetchUserData(userId: string): Promise<any> {
  console.log(`Fetching fresh data for user ${userId}...`);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock user data
  return {
    id: userId,
    name: `User ${userId}`,
    email: `user${userId}@example.com`,
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };
}

// Cache middleware function
async function getCachedData(key: string, fetcher: () => Promise<any>, ttlMs: number = 5 * 60 * 1000): Promise<any> {
  // Try to get from cache first
  const cached = cache.get(key);
  if (cached) {
    console.log(`Cache HIT for key: ${key}`);
    return cached;
  }
  
  // Cache miss - fetch fresh data
  console.log(`Cache MISS for key: ${key}`);
  const data = await fetcher();
  
  // Store in cache with 5-minute expiration
  const expirationTime = Date.now() + ttlMs;
  await cache.set(key, data, { ex: expirationTime });
  
  return data;
}

// Bun server
const server = serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      // GET /users/:id - Get user data with caching
      if (url.pathname.startsWith('/users/') && req.method === 'GET') {
        const userId = url.pathname.split('/')[2];
        
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'User ID is required' }), 
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }
        
        const userData = await getCachedData(
          `user:${userId}`,
          () => fetchUserData(userId),
          5 * 60 * 1000 // 5 minutes
        );
        
        return new Response(
          JSON.stringify({ 
            data: userData,
            cached: cache.exists(`user:${userId}`),
            expiresAt: cache.getExpiration(`user:${userId}`)
          }), 
          { 
            status: 200, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
      }
      
      // GET /cache/stats - View cache statistics
      if (url.pathname === '/cache/stats' && req.method === 'GET') {
        const stats = {
          storageSize: cache.size(),
        };
        
        return new Response(
          JSON.stringify(stats), 
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      
      // DELETE /cache/:key - Clear specific cache entry
      if (url.pathname.startsWith('/cache/') && req.method === 'DELETE') {
        const key = url.pathname.split('/')[2];
        cache.delete(key);
        
        return new Response(
          JSON.stringify({ message: `Cache entry '${key}' deleted` }), 
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      
      // GET / - Health check
      if (url.pathname === '/' && req.method === 'GET') {
        return new Response(
          JSON.stringify({ 
            message: 'TinyKv Bun Server Example',
            endpoints: [
              'GET /users/:id - Get user data (cached for 5 minutes)',
              'GET /cache/stats - View cache statistics',
              'DELETE /cache/:key - Clear specific cache entry'
            ]
          }), 
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      
      // 404 for unknown routes
      return new Response(
        JSON.stringify({ error: 'Not Found' }), 
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
      
    } catch (error) {
      console.error('Server error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal Server Error' }), 
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
  },
});

console.log(`🚀 TinyKv Bun Server running on http://localhost:${server.port}`);
console.log('\nAvailable endpoints:');
console.log('  GET /                 - Health check and API info');
console.log('  GET /users/:id        - Get user data (cached for 5 minutes)');
console.log('  GET /cache/stats      - View cache statistics');
console.log('  DELETE /cache/:key    - Clear specific cache entry');
console.log('\nExample usage:');
console.log('  curl http://localhost:3000/users/123');
console.log('  curl http://localhost:3000/cache/stats');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  cache.cleanup();
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  cache.cleanup();
  server.stop();
  process.exit(0);
});
