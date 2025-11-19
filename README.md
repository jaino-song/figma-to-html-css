# Figma to HTML/CSS Converter

This monorepo contains a Full Stack application that converts Figma designs into visually identical HTML/CSS code.

## 🏗 Architecture Overview

The project follows a **Clean Architecture** approach for the backend and a **Component-Based** architecture for the frontend, structured as a monorepo.

### Monorepo Structure
- **`apps/client`**: Next.js frontend application.
- **`apps/server`**: NestJS backend application.

This separation ensures that the UI concerns (Client) are completely decoupled from the business logic and external API integrations (Server).

---

## 🖥 Frontend (`apps/client`)

Built with **Next.js 15 (App Router)**.

### Key Technologies & Decisions
- **State Management: Zustand**
  - *Why?* We need a global store to hold the `fileKey`, `token`, and the resulting `html/css` across components (Form, Preview, Code View). Zustand provides a minimal, hook-based API without the boilerplate of Redux/Context.
- **Data Fetching: TanStack Query (React Query)**
  - *Why?* Handling API states (loading, error, success) manually is error-prone. React Query handles caching and request states automatically.
- **Styling: Tailwind CSS**
  - *Why?* Speed of development for the UI shell itself. (Note: The *generated* CSS for the Figma conversion is standard vanilla CSS to ensure portability).

### API Client
- Located in `lib/api.ts`.
- Uses **Axios** for robust HTTP handling.
- The conversion endpoint is decoupled from the UI, allowing easy swapping or mocking.

---

## ⚙️ Backend (`apps/server`)

Built with **NestJS**, strictly adhering to **Clean Architecture** principles to ensure maintainability and testability.

### Module Structure (`src/modules/figma`)
The core logic is encapsulated in a dedicated `FigmaModule`.

#### 1. Domain Layer (`domain/`)
- **`figma.types.ts`**: Pure TypeScript interfaces defining the shape of Figma Nodes (Frames, Text, Vectors, etc.).
- *Decision*: We use `interfaces` instead of `classes` here because this data is read-only from the API. Instantiating thousands of classes for a large design file would be computationally expensive and unnecessary.

#### 2. Application Layer (`application/`)
- **`figma-converter.service.ts`**: The core business logic.
  - **Recursive Traversal**: The converter recursively walks the Figma node tree.
  - **Context Object**: A context object (`cssRules`) is passed down the tree to collect CSS rules without polluting the global state, ensuring thread safety.
  - **Hybrid Positioning Strategy**:
    - **Root/Artboard**: Treated as `position: relative`.
    - **Auto Layout**: If `layoutMode` is detected, we generate `display: flex` properties.
    - **Absolute Fallback**: For standard frames, we calculate `position: absolute` coordinates relative to the parent to ensure "pixel-perfect" fidelity, matching the `absoluteBoundingBox` provided by Figma.
  - **Style Parsing**: Dedicated helpers (`parseFills`, `parseTypography`, `parseEffects`) handle the complexity of Figma's paint arrays (gradients, images, solid colors).

- **DTOs (`dto/`)**:
  - `ConvertFigmaDto`: Uses `class-validator` to ensure the client sends valid keys and tokens before processing begins.

#### 3. Infrastructure Layer (`infrastructure/`)
- **`figma-api.service.ts`**: Handles the external communication with Figma's REST API.
- *Why separate?* If Figma updates their API or we switch to a different provider (e.g., a local file parser), we only update this file. The converter service remains untouched.

#### 4. Presentation Layer (`presentation/`)
- **`figma.controller.ts`**: Defines the HTTP endpoints (`POST /figma/convert`). It orchestrates the flow between the API Service and the Converter Service.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation
```bash
# Install root dependencies (if any)
npm install

# Install Client dependencies
cd apps/client
npm install

# Install Server dependencies
cd ../server
npm install
```

### Running the App

**1. Start the Backend**
```bash
cd apps/server
npm run start
# Server runs on http://localhost:3000
```

**2. Start the Frontend**
```bash
cd apps/client
npm run dev
# Client runs on http://localhost:3001 (or 3000 if server is off)
```

### Usage
1. Go to the frontend URL.
2. Enter your **Figma File Key** (from the URL: `figma.com/file/KEY/...`).
3. Enter your **Personal Access Token** (from Figma Account Settings).
4. Click **Convert**.
5. Download or Preview the result.

