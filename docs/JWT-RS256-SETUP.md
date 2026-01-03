# JWT RS256 Asymmetric Key Authentication Setup

This document explains how to set up RS256 (asymmetric) JWT authentication for the TripComposer platform.

## Overview

RS256 uses asymmetric cryptography:
- **Private Key**: Used **only** by the Identity Service to **sign** tokens
- **Public Key**: Shared with **all services** to **verify** tokens

This is more secure than HS256 (shared secret) because:
1. Only one service has the signing key
2. Compromised downstream services cannot forge tokens
3. Key rotation is simpler - just update the signing service

## Generating Keys

### Option 1: Using OpenSSL (Recommended)

```bash
# Generate a 2048-bit RSA private key
openssl genrsa -out jwt-private.pem 2048

# Extract the public key from the private key
openssl rsa -in jwt-private.pem -pubout -out jwt-public.pem
```

### Option 2: Using Node.js

```javascript
const crypto = require('crypto');
const { generateKeyPairSync } = crypto;

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

console.log('Private Key:\n', privateKey);
console.log('Public Key:\n', publicKey);
```

## Render Secret Files Setup (Recommended)

Render's Secret Files feature is the cleanest way to handle PEM keys. Files are stored securely and available at `/etc/secrets/<filename>`.

### Step-by-Step Setup on Render

1. **Go to your service** on Render dashboard
2. **Click "Environment"** in the left sidebar
3. **Scroll to "Secret Files"** section
4. **Click "Add Secret File"**
5. **For Identity Service**, add TWO files:
   - Filename: `jwt-private.pem` → Paste contents of your private key
   - Filename: `jwt-public.pem` → Paste contents of your public key
6. **For Gateway and other services**, add ONE file:
   - Filename: `jwt-public.pem` → Paste contents of your public key (same as Identity)
7. **Click "Save Changes"** - service will redeploy

### File Naming Convention

| Service | Secret Files Needed |
|---------|---------------------|
| Identity Service | `jwt-private.pem`, `jwt-public.pem` |
| API Gateway | `jwt-public.pem` |
| Requests Service | `jwt-public.pem` |
| Other Services | `jwt-public.pem` |

### How It Works

The services automatically look for keys in this order:
1. `/etc/secrets/jwt-private.pem` or `/etc/secrets/jwt-public.pem` (Render)
2. `./secrets/jwt-*.pem` (Local development)
3. `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` environment variables (fallback)

## Environment Variables (Alternative Method)

If you prefer environment variables over secret files:

### Identity Service (Token Issuer)

The Identity Service is the **only** service that signs tokens.

**Using Secret Files (Recommended):**
- Upload `jwt-private.pem` and `jwt-public.pem` to Render Secret Files

**Environment Variables:**
```env
# JWT Algorithm
JWT_ALGORITHM=RS256

# Token settings
JWT_ISSUER=tripcomposer-identity
JWT_AUDIENCE=tripcomposer-platform
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d
```

### API Gateway (Token Validator)

**Using Secret Files (Recommended):**
- Upload `jwt-public.pem` to Render Secret Files

**Environment Variables:**
```env
# JWT Algorithm
JWT_ALGORITHM=RS256

# Must match Identity Service settings
JWT_ISSUER=tripcomposer-identity
JWT_AUDIENCE=tripcomposer-services
```

### Requests Service & Other Downstream Services

**Using Secret Files (Recommended):**
- Upload `jwt-public.pem` to Render Secret Files

**Environment Variables:**
```env
# JWT Algorithm
JWT_ALGORITHM=RS256

# Must match Identity Service settings
JWT_ISSUER=tripcomposer-identity
JWT_AUDIENCE=tripcomposer-platform
```

## Local Development Setup

For local development, create a `secrets` folder in each service:

```bash
# In each service directory
mkdir -p secrets
cp /path/to/jwt-private.pem ./secrets/  # Identity only
cp /path/to/jwt-public.pem ./secrets/   # All services
```

Add to `.gitignore`:
```
secrets/
*.pem
```

## Verification Checklist

### Using Render Secret Files
1. **Identity Service**
   - [ ] `jwt-private.pem` uploaded to Secret Files
   - [ ] `jwt-public.pem` uploaded to Secret Files
   - [ ] `JWT_ALGORITHM=RS256` in Environment
   - [ ] `JWT_ISSUER=tripcomposer-identity` in Environment

2. **API Gateway**
   - [ ] `jwt-public.pem` uploaded to Secret Files (same content as Identity)
   - [ ] `JWT_ALGORITHM=RS256` in Environment
   - [ ] `JWT_ISSUER=tripcomposer-identity` in Environment

3. **Other Services**
   - [ ] `jwt-public.pem` uploaded to Secret Files (same content as Identity)
   - [ ] `JWT_ALGORITHM=RS256` in Environment

## Troubleshooting

### "Invalid signature" error
- Verify the public key matches the private key
- Check for extra whitespace or newline issues
- Ensure newlines are properly escaped (`\n`)

### "Token issuer mismatch"
- Ensure `JWT_ISSUER` is the same across all services
- Current value: `tripcomposer-identity`

### "Token audience mismatch"
- Check `JWT_AUDIENCE` configuration
- Identity Service uses: `tripcomposer-platform`
- Gateway uses: `tripcomposer-services`
- **Note**: These should ideally match or Gateway should accept both

### Token not being validated
- Check that `JWT_ALGORITHM=RS256` is set
- Verify the public key is in correct PEM format
- Check logs for specific error messages

## Security Notes

1. **Never commit keys to git** - Use environment variables or secrets management
2. **Rotate keys periodically** - Generate new keys and update all services
3. **Private key protection** - Only Identity Service should have access
4. **Key length** - Use at least 2048-bit RSA keys (4096-bit for higher security)

## Quick Reference

| Service | Secret Files | Signs Tokens | Verifies Tokens |
|---------|--------------|--------------|-----------------|
| Identity Service | `jwt-private.pem` + `jwt-public.pem` | ✅ Yes | ✅ Yes |
| API Gateway | `jwt-public.pem` | ❌ No | ✅ Yes |
| Requests Service | `jwt-public.pem` (optional) | ❌ No | ✅ Yes (fallback) |
| Other Services | `jwt-public.pem` (optional) | ❌ No | ✅ Yes (fallback) |

## Migration from HS256

If migrating from HS256:

1. Generate RS256 key pair
2. Update Identity Service first (it can sign with both temporarily)
3. Update Gateway with public key
4. Update downstream services
5. Set `JWT_ALGORITHM=RS256` on all services
6. Remove legacy `JWT_SECRET` after migration complete
