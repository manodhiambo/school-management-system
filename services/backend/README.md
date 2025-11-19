# School Management System - Backend API

A comprehensive, production-ready School Management System backend built with Node.js, Express, and MySQL.

## Features

### Core Modules
- ✅ **Authentication & Authorization** - JWT, MFA, Role-based access control
- ✅ **Student Management** - Complete CRUD, documents, promotions, analytics
- ✅ **Teacher Management** - Attendance, leaves, salary, schedule
- ✅ **Parent Management** - Multi-child support, dashboard, notifications
- ✅ **Academic Management** - Subjects, classes, exams, results, gradebook
- ✅ **Attendance Module** - Manual/Biometric, reports, defaulters
- ✅ **Fee Management** - Invoices, payments, discounts, defaulters

### Additional Features
- 📊 Comprehensive analytics and reporting
- 🔔 Real-time notifications
- 📱 Mobile-ready API endpoints
- 🔒 Advanced security (rate limiting, helmet, validation)
- 📝 Audit logging
- 🎯 Bulk operations support

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MySQL 8.0+
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Joi
- **Security**: Helmet, bcryptjs, express-rate-limit
- **Logging**: Winston
- **MFA**: Speakeasy + QRCode

## Getting Started

### Prerequisites

- Node.js 18+ installed
- MySQL 8.0+ installed and running
- npm or yarn package manager

### Installation

1. **Clone the repository**
```bash
   cd school-management-system/services/backend
```

2. **Run setup script**
```bash
   ./setup.sh
```

3. **Configure environment variables**
   Edit `.env` file with your database credentials:
```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=school_management
   DB_USER=root
   DB_PASSWORD=your_password
   
   JWT_SECRET=your-super-secret-jwt-key
   JWT_REFRESH_SECRET=your-refresh-token-secret
```

4. **Run database migrations**
```bash
   npm run migrate
```

5. **Seed initial data**
```bash
   npm run seed
```

6. **Start development server**
```bash
   npm run dev
```

The API will be available at `http://localhost:5000/api/v1`

## API Documentation

### Authentication Endpoints
```
POST   /api/v1/auth/register          - Register new user
POST   /api/v1/auth/login             - Login
POST   /api/v1/auth/login/mfa         - Login with MFA
POST   /api/v1/auth/refresh-token     - Refresh access token
POST   /api/v1/auth/logout            - Logout
POST   /api/v1/auth/forgot-password   - Request password reset
POST   /api/v1/auth/reset-password/:token - Reset password
POST   /api/v1/auth/change-password   - Change password
GET    /api/v1/auth/me                - Get current user

MFA:
POST   /api/v1/auth/mfa/setup         - Setup MFA
POST   /api/v1/auth/mfa/enable        - Enable MFA
POST   /api/v1/auth/mfa/disable       - Disable MFA
POST   /api/v1/auth/mfa/verify        - Verify MFA token
```

### Student Endpoints
```
POST   /api/v1/students                - Create student
GET    /api/v1/students                - List students (with filters)
GET    /api/v1/students/statistics     - Student statistics
POST   /api/v1/students/bulk-import    - Bulk import students
GET    /api/v1/students/:id            - Get student by ID
PUT    /api/v1/students/:id            - Update student
PATCH  /api/v1/students/:id/status     - Update student status
DELETE /api/v1/students/:id            - Delete student (soft)

GET    /api/v1/students/:id/attendance        - Student attendance
GET    /api/v1/students/:id/academic-report   - Academic report
GET    /api/v1/students/:id/finance           - Fee details
POST   /api/v1/students/:id/promote           - Promote student
GET    /api/v1/students/:id/timetable         - Student timetable
GET    /api/v1/students/:id/documents         - List documents
POST   /api/v1/students/:id/documents         - Upload document
DELETE /api/v1/students/:id/documents/:docId  - Delete document
```

