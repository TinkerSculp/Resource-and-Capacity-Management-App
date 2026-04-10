# Backend Setup (Express + MongoDB)

## 📁 Navigate into the backend folder

```bash
cd backend
```

---

## 📦 Install Dependencies

Install all required packages:

```bash
npm install
```

If setting up from scratch, install the core packages manually:

```bash
npm install express cors dotenv mongodb mongoose jsonwebtoken bcrypt
```

Install the dev tool for auto-restart on file changes:

```bash
npm install --save-dev nodemon
```

---

## 🔐 Environment Variables

Create a `.env` file inside `/backend` with the following entries:

```
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>
JWT_SECRET=your_random_secret_here_make_it_long_and_unpredictable
PORT=3001
HF_API_KEY=Hugging_Face_API_key_for_AI_features
```

> ⚠️ `JWT_SECRET` must be a long, random string. Never use a predictable value and never commit this file to version control.

---

## 📄 loadEnv.js

Create `/backend/loadEnv.js` to load environment variables before anything else runs:

```js
import dotenv from "dotenv";
dotenv.config();
```

Import this at the very top of your entry file (e.g. `server.js`) before any other imports that rely on `process.env`.

---

## 🚫 .gitignore

Make sure a `.gitignore` file exists in `/backend` with at least the following entries:

```
# Dependencies
node_modules/

# Environment files — never commit secrets
.env
.env.local
.env.development
.env.production

# Debug logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS files
.DS_Store
Thumbs.db
```

---

## 🚀 Start the Backend

Development mode (auto-restart on file changes):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

Backend runs at: **http://localhost:3001**

---

## 📋 Notes

- All API routes are prefixed with `/api` — the frontend `NEXT_PUBLIC_API_URL` should point to `http://localhost:3001/api`.
- JWT tokens are issued on login and must be included in the `Authorization: Bearer <token>` header on protected routes.
- MongoDB Atlas is used for the database — make sure your IP address is whitelisted in the Atlas network access settings.
- The project uses ES Modules (`import`/`export`) — ensure `"type": "module"` is set in `package.json`.