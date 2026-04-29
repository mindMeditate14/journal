# NexusJournal — Project Structure

```
journal/
├── ARCHITECTURE.md              # System design & technical specifications
├── README.md                    # Project overview & quick start
├── LICENSE
│
├── server/                      # Node.js + Express backend
│   ├── package.json
│   ├── .env.example            # Environment variables template
│   ├── src/
│   │   ├── index.js            # Express server entry point
│   │   ├── config/
│   │   │   └── database.js      # MongoDB connection + indexes
│   │   ├── middleware/
│   │   │   ├── auth.js          # JWT authentication, role-based access
│   │   │   └── errorHandler.js  # Global error handling
│   │   ├── models/              # Mongoose schemas
│   │   │   ├── User.js
│   │   │   ├── Journal.js
│   │   │   ├── Manuscript.js
│   │   │   ├── ResearchProject.js
│   │   │   ├── ClinicalEvidence.js
│   │   │   ├── Reference.js
│   │   │   └── CaseStudy.js
│   │   ├── controllers/         # Express route handlers
│   │   │   ├── authController.js
│   │   │   ├── journalController.js
│   │   │   └── ...
│   │   ├── services/            # Business logic layer
│   │   │   ├── authService.js
│   │   │   ├── journalService.js
│   │   │   ├── evidenceService.js
│   │   │   ├── searchService.js
│   │   │   ├── aiService.js     # Gemini RAG integration
│   │   │   └── ...
│   │   ├── routes/              # Express route definitions
│   │   │   ├── auth.js
│   │   │   ├── journals.js
│   │   │   ├── manuscripts.js
│   │   │   ├── projects.js
│   │   │   └── ...
│   │   ├── validators/          # Input validation rules
│   │   ├── utils/               # Utilities (logger, helpers)
│   │   └── config/              # Configuration files
│   └── scripts/                 # Migration & utility scripts
│       ├── seed.js
│       └── migrate.js
│
├── client/                      # React 18 + TypeScript + Vite
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .env.example
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx            # React entry point
│   │   ├── App.tsx             # Main app component & router
│   │   ├── index.css           # Tailwind + global styles
│   │   ├── api/
│   │   │   └── client.ts       # Axios instance + interceptors
│   │   ├── services/           # API calls
│   │   │   └── api.ts          # Endpoints wrapper
│   │   ├── contexts/           # React contexts (future)
│   │   ├── pages/              # Page components
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── SearchPage.tsx
│   │   │   ├── WorkspacePage.tsx
│   │   │   ├── ManuscriptEditor.tsx
│   │   │   ├── KnowledgeGraphPage.tsx
│   │   │   └── ...
│   │   ├── components/         # Reusable components
│   │   │   ├── Layout.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── JournalCard.tsx
│   │   │   └── ...
│   │   ├── hooks/              # Custom React hooks
│   │   ├── types/              # TypeScript interfaces
│   │   │   └── index.ts
│   │   ├── utils/              # Utility functions
│   │   │   └── authStore.ts   # Zustand auth state
│   │   └── assets/             # Static files
│   └── dist/                   # Build output (generated)
│
└── docs/
    ├── API.md                  # REST API documentation
    ├── DATABASE.md             # MongoDB schema details
    ├── DEPLOYMENT.md           # VPS deployment guide
    ├── INTEGRATION.md          # AYUSH Entry integration guide
    ├── KNOWLEDGE-GRAPH.md      # Graph structure & queries
    ├── ROADMAP.md              # Development phases
    └── CONTRIBUTING.md         # Contribution guidelines
```

---

## Key Features by Layer

### Backend (Node.js + Express)
- ✅ JWT authentication with role-based access control
- ✅ 7 core MongoDB collections with optimized indexes
- ✅ Modular service-controller-route architecture
- ✅ Error handling & validation middleware
- ✅ Ready for: Elasticsearch integration, Gemini RAG, PDF processing

### Frontend (React 18 + TypeScript + Vite)
- ✅ Modern routing with React Router
- ✅ Type-safe API client with axios interceptors
- ✅ Zustand state management for auth
- ✅ Tailwind CSS for responsive UI
- ✅ Protected routes with auth middleware
- ✅ Pages: Login, Dashboard, Search, Workspace (in progress)

