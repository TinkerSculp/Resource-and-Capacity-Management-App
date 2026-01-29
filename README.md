# Resource and Capacity Management App

A scalable, web-based solution that centralizes resource data, streamlines activity assignments, and provides dynamic dashboards for capacity planning. The application supports role‑based access, analytics, and collaborative features such as inline comments and notifications.

## Tech Stack

- **Frontend**: Next.js 16 with React 19
- **Styling**: Tailwind CSS 4
- **Backend**: Express.js API server
- **Database**: MongoDB

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Mongodb database
- Git

### Installation

1. Install dependencies:
```bash
npm install
npm install chart.js react-chartjs-2
```

2. Configure your database connection in `server.js`

3. Run the development server:
```bash
npm run dev
```

4. In a separate terminal, start the API server:
```bash
node server.js
```

5. Open [http://localhost:3000](http://localhost:3000) to view the application

## Project Structure

- `/app` - Next.js application pages and layouts
- `/public` - Static assets
- `server.js` - Express API server

# Project Structure
/app - Next.js application pages and layouts

/public - Static assets

src or root server.js - Express API server and DB connection

/scripts/seed - Idempotent seed scripts

/scripts/migrations - Migration scripts and runner

/tests - Unit and integration tests

.env.example - Example environment variables

package.json - npm scripts and dependencies

# Database Setup (MongoDB)
Connection pattern (recommended)
Connect once at startup, verify with a ping, then start the HTTP server so routes never run with an undefined DB handle.

# Example server.js connection snippet

- javascript
require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

async function start() {
  await client.connect();
  const db = client.db(process.env.DB_NAME || 'ResourceManagementAPP_DB');
  await db.command({ ping: 1 });
  app.locals.db = db;

  // middleware to inject db into handlers
  app.use((req, res, next) => {
    if (!req.app.locals.db) return res.status(503).json({ error: 'DB not ready' });
    req.db = req.app.locals.db;
    next();
  });

  app.listen(process.env.PORT || 3001, () => console.log('Server listening'));
}

start();
process.on('SIGINT', async () => { await client.close(); process.exit(0); });
process.on('SIGTERM', async () => { await client.close(); process.exit(0); });

# Environment variables
MONGODB_URI — connection string (local or Atlas)

DB_NAME — database name used by the app

# Seeding data
Keep idempotent seed scripts in scripts/seed/. Use updateOne(..., { upsert: true }) to avoid duplicates.

Example run:

- bash
node scripts/seed/employees.js
Bulk import (JSON/CSV) with mongoimport:

- bash
mongoimport --uri="%MONGODB_URI%/%DB_NAME%" --collection=employee --file=employees.json --jsonArray
Indexes and validation
Create indexes in a setup script or migration:

- javascript
db.employee.createIndex({ emp_id: 1 }, { unique: true });
db.employee.createIndex({ dept_no: 1 });
db.account.createIndex({ emp_id: 1 }, { unique: true });
db.account.createIndex({ "account.acc_type_id": 1 });
Use JSON Schema validators for critical collections:

- javascript
db.createCollection("employee", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["emp_id","emp_name","emp_title","dept_no"],
      properties: {
        emp_id: { bsonType: "int" },
        emp_name: { bsonType: "string" },
        emp_title: { bsonType: "string" },
        dept_no: { bsonType: "string" },
        manager_id: { bsonType: ["int","null"] }
      }
    }
  }
});

# Windows tips
Install MongoDB via the MSI installer and run it as a Windows service, or use Docker Desktop with a Mongo image.

Ensure MongoDB tools (mongoimport, mongodump, mongorestore) are in your PATH or call them with full paths.


## Features (Planned)

- Resource management and tracking
- Activity assignment workflows
- Dynamic capacity planning dashboards
- Role-based access control
- Analytics and reporting
- Inline comments and notifications

## Development

Frontend uses Next.js App Router and React Server Components; edit files in /app.

Keep business logic in controllers/services, not in route handlers.

Add request validation (Joi or Zod) and password hashing (bcrypt) before exposing account endpoints.

Avoid unbounded find({}) queries in production; add pagination and indexes.

Add logging (morgan) and a health endpoint that reports DB connectivity.

# Useful Commands

bash
# frontend dev server
npm run dev

# backend (if separate)
node server.js
# or with nodemon
npx nodemon src/server.js

# run seed script
node scripts/seed/employees.js

# import JSON data
mongoimport --uri="$MONGODB_URI/$DB_NAME" --collection=employee --file=employees.json --jsonArray

# backup database
mongodump --uri="$MONGODB_URI/$DB_NAME" --out=./backups/$(date +%F)

# restore database
mongorestore --uri="$MONGODB_URI" --nsInclude="$DB_NAME.*" ./backups/<date>

# Security, Backups, and maintenance
Passwords: always hash with bcrypt before storing; never return password hashes in responses.

Access: use least‑privilege DB users and restrict IP access.

TLS: enable TLS for production DB connections (Atlas or self‑managed).

Secrets: keep .env out of source control; use a secrets manager for production.

Backups: schedule mongodump or use Atlas automated backups and test restores regularly.

Monitoring: track disk usage, slow queries, and index health.
