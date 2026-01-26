# Environment Configuration

## Required Environment Variables

### Database
- `DATABASE_URL`: Main PostgreSQL database connection string
- `DATABASE_DIRECT_URL`: Direct database connection URL

### Caching
- `REDIS_URL`: Redis server connection URL for caching

### Authentication
- `NEXTAUTH_URL`: Base URL for NextAuth authentication
- `NEXTAUTH_SECRET`: Secret key for NextAuth session encryption

### Security
- `ENCRYPTION_KEY`: 64-character hex string for AES-256 encryption

### OAuth Configurations

#### Google Ads
- `GOOGLE_ADS_DEVELOPER_TOKEN`: Google Ads developer token
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret

#### Meta (Facebook) Ads
- `META_APP_ID`: Meta/Facebook App ID
- `META_APP_SECRET`: Meta/Facebook App Secret

## Configuration Tips

1. Never commit secrets to version control
2. Use `.env.example` as a template
3. Create a local `.env` file for development
4. Use environment-specific configurations

## Setting Up Environment

1. Copy `.env.example` to `.env`
2. Replace placeholders with actual credentials
3. Ensure all required variables are set