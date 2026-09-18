# Sanity + Netlify On-Demand ISR Webhook (Ops)

With Next.js App Router On-Demand Incremental Static Regeneration (ISR), content updates go live in **<1 second** with **0 Netlify build minutes**.

## Webhook Setup:

1. Go to **[sanity.io/manage](https://sanity.io/manage)** → select your project (`rotaractblreast`).
2. Go to **API** → **Webhooks** → **Create Webhook**.
3. Fill in:
   - **Name:** `Live Website On-Demand ISR`
   - **URL:** `https://rotaractblreast.org/api/revalidate/`
   - **Dataset:** `production`
   - **Trigger on:** Check **Create**, **Update**, **Delete**
   - **Filter:** `!(_type match "sanity.*")`
   - **Projection:**
     ```groq
     {
       _type,
       "slug": slug.current
     }
     ```
   - **Drafts:** Unchecked
   - **Secret:** Enter your secret key (and add `SANITY_REVALIDATE_SECRET` in Netlify Environment Variables).
4. Save the webhook.
5. **Delete or disable any old Netlify build hooks** pointing to `api.netlify.com/build_hooks/...`.

Editors never need GitHub — only a Sanity invite + Google login. Edits update live pages instantaneously without triggering CI builds.
