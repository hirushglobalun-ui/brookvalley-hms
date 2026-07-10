# Getting Started

This guide provides instructions on how to set up the Brookvalley HMS locally for development.

## Prerequisites

Ensure you have the following installed on your machine:
- **Node.js** (v18.x or later)
- **npm** (v9.x or later)
- **Git**
- A **Supabase** account and project (if testing against a live instance) or Docker for local Supabase.

---

## 🚀 1. Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd brookvalley-hms
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

---

## ⚙️ 2. Environment Configuration

The application uses Supabase as its Backend-as-a-Service (BaaS). You must provide the Supabase URL and Anon Key via environment variables.

1. **Create a `.env` file** at the root of the project:
   ```bash
   touch .env
   ```

2. **Add the following variables** (replace with your actual Supabase project credentials):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   > **Note:** Do NOT commit your `.env` file to source control. It is already included in `.gitignore`.

---

## 🏃 3. Running the Development Server

Start the Next.js development server with Turbopack for faster cold starts:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. The application should automatically redirect you to `/login` if you are not authenticated.

---

## 🛠️ 4. Build for Production

To create an optimized production build:

```bash
npm run build
```

To start the production server:

```bash
npm run start
```

---

## 🧪 5. Next Steps

- Check out the [Testing Guide](TESTING.md) to run the test suites.
- Read the [Architecture Document](ARCHITECTURE.md) to understand how the codebase is structured.
