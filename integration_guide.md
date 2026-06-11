# Amour Affairs — Website & Dashboard Integration Guide

This guide details exactly how to deploy the secure backend system, connect it to the **Next.js Dashboard**, and dynamically wire up the **Vite Website** when you are ready to launch.

---

## 🛠️ Step 1: Backend & Database Deployment (cPanel)

### 1. Database Setup
1. Log in to your cPanel hosting control panel.
2. Open **MySQL Database Wizard**:
   - Create a database named `amouraffairs_db` (or similar).
   - Create a database user (e.g. `amour_admin`) with a strong generated password.
   - Assign the user to the database with **ALL PRIVILEGES**.
3. Open **phpMyAdmin**:
   - Select your new database.
   - Click the **Import** tab.
   - Choose the `api/database.sql` file and run it to construct the 16 CMS tables.

### 2. Configure PHP API Constants
Open your live `api/config.php` file and configure the production details:
```php
// Database Credentials
define('DB_HOST', 'localhost');
define('DB_NAME', 'your_cpanel_db_name');
define('DB_USER', 'your_cpanel_db_user');
define('DB_PASS', 'your_secure_db_password');

// JWT Secret Key (Crucial: Generate a 64+ char secure random key)
define('JWT_SECRET', 'your_random_generated_highly_secure_secret_key_64_characters');

// Whitelisted origins for CORS (Prevents unauthorized external websites from hitting your API)
define('ALLOWED_ORIGINS', [
    'https://amouraffairs.in',
    'https://www.amouraffairs.in',
    'https://dashboard.amouraffairs.in', // If hosted on a subdomain
]);
```

### 3. Run the Database Seeder
1. Point your browser to `https://amouraffairs.in/api/seed.php`.
2. This initializes:
   - Super Admin: `info@amouraffairs.in` / Password: `admin_password_here` (Change in seed.php prior to run)
   - Test User: `test@test.in` / Password: `test123`
3. ⚠️ **IMPORTANT SECURITY STEP**: Delete the file `api/seed.php` immediately after seeding or uncomment the file matching rules in `api/.htaccess` to block any future execution.

---

## 🚀 Step 2: Next.js Dashboard Build & Sync
1. In `amour-affairs-dashboard/.env.local`, update your API URL to point to your live site:
   ```env
   NEXT_PUBLIC_API_URL=https://amouraffairs.in/api
   ```
2. Build the production application bundle:
   ```bash
   npm run build
   ```
3. Deploy the resulting build outputs directly to your cPanel hosting folder. Recommended path: `public_html/dashboard` or on a subdomain `dashboard.amouraffairs.in`.

---

## 🌐 Step 3: Wiring the Vite Website to the API

This is exactly how to connect the website's sections dynamically to show content uploaded from the dashboard.

### 1. Unified API Fetcher Script
Create a centralized file on your Vite website (e.g. `src/js/api.js`) to handle server queries:

```javascript
// src/js/api.js
const API_BASE_URL = 'https://amouraffairs.in/api';

export async function fetchFromAPI(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("API Fetch Error:", error);
        return null;
    }
}
```

---

### 2. Dynamic Gallery Rendering
To load gallery images uploaded from Kedar's dashboard into the website's gallery page:

**Your HTML Target:**
```html
<div id="wedding-gallery-grid" class="gallery-grid">
    <!-- Dynamic WebP images will inject here -->
</div>
```

**Your JavaScript Execution:**
```javascript
import { fetchFromAPI } from './api.js';

async function loadGallery() {
    const galleryGrid = document.getElementById('wedding-gallery-grid');
    if (!galleryGrid) return;

    // Fetch active gallery images from API
    const data = await fetchFromAPI('gallery.php?all=1');
    if (!data || !data.images) return;

    // Build the grid items dynamically
    galleryGrid.innerHTML = data.images.map(image => `
        <div class="gallery-item" data-category="${image.category}">
            <img 
              src="https://amouraffairs.in/api/${image.image_path}" 
              alt="${image.title || 'Wedding Photography'}" 
              loading="lazy"
              class="gallery-image"
            />
            <div class="gallery-overlay">
                <h4>${image.title || ''}</h4>
                <p>${image.category}</p>
            </div>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', loadGallery);
