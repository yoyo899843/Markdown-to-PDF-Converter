import express from 'express';
import { fileURLToPath } from 'url';
import convertRoutes from './routes/convert.js';

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(fileURLToPath(new URL('../public/', import.meta.url))));
app.use(convertRoutes);

export default app;
