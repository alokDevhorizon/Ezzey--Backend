const app = require('./src/app');
const connectDB = require('./src/config/database');

const PORT = process.env.PORT || 5000;

let server;

// Connect to MongoDB and Start Server
connectDB()
  .then(() => {
    server = app.listen(PORT, () => {
      console.log(`\n========================================`);
      console.log(`🚀 Smart Timetable Backend Started`);
      console.log(`📍 Server running on http://localhost:${PORT}`);
      console.log(`🗄️  Environment: ${process.env.NODE_ENV}`);
      console.log(`========================================\n`);
    });
  })
  .catch((err) => {
    console.error('❌ DB Connection Failed:', err);
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Error: ${err.message}`);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  if (server) {
    server.close(() => {
      console.log('HTTP server closed');
    });
  }
});

module.exports = server;