### Teacher Endpoints
```
POST   /api/v1/teachers                    - Create teacher
GET    /api/v1/teachers                    - List teachers
GET    /api/v1/teachers/statistics         - Teacher statistics
GET    /api/v1/teachers/available          - Available teachers
GET    /api/v1/teachers/:id                - Get teacher
PUT    /api/v1/teachers/:id                - Update teacher
POST   /api/v1/teachers/:id/assign-class   - Assign class
POST   /api/v1/teachers/:id/assign-subject - Assign subject
GET    /api/v1/teachers/:id/schedule       - Teacher schedule

POST   /api/v1/teachers/:id/attendance       - Mark attendance
GET    /api/v1/teachers/:id/attendance       - Get attendance
POST   /api/v1/teachers/:id/leave            - Apply leave
GET    /api/v1/teachers/:id/leave            - Get leaves
PATCH  /api/v1/teachers/leave/:id/approve    - Approve/reject leave
GET    /api/v1/teachers/:id/salary           - Salary details
DELETE /api/v1/teachers/:id                  - Delete teacher
```

### Parent Endpoints
```
POST   /api/v1/parents                     - Create parent
GET    /api/v1/parents                     - List parents
GET    /api/v1/parents/statistics          - Parent statistics
GET    /api/v1/parents/:id                 - Get parent
PUT    /api/v1/parents/:id                 - Update parent
POST   /api/v1/parents/:id/link-student    - Link student
DELETE /api/v1/parents/:id/unlink-student/:studentId - Unlink
PATCH  /api/v1/parents/:id/student-link/:studentId   - Update link

GET    /api/v1/parents/:id/children                          - Children list
GET    /api/v1/parents/:id/children/:studentId/attendance    - Child attendance
GET    /api/v1/parents/:id/children/:studentId/academic-report - Report
GET    /api/v1/parents/:id/children/:studentId/fees          - Child fees
GET    /api/v1/parents/:id/payments                          - Payment history
GET    /api/v1/parents/:id/notifications                     - Notifications
PATCH  /api/v1/parents/:id/notifications/:notificationId/read - Mark read
GET    /api/v1/parents/:id/messages                          - Messages
GET    /api/v1/parents/:id/dashboard                         - Dashboard
DELETE /api/v1/parents/:id                                   - Delete parent
```

### Academic Endpoints
```
Subjects:
POST   /api/v1/academic/subjects           - Create subject
GET    /api/v1/academic/subjects           - List subjects
GET    /api/v1/academic/subjects/:id       - Get subject
PUT    /api/v1/academic/subjects/:id       - Update subject
DELETE /api/v1/academic/subjects/:id       - Delete subject

Classes:
POST   /api/v1/academic/classes                      - Create class
GET    /api/v1/academic/classes                      - List classes
GET    /api/v1/academic/classes/:id                  - Get class
PUT    /api/v1/academic/classes/:id                  - Update class
POST   /api/v1/academic/classes/:id/subjects         - Assign subject
DELETE /api/v1/academic/classes/:id/subjects/:subId  - Remove subject

Exams:
POST   /api/v1/academic/exams              - Create exam
GET    /api/v1/academic/exams              - List exams
GET    /api/v1/academic/exams/:id          - Get exam
PUT    /api/v1/academic/exams/:id          - Update exam
DELETE /api/v1/academic/exams/:id          - Delete exam

Results:
POST   /api/v1/academic/results                    - Enter result
POST   /api/v1/academic/results/bulk               - Bulk enter
GET    /api/v1/academic/exams/:examId/results      - Get results
POST   /api/v1/academic/exams/:examId/publish-results   - Publish
POST   /api/v1/academic/exams/:examId/unpublish-results - Unpublish

Gradebook:
POST   /api/v1/academic/gradebook          - Create entry
GET    /api/v1/academic/gradebook          - List entries
PUT    /api/v1/academic/gradebook/:id      - Update entry
DELETE /api/v1/academic/gradebook/:id      - Delete entry

Reports:
GET    /api/v1/academic/reports/student/:studentId/exam/:examId - Report card
GET    /api/v1/academic/reports/class/:classId/exam/:examId     - Class report
GET    /api/v1/academic/reports/exam/:examId/subject-performance - Subject performance
```

