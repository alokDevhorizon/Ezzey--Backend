require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Import routes
const authRoutes = require('./routes/authRoutes');
const classroomRoutes = require('./routes/classroomRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const batchRoutes = require('./routes/batchRoutes');
const specialSlotRoutes = require('./routes/specialSlotRoutes');
const timetableRoutes = require('./routes/timetableRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ========================================================
//  🚀 SIMPLE UNIVERSAL CORS — ALLOW ALL ORIGINS + COOKIES
// ========================================================
app.use(
  cors({
    origin: true,          // ⭐ Reflect request origin (allows ALL)
    credentials: true,     // ⭐ Allow cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

// Allow preflight
app.options('*', cors());

// ========================================================
//  OTHER MIDDLEWARE
// ========================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// ========================================================
//  OPTIONAL — SAFEST SECURITY HEADERS (NO CORS LOGIC HERE)
// ========================================================
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  next();
});

// ========================================================
//  HEALTH CHECK
// ========================================================
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Smart Timetable Backend is running',
    timestamp: new Date().toISOString(),
  });
});

// ========================================================
//  ROUTES
// ========================================================
app.use('/auth', authRoutes);
app.use('/classrooms', classroomRoutes);
app.use('/faculties', facultyRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/batches', batchRoutes);
app.use('/special-slots', specialSlotRoutes);
app.use('/timetable', timetableRoutes);
app.use('/dashboard', dashboardRoutes);

// ========================================================
//  404 HANDLER
// ========================================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

// ========================================================
//  ERROR HANDLER
// ========================================================
app.use(errorHandler);

module.exports = app;
