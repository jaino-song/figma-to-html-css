# Backend Architecture Decision Flow

## 1. Repo/Code Purpose

This backend application converts Figma designs into production-ready HTML and CSS code. It:
- Fetches design data from Figma's REST API using a file key and personal access token
- Parses the Figma node tree structure (frames, text, shapes, effects)
- Generates semantic HTML with CSS styling that recreates the design pixel-perfectly
- Returns the converted code to the frontend for preview and download

**Primary Use Case:** Designers can export their Figma mockups directly to code without manual HTML/CSS writing.

---

## 2. Files Structure

### Root Files
- **`src/main.ts`** - NestJS application entry point that bootstraps the server
- **`src/app.module.ts`** - Root module that imports and orchestrates all feature modules

### Feature Module: `src/modules/figma/`

#### **Presentation Layer** (`presentation/`)
- **`figma.controller.ts`** - Handles HTTP requests, validates DTOs, orchestrates services, returns responses

#### **Application Layer** (`application/`)
- **`figma-converter.service.ts`** - Core business logic to convert Figma nodes to HTML/CSS
- **`dto/convert-figma.dto.ts`** - Data Transfer Object defining the request structure with validation

#### **Domain Layer** (`domain/`)
- **`figma.types.ts`** - TypeScript interfaces representing Figma entities (FigmaNode, Paint, Color, Effect, etc.)

#### **Infrastructure Layer** (`infrastructure/`)
- **`figma-api.service.ts`** - External API communication to fetch data from Figma's REST API
- **`mappers/figma-api.mapper.ts`** - Converts raw API responses to domain types and vice-versa

#### **Module Configuration**
- **`figma.module.ts`** - NestJS module that registers all providers and controllers

### Test Files (`test/`)

#### **Unit Tests** (`test/unit/`)
- **`application/figma-converter.service.spec.ts`** (38 tests) - Tests HTML/CSS generation logic
- **`application/dto/convert-figma.dto.spec.ts`** (13 tests) - Tests DTO validation rules
- **`infrastructure/figma-api.service.spec.ts`** (13 tests) - Tests API fetching and error handling
- **`infrastructure/mappers/figma-api.mapper.spec.ts`** (25 tests) - Tests API-to-domain mapping

#### **Integration Tests** (`test/integration/`)
- **`figma.controller.spec.ts`** (13 tests) - Tests full request-response flow through all layers

---

## 3. Structure Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENT REQUEST                         │
│                 POST /figma/convert                          │
│                 { fileKey, token }                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              PRESENTATION LAYER                              │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         FigmaController                              │   │
│  │  - Receives HTTP request                             │   │
│  │  - Validates DTO (ConvertFigmaDto)                   │   │
│  │  - Orchestrates services                             │   │
│  │  - Handles errors → HTTP exceptions                  │   │
│  └──────────────┬──────────────────────────────────────┘   │
└─────────────────┼────────────────────────────────────────────┘
                  │
      ┌───────────┴────────────┐
      ▼                        ▼
┌────────────────────┐  ┌─────────────────────────┐
│ INFRASTRUCTURE     │  │  APPLICATION LAYER      │
│     LAYER          │  │                         │
│                    │  │  ┌──────────────────┐  │
│ ┌────────────────┐ │  │  │ FigmaConverter   │  │
│ │ FigmaApiService│ │  │  │    Service       │  │
│ │                │ │  │  │                  │  │
│ │ - Axios HTTP   │ │  │  │ - Find artboard  │  │
│ │ - Auth header  │ │  │  │ - Traverse tree  │  │
│ │ - Error wrap   │ │  │  │ - Generate HTML  │  │
│ └────────┬───────┘ │  │  │ - Generate CSS   │  │
│          │         │  │  └──────────────────┘  │
│          ▼         │  │                         │
│ ┌────────────────┐ │  │                         │
│ │ Figma API      │ │  │                         │
│ │ Mapper         │ │  │                         │
│ │                │ │  │                         │
│ │ - API → Domain │ │  │                         │
│ │ - Domain → API │ │  │                         │
│ └────────┬───────┘ │  │                         │
└──────────┼─────────┘  └─────────────────────────┘
           │
           ▼
    ┌─────────────┐
    │   DOMAIN    │
    │   LAYER     │
    │             │
    │ FigmaNode   │
    │ Paint       │
    │ Color       │
    │ Effect      │
    │ TypeStyle   │
    └─────────────┘
