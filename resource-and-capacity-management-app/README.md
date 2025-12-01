Resource and Capacity Management App
A scalable, web-based solution that centralizes resource data, streamlines activity assignments, and provides dynamic dashboards for capacity planning. The application supports role‑based access, analytics, and collaborative features such as inline comments and notifications.

Tech Stack
Frontend: Next.js 16 with React 19

Styling: Tailwind CSS 4

Backend: Express.js API server

Database: MongoDB (configured in server.js; if you prefer MySQL, update the server configuration and queries accordingly)

Getting Started
Prerequisites
Node.js v18 or higher

MongoDB (local, Docker, or Atlas)

Git

Clone and install
bash
git clone <repo-url>
cd <repo-directory>
npm install
# ensure the MongoDB driver is present
npm install mongodb
Environment variables
Create a .env file in the project root with these keys:

Code
PORT=3001
MONGODB_URI=mongodb://localhost:27017
DB_NAME=ResourceManagementAPP_DB
NODE_ENV=development
Add .env to .gitignore and include a .env.example in the repo.

Run the app locally
bash
# start the Next.js frontend (development)
npm run dev

# in a separate terminal start the Express API (if not started by the same process)
node server.js

# open the frontend
# http://localhost:3000
Project Structure
Code
.
├─ app                 # Next.js App Router pages and layouts
├─ public              # Static assets
├─ src
│  ├─ server.js        # Express API server and DB connection
│  ├─ routes
│  ├─ controllers
│  └─ services
├─ scripts
│  ├─ seed
│  └─ migrations
├─ tests
├─ .env.example
├─ package.json
└─ README.md
Notes

Frontend code lives in /app and uses React Server Components.

Backend code lives in src (or root server.js) and exposes API endpoints used by the frontend.

Seed and migration scripts belong in scripts/ and should be idempotent.

Database Setup and Connection
Recommended connection pattern
Connect once at startup, verify with a ping, then start the HTTP server to avoid routes running before the DB is ready.

Attach the verified DB handle to app.locals or inject it into requests via middleware so handlers use the same connection.

Example connection snippet

javascript
const { MongoClient, ServerApiVersion } = require('mongodb');
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

await client.connect();
const db = client.db(process.env.DB_NAME || 'ResourceManagementAPP_DB');
await db.command({ ping: 1 });
// attach db to app.locals or pass into services
Seeding data
Place idempotent seed scripts in scripts/seed/. Use updateOne(..., { upsert: true }) to avoid duplicates.

Example seed runner:

bash
node scripts/seed/employees.js
Indexes and validation
Create indexes for common filters:

javascript
db.employee.createIndex({ emp_id: 1 }, { unique: true });
db.employee.createIndex({ dept_no: 1 });
db.account.createIndex({ emp_id: 1 }, { unique: true });
Use MongoDB JSON schema validators to enforce document shapes for critical collections.

Windows tips
Install MongoDB via the MSI installer and run it as a Windows service, or use Docker Desktop with a Mongo image.

Ensure MongoDB tools (mongoimport, mongodump, mongorestore) are in your PATH or call them with full paths.

Features Planned
Resource management and tracking

Activity assignment workflows

Dynamic capacity planning dashboards

Role‑based access control

Analytics and reporting

Inline comments and notifications

Development Notes
The frontend uses Next.js App Router and React Server Components; edit files in /app to change pages and layouts.

Keep business logic in controllers/services, not in route handlers.

Add request validation (Joi or Zod) and password hashing (bcrypt) before exposing account endpoints.

Avoid unbounded find({}) queries in production; add pagination and indexes.

Add logging (morgan) and consider a simple health endpoint that reports DB connectivity.

Useful Commands
bash
# start frontend dev server
npm run dev

# start backend (if separate)
node server.js

# run seed script
node scripts/seed/employees.js

# import JSON data
mongoimport --uri="$MONGODB_URI/$DB_NAME" --collection=employee --file=employees.json --jsonArray

# backup database
mongodump --uri="$MONGODB_URI/$DB_NAME" --out=./backups/$(date +%F)

# restore database
mongorestore --uri="$MONGODB_URI" --nsInclude="$DB_NAME.*" ./backups/<date>
Next Steps