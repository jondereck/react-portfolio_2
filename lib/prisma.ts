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

type Database = {
  skills: Skill[];
  experience: Experience[];
  certificates: Certificate[];
};

const dbPath = path.join(process.cwd(), 'data', 'db.json');

const initialDb: Database = { skills: [], experience: [], certificates: [] };

async function readDb(): Promise<Database> {
  try {
    const content = await fs.readFile(dbPath, 'utf8');
    return JSON.parse(content) as Database;
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
};
