# Presentation Layer: Decision Flow & Architecture

## Layer Purpose

The **Presentation Layer** is the outermost layer of our application. It handles all HTTP-related concerns and serves as the entry point for external requests.

**Core Responsibility:** Adapt HTTP requests to internal service calls and return HTTP responses.

---

## Files in This Layer

### `figma.controller.ts`

**Location:** `presentation/figma.controller.ts`

**Purpose:** HTTP endpoint controller for Figma-related operations

---

## File Analysis: `figma.controller.ts`

### Structure Overview

```typescript
@Controller('figma')
export class FigmaController {
  constructor(
    private readonly figmaApi: FigmaApiService,
    private readonly converter: FigmaConverterService,
  ) {}

  @Post('convert')
  async convert(@Body() dto: ConvertFigmaDto) { ... }
}
```

### Key Design Decisions

#### 1. **Controller Decorator Pattern**
```typescript
@Controller('figma')
```

**Why:**
- NestJS decorator that defines the base route (`/figma`)
- Keeps routing configuration close to the handler
- Allows for middleware and guards to be applied at the controller level

**Alternative Considered:** Express-style router files
**Reason for Current Choice:** NestJS decorators provide better type safety and integration with the framework's dependency injection, also considering scalability.

---

#### 2. **Dependency Injection via Constructor**
```typescript
constructor(
  private readonly figmaApi: FigmaApiService,
  private readonly converter: FigmaConverterService,
) {}
```

**Why:**
- **Testability:** Easy to inject mock services in unit tests
- **Loose Coupling:** Controller doesn't create its own dependencies
- **Single Responsibility:** Each service handles one concern
- `readonly` prevents accidental reassignment

**Design Pattern:** Dependency Injection + Service Locator (via NestJS IoC container)

---

#### 3. **POST Endpoint for Conversion**
```typescript
@Post('convert')
async convert(@Body() dto: ConvertFigmaDto)
```

**Why POST instead of GET?**
- Figma access tokens are sensitive (shouldn't be in URL/query params)
- Request body is encrypted in HTTPS
- Follows REST conventions for operations that process data
- Better for future extensibility (adding more parameters)

**Why `@Body()` with DTO?**
- Automatic validation via `class-validator`
- Type safety at runtime
- Request body is automatically deserialized and validated
- Invalid requests are rejected before reaching business logic

---

#### 4. **Orchestration Flow**
```typescript
async convert(@Body() dto: ConvertFigmaDto) {
  try {
    // 1. Fetch external data (Infrastructure)
    const figmaFile = await this.figmaApi.getFile(dto.fileKey, dto.token);
    
    // 2. Process data (Application)
    const result = this.converter.convert(figmaFile);
    
    // 3. Return result
    return result;
  } catch (error) {
    // Error normalization
  }
}
```

**Why This Flow?**

**Step 1: Fetch Data**
- Delegates to Infrastructure layer
- Controller doesn't know HOW data is fetched (could be HTTP, database, cache)
- Respects Separation of Concerns

**Step 2: Process Data**
- Delegates to Application layer
- Controller doesn't contain business logic
- Pure orchestration

**Step 3: Return Result**
- NestJS automatically serializes the object to JSON
- No manual response formatting needed

**Error Handling Strategy:**
- Catches all errors to prevent server crashes
- Re-throws `HttpException` instances (already formatted)
- Wraps unknown errors in `HttpException` with 500 status
- Normalizes error responses for consistency

---

#### 5. **Why "Thin" Controllers?**

**Current State:**
- 0 lines of business logic
- Only orchestration and error handling
- ~15 lines total (excluding comments)

**Benefits:**
- **Easy to Test:** Minimal mocking required
- **Easy to Read:** Purpose is immediately clear
- **Easy to Change:** Moving to a different framework only requires rewriting this file
- **No Duplication:** Business logic lives in one place (services)

**Anti-Pattern Avoided:**
```typescript
// ❌ BAD: Fat Controller
@Post('convert')
async convert(@Body() dto) {
  const response = await axios.get(`https://api.figma.com/...`);
  const html = this.generateHTML(response.data); // Business logic
  const css = this.generateCSS(response.data);   // Business logic
  return { html, css };
}
```

**Problems with Fat Controllers:**
- Can't reuse logic outside HTTP context
- Harder to test (must mock HTTP framework)
- Violates Single Responsibility Principle
- Business logic is tied to HTTP

---

## Dependency Graph

```
FigmaController
    ├── depends on → FigmaApiService (Infrastructure)
    ├── depends on → FigmaConverterService (Application)
    └── uses → ConvertFigmaDto (Application/DTO)
