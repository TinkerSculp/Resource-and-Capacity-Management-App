# Resource and Capacity Management App

A scalable, web-based solution that centralizes resource data, streamlines activity assignments, and provides dynamic dashboards for capacity planning. The application supports role-based access, analytics, and collaborative features such as inline comments and notifications.

## Tech Stack

- **Frontend**: Next.js 16 with React 19
- **Styling**: Tailwind CSS 4
- **Backend**: Express.js API server
- **Database**: MySQL 2

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Mongodb database

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure your database connection in `server.js`

3. In a separate terminal, start the API server:
```bash
node server.js
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) to view the application

## Project Structure

- `/app` - Next.js application pages and layouts
- `/public` - Static assets
- `server.js` - Express API server

## Features (Planned)

- Resource management and tracking
- Activity assignment workflows
- Dynamic capacity planning dashboards
- Role-based access control
- Analytics and reporting
- Inline comments and notifications

## Development

The app uses Next.js App Router with React Server Components. Edit files in the `/app` directory to modify pages and components.