```

### **Data Flow:**

1. **Request** → Controller receives `{ fileKey, token }`
2. **Fetch** → Infrastructure layer calls Figma API
3. **Map** → Raw API response → Domain model (FigmaNode)
4. **Convert** → Application layer processes FigmaNode tree → HTML/CSS
5. **Response** → Controller returns `{ html, css }`

---

## 4. Key Design Decisions (Decision Tree)

### **Why Clean Architecture?**

#### Decision Tree:
```
Need backend structure
    ├─ Will scale? → YES
    │   ├─ Multiple external APIs? → Potentially (Figma, others)
    │   ├─ Complex business logic? → YES (tree traversal, CSS generation)
    │   └─ ✅ Use Clean Architecture (layer separation)
    │
    └─ Simple CRUD? → NO
```

**Rationale:**
- **Separation of Concerns:** Each layer has single responsibility
- **Testability:** Can test business logic without HTTP or external APIs
- **Maintainability:** Changes to Figma API don't affect business logic
- **Scalability:** Easy to add new features or external services

---

### **Layer Responsibilities & Contracts**

#### **Presentation Layer (Controller)**

**Receives:**
```typescript
ConvertFigmaDto {
  fileKey: string;  // e.g., "MxMXpjiLPbdHlratvH0Wdy"
  token: string;    // e.g., "figd_abc123..."
}
```

**Returns:**
```typescript
{
  html: string;  // Generated HTML string
  css: string;   // Generated CSS string
}
```

**Why POST instead of GET?**
- **Security:** Token in request body (not URL/query params)
- **Semantics:** While functionally idempotent, it's an RPC-style operation (conversion)
- **Token protection:** Prevents token leakage in server logs, browser history

---

#### **Infrastructure Layer (API Service)**

**Receives:**
```typescript
getFile(fileKey: string, token: string)
```

**Returns:**
```typescript
Promise<FigmaNode>  // Mapped domain model
```

**Key Decisions:**

1. **Why no caching?**
   ```
   Caching needed?
       ├─ Multiple requests for same file? → Unlikely (per-user, one-time)
       ├─ Data changes frequently? → YES (designs update often)
       └─ ❌ No caching (YAGNI principle)
   ```

2. **Why mapper pattern?**
   ```
   Raw API response structure
       ├─ Type safety? → NO (any type from axios)
       ├─ Validation needed? → YES
       ├─ Default values? → YES (color channels, opacity)
       └─ ✅ Use mapper to transform API → Domain
   ```

3. **Error Handling:**
   - Catches axios errors
   - Wraps in NestJS `HttpException`
   - Preserves status codes (404, 403, 500)
   - Provides fallback messages

---

#### **Application Layer (Converter Service)**

**Receives:**
```typescript
convert(rootNode: FigmaNode)
```

**Returns:**
```typescript
{
  html: string;
  css: string;
}
```

**Key Algorithm Decisions:**

1. **Artboard Discovery:**
   ```
   Root node type?
       ├─ DOCUMENT/CANVAS? → Find ALL FRAMEs/SECTIONs/COMPONENTs
       ├─ Multiple artboards? → Convert all, wrap in container
       ├─ Single artboard? → Convert without wrapper
       └─ No artboards? → Use root node
   ```
   **Why?** Figma files often have multiple artboards (screens, sections, components); converting all provides complete output.
   **Supported Types:** FRAME, SECTION (Figma's organizational containers), COMPONENT
   
   **Container Layout:** When multiple artboards are detected, they are wrapped in `.artboards-container` with `flex-direction: column` to **stack them vertically** (each artboard appears below the previous one). This provides a natural scrolling experience when viewing multiple screens/components.

2. **Tree Traversal:**
   ```
   For each artboard:
       └─ Process as root (isRoot=true)
           └─ For each child node:
               ├─ Visible? → NO → Skip
               ├─ YES → Generate class name
               │       → Generate CSS
               │       └─ Process children (recursive)
   ```
   **Pattern:** Depth-first traversal with context passing
   **Important:** All artboards treated as root containers for consistent flex layout

3. **Positioning Strategy:**
   ```
   Node positioning?
       ├─ Root node? → position: relative
       ├─ Parent has auto-layout? → position: static (flexbox)
       └─ Default → position: absolute (calculate left/top)
   ```
   **Why?** Balances pixel-perfect layout with responsive flexbox.

4. **CSS Generation:**
   - **Fills:** Solid → `rgba()`, Gradient → `linear-gradient()`, Image → `url()`
   - **Strokes:** Border with weight and color
   - **Effects:** Box-shadow (drop/inner)
   - **Typography:** Font family, size, weight, line-height, text-align
   - **Layout:** Flexbox for auto-layout, absolute for pixel-perfect
   - **Multiple Frames:** Wrapped in flex container with gap for side-by-side display

5. **Security:**
   - HTML escaping: `&`, `<`, `>`, `"` → entities
   - Prevents XSS from user-generated text in Figma

