import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ai-orchestrator' });
});

app.listen(PORT, () => {
  console.log(`🤖 AI Orchestrator service running on port ${PORT}`);
});
