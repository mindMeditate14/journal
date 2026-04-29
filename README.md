# NexusJournal — Quick Start Guide

> **Clinical Evidence & Journal Publishing Platform**
> 
> A production-grade MERN application for researchers to discover, create, and publish peer-reviewed journals with integrated clinical evidence and knowledge graphs.

---

## 🎯 Project Overview

**NexusJournal** connects:
- **Global knowledge repository** (journals, references, clinical evidence)
- **Personal research workspace** (projects, manuscripts, libraries)
- **Clinical database integration** (AYUSH Entry case records)
- **Knowledge graphs** (Condition ↔ Intervention ↔ Evidence ↔ Outcomes)

**Target Users:**
- Researchers wanting to structure case studies into journal articles
- Practitioners accessing clinical evidence and peer-reviewed journals
- Administrators managing publication workflows and peer review

---

## ⚡ Quick Start (5 minutes)

### Prerequisites
```bash
# Required
node --version    # >= 18.0.0
npm --version     # >= 9.0.0
mongod --version  # MongoDB running locally
```

### 1. Install Dependencies
```bash
# Server
cd server && npm install

# Client
cd ../client && npm install
```

### 2. Configure Environment
```bash
# Copy templates
cp server/.env.example server/.env
cp client/.env.example client/.env

# Default .env should work for local development
# Edit if needed for custom MongoDB/API URLs
```

### 3. Start Servers
```bash
# Terminal 1: Backend (port 5005)
cd server && npm run dev

# Terminal 2: Frontend (port 5173)
cd client && npm run dev
```

### 4. Access the App
- **Frontend:** http://localhost:5173
- **API:** http://localhost:5005/api
- **Health check:** http://localhost:5005/health

### 5. Test Login
```bash
# Default test user (from seed script, when ready)
Email: test@nexusjournal.com
Password: password123
```

---

## 📂 Project Structure

### Backend (`server/`)
```
src/
├── config/       # Database connection
├── models/       # MongoDB schemas (7 core collections)
├── controllers/  # Request handlers
├── services/     # Business logic
├── routes/       # API endpoints
├── middleware/   # Auth, errors, validation
└── utils/        # Logger, helpers
```

**Key Files:**
- `src/index.js` — Express server entry point
- `src/config/database.js` — MongoDB connection
- `src/middleware/auth.js` — JWT authentication

### Frontend (`client/`)
```
src/
├── pages/        # Page components
├── components/   # Reusable UI
├── services/     # API calls
├── types/        # TypeScript interfaces
├── utils/        # State (Zustand), helpers
└── api/          # Axios client
```

**Key Files:**
- `src/App.tsx` — Router & main app
- `src/main.tsx` — React entry point
- `src/utils/authStore.ts` — Auth state management

---

## 🗄️ Core Data Models

| Model | Purpose |
|---|---|
| **User** | Account + roles (admin, researcher, practitioner, reader) |
| **Journal** | Published/draft journal articles |
| **Manuscript** | Work-in-progress article with versions |
| **ResearchProject** | Container for manuscripts + collaborators |
| **ClinicalEvidence** | Structured evidence: condition → intervention → outcome |
| **Reference** | Citations & bibliography |
| **CaseStudy** | Clinical case converted from AYUSH Entry |

---

## 🔐 Authentication

**JWT Flow:**
1. User registers/logs in
2. Server returns `accessToken` (15m) + `refreshToken` (7d)
3. Client stores tokens in localStorage
4. All API calls include `Authorization: Bearer <token>`
5. Expired? Refresh token auto-refreshes silently

**Roles & Permissions:**
- **Admin** — Manage all users, approve journals, configure platform
- **Researcher** — Create projects, draft manuscripts, collaborate, publish
- **Practitioner** — View journals, create case studies, read-only access
- **Reader** — View published journals, limited search, no editing

---

## 📝 API Overview

### Auth Endpoints
```
POST   /api/auth/register         Register user
POST   /api/auth/login            Login & get tokens
POST   /api/auth/refresh          Refresh access token
GET    /api/auth/me               Get current user (auth required)
```

### Journal Endpoints (Core)
```
GET    /api/journals/search       Search journals (public)
GET    /api/journals/:id          Get journal details
POST   /api/journals              Create journal (auth required)
PATCH  /api/journals/:id          Update journal (owner only)
```

### More Endpoints (Phase 2+)
- `/api/manuscripts` — Draft management
- `/api/workspace/projects` — Research projects
- `/api/evidence` — Clinical evidence
- `/api/references` — Citation management
- `/api/search` — Advanced full-text search

**See [docs/API.md](./docs/API.md) for complete endpoint list.**

---

## 🛠️ Development Commands

### Server
```bash
npm run dev           # Start dev server with nodemon
npm run test          # Run tests
npm run lint          # Check code style
npm run seed          # Populate database
```

