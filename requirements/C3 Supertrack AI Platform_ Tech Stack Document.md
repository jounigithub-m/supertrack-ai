## **C3 Supertrack AI Platform: Tech Stack Document**

This document describes the technical stack and dependencies necessary for the Supertrack AI Platform. Links to official documentation are provided for easy reference.

---

### **Frontend Technologies**

* **Framework:** Next.js 14.x  
* **Language:** TypeScript  
* **Styling:** [Tailwind CSS](https://tailwindcss.com/docs/installation)  
* **UI Library:** shadcn/ui  
* **State Management:** React Context API, React Query  
* **Authentication:** JWT with secure HTTP-only cookies (NextAuth.js)  
* **Visualization:** Chart.js

### **Backend Technologies**

* **Serverless Functions:** [Azure Durable Functions](https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-overview)  
* **Containerization:** [Azure Container Apps](https://azure.microsoft.com/services/container-apps)  
* **Analytical Database:** StarRocks  
* **Graph Database:** Neo4j  
* **Vector Database & Embeddings:** Redis  
* **Data Lake:** [Apache Iceberg](https://iceberg.apache.org/docs/latest/)  
* **Operational Database:** [Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/)

### **Machine Learning**

* **Model Serving:** ONNX Runtime  
* **Model:** Quantized [LLaMA 7B](https://ai.facebook.com/blog/large-language-model-llama-meta-ai/) (Hugging Face)

### **State and Cache Management**

* **State:** React Query  
* **Caching:** Redis for embeddings and semantic caching

### **Security & Authentication**

* **Identity & Authentication:** [Azure AD B2C](https://learn.microsoft.com/en-us/azure/active-directory-b2c/overview)  
* **Encryption:** Encryption at rest and in transit  
* **RBAC:** [Role-Based Access Control](https://learn.microsoft.com/en-us/azure/role-based-access-control/)

### **AI Models and Optimization**

* **Model Serving:** ONNX Runtime  
* **Model Optimization & Quantization:** ONNX, LLaMA 7B

### **API and Data Integration**

* **Real-Time APIs:** OAuth2 (Meta, Google, LinkedIn, TikTok, etc.)  
* **Batch Data Sources:** Shopify, Amazon RDS, HubSpot  
* **Connector & Pipeline Management:** Custom implementation using Azure Durable Functions

### **Development Methodology and Tools**

* **IDE:** [Cursor.ai](https://cursor.sh/) integrated AI-assisted development environment  
* **AI Coding Assistants:** Claude, Grok

---

### **Installation and Setup**

#### **Initial Installation**

To set up your local development environment, run:

```
npm install next@latest react react-dom typescript tailwindcss shadcn/ui recharts lucide-react next-auth react-query redis
```

### **Cursor.ai Integration**

Use Cursor.ai Documentation for AI-assisted development workflows and collaboration during the development process.

---

This document provides comprehensive references for all technologies and dependencies used in the Supertrack AI Platform, ensuring a smooth and efficient development experience.

