# Deployment Guide — Sentra AI (sentra-main)

_Architected and built by Drferdi — Sentra Healthcare Solutions © 2025–2026_

---

## Environments

| Environment              | URL                   | How to reach                     |
| ------------------------ | --------------------- | -------------------------------- |
| Local dev                | http://localhost:3000 | `npm run dev`                    |
| Local production preview | http://localhost:3000 | `npm run build && npm run start` |
| Production               | https://sentrahai.com | Deployed via Railway             |

---

## Deployment Platform — Railway

The application is deployed on [Railway](https://railway.app/) using automatic
Node.js detection. Railway runs `npm run build` to produce the Next.js bundle
and `npm run start` to launch the production server.

### Configuration

There is no `railway.toml` in this project — Railway auto-detects Next.js and
configures the build and start commands automatically.

If manual override is needed, create `railway.toml`:

```toml
[build]
buildCommand = "npm run build"

[deploy]
startCommand = "npm run start"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

### Environment Variables on Railway

This site requires no environment variables in production. Set the following
only if adding integrations:

```
NODE_ENV=production       # Set automatically by Railway
```

---

## Deployment Steps

### Standard deploy (push to main)

```bash
# Ensure clean build locally first
npm run build

# Push — Railway deploys automatically on push to main
git push origin main
```

### Manual deploy via Railway CLI

```bash
# Install CLI (once)
npm install -g @railway/cli

# Login
railway login

# Link to project (once)
railway link

# Deploy current branch
railway up

# Tail logs
railway logs
```

---

## Pre-Deploy Checklist

Before every production deployment:

- [ ] `npm run lint` — zero ESLint errors
- [ ] `npm run build` — zero TypeScript errors, build completes successfully
- [ ] All new clinical claims verified by Chief (Dr. Ferdi Iskandar)
- [ ] New articles added to `app/sitemap.ts`
- [ ] `public/llms.txt` updated if products or metrics changed
- [ ] Security headers present — verify with `curl -I https://sentrahai.com`

---

## Rollback

```bash
# Via Railway CLI
railway rollback

# Via Railway dashboard
# Deployments → select previous deployment → Redeploy
```

---

## Domain Configuration

- Production domain: `sentrahai.com`
- DNS: configured in Railway project settings → Custom Domains
- SSL: automatically provisioned by Railway (Let's Encrypt)
- HSTS with `preload` is active — ensure DNS is stable before enabling preload
  in browser lists

---

## Post-Deploy Verification

After each deploy, verify:

```bash
# Security headers
curl -I https://sentrahai.com | grep -iE "x-frame|content-security|strict-transport|x-content-type"

# Sitemap
curl https://sentrahai.com/sitemap.xml | head -30

# Robots
curl https://sentrahai.com/robots.txt

# LLMs.txt
curl https://sentrahai.com/llms.txt
```

---

_Architected and built by Drferdi — Sentra Healthcare Solutions © 2025–2026_
