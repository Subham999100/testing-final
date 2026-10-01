// ============================================================
// ORGANISATION PORTAL
// WebSocket gateway (socket.io). One connection per browser tab,
// joined to an org room and a user room. Payloads carry ids only:
// clients refetch through the permission-checked REST API, so a
// broadcast never leaks data a member is not allowed to see.
// ============================================================

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import * as crypto from 'crypto';
import type { Server, Socket } from 'socket.io';
import { PrismaService } from '../../../database/prisma.service';
import { resolveOrgContext } from './org-context';

function allowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  const allowed = [process.env.CORS_ORIGIN, 'http://localhost:5173', 'http://localhost:3000'].filter(Boolean);
  return allowed.includes(origin);
}

@WebSocketGateway({
  namespace: '/org-realtime',
  cors: {
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => cb(null, allowedOrigin(origin)),
    credentials: true,
  },
})
export class OrgRealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(OrgRealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = typeof client.handshake.auth?.token === 'string' ? client.handshake.auth.token : null;
      if (!token) throw new Error('missing token');
      const secret = this.config.get<string>('jwt.secret') || this.config.get<string>('JWT_SECRET');
      this.jwt.verify(token, { secret });

      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const session = await this.prisma.platformSession.findUnique({ where: { tokenHash }, include: { user: true } });
      if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user?.isActive) {
        throw new Error('invalid session');
      }
      const u = session.user;
      const ctx = await resolveOrgContext(this.prisma, {
        userId: u.id,
        role: u.role,
        organisationId: u.organisationId,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
      });
      client.data.userId = ctx.userId;
      await client.join(`org:${ctx.organisationId}`);
      await client.join(`user:${ctx.userId}`);
    } catch (err) {
      this.logger.debug(`Rejected realtime connection: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  toOrg(organisationId: string, event: string, payload: Record<string, unknown> = {}): void {
    this.server?.to(`org:${organisationId}`).emit(event, payload);
  }

  toUser(userId: string, event: string, payload: Record<string, unknown> = {}): void {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }

  disconnectUser(userId: string): void {
    this.server?.in(`user:${userId}`).disconnectSockets(true);
  }
}
