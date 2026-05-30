import express from 'express';
import path from 'path';
import { initDb } from './db';
import { seedStickers } from './seeds/stickers';
import { seedUsers, ensureAdmin } from './seeds/users';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import stickerRoutes from './routes/stickerRoutes';
import tradeRoutes from './routes/tradeRoutes';
import chatRoutes from './routes/chatRoutes';
import shippingRoutes from './routes/shippingRoutes';
import matchRoutes from './routes/matchRoutes';
import notificationRoutes from './routes/notificationRoutes';
import profileRoutes from './routes/profileRoutes';
import listingRoutes from './routes/listingRoutes';
import statsRoutes from './routes/statsRoutes';
import orderRoutes from './routes/orderRoutes';
import adminRoutes from './routes/adminRoutes';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/stickers', stickerRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/trades/:id/messages', chatRoutes);
app.use('/api/trades/:id/shipping', shippingRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', profileRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Landing page at root for non-logged-in users (served as static)
// SPA fallback for all other routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use(errorHandler);

async function start(): Promise<void> {
  await initDb();
  await seedStickers();
  await seedUsers();
  await ensureAdmin();

  app.listen(PORT, () => {
    console.log(`\n🌍 Panini WC2026 Trading Platform`);
    console.log(`🚀 Servidor a correr em http://localhost:${PORT}`);
    console.log(`📦 Base de dados inicializada\n`);
  });
}

start().catch(err => {
  console.error('Erro ao iniciar servidor:', err);
  process.exit(1);
});

export default app;
