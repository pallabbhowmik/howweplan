# @tripcomposer/auth-utils

Pure authentication and authorization utilities for HowWePlan.

> Note: Package scope remains `@tripcomposer/*` for compatibility.

## Features

- **JWT Helpers**: Decode, verify, and extract claims from JWT tokens
- **RBAC Primitives**: Role and permission checking with hierarchy support
- **Identity Context**: Build user identity from JWT claims

## Design Principles

This package is designed to be:

- ✅ **Pure**: All functions are pure with no side effects
- ✅ **Deterministic**: Same inputs always produce same outputs
- ✅ **Explicit**: All configuration passed as function arguments
- ✅ **Universal**: Safe to use in both browser and Node.js
- ✅ **Type-safe**: Full TypeScript support with strict types

This package **does NOT**:

- ❌ Read environment variables
- ❌ Access databases
- ❌ Call external services
- ❌ Perform any I/O operations

## Installation

```bash
pnpm add @tripcomposer/auth-utils
```

## Usage

### JWT Operations

```typescript
import {
  decodeJwt,
  extractClaims,
  verifyJwt,
  isTokenExpired,
  type JwtVerificationConfig,
} from '@tripcomposer/auth-utils';

// Decode without verification (useful for debugging)
const decoded = decodeJwt(token);
console.log(decoded?.payload.sub);

// Extract normalized claims
const claims = extractClaims(token);
console.log(claims?.subject);
console.log(claims?.audience); // Always an array

// Check expiration
const currentTime = Math.floor(Date.now() / 1000);
if (isTokenExpired(token, currentTime)) {
  console.log('Token is expired');
}

// Verify token (claims validation)
const config: JwtVerificationConfig = {
  secret: secretFromSecureSource, // MUST be passed explicitly
  algorithms: ['HS256'],
  issuer: 'https://auth.example.com',
  audience: 'my-app',
  currentTime: Math.floor(Date.now() / 1000),
};

const result = verifyJwt(token, config);
if (result.valid) {
  console.log('Valid token for user:', result.payload?.sub);
} else {
  console.error('Invalid:', result.error?.message);
}
```

### Role & Permission Checking

```typescript
import {
  hasRole,
  hasPermission,
  assertPermission,
  createRbacConfig,
  Role,
  Permission,
  DEFAULT_ROLE_HIERARCHY,
  PermissionDeniedError,
} from '@tripcomposer/auth-utils';

const user = { roles: ['admin'] };
const config = createRbacConfig();

// Check roles (with hierarchy support)
hasRole(user, Role.ADMIN); // true
hasRole(user, Role.USER, DEFAULT_ROLE_HIERARCHY); // true (inherited)

// Check permissions
hasPermission(user, Permission.MANAGE_USERS, config); // true
hasPermission(user, Permission.MANAGE_SYSTEM, config); // false (super_admin only)

// Assert permission (throws if denied)
try {
  assertPermission(user, Permission.MANAGE_USERS, config);
  // User has permission, proceed with action
} catch (error) {
  if (error instanceof PermissionDeniedError) {
    console.error('Access denied:', error.message);
  }
}
```

### Identity Context Building

```typescript
import {
  buildIdentityContext,
  createAnonymousIdentity,
  type IdentityContextConfig,
} from '@tripcomposer/auth-utils';

// Build identity from JWT claims
const claims = {
  sub: 'user-123',
  email: 'user@example.com',
  email_verified: true,
  name: 'John Doe',
  roles: ['admin'],
  custom_field: 'custom_value',
};

const config: IdentityContextConfig = {
  rolesClaimKey: 'roles',
  defaultRoles: ['user'],
  roleMapping: {
    'admin': 'admin',
    'super': 'super_admin',
  },
  extractMetadata: (claims) => ({
    customField: claims.custom_field,
  }),
};

const identity = buildIdentityContext(claims, config, {
  currentTime: Math.floor(Date.now() / 1000),
  authMethod: 'jwt',
});

console.log(identity.userId); // 'user-123'
console.log(identity.isAuthenticated); // true
console.log(identity.roles); // ['admin']

// Create anonymous identity
const anonymous = createAnonymousIdentity({
  roles: ['guest'],
});
console.log(anonymous.isAnonymous); // true
```

## API Reference

### JWT Module

| Function | Description |
|----------|-------------|
| `decodeJwt(token)` | Decode JWT without verification |
| `verifyJwt(token, config)` | Verify JWT claims |
| `validateJwtClaims(token, config)` | Validate claims only (no signature) |
| `extractClaims(token)` | Extract normalized claims |
| `isTokenExpired(token, currentTime)` | Check if token is expired |
| `isTokenNotYetValid(token, currentTime)` | Check if token is not yet valid |

### RBAC Module

| Function | Description |
|----------|-------------|
| `hasRole(user, role, hierarchy?)` | Check if user has role |
| `hasAnyRole(user, roles, hierarchy?)` | Check if user has any role |
| `hasAllRoles(user, roles, hierarchy?)` | Check if user has all roles |
| `hasPermission(user, permission, config)` | Check if user has permission |
| `hasAnyPermission(user, permissions, config)` | Check if user has any permission |
| `hasAllPermissions(user, permissions, config)` | Check if user has all permissions |
| `assertPermission(user, permission, config)` | Assert permission (throws) |
| `assertRole(user, role, hierarchy?)` | Assert role (throws) |
| `getUserPermissions(user, config)` | Get all user permissions |
| `getUserRoles(user, hierarchy?)` | Get all user roles |
| `createRbacConfig(partial?)` | Create RBAC config with defaults |

### Identity Module

| Function | Description |
|----------|-------------|
| `buildIdentityContext(claims, config?, options?)` | Build identity from claims |
| `tryBuildIdentityContext(claims, config?, options?)` | Build with result wrapper |
| `createAnonymousIdentity(config?)` | Create anonymous identity |
| `isIdentityExpired(identity, currentTime)` | Check if identity expired |
| `getIdentityRemainingTime(identity, currentTime)` | Get remaining validity |
| `mergeIdentityContexts(base, override)` | Merge two identities |

## Types

All types are exported and documented. Key types include:

- `JwtVerificationConfig` - JWT verification configuration
- `JwtVerificationResult` - Result of JWT verification
- `RbacConfig` - RBAC configuration
- `RolePermissionMap` - Role to permissions mapping
- `IdentityContext` - Complete user identity
- `IdentityContextConfig` - Identity building configuration

## License

MIT
