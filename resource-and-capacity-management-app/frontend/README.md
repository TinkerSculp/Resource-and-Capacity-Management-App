# Frontend Setup (Next.js + Axios)

## 📁 Navigate into the frontend folder

```bash
cd frontend
```

---

## 📦 Install Dependencies

Install all required packages:

```bash
npm install
```

If setting up from scratch, install the core packages manually:

```bash
npm install next react react-dom axios react-chartjs-2 chart.js
```

Install Tailwind CSS and its peer dependencies:

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

This generates `tailwind.config.js` and `postcss.config.js`, and enables Tailwind inside `globals.css`.

---

## 🔐 Environment Variables

Create a `.env.local` file inside `/frontend`:

```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## 🚫 .gitignore

Make sure a `.gitignore` file exists in `/frontend` with at least the following entries:

```
# Dependencies
node_modules/

# Next.js build output
.next/
out/

# Environment files — never commit secrets
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Debug logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS files
.DS_Store
Thumbs.db
```

---

## 🚀 Start the Frontend

Run the development server:

```bash
npm run dev
```

Frontend runs at: **http://localhost:3000**

---

## 📋 Notes

- The API base URL is injected automatically via the shared `@/lib/api` Axios instance — you only need to set `NEXT_PUBLIC_API_URL` in `.env.local`.
- The project uses the Next.js App Router (`/app` directory) with `"use client"` directives on interactive pages.
- Tailwind dark mode is controlled by the `prefers-color-scheme` media query — no manual toggle needed.
- Some pages use `export const dynamic = 'force-dynamic'` to disable static caching on routes that fetch live data.