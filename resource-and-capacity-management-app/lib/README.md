# Lib Folder

The `lib` folder contains utility functions, helper code, and shared logic used across the Resource & Capacity Management application.

## Purpose

This directory houses reusable code that supports the application's core functionality, separate from UI components and pages.

## Recommended Structure

```
lib/
├── database/
│   ├── mongodb.js          # MongoDB connection utilities
│   └── queries.js          # Reusable database queries
├── auth/
│   ├── jwt.js              # JWT token generation and verification
│   └── session.js          # Session management
├── validation/
│   ├── schemas.js          # Validation schemas
│   └── sanitizers.js       # Input sanitization functions
├── api/
│   ├── client.js           # API client utilities
│   └── endpoints.js        # API endpoint constants
├── utils/
│   ├── formatters.js       # Data formatting utilities
│   ├── dates.js            # Date manipulation helpers
│   └── constants.js        # Application constants
└── models/
    └── index.js            # Database model exports
```

## Usage

Import utilities from the lib folder using the `@/lib` alias:

```javascript
import { connectDB } from '@/lib/database/mongodb';
import { validateEmail } from '@/lib/validation/schemas';
import { formatDate } from '@/lib/utils/formatters';
```

## Best Practices

- Keep functions pure and reusable
- Export only what's needed
- Document complex utilities with JSDoc comments
- Write unit tests for critical utilities
- Avoid UI-specific code (use `components/` instead)