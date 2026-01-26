# Environment Configuration

## Overview

HG-PPC requires several environment variables for proper operation. This document details all required and optional configuration.

## Environment Files

- **Root**: `.env` - Database URLs used by the `packages/db` package
- **Web App**: `apps/web/.env.local` - All web app configuration including auth, APIs, etc.
- **Worker**: Environment variables can be set via Docker Compose or system environment

## Required Environment Variables

### Database

- `DATABASE_URL`: PostgreSQL connection string for connection pooling
  - Format: `postgresql://user:password@host:port/database`
  - Example: `postgresql://hg_ppc:password@db-vps:6543/hg_ppc`

- `DATABASE_DIRECT_URL`: Direct PostgreSQL connection URL (bypasses pooling)
  - Format: `postgresql://user:password@host:port/database`
  - Example: `postgresql://hg_ppc:password@db-vps:5432/hg_ppc`
  - Used by Drizzle migrations and schema operations

### Caching & Job Queue

- `REDIS_URL`: Redis server connection URL
  - Format: `redis://host:port`
  - Example: `redis://localhost:6379`
  - Used for caching and BullMQ job queues

### Authentication

**Note**: This project uses **custom email-code authentication**, not NextAuth. The `NEXTAUTH_*` variables in `.env.example` are legacy references and can be removed or replaced.

- `NEXTAUTH_URL` (legacy, can rename to `APP_URL`): Base URL of the application
  - Example: `http://localhost:3000`
  - Used for OAuth callbacks and email links

- `NEXTAUTH_SECRET` (legacy, can rename to `JWT_SECRET`): Secret key for JWT token signing
  - Generate with: `openssl rand -base64 32`
  - Must be kept secure and consistent across deployments

### Security & Encryption

- `ENCRYPTION_KEY`: 64-character hex string for AES-256 encryption
  - Format: 64 hexadecimal characters (32 bytes)
  - Generate with: `openssl rand -hex 32`
  - Used for encrypting sensitive data like OAuth refresh tokens in the database

### Email Service (AWS SES)

The authentication system sends verification codes via AWS SES:

- `AWS_REGION`: AWS region for SES (e.g., `us-east-1`)
- `AWS_ACCESS_KEY_ID`: AWS access key with SES send permissions
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key
- `EMAIL_FROM`: Sender email address (must be verified in SES)

### OAuth Configurations

#### Google Ads API

Google Ads requires separate credentials per MCC (Manager) account:

**Garage Door Marketers MCC:**
```bash
GOOGLE_ADS_DEVELOPER_TOKEN_GARAGE_DOOR=u2lyH67_WGfdQ-3cONtClw
GOOGLE_ADS_CLIENT_ID_GARAGE_DOOR=your-id.apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET_GARAGE_DOOR=your-secret
GOOGLE_ADS_REFRESH_TOKEN_GARAGE_DOOR=your-refresh-token
GOOGLE_ADS_LOGIN_CUSTOMER_ID_GARAGE_DOOR=123-456-7890
```

**Paving Marketers MCC:**
```bash
GOOGLE_ADS_DEVELOPER_TOKEN_PAVING=your-token
GOOGLE_ADS_CLIENT_ID_PAVING=your-id.apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET_PAVING=your-secret
GOOGLE_ADS_REFRESH_TOKEN_PAVING=your-refresh-token
GOOGLE_ADS_LOGIN_CUSTOMER_ID_PAVING=123-456-7890
```

**Heaviside MCC:**
```bash
GOOGLE_ADS_DEVELOPER_TOKEN_HEAVISIDE=your-token
GOOGLE_ADS_CLIENT_ID_HEAVISIDE=your-id.apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET_HEAVISIDE=your-secret
GOOGLE_ADS_REFRESH_TOKEN_HEAVISIDE=your-refresh-token
GOOGLE_ADS_LOGIN_CUSTOMER_ID_HEAVISIDE=123-456-7890
```

See [docs/google-ads-api.md](./docs/google-ads-api.md) for setup instructions.

#### Meta (Facebook) Ads

**Note**: `.env.example` includes Meta variables but the worker app (`apps/worker/requirements.txt`) does not include a Meta/Facebook Ads SDK. Meta integration may be planned but not yet implemented.

```bash
META_APP_ID=your-app-id
META_APP_SECRET=your-app-secret
```

## Optional Configuration

### Authentication Customization

The email-code auth system can be configured in `apps/web/src/lib/auth/config.ts`:

- `allowedEmailDomain`: Restrict auth to specific email domain
- `authCodeTtlSeconds`: Verification code expiration (default: 600 = 10 minutes)
- `jwtExpiryHours`: Session token expiration (default: 720 = 30 days)

### Python Worker Configuration

Additional variables for the Python worker service:

- `ENVIRONMENT`: `development`, `staging`, or `production`
- `DEBUG`: Set to `true` for verbose logging
- `LOG_LEVEL`: Logging level (default: `INFO`)

## Setup Instructions

### 1. Copy Example File

```bash
cp .env.example .env
```

### 2. Generate Secrets

```bash
# JWT Secret (32 bytes, base64)
openssl rand -base64 32

# Encryption Key (32 bytes, hex = 64 characters)
openssl rand -hex 32
```

### 3. Configure Database

For local development with Docker Compose, the default values in `.env.example` work out of the box:

```bash
DATABASE_URL=postgresql://hg_ppc:password@db-vps:6543/hg_ppc
DATABASE_DIRECT_URL=postgresql://hg_ppc:password@db-vps:5432/hg_ppc
```

For production, update with your actual database credentials.

### 4. Configure Redis

```bash
REDIS_URL=redis://localhost:6379
```

For production, update with your Redis instance URL.

### 5. Configure AWS SES

1. Verify your sender email in AWS SES
2. Create IAM user with SES send permissions
3. Add credentials to `.env`:

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
EMAIL_FROM=noreply@yourdomain.com
```

### 6. Configure Google Ads (Optional)

Follow the guide in [docs/google-ads-api.md](./docs/google-ads-api.md) to:

1. Apply for Google Ads API access for each MCC
2. Create OAuth 2.0 credentials in Google Cloud Console
3. Generate refresh tokens
4. Add all credentials to `.env`

## Security Best Practices

1. **Never commit secrets to version control**
   - `.env` files are in `.gitignore`
   - Use `.env.example` as a template only

2. **Use strong, unique secrets for each environment**
   - Different secrets for development, staging, production
   - Rotate secrets periodically

3. **Restrict access to `.env` files**
   ```bash
   chmod 600 .env
   ```

4. **Use environment-specific configurations**
   - Different database credentials per environment
   - Use secret management services in production (AWS Secrets Manager, etc.)

5. **Encrypt sensitive data at rest**
   - The `ENCRYPTION_KEY` is used to encrypt OAuth tokens in the database
   - Keep this key secure and backed up

## Troubleshooting

### Database Connection Issues

- Ensure PostgreSQL is running: `docker-compose ps db`
- Check connection string format matches your setup
- Verify port is not blocked: `telnet localhost 5432`

### Redis Connection Issues

- Ensure Redis is running: `docker-compose ps redis`
- Test connection: `redis-cli ping`

### AWS SES Email Issues

- Verify sender email in SES console
- Check SES is out of sandbox mode for production
- Verify IAM permissions include `ses:SendEmail`

### Google Ads API Issues

- Check developer token status in Google Ads API Center
- Verify OAuth refresh token is not expired
- Ensure MCC account has API access approved

## Environment Variables Reference

See `.env.example` for a complete template with all variables and example values.
