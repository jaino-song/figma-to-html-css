# Figma to HTML/CSS Converter

A high-performance web application that converts Figma designs into production-ready HTML and CSS code.

## 🎯 Purpose

Transform Figma designs into pixel-perfect HTML/CSS without manual coding. Simply provide a Figma file key and API token to get clean, semantic code.

## 🚀 Quick Start

```bash
# Install dependencies
cd apps/server && npm install
cd ../client && npm install

# Start backend (port 3000)
cd apps/server && npm run start:dev

# Start frontend (port 3001)
cd apps/client && npm run dev
```

## 🏗️ Architecture

### **Clean Architecture with NestJS**

```
┌─────────────────────────────────────────┐
│         PRESENTATION LAYER              │ → HTTP endpoints, DTOs
├─────────────────────────────────────────┤
│         APPLICATION LAYER               │ → Business logic, conversion
├─────────────────────────────────────────┤
│         DOMAIN LAYER                    │ → Types, interfaces
├─────────────────────────────────────────┤
│         INFRASTRUCTURE LAYER            │ → External APIs, mappers
└─────────────────────────────────────────┘
```

### **Backend Structure (`apps/server`)**

```
src/modules/figma/
├── presentation/
│   └── figma.controller.ts         # HTTP endpoints, request handling
├── application/
│   ├── figma-converter.service.ts  # Core conversion logic
│   └── dto/convert-figma.dto.ts    # Input validation
├── domain/
│   └── figma.types.ts              # TypeScript interfaces
└── infrastructure/
    ├── figma-api.service.ts        # Figma API client
    └── mappers/figma-api.mapper.ts # API ↔ Domain transformation
```

### **Frontend Structure (`apps/client`)**

Simple Next.js app with:
- **Single Page Component** (`app/page.tsx`)
- **TanStack Query** for server state
- **Tailwind CSS** for styling
- **No Redux/Zustand** (YAGNI principle)

## 📊 Data Flow

```
1. User Input → fileKey + token
2. Frontend → POST /figma/convert
3. Controller → Validates DTO
4. Infrastructure → Fetch from Figma API
5. Mapper → Transform to domain types
6. Converter → Generate HTML/CSS
7. Response → Return to frontend
```

## 🔑 Key Design Decisions

### **Backend**

| Decision | Reasoning |
|----------|-----------|
| **Clean Architecture** | Separation of concerns, testability, maintainability |
| **Interfaces over Classes** | Zero runtime overhead for JSON tree with thousands of nodes |
| **POST for `/convert`** | Token security (not in URL), semantic action |
| **Retry with Exponential Backoff** | Handle rate limits (429), service issues (503) |
| **No Caching** | Stateless, designs change frequently |

### **Frontend**

| Decision | Reasoning |
|----------|-----------|
| **No Zustand/Redux** | Single component, simple state → `useState` sufficient |
| **TanStack Query** | Client-side caching, refetch control, loading states |
| **Single Page** | MVP focus, minimal complexity |
| **No Auto-Refetch** | Manual conversion trigger, cache never stales |

## 🧩 Core Conversion Algorithm

```typescript
// 1. Find all artboards (FRAME, SECTION, COMPONENT)
const artboards = findAllArtboards(rootNode);

// 2. Process each artboard recursively
for (const artboard of artboards) {
  html += processNode(artboard, isRoot=true);
  css += generateStyles(artboard);
}

// 3. Key transformations:
- Figma fills → CSS backgrounds/gradients
- Figma effects → CSS shadows/filters
- Figma layout → CSS flexbox/absolute positioning
- Figma text → CSS typography
```

## 🐛 Notable Bugs Fixed

1. **Null-Safety in Mappers** - Added guards for optional nested properties (crashes prevented)
2. **Multiple Artboards Positioning** - All artboards now use consistent `position: relative` for flex layout
3. **Vertical Stacking** - Changed artboard container from horizontal to vertical layout
4. **Text Alignment** - Switched from `text-align` (doesn't work on inline) to flexbox on parent
5. **Flex Application Logic** - Fixed applying flex to parents, not text children themselves
6. **Figma Alignment Mapping** - Map `counterAxisAlignItems`/`primaryAxisAlignItems` to CSS flexbox

## 🧪 Testing

**112 tests** across all layers:

```bash
# Run all tests
npm test

# Coverage report
npm run test:cov
```

| Layer | Tests | Coverage Focus |
|-------|-------|----------------|
| **Application** | 38 | HTML/CSS generation, edge cases |
| **Infrastructure** | 38 | API calls, mapping, null-safety |
| **Presentation** | 13 | Request flow, error handling |
| **DTOs** | 13 | Validation rules |

## 🔧 Configuration

### **Required Environment Variables**

None! The application uses:
- Frontend: `http://localhost:3001`
- Backend: `http://localhost:3000`
- Figma API: Token provided per request


## 📈 Performance Optimizations

- **Interfaces over Classes**: Zero runtime overhead for type checking
- **No Server-Side Caching**: Stateless design, designs change frequently
- **Efficient Tree Traversal**: Single-pass recursive processing
- **Minimal Dependencies**: Only essential packages
- **Retry with Backoff**: Handles transient failures (429, 503) gracefully

## 🛡️ Error Handling

- **Retry Logic**: Exponential backoff for transient failures
- **Graceful Degradation**: Placeholder gradients for missing images
- **Validation**: DTO validation with class-validator
- **HTTP Status Preservation**: Correct error codes from API to client

## 📚 Additional Resources

- [`bug-fix.md`](bug-fix.md) - Detailed bug analysis and fixes

## 💡 Principles

- **YAGNI** (You Aren't Gonna Need It) - No premature optimization
- **KISS** (Keep It Simple, Stupid) - Minimal complexity
- **Clean Architecture** - Clear separation of concerns
- **Test-Driven Development** - Comprehensive test coverage

---

**Built with** NestJS, Next.js, TypeScript, and hard work 🧑🏻‍💻
