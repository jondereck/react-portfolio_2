import { z } from 'zod';
import { isAnchorOrSafeHttpUrl, isSafeHttpUrl } from '@/lib/url-safety';

const textField = (min: number, max: number) => z.string().trim().min(min).max(max);
const urlField = (max: number) =>
  z
    .string()
    .trim()
    .url()
    .max(max)
    .refine((value) => isSafeHttpUrl(value), { message: 'Only http/https URLs are allowed.' });
const emailField = () => z.string().trim().email().max(120);
const orderField = (max = 9999) => z.number().int().min(0).max(max).optional().default(0);
const publishField = () => z.boolean().optional().default(true);

export const skillSchema = z.object({
  name: textField(1, 60),
  level: z.number().int().min(1).max(100),
  category: textField(1, 50),
  description: textField(3, 400).optional(),
  image: urlField(500).optional(),
  sortOrder: orderField(),
  isPublished: publishField(),
});

export const experienceSchema = z.object({
  title: textField(1, 100),
  company: textField(1, 100),
  description: textField(5, 1200),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().nullable(),
  location: textField(1, 120).optional(),
  employmentType: textField(1, 120).optional(),
  image: urlField(500).optional(),
  isCurrent: z.boolean().optional().default(false),
  sortOrder: orderField(),
  isPublished: publishField(),
});

export const certificateSchema = z.object({
  title: textField(1, 120),
  issuer: textField(1, 120),
  image: urlField(500),
  link: urlField(500),
  category: textField(1, 50),
  issuedAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  credentialId: textField(1, 120).optional(),
  sortOrder: orderField(),
  isPublished: publishField(),
});

export const heroSchema = z.object({
  eyebrow: textField(1, 80),
  title: textField(5, 220),
  description: textField(20, 600),
  primaryCtaLabel: textField(1, 40),
  primaryCtaHref: textField(1, 200).refine((value) => isAnchorOrSafeHttpUrl(value), {
    message: 'Must be an anchor link or an http/https URL.',
  }),
  secondaryCtaLabel: textField(1, 40),
  secondaryCtaHref: textField(1, 200).refine((value) => isAnchorOrSafeHttpUrl(value), {
    message: 'Must be an anchor link or an http/https URL.',
  }),
  image: urlField(500),
});

export const aboutSchema = z.object({
  title: textField(5, 180),
  body: textField(20, 1000),
  highlights: z
    .array(
      z.object({
        label: textField(1, 60),
        value: textField(1, 2000),
      }),
    )
    .min(1)
    .max(6),
});

export const siteConfigSchema = z.object({
  logoText: textField(1, 80).optional(),
  logoImage: urlField(500).optional(),
});

export const socialLinkSchema = z.object({
  label: textField(1, 60),
  url: urlField(500),
});

export const contactSchema = z.object({
  email: emailField().optional(),
  phone: textField(3, 60).optional(),
  location: textField(1, 120).optional(),
  calendarLink: urlField(500).optional(),
  socialLinks: z.array(socialLinkSchema).max(6).optional(),
});

export const seoSchema = z.object({
  title: textField(1, 120).optional(),
  description: textField(10, 300).optional(),
  ogImage: urlField(500).optional(),
  keywords: z.array(textField(1, 30)).max(20).optional(),
});

export const portfolioSchema = z.object({
  title: textField(1, 120),
  slug: textField(1, 160),
  summary: textField(10, 600),
  descriptions: z.array(textField(1, 320)).max(12).optional().default([]),
  tech: z.array(textField(1, 40)).min(1).max(10),
  image: urlField(500),
  badge: textField(1, 60),
  repoUrl: urlField(500).optional(),
  demoUrl: urlField(500).optional(),
  sortOrder: orderField(),
  isFeatured: z.boolean().optional().default(false),
  isPublished: publishField(),
});