---

#### **Domain Layer (Types)**

**Why interfaces instead of classes?**
```
Domain entities needed?
    ├─ Need methods/behavior? → NO (just data structures)
    ├─ Need runtime validation? → NO (handled at DTO layer)
    └─ ✅ Use interfaces (zero runtime overhead)
```

**Key Types:**
- `FigmaNode` - Core entity representing any Figma element
- `Paint` - Fill/stroke styling
- `Color` - RGBA values (normalized 0-1)
- `Effect` - Shadows and effects
- `TypeStyle` - Typography properties

**Design Decision: Optional vs Required**
- Required: `id`, `name`, `type` (always present in Figma)
- Optional: Everything else (depends on node type)

---

## 5. Testing Strategy

### **Test Pyramid**

```
        ┌─────────────────┐
        │   Integration   │  13 tests
        │   (Controller)  │  Full flow
        └─────────────────┘
              │
        ┌─────────────────┐
        │      Unit       │  89 tests
        │   (Services)    │  Isolated logic
        └─────────────────┘
              │
        ┌─────────────────┐
        │      Unit       │  
        │     (DTOs)      │  Validation
        └─────────────────┘
```

**Total: 102 tests** across all layers

---

### **Testing Approach by Layer**

#### **1. DTO Validation Tests** (`convert-figma.dto.spec.ts`)
- ✅ Valid inputs pass
- ❌ Missing fields fail
- ❌ Empty strings fail
- ❌ Wrong types fail
- ❌ Whitespace-only fail

**Why:** Ensure request validation catches bad inputs before processing.

---

#### **2. Infrastructure Tests** (`figma-api.service.spec.ts`)

**Mocking Strategy:**
```typescript
jest.mock('axios');  // Mock external API calls
```

**Test Coverage:**
- ✅ Successful API fetch
- ✅ Correct headers sent
- ✅ Response mapped to domain
- ❌ 404 errors handled
- ❌ 403 authentication errors
- ❌ Network errors handled
- ❌ Malformed responses

**Why mock?** No real API calls in tests (fast, deterministic, no rate limits).

---

#### **3. Mapper Tests** (`figma-api.mapper.spec.ts`)

**Test Coverage:**
- ✅ Basic properties mapped
- ✅ Nested children recursion
- ✅ Default values applied
- ✅ Optional properties handled
- ✅ Bidirectional mapping (API ↔ Domain)
- ❌ Null/undefined handled

**Why bidirectional?** Future-proofing for write operations to Figma.

---

#### **4. Application Logic Tests** (`figma-converter.service.spec.ts`)

**Test Categories:**
1. **Basic Conversion** - Simple nodes → HTML/CSS
2. **HTML Generation** - Nesting, escaping, visibility
3. **CSS Positioning** - Absolute, static, flexbox
4. **Backgrounds** - Solid, gradients, images, opacity
5. **Borders** - Strokes, corner radii
6. **Effects** - Drop shadows, inner shadows
7. **Typography** - Fonts, colors, alignment
8. **Helpers** - `rgba()` color conversion
9. **Edge Cases** - Empty children, missing properties

