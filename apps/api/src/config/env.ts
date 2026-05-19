import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(8),
  WEBHOOK_VERIFY_TOKEN: z.string().min(1),
  META_APP_ID: z.string().optional().default(""),
  META_APP_SECRET: z.string().optional().default(""),
  META_INSTAGRAM_APP_ID: z.string().optional().default(""),
  META_INSTAGRAM_APP_SECRET: z.string().optional().default(""),
  META_REDIRECT_URI: z.string().url().optional().default("http://localhost:4000/instagram/oauth/callback"),
  META_CONFIG_ID: z.string().optional().default(""),
  META_GRAPH_VERSION: z.string().default("v23.0"),
  META_OAUTH_SCOPES: z.string().default("instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,pages_show_list,pages_manage_metadata,business_management"),
  MOCK_INSTAGRAM_CONNECT: z
    .string()
    .default("true")
    .transform((value) => value === "true"),
});

export const env = envSchema.parse(process.env);
