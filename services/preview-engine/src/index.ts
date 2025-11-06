import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'preview-engine' });
});

app.listen(PORT, () => {
  console.log(`👁️  Preview Engine service running on port ${PORT}`);
});
