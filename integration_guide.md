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
   - Choose the `api/database.sql` file and run it to construct the 14 CMS tables.

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

### 4. Dynamic Lead Intake Form
To capture new client inquiries directly into Kedar's dashboard dashboard instantly:

**Your HTML Form:**
```html
<form id="contact-inquiry-form">
    <input type="text" name="name" required placeholder="Your Name" />
    <input type="email" name="email" required placeholder="Your Email" />
    <input type="tel" name="phone" required placeholder="Your Phone Number" />
    <select name="event_type">
        <option value="Wedding">Wedding</option>
        <option value="Pre-Wedding">Pre-Wedding</option>
        <option value="Corporate">Corporate</option>
    </select>
    <textarea name="notes" placeholder="Tell us about your event..."></textarea>
    <button type="submit">Send Message</button>
</form>
```

**Your JavaScript Submission Handler:**
```javascript
document.getElementById('contact-inquiry-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const payload = {
        client_name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        event_type: formData.get('event_type'),
        notes: [{ content: formData.get('notes'), author: 'System' }]
    };

    try {
        const response = await fetch('https://amouraffairs.in/api/leads.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert("Thank you! Your inquiry was sent successfully.");
            e.target.reset();
        } else {
            alert("Oops! There was an issue submitting your inquiry. Please try again.");
        }
    } catch (error) {
        console.error("Submission Error:", error);
    }
});
```

---

## 🛡️ Production Security Checklist
- [ ] **Delete Seeder**: Verify that `api/seed.php` is deleted from the server.
- [ ] **HTTPS Enforced**: Force all requests to HTTPS inside the domain's cPanel zone settings (or via cPanel Redirects).
- [ ] **Config Protection**: Check that visiting `https://amouraffairs.in/api/config.php` or `/api/database.sql` returns a **403 Forbidden** (protected by `.htaccess`).
- [ ] **JWT Key Strength**: Verify `JWT_SECRET` is complex and has at least 64 random characters.