**Why comprehensive?** Core business logic requires high confidence.

---

#### **5. Integration Tests** (`figma.controller.spec.ts`)

**Purpose:** Verify full request→response flow

**Test Coverage:**
- ✅ Complete successful flow
- ✅ Services called in order
- ✅ Complex nested structures
- ❌ Error propagation
- ❌ Generic error wrapping
- ❌ Status code preservation

**Mocking:** Mock services but test real controller orchestration.

---

### **Test Design Principles**

1. **Isolation:** Each test is independent
2. **Comments:** Every test has a comment explaining its purpose
3. **AAA Pattern:** Arrange → Act → Assert
4. **Edge Cases:** Null, undefined, empty, malformed data
5. **Mock External:** No real API calls or side effects

---

## 6. Key Takeaways

### **Architectural Wins**

1. **Layered Separation**
   - Presentation doesn't know about Axios
   - Application doesn't know about HTTP
   - Domain has zero dependencies
   - Infrastructure is easily replaceable

2. **Type Safety**
   - Raw API `any` → Mapped domain types
   - Validation at DTO layer
   - TypeScript catches errors at compile-time

3. **Testability**
   - 102 tests covering all layers
   - Services can be tested without HTTP or APIs
   - Fast test execution (no network calls)

---

### **Design Patterns Used**

| Pattern | Where | Why |
|---------|-------|-----|
| **Dependency Injection** | All services | Testability, loose coupling |
| **DTO Pattern** | Controller | Input validation, type safety |
| **Mapper Pattern** | Infrastructure | API → Domain transformation |
| **Repository Pattern** | FigmaApiService | Abstract external data source |
| **Service Layer** | Application | Encapsulate business logic |

---

### **Trade-offs Made**

| Decision | Pro | Con | Rationale |
|----------|-----|-----|-----------|
| No caching | Simpler code | Slower repeat requests | YAGNI - not needed for use case |
| Clean Architecture | Maintainable, testable | More files/boilerplate | Worth it for scalability |
| POST endpoint | Secure token handling | Not RESTful | Security > REST purity |
| Interfaces not classes | Zero runtime cost | No methods | Domain entities are data only |
| Absolute positioning | Pixel-perfect | Not responsive | Figma designs are static |

---

### **When to Modify Architecture**

#### **Add Caching If:**
- Users frequently request same files
- Response times become critical
- Figma API rate limits hit

#### **Add Database If:**
- Need to store conversion history
- Want user accounts/sessions
- Building analytics features

#### **Add Queue If:**
- Conversions take too long (>5s)
- Need background processing
- Want to retry failures

#### **Keep Simple Until:**
- Current structure handles load
- No performance issues
- Team can navigate codebase easily

---

### **File Size & Complexity Metrics**

| Layer | Files | Tests | Lines of Code |
|-------|-------|-------|---------------|
| Presentation | 1 | 13 | ~50 |
| Application | 2 | 51 | ~350 |
| Domain | 1 | 0 | ~90 |
| Infrastructure | 2 | 38 | ~250 |
| **Total** | **6** | **102** | **~740** |

---

### **Learning Path for New Developers**

1. **Start:** Read `figma.types.ts` to understand data structures
2. **Then:** Review `figma-converter.service.ts` to see core logic
3. **Next:** Check `figma.controller.ts` to see HTTP layer
4. **Finally:** Look at `figma-api.service.ts` for external integration
5. **Bonus:** Read test files for usage examples

---

### **Future Enhancements Considered**

#### **Planned:**
- [ ] Support for more Figma node types (vectors, masks)
- [ ] Better gradient angle calculation
- [ ] Export to React components (not just HTML)

#### **Rejected (for now):**
- ❌ Real-time Figma sync (too complex)
- ❌ Two-way editing (not in scope)
- ❌ AI-powered optimization (YAGNI)

---

**Last Updated:** 2025-11-21  
**Architecture Version:** 1.0  
**Maintained By:** Development Team

