# Google Ads API Integration

## Overview

Integration with Google Ads API to pull campaign performance data for client reporting and campaign management.

## MCC Access Status

| MCC Account | Developer Token | Access Level | Status | Contact Email |
|-------------|-----------------|--------------|--------|---------------|
| Garage Door Marketers | `u2lyH67_WGfdQ-3cONtClw` | Explorer | Basic Access applied (pending since late Dec 2025) | chris@garagedoormarketers.com |
| Paving Marketers | Not applied | N/A | **TODO: Apply** | TBD |
| Heaviside | Not applied | N/A | **TODO: Apply** | TBD |

## Access Levels

| Level | Description | Limits |
|-------|-------------|--------|
| **Explorer** | Test/development only | Test accounts only, no production data |
| **Basic** | Production access | 15,000 operations/day, 1,000 requests/day |
| **Standard** | Full production | 100,000+ operations/day |

## How to Apply for API Access

1. Sign into the MCC account at https://ads.google.com
2. Go to **Tools & Settings** (wrench icon) → **API Center**
3. Or direct URL: https://ads.google.com/aw/apicenter
4. Click **Apply for access** or **Apply for Basic Access**
5. Fill in company details:
   - API contact email
   - Company name
   - Company URL
   - Company type: Agency/SEM
   - Intended use: "View account information within our own private application, make edits to campaigns..."
   - Principal place of business: United States

## Environment Variables

Once approved, add to `.env.local`:

```bash
# Google Ads API - Garage Door Marketers MCC
GOOGLE_ADS_DEVELOPER_TOKEN_GARAGE_DOOR=u2lyH67_WGfdQ-3cONtClw
GOOGLE_ADS_CLIENT_ID_GARAGE_DOOR=
GOOGLE_ADS_CLIENT_SECRET_GARAGE_DOOR=
GOOGLE_ADS_REFRESH_TOKEN_GARAGE_DOOR=
GOOGLE_ADS_LOGIN_CUSTOMER_ID_GARAGE_DOOR=

# Google Ads API - Paving Marketers MCC
GOOGLE_ADS_DEVELOPER_TOKEN_PAVING=
GOOGLE_ADS_CLIENT_ID_PAVING=
GOOGLE_ADS_CLIENT_SECRET_PAVING=
GOOGLE_ADS_REFRESH_TOKEN_PAVING=
GOOGLE_ADS_LOGIN_CUSTOMER_ID_PAVING=

# Google Ads API - Heaviside MCC
GOOGLE_ADS_DEVELOPER_TOKEN_HEAVISIDE=
GOOGLE_ADS_CLIENT_ID_HEAVISIDE=
GOOGLE_ADS_CLIENT_SECRET_HEAVISIDE=
GOOGLE_ADS_REFRESH_TOKEN_HEAVISIDE=
GOOGLE_ADS_LOGIN_CUSTOMER_ID_HEAVISIDE=
```

## OAuth Setup (Required for Each MCC)

In addition to the developer token, you need OAuth credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project for each MCC
3. Enable the **Google Ads API**
4. Create OAuth 2.0 credentials (Web application type)
5. Generate refresh token using the OAuth playground or a setup script

## Planned Features

- [ ] Campaign performance dashboard
- [ ] Automated client reporting
- [ ] Campaign status monitoring
- [ ] Budget alerts
- [ ] Lead/conversion tracking sync

## Troubleshooting: Stuck Basic Access Application

If Basic Access application has been pending for more than 5 business days:

1. **Check email** for requests for additional information
2. **Re-apply** - Click "Apply for Basic Access" again
3. **Contact Support**:
   - https://support.google.com/google-ads/gethelp
   - Google Ads API Forum: https://groups.google.com/g/adwords-api
4. **Call Google Ads support** - They can sometimes escalate API issues

## Resources

- [Google Ads API Documentation](https://developers.google.com/google-ads/api/docs/start)
- [Node.js Client Library](https://github.com/Opteo/google-ads-api)
- [API Center](https://ads.google.com/aw/apicenter)