```

**Direction of Dependencies:**
- Presentation → Infrastructure ✅
- Presentation → Application ✅
- Presentation ← Nothing (nothing depends on controllers)

This is the **outermost layer**, so it's allowed to depend on everything.

---

## Error Handling Strategy

### Current Implementation

```typescript
try {
  // Happy path
} catch (error) {
  if (error instanceof HttpException) throw error;
  throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
}
```

### Why This Design?

**1. Re-throw Known HTTP Errors**
- Services may throw `HttpException` with specific status codes
- Example: `FigmaApiService` throws 401 if token is invalid
- We preserve the original status code and message

**2. Wrap Unknown Errors**
- Unexpected errors become 500 Internal Server Error
- Prevents leaking internal implementation details
- Provides consistent error response format

**3. No Silent Failures**
- All errors are thrown, never swallowed
- Client always receives an error response
- Makes debugging easier

### Future Considerations

**Potential Enhancement: Error Logging**
```typescript
catch (error) {
  this.logger.error('Conversion failed', error);
  // ... throw
}
```

**Potential Enhancement: Custom Error Responses**
```typescript
if (error.code === 'FIGMA_FILE_NOT_FOUND') {
  throw new NotFoundException('Figma file not found');
}
```

---

## Testing Strategy

### Unit Test Approach

```typescript
describe('FigmaController', () => {
  let controller: FigmaController;
  let mockApiService: jest.Mocked<FigmaApiService>;
  let mockConverterService: jest.Mocked<FigmaConverterService>;

  beforeEach(() => {
    mockApiService = { getFile: jest.fn() };
    mockConverterService = { convert: jest.fn() };
    controller = new FigmaController(mockApiService, mockConverterService);
  });

  it('should orchestrate fetch and convert', async () => {
    mockApiService.getFile.mockResolvedValue(mockFigmaNode);
    mockConverterService.convert.mockReturnValue({ html: '...', css: '...' });
    
    const result = await controller.convert({ fileKey: 'abc', token: '123' });
    
    expect(mockApiService.getFile).toHaveBeenCalledWith('abc', '123');
    expect(mockConverterService.convert).toHaveBeenCalledWith(mockFigmaNode);
    expect(result).toEqual({ html: '...', css: '...' });
  });
});
```

**What We're Testing:**
- ✅ Correct orchestration order
- ✅ Parameters are passed correctly
- ✅ Return value is propagated

**What We're NOT Testing:**
- ❌ Actual HTTP requests (that's integration tests)
- ❌ Business logic (that's in services)

---

## API Contract

### Endpoint: `POST /figma/convert`

**Request:**
```json
{
  "fileKey": "abc123xyz",
  "token": "figd_your_token_here"
}
```

**Success Response (200):**
```json
{
  "html": "<div>...</div>",
  "css": ".node-123 { ... }"
}
```

**Error Responses:**

**400 Bad Request** (Invalid input)
```json
{
  "statusCode": 400,
  "message": ["fileKey should not be empty"],
  "error": "Bad Request"
}
```

**401 Unauthorized** (Invalid Figma token)
```json
{
  "statusCode": 401,
  "message": "Invalid token",
  "error": "Unauthorized"
}
```

**500 Internal Server Error** (Unexpected)
```json
{
  "statusCode": 500,
  "message": "An error occurred",
  "error": "Internal Server Error"
}
```

---

## Future Extensibility

### Adding New Endpoints

**Example: Export to React Components**

1. Add new method to controller:
```typescript
@Post('convert-to-react')
async convertToReact(@Body() dto: ConvertFigmaDto) {
  const figmaFile = await this.figmaApi.getFile(dto.fileKey, dto.token);
  const result = this.reactConverter.convert(figmaFile); // New service
  return result;
}
```

2. Create `FigmaToReactService` in Application layer
3. Register service in `figma.module.ts`

**Impact:** Only 2 files modified (controller + new service)

---

### Adding Authentication/Authorization

**Example: User must own the Figma file**

```typescript
@UseGuards(AuthGuard, OwnershipGuard)
@Post('convert')
async convert(@Body() dto: ConvertFigmaDto, @User() user) {
  // Guard ensures user owns this file
  // ...
}
```

**Impact:** No business logic changes needed

---

## Key Takeaways

1. **Controllers are "dumb"** - They orchestrate, not implement
2. **HTTP concerns stay here** - No HTTP code leaks into services
3. **Error handling is normalized** - Consistent client experience
4. **Easy to test** - Minimal mocking required
5. **Framework-specific** - This is the ONLY layer that knows about NestJS decorators

**Golden Rule:** If you're writing business logic in a controller, you're doing it wrong. Extract it to a service.