### Database (MongoDB)
- ✅ User management with roles
- ✅ Journal publication workflow
- ✅ Manuscript collaboration & versioning
- ✅ Clinical evidence with knowledge links
- ✅ Reference & case study management
- ✅ Indexes optimized for common queries

---

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 5.0+
- npm or yarn

### Server Setup
```bash
cd server
cp .env.example .env
# Edit .env with your configuration
npm install
npm run dev  # Start on http://localhost:5005
```

### Client Setup
```bash
cd client
cp .env.example .env
npm install
npm run dev  # Start on http://localhost:5173
```

### Access the app
- **Frontend:** http://localhost:5173
- **API:** http://localhost:5005/api
- **Health check:** http://localhost:5005/health

---

## Development Roadmap

### Phase 1: MVP (Weeks 1-4) ✅ FRAMEWORK COMPLETE
- [x] Auth system + JWT + roles
- [x] Journal CRUD + basic search
- [x] Personal workspace (projects, manuscripts)
- [x] Citation management foundation
- [ ] AYUSH Entry integration
- [ ] Basic UI screens

### Phase 2: Core Features (Weeks 5-8)
- [ ] Knowledge graph builder
- [ ] Advanced search with Elasticsearch
- [ ] Peer review workflow
- [ ] PDF upload + metadata extraction
- [ ] Real-time collaboration (WebSocket)
- [ ] Comment & annotation system

### Phase 3: AI + Scale (Weeks 9-12)
- [ ] RAG-based literature review
- [ ] Journal draft assistant (Gemini)
- [ ] Auto-outline generation
- [ ] Performance optimization
- [ ] Full-text search analytics
- [ ] Mobile PWA support

---

## Technology Stack

| Layer | Tech | Why |
|---|---|---|
| **Frontend** | React 18 + TypeScript + Vite | Modern, fast, type-safe |
| **Backend** | Node.js + Express | Lightweight, event-driven, scalable |
| **Database** | MongoDB + Mongoose | Document model fits clinical evidence |
| **Search** | Elasticsearch | Full-text, faceted, aggregations |
| **Cache** | Redis | Sessions, metadata, results |
| **Auth** | JWT (HS256) | Stateless, scalable |
| **AI** | Google Gemini API | RAG, completions, embeddings |
| **Styling** | Tailwind CSS | Production-ready, utility-first |
| **File Storage** | S3 / Cloudinary | Scalable, CDN |
| **Deployment** | PM2 + VPS | Same infra as FinScan & Personality-Test |

---

## Environment Variables

### Server (.env)
```
NODE_ENV=development
PORT=5005
MONGO_URI=mongodb://localhost:27017/nexusjournal_db
JWT_SECRET=change-me-in-production
AYUSH_ENTRY_API_URL=http://localhost:5001/api
GOOGLE_GEMINI_API_KEY=your-api-key
```

### Client (.env)
```
VITE_API_URL=http://localhost:5005/api
```

---

## Next Steps

1. **Install dependencies:**
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

2. **Set up environment:**
   ```bash
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ```

3. **Start development servers:**
   ```bash
   # Terminal 1: Backend
   cd server && npm run dev
   
   # Terminal 2: Frontend
   cd client && npm run dev
   ```

4. **Test the API:**
   ```bash
   curl http://localhost:5005/health
   ```

5. **Access the frontend:**
   - Open http://localhost:5173 in your browser

---

## API Routes (Current Phase 1)

### Auth
- `POST /api/auth/register` — Register user
- `POST /api/auth/login` — Login & get tokens
- `POST /api/auth/refresh` — Refresh access token
- `GET /api/auth/me` — Get current user

### Journals
- `GET /api/journals/search?q=...` — Search journals
- `GET /api/journals/:id` — Get journal details
- `POST /api/journals` — Create journal (auth required)
- `PATCH /api/journals/:id` — Update journal (owner only)

---

## Contributing

1. Follow the folder structure above
2. Create services for business logic (don't put it in controllers)
3. Use TypeScript on frontend, plain JS on backend
4. Add validation middleware for all POST/PATCH requests
5. Update docs when adding routes or models
6. Test before pushing (run `npm run lint`)

---

## License

Proprietary — All rights reserved © 2026

---

## Support

For questions or issues:
1. Check the [Architecture](./ARCHITECTURE.md) document
2. Review the [API documentation](./docs/API.md)
3. See deployment guide at [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

---

**Built with ❤️ as a production-grade platform**
