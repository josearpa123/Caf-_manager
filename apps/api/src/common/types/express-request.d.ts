import { AuthenticatedPlatformAdmin, AuthenticatedUser } from './auth.types';

declare module 'express' {
  interface Request {
    user?: AuthenticatedUser | AuthenticatedPlatformAdmin;
  }
}
