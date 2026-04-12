import { PrismaClient } from '@prisma/client';
import { defaultAdminSettings } from '../lib/adminSettingsDefaults';
import { defaultSiteConfig, defaultSiteContent } from '../lib/siteContentDefaults';

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction([
    prisma.certificate.deleteMany(),
    prisma.skill.deleteMany(),
    prisma.experience.deleteMany(),
    prisma.portfolio.deleteMany(),
    prisma.adminAuditEvent.deleteMany(),
    prisma.adminSettings.deleteMany(),
    prisma.siteConfig.deleteMany(),
    prisma.siteContent.deleteMany(),
  ]);

  await prisma.siteContent.create({ data: defaultSiteContent });
  await prisma.siteConfig.create({ data: defaultSiteConfig });
  await prisma.adminSettings.create({ data: defaultAdminSettings });

  await prisma.skill.createMany({
    data: [
      {
        name: 'React',
        level: 90,
        category: 'Frontend',
        description: 'Production-grade single-page apps',
        image: 'https://res.cloudinary.com/demo/image/upload/v1710000000/portfolio/react.png',
        sortOrder: 1,
      },
      {
        name: 'Next.js',
        level: 88,
        category: 'Frontend',
        description: 'Hybrid SSR/ISR builds',
        image: 'https://res.cloudinary.com/demo/image/upload/v1710000000/portfolio/next.png',
        sortOrder: 2,
      },
    ],
  });

  await prisma.experience.createMany({
    data: [
      {
        title: 'Senior Frontend Engineer',
        company: 'Nimbus Labs',
        description: 'Led UI platform, shipped reusable component library.',
        startDate: new Date('2022-01-01'),
        location: 'Remote',
        employmentType: 'Full-time',
        image: 'https://res.cloudinary.com/demo/image/upload/v1710000000/portfolio/nimbus.png',
        sortOrder: 1,
      },
      {
        title: 'Product Engineer',
        company: 'Arc Studio',
        description: 'Partnered with design to deliver 0-1 SaaS experiences.',
        startDate: new Date('2020-04-01'),
        endDate: new Date('2021-12-01'),
        location: 'Manila',
        employmentType: 'Contract',
        image: 'https://res.cloudinary.com/demo/image/upload/v1710000000/portfolio/arc.png',
        sortOrder: 2,
      },
    ],
  });

  await prisma.certificate.createMany({
    data: [
      {
        title: 'AWS Certified Cloud Practitioner',
        issuer: 'Amazon Web Services',
        image: 'https://res.cloudinary.com/demo/image/upload/v1710000000/portfolio/aws.png',
        link: 'https://aws.amazon.com/certification/',
        category: 'Cloud',
        sortOrder: 1,
      },
      {
        title: 'Google UX Design',
        issuer: 'Google',
        image: 'https://res.cloudinary.com/demo/image/upload/v1710000000/portfolio/google-ux.png',
        link: 'https://grow.google/certificates/',
        category: 'Design',
        sortOrder: 2,
      },
    ],
  });

  await prisma.portfolio.createMany({
    data: [
      {
        title: 'AI Insights Dashboard',
        slug: 'ai-insights-dashboard',
        description: 'Real-time analytics dashboard with streaming data visualizations.',
        descriptions: [
          'Shipped live KPI panels with sub-second updates for operations teams.',
          'Implemented role-based views for executive and analyst workflows.',
          'Improved time-to-insight with streamlined filtering and saved segments.',
        ],
        tech: ['Next.js', 'Prisma', 'Tailwind CSS'],
        image: 'https://res.cloudinary.com/demo/image/upload/v1710000000/portfolio/ai-dashboard.png',
        badge: 'Case Study',
        repoUrl: 'https://github.com/example/ai-dashboard',
        demoUrl: 'https://demo.example.com/ai',
        sortOrder: 1,
        isFeatured: true,
      },
      {
        title: 'Commerce Platform UI',
        slug: 'commerce-platform-ui',
        description: 'Headless commerce storefront optimized for conversions.',
        descriptions: [
          'Built reusable product, cart, and checkout modules for rapid launches.',
          'Optimized mobile checkout flow to reduce drop-off at payment steps.',
          'Integrated CMS-driven merchandising content across category pages.',
        ],
        tech: ['React', 'Node.js', 'PostgreSQL'],
        image: 'https://res.cloudinary.com/demo/image/upload/v1710000000/portfolio/commerce.png',
        badge: 'Featured',
        repoUrl: 'https://github.com/example/commerce',
        demoUrl: 'https://demo.example.com/commerce',
        sortOrder: 2,
        isFeatured: false,
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
