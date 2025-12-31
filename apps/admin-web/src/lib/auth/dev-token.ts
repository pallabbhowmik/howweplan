/**
 * Development Token Utility
 * 
 * Creates JWT tokens for local development mode.
 * These tokens are signed with the same secret used by backend services
 * in the docker-compose development environment.
 */

import * as jose from 'jose';

// Development JWT configuration matching docker-compose services
const DEV_JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';
const DEV_JWT_ISSUER = 'tripcomposer';
const DEV_JWT_AUDIENCE = 'tripcomposer-services';

/**
 * Creates a development access token that matches the format
 * expected by backend services.
 * Note: The identity service uses uppercase roles (USER, AGENT, ADMIN)
 */
export async function createDevAccessToken(
  userId: string,
  role: 'USER' | 'AGENT' | 'ADMIN' = 'ADMIN'
): Promise<string> {
  const secret = new TextEncoder().encode(DEV_JWT_SECRET);
  
  const token = await new jose.SignJWT({
    sub: userId,
    role,
    status: 'ACTIVE',
    agentVerificationStatus: null,
    type: 'access',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(DEV_JWT_ISSUER)
    .setAudience(DEV_JWT_AUDIENCE)
    .setExpirationTime('24h')
    .setIssuedAt()
    .sign(secret);

  return token;
}
