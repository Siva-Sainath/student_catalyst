# Contributors

## Human

**Siva Sainath**
Lead developer and project author.
[github.com/Siva-Sainath](https://github.com/Siva-Sainath)

---

## AI

**Claude (Anthropic)**
AI pair programmer used throughout the development of this project.

Claude contributed to the architecture, implementation, and refinement of:

- The Hermes multi-agent routing harness (`mac-backend/agents/hermes_harness.py`) — model selection logic, task classifiers, and the streaming token pipeline
- The RAG document retrieval system (`mac-backend/agents/rag.py`) — chunking strategy, overlap logic, and context injection
- The enhanced voice command processor (`mac-backend/agents/enhanced_voice.py`) — intent classification, multi-step command support, and fallback tiers
- All ten web application pages (`src/app/pages/`) — component structure, data binding, loading states, and error handling
- All eleven mobile screens (`mobile-app/src/screens/`) — native layouts, navigation, and real-time data loading
- The SSE streaming chat pipeline between the FastAPI backend and the React frontend
- The professional blue design system (`src/styles/theme.css`) — CSS custom properties, color palette, glassmorphism cards, and gradient system
- SQLAlchemy database models (`mac-backend/models.py`) and the synthetic student data generator (`mac-backend/synthetic_data.py`)
- The FastAPI server route design and middleware configuration (`mac-backend/server.py`)
- This README and project documentation

[claude.ai](https://claude.ai) — Claude Sonnet by Anthropic