### Attendance Endpoints
```
Sessions:
POST   /api/v1/attendance/sessions         - Create session
GET    /api/v1/attendance/sessions         - List sessions

Mark Attendance:
POST   /api/v1/attendance/mark             - Mark single
POST   /api/v1/attendance/mark/bulk        - Bulk mark
POST   /api/v1/attendance/mark/class       - Mark entire class

Retrieve:
GET    /api/v1/attendance                      - Get attendance
GET    /api/v1/attendance/class/:classId/date  - Class by date

Statistics:
GET    /api/v1/attendance/statistics                - Statistics
GET    /api/v1/attendance/student/:studentId/summary - Summary
POST   /api/v1/attendance/student/:studentId/summary - Update summary

Reports:
GET    /api/v1/attendance/defaulters       - Defaulters list
GET    /api/v1/attendance/report           - Generate report

Notifications:
POST   /api/v1/attendance/notify/absence   - Notify parents
```

### Fee Endpoints
```
Structure:
POST   /api/v1/fee/structure               - Create structure
GET    /api/v1/fee/structure               - List structures
GET    /api/v1/fee/structure/:id           - Get structure
PUT    /api/v1/fee/structure/:id           - Update structure

Discounts:
POST   /api/v1/fee/discount                - Create discount
POST   /api/v1/fee/discount/apply          - Apply to student

Invoices:
POST   /api/v1/fee/invoice                 - Generate invoice
GET    /api/v1/fee/invoice                 - List invoices
GET    /api/v1/fee/invoice/:id             - Get invoice

Payments:
POST   /api/v1/fee/payment                 - Record payment
GET    /api/v1/fee/payment                 - List payments

Reports:
GET    /api/v1/fee/defaulters              - Fee defaulters
GET    /api/v1/fee/statistics              - Fee statistics
```

## Default Credentials

After seeding the database:

**Admin Account:**
- Email: `admin@school.com`
- Password: `admin123`

**⚠️ IMPORTANT: Change these credentials immediately after first login!**

## Project Structure
```
services/backend/
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # Route controllers
│   ├── database/         # Migrations and seeds
│   ├── middleware/       # Custom middleware
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── utils/            # Utility functions
│   └── server.js         # Entry point
├── logs/                 # Application logs
├── uploads/              # File uploads
├── .env                  # Environment variables
├── .env.example          # Environment template
├── package.json          # Dependencies
└── README.md             # This file
```

## Security Features

- JWT-based authentication with refresh tokens
- Multi-factor authentication (TOTP)
- Password hashing with bcrypt
- Rate limiting (100 requests/15min)
- Helmet.js security headers
- Input validation with Joi
- SQL injection prevention
- XSS protection
- CORS configuration

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Database Operations

**Create migration:**
```bash
# Add new SQL file in src/database/migrations/
# Format: XXX_description.sql
```

**Run migrations:**
```bash
npm run migrate
```

**Seed database:**
```bash
npm run seed
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment (development/production) | development |
| PORT | Server port | 5000 |
| DB_HOST | Database host | localhost |
| DB_PORT | Database port | 3306 |
| DB_NAME | Database name | school_management |
| DB_USER | Database user | root |
| DB_PASSWORD | Database password | - |
| JWT_SECRET | JWT secret key | - |
| JWT_REFRESH_SECRET | Refresh token secret | - |
| JWT_ACCESS_EXPIRY | Access token expiry | 15m |
| JWT_REFRESH_EXPIRY | Refresh token expiry | 7d |

## API Response Format

### Success Response
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success message",
  "data": { ... },
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error message"
}
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Create an issue on GitHub
- Email: support@schoolmanagement.com

---

**Built with ❤️ for Education**
