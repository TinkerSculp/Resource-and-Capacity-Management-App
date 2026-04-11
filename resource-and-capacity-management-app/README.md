# Resource and Capacity Management App

A web-based solution for Capstone Dynamics that centralises resource data, streamlines activity assignments, and provides dynamic dashboards for capacity planning. Supports role-based access for four account types: Resource Manager, Stakeholder, Team Member, and Admin.

---

## Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Backend  | Express.js                        |
| Database | MongoDB Atlas                     |
| Auth     | JWT (JSON Web Tokens) + bcrypt    |

---

## Project Structure

```
resource-and-capacity-management-app/
├── frontend/          # Next.js app (App Router)
│   ├── app/           # Pages and layouts
│   ├── components/    # Shared UI components
│   ├── lib/           # Axios instance and utilities
│   └── public/        # Static assets (SVGs, images)
├── backend/           # Express API server
│   ├── controllers/   # Route handler logic
│   ├── routes/        # API route definitions
│   ├── middleware/     # Auth, error handling
│   └── server.js      # Entry point
|
├── package.json
|-- Railway.json
└── README.md          # You are here
```

---

## Prerequisites

- **Node.js** v18 or higher — [Download](https://nodejs.org/)
- **MongoDB Atlas** account (or local MongoDB installation)
- **Git** — [Download](https://git-scm.com/)

---

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd resource-and-capacity-management-app
```

### 2. Set up the Backend

See [`/backend/README.md`](./backend/README.md) for full instructions.

Quick start:

```bash
cd backend
cp .env.example .env   # then fill in your values
npm install
npm run dev
```

Backend runs at **http://localhost:3001**

### 3. Set up the Frontend

See [`/frontend/README.md`](./frontend/README.md) for full instructions.

Quick start:

```bash
cd frontend
cp .env.example .env.local   # then fill in your values
npm install
npm run dev
```

Frontend runs at **http://localhost:3000**

---

## Environment Variables

### Backend (`/backend/.env`)

| Variable       | Description                                      |
|----------------|--------------------------------------------------|
| `MONGODB_URI`  | Full MongoDB connection string (Atlas or local)  |
| `DB_NAME`      | Database name (`ResourceManagementAPP_DB`)       |
| `PORT`         | API server port (default `3001`)                 |
| `JWT_SECRET`   | Long, random secret for signing JWT tokens       |
| `FRONTEND_URL` | Frontend origin for CORS (`http://localhost:3000`)|

### Frontend (`/frontend/.env.local`)

| Variable                | Description                            |
|-------------------------|----------------------------------------|
| `NEXT_PUBLIC_API_URL`   | Backend API base URL (`http://localhost:3001/api`) |

> ⚠️ Never commit `.env` or `.env.local` to version control.

---

## Role-Based Access

| Role             | `acc_type_id` | Access                                                  |
|------------------|---------------|---------------------------------------------------------|
| Resource Manager | 1             | Full access — resources, initiatives, assignments, reports |
| Stakeholder      | 2             | Read-only — initiatives and assignments scoped to their requests |
| Team Member      | 3             | Read-only — assignments and initiatives they are part of |
| Admin            | 4             | Account management only                                 |

---

## Useful Commands

```bash
# Start frontend dev server
cd frontend && npm run dev

# Start backend dev server
cd backend && npm run dev

# Run a seed script
node scripts/seed/employees.js

# Import JSON data into MongoDB
mongoimport --uri="$MONGODB_URI/$DB_NAME" --collection=employee --file=employees.json --jsonArray

# Backup the database
mongodump --uri="$MONGODB_URI/$DB_NAME" --out=./backups/$(date +%F)

# Restore from backup
mongorestore --uri="$MONGODB_URI" --nsInclude="$DB_NAME.*" ./backups/<date>
```

---

## Troubleshooting

**`Database not connected yet` error**
- Check `MONGODB_URI` in your `.env` file
- Ensure your IP is whitelisted in MongoDB Atlas → Network Access

**Port already in use**
- Change `PORT` in `/backend/.env` to a different value (e.g. `3002`)
- Update `NEXT_PUBLIC_API_URL` in `/frontend/.env.local` to match

**Dependency errors**
- Delete `node_modules` and `package-lock.json` in the affected folder
- Run `npm install` again

---

## Security Notes

- Passwords are hashed with **bcrypt** before storage — never returned in API responses
- All protected routes require a valid JWT in the `Authorization: Bearer <token>` header
- `.env` files are excluded from version control via `.gitignore`
- Use least-privilege MongoDB Atlas users and restrict IP access in production
- Enable TLS for all production database connections