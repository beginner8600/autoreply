import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { prisma } from "../lib/db.js";

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  name: z.string().min(2).max(80).optional(),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: parsed.error.issues.map((issue) => issue.message).join(", "),
      });
    }

    const input = parsed.data;
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingUser) {
      return reply.code(409).send({ error: "Email is already registered" });
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        name: input.name,
      },
    });

    const token = await reply.jwtSign({
      sub: user.id,
      email: user.email,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  });

  app.post("/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: parsed.error.issues.map((issue) => issue.message).join(", "),
      });
    }

    const input = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user) {
      return reply.code(401).send({ error: "Invalid email or password" });
    }

    const isValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!isValid) {
      return reply.code(401).send({ error: "Invalid email or password" });
    }

    const token = await reply.jwtSign({
      sub: user.id,
      email: user.email,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  });
}
