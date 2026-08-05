import { generateOpenApiDocument } from 'trpc-to-openapi';

const baseUrl = process.env.BACKEND_URL || 'http://localhost:3001';

export const createOpenApiDocument = (appRouter: any) =>
  generateOpenApiDocument(appRouter, {
    title: 'Ardoise API',
    version: '1.0.0',
    baseUrl: `${baseUrl}`,
    description:
      'Ardoise payment and invoicing API with tRPC, authentication, Stripe payments, and document storage.',
    tags: ['Authentication', 'Users', 'Clients', 'Payments', 'Documents', 'Media', 'Admin'],
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from login endpoint',
      },
    },
  });
