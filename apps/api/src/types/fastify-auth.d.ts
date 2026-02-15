import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: {
      id: string;
      email: string | null;
      displayName: string | null;
    };
  }
}