```

---

### 3. Dynamic Testimonials Slider
To show real customer reviews on the website's home page testimonials section:

**Your HTML Target:**
```html
<div id="testimonials-slider" class="swiper-wrapper">
    <!-- Testimonial slides will inject here -->
</div>
```

**Your JavaScript Execution:**
```javascript
import { fetchFromAPI } from './api.js';

async function loadTestimonials() {
    const sliderContainer = document.getElementById('testimonials-slider');
    if (!sliderContainer) return;

    // Fetch only featured testimonials
    const data = await fetchFromAPI('testimonials.php?featured=1');
    if (!data || !data.testimonials) return;

    sliderContainer.innerHTML = data.testimonials.map(item => `
        <div class="swiper-slide testimonial-card">
            <p class="review-text">"${item.content}"</p>
            <div class="reviewer-info">
                <h5>${item.client_name}</h5>
                <span class="review-tag">${item.event_type}</span>
            </div>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', loadTestimonials);
```

---

### 4. Lead Intake Form (already built in)
The home page ships with an inquiry form (`#contact` section, `src/js/lead-form.js`)
that posts to the **public** endpoint `POST /api/leads.php?action=inquiry`.
No wiring needed at launch — it works as soon as the API is deployed.

Endpoint protections (server-side, in `api/leads.php`):
- Rate limited: 5 inquiries per 10 minutes per IP (HTTP 429 beyond that)
- Honeypot field `website` — bot submissions get a fake success and are discarded
- Validation: name 2–200 chars, phone **or** email required (both format-checked),
  message ≤ 2000 chars, `event_type` whitelisted, `event_date` must be `YYYY-MM-DD`
- `source` = Website / `stage` = New Inquiry are forced server-side; client
  overrides are ignored, and the response never exposes the full lead record

Submissions appear instantly in the dashboard's **Leads** pipeline with the
message attached as a "Website Form" note. If the API is unreachable, the form
shows a WhatsApp fallback link instead of failing silently.

---

## 💻 Local Development Stack (Windows)

The full CMS stack can run locally for testing (PHP 8.3 + MariaDB installed via winget):

```powershell
# 1. Start MariaDB (data dir created once with mariadb-install-db.exe)
& "C:\Program Files\MariaDB 12.3\bin\mariadbd.exe" --datadir="$env:TEMP\amour_mariadb_data" --console

# 2. Serve the API + uploads from the repo root
php -S localhost:8080 -t "F:\projects kedar\amour affairs final website"

# 3. Website dev server (reads .env.development → VITE_API_URL=http://localhost:8080/api)
npm run dev

# 4. Dashboard dev server (.env.local already points at localhost:8080)
cd amour-affairs-dashboard; npm run dev
```

Automated checks:
- `scripts\test-phase1-api.ps1` — end-to-end API tests (auth, albums, films, uploads, cleanup)
- `node scripts\test-phase2-wiring.mjs` — website fetch-mapper tests incl. fallback behaviour

The website's fallback rule: every CMS-driven section keeps its bundled stock content
whenever the API is unreachable **or has no usable content yet** — the site can never
render empty because of the CMS.

---

## 🛡️ Production Security Checklist
- [ ] **Delete Seeder**: Verify that `api/seed.php` is deleted from the server.
- [ ] **HTTPS Enforced**: Force all requests to HTTPS inside the domain's cPanel zone settings (or via cPanel Redirects).
- [ ] **Config Protection**: Check that visiting `https://amouraffairs.in/api/config.php` or `/api/database.sql` returns a **403 Forbidden** (protected by `.htaccess`).
- [ ] **JWT Key Strength**: Verify `JWT_SECRET` is complex and has at least 64 random characters.
