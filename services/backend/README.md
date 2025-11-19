# School Management System - Backend

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update `.env` with your database credentials

4. Run migrations:
```bash
npm run migrate
```

5. Seed database:
```bash
npm run seed
```

6. Start development server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- POST `/api/v1/auth/register` - Register new user
- POST `/api/v1/auth/login` - Login
- POST `/api/v1/auth/login/mfa` - Login with MFA
- POST `/api/v1/auth/refresh-token` - Refresh access token
- POST `/api/v1/auth/logout` - Logout
- POST `/api/v1/auth/forgot-password` - Request password reset
- POST `/api/v1/auth/reset-password/:token` - Reset password
- POST `/api/v1/auth/change-password` - Change password
- GET `/api/v1/auth/me` - Get current user

### MFA
- POST `/api/v1/auth/mfa/setup` - Setup MFA
- POST `/api/v1/auth/mfa/enable` - Enable MFA
- POST `/api/v1/auth/mfa/disable` - Disable MFA
- POST `/api/v1/auth/mfa/verify` - Verify MFA token

## Default Admin Credentials
- Email: admin@school.com
- Password: admin123

**Change these credentials immediately after first login!**
