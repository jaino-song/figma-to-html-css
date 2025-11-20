# Infrastructure Layer: Decision Flow & Architecture

## Layer Purpose

The **Infrastructure Layer** handles all interactions with the external world: APIs, databases, file systems, third-party services, etc.

**Core Responsibility:** Isolate external dependencies and translate between external formats and our Domain models.

---

## Files in This Layer

### `figma-api.service.ts`

**Location:** `infrastructure/figma-api.service.ts`

**Purpose:** Communicate with the Figma REST API

---

## File Analysis: `figma-api.service.ts`

### Structure Overview

```typescript
@Injectable()
export class FigmaApiService {
  private readonly baseUrl = 'https://api.figma.com/v1';
  private cache = new Map<string, { data: FigmaNode; timestamp: number }>();
  private readonly CACHE_TTL = 3600000; // 1 hour

  async getFile(fileKey: string, token: string): Promise<FigmaNode> { ... }
}
```

### Key Design Decisions

#### 1. **Injectable Service Pattern**
```typescript
@Injectable()
export class FigmaApiService { ... }
```

**Why:**
- Makes this service available for dependency injection
- Singleton scope by default (one instance shared across app)
- Can be easily mocked in tests
- Framework manages lifecycle

**Alternative Considered:** Static utility class
**Reason for Current Choice:** DI allows for better testability and state management

---

#### 2. **Base URL Configuration**
```typescript
private readonly baseUrl = 'https://api.figma.com/v1';
```

**Current State:** Hard-coded constant

**Why:**
- Figma API endpoint is stable and unlikely to change
- Simplifies configuration for now

**Future Improvement:**
```typescript
constructor(@Inject('FIGMA_API_URL') private readonly baseUrl: string) {}
```

**When to Refactor:**
- When supporting multiple Figma environments (staging, production)
- When building a proxy/mock for testing
- When moving to environment variables

**Trade-off:** Simplicity now vs. flexibility later (currently simple wins)

---

#### 3. **In-Memory Caching Strategy**

### Cache Structure

```typescript
private cache = new Map<string, { data: FigmaNode; timestamp: number }>();
private readonly CACHE_TTL = 3600000; // 1 hour in milliseconds
```

**Cache Storage:**
- **Key:** `fileKey` (string) - Figma file identifier
- **Value:** Object containing:
  - `data: FigmaNode` - The cached Figma document
  - `timestamp: number` - When it was cached (Unix timestamp in ms)

**Why Cache?**
- **API Rate Limiting:** Figma has strict rate limits
- **Performance:** Repeated requests for same file are instant
- **Development Speed:** Faster iteration during development
- **Cost Reduction:** Fewer API calls

**Why In-Memory (Map)?**
- Simple implementation
- Zero external dependencies
- Fast lookups O(1)
- Sufficient for single-instance deployments

---

### Cache Flow

#### Step 1: **Check Cache First**

```typescript
async getFile(fileKey: string, token: string): Promise<FigmaNode> {
  const cached = this.cache.get(fileKey);
  if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
    console.log('Using cached Figma file');
    return cached.data;
  }
```

**Logic:**
1. Try to get cached data: `this.cache.get(fileKey)`
2. If found AND not expired:
   - `Date.now() - cached.timestamp` = age of cache entry
   - If age < 1 hour (CACHE_TTL), return cached data
3. Otherwise, continue to fetch from API

---

#### Step 2: **Fetch from API (Cache Miss)**

```typescript
try {
  const response = await axios.get(`${this.baseUrl}/files/${fileKey}`, {
    headers: {
      'X-Figma-Token': token,
    },
  });
  
  this.cache.set(fileKey, {
    data: response.data.document,
    timestamp: Date.now(),
  });
  
  return response.data.document;
```

**Logic:**
1. Fetch from Figma API
2. Store in cache: `this.cache.set(fileKey, { data, timestamp })`
3. Return the data

---

### Visual Flow Diagram

```
Request for fileKey "abc123"
         ↓
    Check cache
         ↓
    ┌─────────┐
    │ Cached? │
    └────┬────┘
         │
    ┌────┴────┐
    │         │
   YES       NO
    │         │
    ↓         ↓
 Check TTL   Fetch API
    │            ↓
┌───┴───┐    Store in cache
│       │        ↓
Fresh  Expired  Return data
│       │
↓       ↓
Return  Fetch API
cache      ↓
       Store in cache
           ↓
       Return data
```

