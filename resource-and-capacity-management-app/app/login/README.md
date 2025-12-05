# Login Page

Modal overlay interface for user authentication with MongoDB Atlas.

## Features

- Modal overlay with translucent backdrop
- Email and password authentication
- MongoDB user verification
- Session management via localStorage
- Redirects to `/dashboard` on success

## API Endpoint

```
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

## Styling

- Capstone Dynamics branding with Outfit font
- Primary color: `#017ACB`
- Light theme with gray/white colors

## Testing

Create test user:
```bash
curl -X POST http://localhost:3001/api/auth/register -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'
```

Login with: `test@example.com` / `password123`

## Security Note

⚠️ Uses plain text passwords for development. Implement bcrypt hashing for production.
