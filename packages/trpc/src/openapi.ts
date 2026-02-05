import { generateOpenApiDocument } from 'trpc-to-openapi';

const baseUrl = process.env.BACKEND_URL || 'http://localhost:3001';

export const createOpenApiDocument = (appRouter: any) =>
  generateOpenApiDocument(appRouter, {
    title: 'MonorepoBoilerplate API',
    version: '1.0.0',
    baseUrl: `${baseUrl}`,
    description:
      'Full-stack monorepo boilerplate API with tRPC, authentication, Stripe payments, and more.',
    docsUrl: 'https://github.com/your-org/monorepo-boilerplate',
    tags: ['Authentication', 'Users', 'Contacts', 'Payments', 'Media', 'Chat', 'Admin'],
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from login endpoint',
      },
    },
  });
