import { z } from 'zod';

const textField = (min, max) => z.string().trim().min(min).max(max);

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
  image: z.string().trim().url().max(500),
  link: z.string().trim().url().max(500),
  category: textField(1, 50),
});
