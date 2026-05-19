import type { FastifyReply, FastifyRequest } from "fastify";

export type AuthUser = {
  sub: string;
  email: string;
};

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify<AuthUser>();
  } catch {
    return reply.code(401).send({ error: "Unauthorized" });
  }
}

export function getAuthUser(request: FastifyRequest): AuthUser {
  return request.user as AuthUser;
}
