/* ============================================================
   LEAD-FORM.JS — Website inquiry form
   Amour Affairs · Premium Wedding Photography

   Validates and submits the home-page contact form to the
   CMS lead pipeline. Mirrors the server's rules so almost
   every error is caught before the request; if the API is
   unreachable the visitor is pointed to WhatsApp instead.
   ============================================================ */

import { submitInquiry } from './api.js';

const WHATSAPP_FALLBACK =
  'We couldn’t send your inquiry right now — please message us directly on ' +
  '<a href="https://wa.me/919921000052" target="_blank" rel="noopener">WhatsApp</a> ' +
  'or call +91 9921000052.';

export function initLeadForm() {
  const form = document.getElementById('inquiryForm');
  if (!form) return;

  const submitBtn = document.getElementById('inquirySubmit');
  const status = document.getElementById('inquiryStatus');
  let isSubmitting = false;

  const fieldEl = (input) => input.closest('.inquiry__field');

  function setFieldError(input, message) {
    const field = fieldEl(input);
    if (!field) return;
    field.classList.toggle('has-error', !!message);
    const errorEl = field.querySelector('.inquiry__field-error');
    if (errorEl) errorEl.textContent = message || '';
  }

  function clearErrors() {
    form.querySelectorAll('.inquiry__field-error').forEach((el) => { el.textContent = ''; });
    form.querySelectorAll('.has-error').forEach((el) => el.classList.remove('has-error'));
    status.textContent = '';
    status.classList.remove('is-error');
  }

  // Mirrors the server-side rules in api/leads.php
  function validate() {
    const name = form.client_name.value.trim();
    const phone = form.phone.value.trim();
    const email = form.email.value.trim();
    let firstInvalid = null;

    const fail = (input, message) => {
      setFieldError(input, message);
      if (!firstInvalid) firstInvalid = input;
    };

    if (name.length < 2) {
      fail(form.client_name, 'Please enter your name');
    }
    if (!phone && !email) {
      fail(form.phone, 'A phone number or email is required');
    }
    if (phone && !/^[0-9+\-\s().]{7,20}$/.test(phone)) {
      fail(form.phone, 'Please enter a valid phone number');
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      fail(form.email, 'Please enter a valid email address');
    }
    if (form.message.value.length > 2000) {
      fail(form.message, 'Message is too long (2000 characters max)');
    }

    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  }

  function showSuccess() {
    form.innerHTML = `
      <div class="inquiry__success">
        <span class="inquiry__success-title">Thank you — we received your inquiry.</span>
        <p class="inquiry__success-text">
          Our team will get back to you within 24 hours. Can’t wait?
          Reach us anytime on <a class="inquiry__contact-link" href="https://wa.me/919921000052"
          target="_blank" rel="noopener">WhatsApp</a>.
        </p>
      </div>
    `;
  }

  // Clear a field's error as soon as the visitor edits it
  form.querySelectorAll('.inquiry__input').forEach((input) => {
    input.addEventListener('input', () => setFieldError(input, ''));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    clearErrors();
    if (!validate()) return;

    isSubmitting = true;
    submitBtn.disabled = true;
    const originalLabel = submitBtn.innerHTML;
    submitBtn.textContent = 'Sending…';

    const result = await submitInquiry({
      client_name: form.client_name.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      event_type: form.event_type.value,
      event_date: form.event_date.value,
      message: form.message.value.trim(),
      website: form.website.value, // honeypot — empty for humans
    });

    if (result.ok) {
      showSuccess();
      return;
    }

    isSubmitting = false;
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalLabel;
    status.classList.add('is-error');
    if (result.error) {
      status.textContent = result.error; // server validation message
    } else {
      status.innerHTML = WHATSAPP_FALLBACK; // API unreachable
    }
  });
}
