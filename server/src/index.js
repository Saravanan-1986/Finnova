import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import expenseRoutes from './routes/expenses.js';
import billsEmiRoutes from './routes/billsEmi.js';
import goalRoutes from './routes/goals.js';
import emergencyFundRoutes from './routes/emergencyFund.js';
import dependentRoutes from './routes/dependentRoutes.js';
import schemeRoutes from './routes/schemeRoutes.js';
import insuranceRoutes from './routes/insuranceRoutes.js';
import savedPlanRoutes from './routes/savedPlanRoutes.js';
import assistantRoutes from './routes/assistantRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/finnova';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Middleware
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174'
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        return callback(new Error('CORS policy block: origin not allowed'), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/bills-emi', billsEmiRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/emergency-fund', emergencyFundRoutes);
app.use('/api/dependents', dependentRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api/saved-plans', savedPlanRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api', insuranceRoutes);




// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'FINNOVA API is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// Connect to MongoDB and start server
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 FINNOVA server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });