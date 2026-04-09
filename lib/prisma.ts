import { promises as fs } from 'node:fs';
import path from 'node:path';

type Skill = {
  id: number;
  name: string;
  level: number;
  category: string;
  createdAt: string;
  updatedAt: string;
};

type Experience = {
  id: number;
  title: string;
  company: string;
  description: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
};

type Certificate = {
  id: number;
  title: string;
  issuer: string;
  image: string;
  link: string;
  category: string;
  createdAt: string;
  updatedAt: string;
};

type Portfolio = {
  id: number;
  title: string;
  description: string;
  tech: string[];
  link: string;
  image: string;
  badge: string;
  createdAt: string;
  updatedAt: string;
};

type SiteHeroContent = {
  eyebrow: string;
  title: string;
  description: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  image: string;
};

type SiteAboutHighlight = {
  label: string;
  value: string;
};

type SiteAboutContent = {
  title: string;
  body: string;
  highlights: SiteAboutHighlight[];
};

type SiteContent = {
  hero: SiteHeroContent;
  about: SiteAboutContent;
};

type Database = {
  skills: Skill[];
  experience: Experience[];
  certificates: Certificate[];
  portfolio: Portfolio[];
  siteContent: SiteContent;
};

const dbPath = path.join(process.cwd(), 'data', 'db.json');

const initialDb: Database = {
  skills: [],
  experience: [],
  certificates: [],
  portfolio: [],
  siteContent: {
    hero: {
      eyebrow: 'Frontend Engineering',
      title: 'Front-End Developer building scalable, high-performance web apps',
      description:
        'I design polished web experiences with React, Next.js, Tailwind CSS, and Prisma—focused on performance, maintainable architecture, and business impact.',
      primaryCtaLabel: 'View Projects',
      primaryCtaHref: '#portfolio',
      secondaryCtaLabel: 'Download Resume',
      secondaryCtaHref: '/resume.pdf',
      image: '/heroImage.jpg',
    },
    about: {
      title: 'About',
      body: 'A quick snapshot of how I think, build, and deliver as a developer.',
      highlights: [
        { label: 'Core stack', value: 'React, Next.js, TypeScript, Tailwind CSS' },
        { label: 'Data layer', value: 'Prisma, REST APIs, GraphQL fundamentals' },
        { label: 'Workflow', value: 'GitHub, CI-ready quality, iterative delivery' },
      ],
    },
  },
};

const toString = (value: unknown, fallback: string) => (typeof value === 'string' && value.trim().length > 0 ? value : fallback);
const toStringArray = (value: unknown): string[] => (Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : []);

function normalizeSiteContent(value: unknown): SiteContent {
  const raw = value && typeof value === 'object' ? (value as Partial<SiteContent>) : {};
  const heroRaw = raw.hero && typeof raw.hero === 'object' ? raw.hero : {};
  const aboutRaw = raw.about && typeof raw.about === 'object' ? raw.about : {};
  const highlights = Array.isArray(aboutRaw.highlights)
    ? aboutRaw.highlights
        .map((highlight) => {
          if (!highlight || typeof highlight !== 'object') return null;
          const label = toString((highlight as SiteAboutHighlight).label, '');
          const contentValue = toString((highlight as SiteAboutHighlight).value, '');
          if (!label || !contentValue) return null;
          return { label, value: contentValue };
        })
        .filter((highlight): highlight is SiteAboutHighlight => Boolean(highlight))
    : initialDb.siteContent.about.highlights;

  return {
    hero: {
      eyebrow: toString(heroRaw.eyebrow, initialDb.siteContent.hero.eyebrow),
      title: toString(heroRaw.title, initialDb.siteContent.hero.title),
      description: toString(heroRaw.description, initialDb.siteContent.hero.description),
      primaryCtaLabel: toString(heroRaw.primaryCtaLabel, initialDb.siteContent.hero.primaryCtaLabel),
      primaryCtaHref: toString(heroRaw.primaryCtaHref, initialDb.siteContent.hero.primaryCtaHref),
      secondaryCtaLabel: toString(heroRaw.secondaryCtaLabel, initialDb.siteContent.hero.secondaryCtaLabel),
      secondaryCtaHref: toString(heroRaw.secondaryCtaHref, initialDb.siteContent.hero.secondaryCtaHref),
      image: toString(heroRaw.image, initialDb.siteContent.hero.image),
    },
    about: {
      title: toString(aboutRaw.title, initialDb.siteContent.about.title),
      body: toString(aboutRaw.body, initialDb.siteContent.about.body),
      highlights,
    },
  };
}

function normalizeDb(raw: Partial<Database>): Database {
  const portfolio = Array.isArray(raw.portfolio)
    ? raw.portfolio.map((item) => ({
        id: Number(item?.id) || 0,
        title: toString(item?.title, ''),
        description: toString(item?.description, ''),
        tech: toStringArray(item?.tech),
        link: toString(item?.link, ''),
        image: toString(item?.image, ''),
        badge: toString(item?.badge, ''),
        createdAt: toString(item?.createdAt, nowIso()),
        updatedAt: toString(item?.updatedAt, nowIso()),
      }))
    : [];

  return {
    skills: Array.isArray(raw.skills) ? raw.skills : initialDb.skills,
    experience: Array.isArray(raw.experience) ? raw.experience : initialDb.experience,
    certificates: Array.isArray(raw.certificates) ? raw.certificates : initialDb.certificates,
    portfolio,
    siteContent: normalizeSiteContent(raw.siteContent),
  };
}

async function readDb(): Promise<Database> {
  try {
    const content = await fs.readFile(dbPath, 'utf8');
    return normalizeDb(JSON.parse(content) as Partial<Database>);
  } catch {
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
    await fs.writeFile(dbPath, JSON.stringify(initialDb, null, 2));
    return initialDb;
  }
}

async function writeDb(db: Database): Promise<void> {
  await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
}

const nowIso = () => new Date().toISOString();
const nextId = (items: { id: number }[]) => (items.length ? Math.max(...items.map((item) => item.id)) + 1 : 1);

export const prisma = {
  skill: {
    async findMany() {
      const db = await readDb();
      return db.skills;
    },
    async create({ data }: { data: Pick<Skill, 'name' | 'level' | 'category'> }) {
      const db = await readDb();
      const created: Skill = { id: nextId(db.skills), ...data, createdAt: nowIso(), updatedAt: nowIso() };
      db.skills.push(created);
      await writeDb(db);
      return created;
    },
    async update({ where, data }: { where: { id: number }; data: Pick<Skill, 'name' | 'level' | 'category'> }) {
      const db = await readDb();
      const index = db.skills.findIndex((item) => item.id === where.id);
      if (index < 0) throw new Error('Not found');
      db.skills[index] = { ...db.skills[index], ...data, updatedAt: nowIso() };
      await writeDb(db);
      return db.skills[index];
    },
    async delete({ where }: { where: { id: number } }) {
      const db = await readDb();
      db.skills = db.skills.filter((item) => item.id !== where.id);
      await writeDb(db);
      return { id: where.id };
    },
  },
  experience: {
    async findMany() {
      const db = await readDb();
      return db.experience;
    },
    async create({ data }: { data: Omit<Experience, 'id' | 'createdAt' | 'updatedAt'> }) {
      const db = await readDb();
      const created: Experience = { id: nextId(db.experience), ...data, createdAt: nowIso(), updatedAt: nowIso() };
      db.experience.push(created);
      await writeDb(db);
      return created;
    },
    async update({ where, data }: { where: { id: number }; data: Omit<Experience, 'id' | 'createdAt' | 'updatedAt'> }) {
      const db = await readDb();
      const index = db.experience.findIndex((item) => item.id === where.id);
      if (index < 0) throw new Error('Not found');
      db.experience[index] = { ...db.experience[index], ...data, updatedAt: nowIso() };
      await writeDb(db);
      return db.experience[index];
    },
    async delete({ where }: { where: { id: number } }) {
      const db = await readDb();
      db.experience = db.experience.filter((item) => item.id !== where.id);
      await writeDb(db);
      return { id: where.id };
    },
  },
  certificate: {
    async findMany() {
      const db = await readDb();
      return db.certificates;
    },
    async create({ data }: { data: Pick<Certificate, 'title' | 'issuer' | 'image' | 'link' | 'category'> }) {
      const db = await readDb();
      const created: Certificate = { id: nextId(db.certificates), ...data, createdAt: nowIso(), updatedAt: nowIso() };
      db.certificates.push(created);
      await writeDb(db);
      return created;
    },
    async update({ where, data }: { where: { id: number }; data: Pick<Certificate, 'title' | 'issuer' | 'image' | 'link' | 'category'> }) {
      const db = await readDb();
      const index = db.certificates.findIndex((item) => item.id === where.id);
      if (index < 0) throw new Error('Not found');
      db.certificates[index] = { ...db.certificates[index], ...data, updatedAt: nowIso() };
      await writeDb(db);
      return db.certificates[index];
    },
    async delete({ where }: { where: { id: number } }) {
      const db = await readDb();
      db.certificates = db.certificates.filter((item) => item.id !== where.id);
      await writeDb(db);
      return { id: where.id };
    },
  },
  portfolio: {
    async findMany() {
      const db = await readDb();
      return db.portfolio;
    },
    async create({ data }: { data: Omit<Portfolio, 'id' | 'createdAt' | 'updatedAt'> }) {
      const db = await readDb();
      const created: Portfolio = { id: nextId(db.portfolio), ...data, createdAt: nowIso(), updatedAt: nowIso() };
      db.portfolio.push(created);
      await writeDb(db);
      return created;
    },
    async update({ where, data }: { where: { id: number }; data: Omit<Portfolio, 'id' | 'createdAt' | 'updatedAt'> }) {
      const db = await readDb();
      const index = db.portfolio.findIndex((item) => item.id === where.id);
      if (index < 0) throw new Error('Not found');
      db.portfolio[index] = { ...db.portfolio[index], ...data, updatedAt: nowIso() };
      await writeDb(db);
      return db.portfolio[index];
    },
    async delete({ where }: { where: { id: number } }) {
      const db = await readDb();
      db.portfolio = db.portfolio.filter((item) => item.id !== where.id);
      await writeDb(db);
      return { id: where.id };
    },
  },
  siteContent: {
    async get() {
      const db = await readDb();
      return db.siteContent;
    },
    async update(data: { hero?: Partial<SiteHeroContent>; about?: Partial<SiteAboutContent> }) {
      const db = await readDb();
      const current = db.siteContent;
      db.siteContent = {
        hero: { ...current.hero, ...(data.hero ?? {}) },
        about: {
          ...current.about,
          ...(data.about ?? {}),
          highlights: data.about?.highlights ?? current.about.highlights,
        },
      };
      await writeDb(db);
      return db.siteContent;
    },
  },
};
