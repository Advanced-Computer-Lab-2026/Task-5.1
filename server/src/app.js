import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import reviewRoutes from './routes/reviews.js';
import userRoutes from './routes/users.js';
import instructorRoutes from './routes/instructors.js';
import mongoSanitize from 'express-mongo-sanitize';

const app = express();

app.use(morgan('dev'));
app.use(cors({ origin: 'http://localhost:5175', credentials: false }));
app.use(express.json());

// Reject MongoDB operators before sanitization
app.use((req, res, next) => {
  const hasMongoOperator = (value) => {
    if (value && typeof value === 'object') {
      for (const key of Object.keys(value)) {
        if (key.startsWith('$') || key.includes('.')) {
          return true;
        }

        if (hasMongoOperator(value[key])) {
          return true;
        }
      }
    }

    return false;
  };

  if (hasMongoOperator(req.body) || hasMongoOperator(req.query)) {
    return res.status(400).json({
      message: 'Invalid request parameters'
    });
  }

  next();
});

// Additional NoSQL injection protection
app.use(mongoSanitize({
  onSanitize: ({ key }) => {
    console.warn(`Blocked MongoDB operator: ${key}`);
  }
}));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/users', userRoutes);
app.use('/api/instructors', instructorRoutes);

// Not found
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server Error' });
});

export default app;