---

### Example Timeline

```javascript
// Time: 0ms
getFile("abc123", "token1")
  → Cache MISS
  → Fetch from API (takes 500ms)
  → Store: { data: {...}, timestamp: 1000 }
  → Return data

// Time: 30 minutes later (1,800,000ms)
getFile("abc123", "token2")
  → Cache HIT
  → Age: 1,800,000ms < 3,600,000ms (TTL)
  → Return cached data immediately (0ms latency!)

// Time: 90 minutes later (5,400,000ms)
getFile("abc123", "token3")
  → Cache EXPIRED
  → Age: 5,400,000ms > 3,600,000ms (TTL)
  → Fetch from API (500ms)
  → Update cache: { data: {...}, timestamp: 5400000 }
  → Return fresh data
```

---

### TTL (Time-To-Live) Strategy

**Why 1 Hour?**
- Balances freshness vs. performance
- Figma designs don't change frequently during active development
- Long enough to benefit repeated requests
- Short enough to see updates within reasonable time

**Trade-offs:**
- **Longer TTL:** Better performance, staler data
- **Shorter TTL:** Fresher data, more API calls

**Production Consideration:**
```typescript
// Could make TTL configurable
constructor(
  @Inject('CACHE_TTL') private readonly CACHE_TTL: number = 3600000
) {}
```

**Cache Invalidation Strategy (Future):**
- Manual invalidation endpoint: `DELETE /cache/:fileKey`
- Webhook from Figma when file changes
- Smart TTL based on file activity

---

### Cache Key Strategy

**Current:** Only uses `fileKey`
```typescript
this.cache.get(fileKey) // Same for all users
```

**Implication:**
- User A fetches file "abc123" → Cached
- User B fetches same file "abc123" → Gets User A's cached data
- **Shared cache across all users**

**Potential Issue:**
If different tokens have different permissions to the same file, User B might see cached data they shouldn't access.

**Alternative (per-user cache):**
```typescript
// Change cache key to include user identifier
this.cache.get(`${fileKey}:${userId}`)
```

---

### Performance Impact

#### Without Cache:
```
Request 1: 500ms (API call)
Request 2: 500ms (API call)
Request 3: 500ms (API call)
Total: 1500ms
```

#### With Cache:
```
Request 1: 500ms (API call, cache miss)
Request 2: ~0ms (cache hit)
Request 3: ~0ms (cache hit)
Total: 500ms (67% faster!)
```

---

### Cache Characteristics

| Characteristic | Value |
|---------------|-------|
| **Storage Type** | In-memory (JavaScript Map) |
| **Scope** | Per server instance |
| **Persistence** | Lost on server restart |
| **TTL** | 1 hour (3,600,000ms) |
| **Eviction Policy** | Time-based only (no LRU) |
| **Max Size** | Unbounded (grows with unique files) |
| **Sharing** | Single instance (not distributed) |

---

#### 4. **HTTP Client Choice: Axios**
```typescript
const response = await axios.get(`${this.baseUrl}/files/${fileKey}`, {
  headers: {
    'X-Figma-Token': token,
  },
});
```

**Why Axios?**
- ✅ Promise-based API (works with async/await)
- ✅ Automatic JSON parsing
- ✅ Interceptor support (for logging, retries)
- ✅ Better error handling than native fetch
- ✅ Request/response transformation

**Alternatives Considered:**

**Native Fetch:**
```typescript
// More verbose
const response = await fetch(url, { headers: ... });
if (!response.ok) throw new Error(...);
const data = await response.json();
```

**Node HTTP/HTTPS:**
```typescript
// Too low-level
https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  // More boilerplate...
});
```

**Reason for Axios:** Considering scalability, best developer experience, proven in production

---

#### 5. **Authentication: X-Figma-Token Header**
```typescript
headers: {
  'X-Figma-Token': token,
}
```

**Why Custom Header?**
- Figma API specification requires it
- More secure than query parameters (not logged in URLs)
- Works with HTTPS encryption

**Security Consideration:**
- Token is passed from client → server → Figma
- Server doesn't store the token
- Each request requires token (stateless)

**Alternative Design: Server-Side Token Storage**
```typescript
// User authenticates once, server stores token
async getFile(fileKey: string, userId: string) {
  const token = await this.tokenStore.getToken(userId);
  // Use stored token
}
```

**Trade-offs:**
- Current: Stateless, no storage needed, but token in every request
- Alternative: Stateful, more secure, but requires database

---

#### 6. **Error Handling Strategy**
```typescript
try {
  return response.data.document;
} catch (error) {
  console.error('Error fetching Figma file:', error);
  throw new HttpException(
    error.response?.data?.err || 'Failed to fetch Figma file',
    error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
  );
}
```

**Why Re-throw as HttpException?**
- Normalizes errors for the controller layer
- Preserves HTTP status codes from Figma API
- Provides meaningful error messages

**Error Mapping:**
- Figma 404 → NestJS 404
- Figma 401 → NestJS 401
- Network errors → NestJS 500

**Logging:**
- `console.error` for debugging (development)
- Should use proper logger in production (Winston, Pino)

**Error Context Preservation:**
```typescript
error.response?.data?.err  // Figma's error message
error.response?.status     // Figma's status code
```

**Fallback Values:**
```typescript
|| 'Failed to fetch Figma file'           // Default message
|| HttpStatus.INTERNAL_SERVER_ERROR       // Default status
```

---

#### 7. **Return Type: Domain Model**
```typescript
async getFile(fileKey: string, token: string): Promise<FigmaNode>
```

**Key Decision:** Return `FigmaNode` (Domain type), not `any` or raw response

**Why:**
- Type safety throughout the application
- Documents the expected structure
- Compiler catches breaking changes
- No need for runtime type checking in Application layer

**Data Extraction:**
```typescript
return response.data.document;
```

- Figma API returns: `{ document: { ... }, ... }`
- We extract only the document node (root of tree)
- Discards metadata we don't need

**Implicit Type Assertion:**
- TypeScript trusts that `response.data.document` matches `FigmaNode`
- Could add runtime validation with Zod/io-ts if needed

---
## Dependency Graph

```
FigmaApiService
    ├── depends on → FigmaNode (Domain type)
    ├── uses → axios (external library)
    └── uses → NestJS HttpException (framework)
```

**Direction of Dependencies:**
- Infrastructure → Domain ✅ (returns Domain types)
- Infrastructure → External Libraries ✅ (Axios, HTTP)
- Infrastructure ← Application (Application calls this)

---

## Testing Strategy

### Unit Test Approach

```typescript
describe('FigmaApiService', () => {
  let service: FigmaApiService;
  let axiosMock: jest.MockedFunction<typeof axios.get>;

  beforeEach(() => {
    service = new FigmaApiService();
    axiosMock = jest.spyOn(axios, 'get').mockResolvedValue({
      data: { document: mockFigmaNode }
    });
  });

  it('should fetch file from Figma API', async () => {
    const result = await service.getFile('abc123', 'token123');
    
    expect(axiosMock).toHaveBeenCalledWith(
      'https://api.figma.com/v1/files/abc123',
      { headers: { 'X-Figma-Token': 'token123' } }
    );
    expect(result).toEqual(mockFigmaNode);
  });

  it('should use cached data within TTL', async () => {
    await service.getFile('abc123', 'token123'); // First call
    await service.getFile('abc123', 'token123'); // Second call
    
    expect(axiosMock).toHaveBeenCalledTimes(1); // Only called once
  });

  it('should throw HttpException on API error', async () => {
    axiosMock.mockRejectedValue({
      response: { status: 401, data: { err: 'Invalid token' } }
    });
    
    await expect(service.getFile('abc123', 'bad_token'))
      .rejects.toThrow(HttpException);
  });
});
```

**What We Test:**
- ✅ Correct API endpoint is called
- ✅ Headers are set properly
- ✅ Caching behavior works
- ✅ Errors are properly transformed

---

## Key Takeaways

1. **All external I/O is isolated here** - Makes it easy to mock/replace
2. **Returns Domain types** - Application layer stays pure
3. **Caching improves performance** - But needs proper invalidation for production
4. **Error transformation** - External errors become internal exceptions
5. **Technology-specific code lives here** - Axios, HTTP, network concerns

