# Backend - Student Management System API

## 🚀 Setup & Installation

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm hoặc yarn

### Installation
```bash
# Clone repository
git clone <repository-url>
cd student-management-system/backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your database credentials

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Start development server
npm run dev
```

## 📊 Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Create and run migrations
npm run db:studio    # Open Prisma Studio (database GUI)
npm test             # Run unit tests
npm run test:watch   # Run tests in watch mode
```

## 🗄️ Database Schema

### Models
- **User**: Admin, Teacher, Student accounts
- **Class**: Course/Subject classes
- **ClassEnrollment**: Student-Class relationships
- **AttendanceSession**: QR attendance sessions
- **AttendanceLog**: Student check-in records
- **EmailVerificationToken**: Email verification
- **DeviceRegistration**: Trusted devices

### Relations
```
User 1:N Class (Teacher)
User N:M Class (Student via ClassEnrollment)
User 1:N AttendanceLog
Class 1:N AttendanceSession
AttendanceSession 1:N AttendanceLog
```

## 🔐 Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/db"

# JWT Authentication
JWT_SECRET="your-super-secret-key"
JWT_EXPIRES_IN="7d"

# Server Configuration
NODE_ENV="development"
PORT=3001

# Email Service (Optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# CORS
FRONTEND_URL="http://localhost:3000"

# 2FA
APP_2FA_NAME="Student Management System"
```

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/register     # Register new user
POST   /api/auth/login        # User login
POST   /api/auth/verify-email # Verify email token
POST   /api/auth/refresh      # Refresh JWT token
```

### Users
```
GET    /api/users/me          # Current user profile
PUT    /api/users/me          # Update profile
GET    /api/users             # List users (Admin)
```

### Classes
```
GET    /api/classes           # List classes
POST   /api/classes           # Create class (Teacher)
GET    /api/classes/:id       # Class details
PUT    /api/classes/:id       # Update class (Teacher)
DELETE /api/classes/:id       # Delete class (Teacher)
POST   /api/classes/:id/import # Import students from Excel
GET    /api/classes/:id/export # Export attendance report
```

### Attendance
```
POST   /api/attendance/create-session # Create QR session (Teacher)
GET    /api/attendance/session/:id    # Get session info
POST   /api/attendance/check-in       # Student check-in
GET    /api/attendance/logs           # Attendance history
```

## 🛡️ Security Features

### Authentication & Authorization
- JWT tokens with expiration
- Role-based access control (RBAC)
- Email verification required
- 2FA with TOTP support
- Device registration & tracking

### Input Security
- Request validation with express-validator
- Rate limiting on sensitive endpoints
- Input sanitization
- File upload validation

### API Security
- CORS configuration
- Helmet.js security headers
- Request size limits
- Secure cookie settings

## 🏗️ Architecture

### Folder Structure
```
src/
├── controllers/     # Route handlers
├── middleware/      # Auth, validation, error handling
├── routes/         # Express route definitions
├── services/       # Business logic layer
├── types/          # TypeScript type definitions
└── utils/          # Helper functions
```

### Middleware Stack
```javascript
// Security & CORS
app.use(helmet())
app.use(cors())
app.use(rateLimit())

// Body parsing
app.use(express.json())
app.use(express.urlencoded())

// Authentication
app.use('/api/protected', requireAuth())

// Error handling
app.use(errorHandler)
```

## 🧪 Testing

### Unit Tests
```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

### API Testing
```bash
# Test endpoints with curl
curl http://localhost:3001/health
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

## 📈 Performance

### Database Optimization
- Indexed foreign keys
- Unique constraints
- Efficient queries with Prisma

### Caching Strategy
- JWT token caching
- Database connection pooling
- Static asset caching

## 🚀 Deployment

### Build for Production
```bash
npm run build
npm start
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
EXPOSE 3001
CMD ["npm", "start"]
```

### Environment Variables for Production
```bash
NODE_ENV=production
DATABASE_URL=<production-db-url>
JWT_SECRET=<secure-random-key>
```

## 🔧 Development Tools

### Prisma Studio
```bash
npx prisma studio
# Opens database GUI at http://localhost:5555
```

### Database Reset
```bash
npx prisma migrate reset  # Reset database & run seeds
```

### Code Quality
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Husky git hooks

## 📝 Changelog

### Version 1.0.0 (Initial Release)
- ✅ Basic Express server setup
- ✅ Prisma database schema
- ✅ JWT authentication foundation
- ✅ TypeScript configuration
- ✅ Development environment setup

### Upcoming Features
- [ ] Authentication endpoints
- [ ] User management
- [ ] Class CRUD operations
- [ ] QR attendance system
- [ ] Email notifications
- [ ] Excel import/export
- [ ] 2FA implementation

---
**Backend API Server for Student Management System**
