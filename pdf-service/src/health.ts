import { Request, Response } from 'express';

/**
 * Health check endpoint for ECS and load balancers.
 * GET /health returns { status: 'ok' } when the service is running.
 */
export function healthHandler(_req: Request, res: Response): void {
  res.status(200).json({ status: 'ok' });
}