### Client
```bash
npm run dev           # Start dev server (Vite)
npm run build         # Build for production
npm run preview       # Preview production build
npm run lint          # Check code style
```

---

## 🔗 Integration Points

### AYUSH Entry Integration (Phase 2)
- Import clinical case records from AYUSH Entry
- Extract: condition, intervention, outcome, dosage, duration
- Auto-populate CaseStudy collection
- Generate manuscript skeleton from case

**API Bridge:**
```
AYUSH Entry (port 5001)
    ↓
NexusJournal (port 5005)
    ↓
CaseStudy → Manuscript → Journal
```

### Google Gemini API (Phase 3)
- RAG-based literature review
- Auto-generate journal outlines
- Manuscript suggestions
- Citation analysis

---

## 📊 Knowledge Graph

**Structure:**
```
Condition (e.g., "Hypertension")
    ↓ [treats]
Intervention (e.g., "Ashwagandha + Yoga")
    ↓ [shows-effect-on]
Outcome (e.g., "10% BP reduction in 8 weeks")
    ↓ [measured-by]
Evidence (RCT, case study, etc.)
```

Each node links back to supporting journals and clinical evidence.

---

## 🚀 Deployment

### VPS Setup (Same as FinScan/Personality-Test)
```bash
# Create project directory
ssh root@76.13.211.100
mkdir -p /opt/nexusjournal

# Deploy backend with PM2
pm2 start /opt/nexusjournal/server/src/index.js --name nexusjournal-app

# Deploy frontend (static build)
npm run build
scp -r client/dist/* root@76.13.211.100:/opt/nexusjournal/public/
```

**See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed steps.**

---

## 📚 Documentation

| Doc | Purpose |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, data models, API spec |
| [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md) | Project layout & file organization |
| [docs/API.md](./docs/API.md) | Complete REST API reference |
| [docs/DATABASE.md](./docs/DATABASE.md) | MongoDB schema details & queries |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | VPS setup & CI/CD |
| [docs/INTEGRATION.md](./docs/INTEGRATION.md) | AYUSH Entry integration guide |
| [docs/KNOWLEDGE-GRAPH.md](./docs/KNOWLEDGE-GRAPH.md) | Graph structure & traversal |
| [docs/ROADMAP.md](./docs/ROADMAP.md) | Development phases & timeline |

---

## 🎓 Technology Stack

| Layer | Tech | Version |
|---|---|---|
| **Frontend** | React | 18.2 |
| | TypeScript | 5.3 |
| | Vite | 5.0 |
| | Tailwind CSS | 3.4 |
| **Backend** | Node.js | 18+ |
| | Express | 4.18 |
| | MongoDB | 5.0+ |
| | Mongoose | 8.0 |
| **Auth** | JWT | HS256 |
| **AI** | Google Gemini | Latest |
| **Search** | Elasticsearch | 7.17 (Phase 2) |
| **Cache** | Redis | 4.6 (Phase 2) |
| **Deploy** | PM2 | Latest |

---

## ✅ Checklist: What's Built (Phase 1)

- [x] Complete system architecture
- [x] MongoDB schema design (7 collections)
- [x] JWT authentication with roles
- [x] API routes & controllers (auth, journals, basic CRUD)
- [x] React 18 frontend with TypeScript
- [x] Login/Dashboard/Search pages
- [x] Zustand auth state management
- [x] API client with interceptors
- [x] Tailwind CSS styling
- [x] Error handling middleware
- [x] Database logging & indexes

## 📋 What's Next (Phase 2-3)

- [ ] AYUSH Entry integration
- [ ] Manuscript editor (Monaco/Tiptap)
- [ ] Knowledge graph visualization
- [ ] Elasticsearch integration
- [ ] Peer review workflow
- [ ] PDF upload & extraction
- [ ] WebSocket collaboration
- [ ] RAG-powered assistant
- [ ] Full-text search
- [ ] Mobile PWA
- [ ] Production deployment

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5005 or 5173
lsof -ti:5005 | xargs kill -9
```

### MongoDB Connection Error
```bash
# Ensure MongoDB is running
mongod --version
# If not, install or start service
```

### API Not Responding
```bash
# Check server is running
curl http://localhost:5005/health

# Check logs
tail -f server/logs/combined.log
```

### CORS Issues
- Update `CORS_ORIGIN` in `server/.env`
- Default: `http://localhost:5173`

---

## 📞 Support & Contact

- **Architecture questions?** → See [ARCHITECTURE.md](./ARCHITECTURE.md)
- **API questions?** → See [docs/API.md](./docs/API.md)
- **Deployment help?** → See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)
- **Data model details?** → See [docs/DATABASE.md](./docs/DATABASE.md)

---

## 📄 License

Proprietary — All rights reserved © 2026

---

**Happy coding! 🚀**

*Built for production by a senior software architect.*
