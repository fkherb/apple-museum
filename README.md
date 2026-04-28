# Apple Product Museum Site v5

Open `index.html` in Safari or Chrome.

Pages:
- `index.html` — landing page and category overview
- `timeline.html` — major Apple/company timeline
- `families.html` — category → family → subfamily → product drill-down
- `catalog.html` — full searchable/filterable catalog

This version keeps categories separate:
- Desktop
- All-in-One
- Laptop
- Mobile
- Wearable
- Home & Networking

Data lives in `data.js`, layout/interactions in `app.js`, and design in `styles.css`.

Updates in this build:
- Product data regenerated from the latest Apple Master Sheet V5.
- Specs marked `N/A` are hidden from product detail views.
- Specs marked `None` remain visible.
- Subfamily cards use the most recent product image from that subfamily.
- Product colors render as hoverable color swatches instead of long text lists.
- Image links are used for images only; only Apple Support and Tech Spec links display as buttons.
