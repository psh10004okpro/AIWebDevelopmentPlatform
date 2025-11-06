import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'code-generator' });
});

app.listen(PORT, () => {
  console.log(`💻 Code Generator service running on port ${PORT}`);
});
