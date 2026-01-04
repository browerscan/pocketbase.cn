import { z } from "zod";

const urlWithDefault = (fallback: string) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().default(fallback),
  );

const optionalUrl = z.preprocess(
  (value) => (value === "" || value == null ? "" : value),
  z.union([z.string().url(), z.literal("")]),
);

const flag = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.enum(["0", "1"]).default("0"),
);

const envSchema = z.object({
  PUBLIC_SITE_URL: urlWithDefault("https://pocketbase.cn"),
  PUBLIC_POCKETBASE_URL: urlWithDefault("http://127.0.0.1:8090"),
  PUBLIC_GA_ID: z.string().optional().default(""),
  PUBLIC_UMAMI_SRC: optionalUrl,
  PUBLIC_UMAMI_WEBSITE_ID: z.string().optional().default(""),
  PUBLIC_BAIDU_SITE_VERIFICATION: z.string().optional().default(""),
  PUBLIC_ENABLE_PASSWORD_LOGIN: flag,
});

const rawEnv = import.meta.env ?? {};
export const publicEnv = envSchema.parse(rawEnv);
