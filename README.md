# Resource & Capacity Management Planner

> Built for **Capstone Dynamics** — a web-based platform for centralising resource data, managing activity assignments, and providing dynamic capacity planning dashboards across teams.

---

## What It Does

- **Resource Management** — track employees, departments, capacity, and hierarchy
- **Initiative Tracking** — create, assign, and monitor projects by category and status
- **Assignments & Allocations** — assign team members to initiatives with monthly FTE allocations
- **Capacity Reporting** — view utilisation by category, person, or activity with CSV export
- **Calendar View** — see monthly activity breakdowns across the team
- **Role-Based Access** — four distinct roles with tailored dashboards and permissions

---

## Account Roles

| Role             | What They Can Do                                                        |
|------------------|-------------------------------------------------------------------------|
| Resource Manager | Full access — manage resources, initiatives, assignments, and reports   |
| Stakeholder      | Read-only — view initiatives and assignments linked to their requests   |
| Team Member      | Read-only — view assignments and initiatives they are part of           |
| Admin            | Account management only — create and edit user accounts                 |

---

## Tech Stack

| Layer    | Technology                              |
|----------|-----------------------------------------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4   |
| Backend  | Express.js                              |
| Database | MongoDB Atlas                           |
| Auth     | JWT + bcrypt                            |

---

## Repository Structure

```
resource-and-capacity-management-app/   ← inner project root
├── frontend/                           # Next.js app
├── backend/                            # Express API
└── README.md                           # Project setup guide
```

---

## Getting Started

Full setup instructions are inside the project folder:

```bash
cd resource-and-capacity-management-app
```

Then follow the guides in order:

1. [`README.md`](./resource-and-capacity-management-app/README.md) — project overview and quick start
2. [`backend/README.md`](./resource-and-capacity-management-app/backend/README.md) — backend setup
3. [`frontend/README.md`](./resource-and-capacity-management-app/frontend/README.md) — frontend setup

---

## Deployment

See [`RAILWAY_DEPLOYMENT.md`](./RAILWAY_DEPLOYMENT.md) for deployment instructions.

---

## Prerequisites

- **Node.js** v18+ — [nodejs.org](https://nodejs.org/)
- **MongoDB Atlas** account — [mongodb.com/atlas](https://www.mongodb.com/atlas)
- **Git** — [git-scm.com](https://git-scm.com/)