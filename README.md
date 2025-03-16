# Supertrack AI Platform

A multi-tenant SaaS solution transforming enterprise data into interactive, intelligent, and agent-driven knowledge ecosystems. Leveraging Apache Iceberg, StarRocks analytical databases, Neo4j knowledge graphs, and advanced RAG 2.0 technology, the platform enables personalized, high-accuracy agent interactions powered by enterprise data.

## Features

- **Three-Tier Personalization:**
  - **Tenant-Level:** Company-specific terminology and data context
  - **User-Level:** Response personalization based on explicit/inferred user preferences
  - **Product-Level:** Cross-tenant industry insights ensuring continuous learning and strict data isolation

- **Unified Data Utilization:** Seamlessly unifies and makes actionable diverse enterprise datasets
- **Agent Autonomy:** Enables agents to manage data, answer queries, and extend capabilities
- **Enterprise Integration:** Effortlessly integrates with existing systems and security protocols
- **Continuous Learning:** Automatically improves through usage data and real-time user feedback

## Technology Stack

### Frontend
- Next.js 14.x (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Server Components

### Backend
- Azure Durable Functions
- Azure Cosmos DB
- Apache Iceberg
- StarRocks
- Neo4j
- Redis

### AI & ML
- ONNX Runtime
- Quantized LLaMA 7B

## Getting Started

### Prerequisites
- Node.js 18+
- Azure account
- Python 3.10+

### Installation
1. Clone the repository
2. Install dependencies
   ```
   npm install
   ```
3. Configure environment variables
4. Start the development server
   ```
   npm run dev
   ```

## Documentation

Comprehensive documentation is available in the `/requirements` directory, covering:
- Product Requirements Document
- Frontend Guidelines
- Backend Setup & Guidelines
- Implementation Plan
- Deployment Guide
- API Documentation

## License

This project is licensed under the MIT License - see the LICENSE file for details. 