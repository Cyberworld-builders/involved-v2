import express from 'express';
import { healthHandler } from './health';
import { startJobProcessor } from './job-processor';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const app = express();

app.use(express.json());

// Health check for ECS
app.get('/health', healthHandler);

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`[PDF Service] Listening on port ${PORT}`);
});

// Start polling for PDF jobs (Supabase as control plane)
startJobProcessor().catch((err) => {
  console.error('[PDF Service] Job processor failed:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[PDF Service] SIGTERM received, shutting down');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('[PDF Service] SIGINT received, shutting down');
  server.close(() => process.exit(0));
});
