import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import authRoutes from './routes/auth.js';
import employeeRoutes from './routes/employees.js';
import wellbeingRoutes from './routes/wellbeing.js';

dotenv.config({ quiet: true });

const app = express();
const port = Number(process.env['PORT'] ?? 3000);

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api', employeeRoutes);
app.use('/api/wellbeing', wellbeingRoutes);

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Backend listening at http://localhost:${port}`);
});
