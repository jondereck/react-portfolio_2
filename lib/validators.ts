import { z } from 'zod';

const textField = (min: number, max: number) => z.string().trim().min(min).max(max);
const urlField = (max: number) => z.string().trim().url().max(max);

export const skillSchema = z.object({
  name: textField(1, 60),
  level: z.number().int().min(1).max(100),
  category: textField(1, 50),
});

export const experienceSchema = z.object({
  title: textField(1, 100),
  company: textField(1, 100),
  description: textField(5, 1000),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().nullable(),
});

export const certificateSchema = z.object({
  title: textField(1, 120),
  issuer: textField(1, 120),
  image: urlField(500),
  link: urlField(500),
  category: textField(1, 50),
});

export const heroSchema = z.object({
  eyebrow: textField(1, 80),
  title: textField(5, 220),
  description: textField(20, 600),
  primaryCtaLabel: textField(1, 40),
  primaryCtaHref: urlField(500),
  secondaryCtaLabel: textField(1, 40),
  secondaryCtaHref: urlField(500),
  image: urlField(500),
});

export const aboutSchema = z.object({
  title: textField(5, 180),
  body: textField(20, 1000),
  highlights: z
    .array(
      z.object({
        label: textField(1, 60),
        value: textField(1, 60),
      }),
    )
    .min(1)
    .max(6),
});

export const portfolioSchema = z.object({
  title: textField(1, 120),
  description: textField(10, 600),
  tech: z.array(textField(1, 40)).min(1).max(10),
  link: urlField(500),
  image: urlField(500),
  badge: textField(1, 60),
});
