## **C4 Supertrack AI Platform: Frontend Guidelines Document**

These guidelines define clear frontend development standards and best practices to ensure consistency, maintainability, and scalability across the Supertrack AI platform.

---

### **1\. Framework and Languages**

* **Framework:** Next.js 14.x (App Router)  
* **Programming Language:** TypeScript (strict mode enabled)

### **2\. UI Components and Styling**

* **UI Component Library:** shadcn/ui (built on Tailwind CSS)  
* **CSS Framework:** Tailwind CSS (utility-first approach)  
* **Customization:** Utilize the custom theme defined in `tailwind.config.ts` for consistent styling

### **3\. Component Structure and Organization**

* **Component Structure:** Follow atomic design methodology:  
  * Base Components: Fundamental UI elements (buttons, inputs, etc.)  
  * Composite Components: Combine base components to build higher-level components  
  * Page and Layout Components: Structure the application pages  
* **Naming Conventions:** PascalCase for component files (e.g., `AgentCard.tsx`)

### **3\. Form Handling and Validation**

* **Form Library:** React Hook Form  
* **Validation:** Zod schemas for type-safe validations

### **4\. State Management**

* **Global State:** React Context API (for tenant, theme, authentication)  
* **Server State:** React Query for server data fetching, caching, and state synchronization

### **4\. Data Visualization**

* **Visualization Library:** Chart.js  
* **Implementation:** Use consistent and interactive charts throughout the dashboard

### **4\. Icons**

* **Library:** Lucide React  
* **Consistency:** Icons must be uniformly styled and appropriately sized

### **5\. Accessibility & Responsiveness**

* Ensure WCAG 2.1 compliance  
* Mobile-first responsive designs using Tailwind CSS breakpoints

### **6\. Code Quality and Testing**

* **Linting:** ESLint configured for consistent code quality  
* **Formatting:** Prettier integrated for automatic code formatting  
* **Testing:** Jest and React Testing Library for unit and integration tests

### **6\. State Management**

* **Global State:** Use React Context API for themes, authentication, and tenant context  
* **Server State:** React Query for data fetching, caching, and synchronization

### **6\. Performance Optimization**

* Implement Next.js best practices (incremental static regeneration, lazy loading)  
* Minimize bundle size via code splitting and lazy component loading  
* Use semantic caching and streaming interfaces for enhanced responsiveness

### **7\. Recommended Project Structure**

```
supertrack-ai/
├── app/
├── components/
│   ├── ui/
│   └── composite/
├── hooks/
├── lib/
├── types/
├── public/
└── config/
```

### **7\. Design Guidelines**

#### **Color Scheme**

* **Primary Colors:** \#4F46E5 (indigo), \#6366F1 (light indigo)  
* **Secondary Colors:** \#14B8A6 (teal), \#F43F5E (red)  
* **Neutral Colors:** \#374151 (dark gray), \#F9FAFB (white)

#### **Typography**

* **Primary Font:** Inter  
* **Secondary Font:** Roboto (for specialized UI components)

#### **Component Styling**

* Buttons: Rounded corners (`rounded-md`), shadow (`shadow-sm`)  
* Cards: Consistent padding (`p-4`), shadow (`shadow-lg`), rounded corners (`rounded-xl`)

### **8\. Icons and Imagery**

* Consistent use of Lucide React icons across UI elements  
* High-quality, optimized SVG assets

---

These Frontend Guidelines ensure consistency, maintainability, and high-quality user experience across the Supertrack AI platform.

