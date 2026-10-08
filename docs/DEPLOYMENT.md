# CIGgiECIG Deployment Guide

## Production Checklist

- [ ] Verify hosting provider accepts tobacco/vape commerce
- [ ] Set ADMIN_PASS to a strong password
- [ ] Configure payment processor (CyberSource, Authorize.Net, NMI)
- [ ] Set up ID verification vendor (Persona, Veriff, AgeChecker.Net)
- [ ] Migrate database to PostgreSQL for production
- [ ] Enable HTTPS and configure security headers
- [ ] Set up rate limiting and DDoS protection
- [ ] Configure audit logging for compliance
- [ ] Test all payment flows with sandbox credentials
- [ ] Verify age-gating works correctly
- [ ] Set up monitoring and alerting

## Environment Variables (Production)

```bash
# Server
NODE_ENV=production
PORT=3000

# Admin
ADMIN_PASS='your-secure-password-here'

# Shipping
SHIP_STATES=WA,OR,CA
LOCAL_ZIPS=99201,99202,99203,99204,99208
STORE_ADDR='Your Business Address, Spokane, WA'
CARRIER='Regional Carrier Inc'
LOCAL_FEE=800
TAX_RATE=0.1065

# Payment (CyberSource)
PAY_PROVIDER=cybersource
CYBS_ACCESS_KEY=your_access_key
CYBS_PROFILE_ID=your_profile_id
CYBS_SECRET_KEY=your_secret_key

# Age Verification (Persona)
AGE_PROVIDER=persona
PERSONA_API_KEY=your_api_key
PERSONA_TEMPLATE_ID=itmpl_xxxxx
PERSONA_WEBHOOK_SECRET=your_webhook_secret

# Database
DATABASE_URL=postgresql://user:password@host/ciggiecig
```

## Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

Build and run:

```bash
docker build -t ciggiecig .
docker run -e ADMIN_PASS='...' -e CYBS_SECRET_KEY='...' -p 3000:3000 ciggiecig
```

## Heroku Deployment

1. Create Procfile:
   ```
   web: node server.js
   ```

2. Push to Heroku:
   ```bash
   heroku create ciggiecig
   heroku config:set ADMIN_PASS='...'
   heroku config:set CYBS_SECRET_KEY='...'
   git push heroku main
   ```

## Security Headers

Add to your reverse proxy (nginx, Cloudflare):

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'
```

## Monitoring

- Set up error tracking (Sentry, LogRocket)
- Monitor payment gateway API health
- Track age-verification success rates
- Log all orders and refunds
- Alert on inventory shortages

## Backup & Recovery

```bash
# Daily backup of products.json
cp data/products.json data/products.json.$(date +%Y%m%d).bak

# Daily backup of orders.json
cp data/orders.json data/orders.json.$(date +%Y%m%d).bak
```

## Compliance

- Verify PACT Act compliance for online sales
- Maintain audit logs of all age checks
- Store payment receipts for tax reporting
- Keep FDA order numbers current for all products
- Document shipping restrictions per state
