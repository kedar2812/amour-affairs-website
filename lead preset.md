# Amour Affairs — WhatsApp Lead Communication Presets

> **Document Purpose:** Automated & semi-automated WhatsApp messaging templates for Amour Affairs lead management workflow.  
> **Prepared For:** Amour Affairs CRM & WhatsApp API Integration  
> **Author / Contact:** Taher Husain (Founder & Director, Amour Affairs)  
> **Formatting Note:** Text enclosed between `**` is rendered as **bold** in Markdown. For direct WhatsApp API or WhatsApp Web copy-pasting, native WhatsApp bold formatting (`*text*`) is also highlighted.

---

## Workflow Overview & Stage Mapping

These presets correspond directly to the **Three-Stage Lead Communication Funnel** inside the CRM:

| Stage | Trigger Event | Primary Objective | Preset Name |
| :--- | :--- | :--- | :--- |
| **Stage 1** | New Lead / Inquiry Received | Warm welcome, brand introduction, and trust-building | *Initial Inquiry & Welcome* |
| **Stage 2** | Pending Booking / Follow-up | Date-hold check, urgency nudge via concurrent inquiries | *Date Hold & Booking Follow-up* |
| **Stage 3** | Closed Lost / Client Decided Otherwise | Graceful closure, maintaining goodwill & future relationship | *Warm Closure & Goodwill* |

---

## Preset 1: Stage 1 — Initial Inquiry & Welcome

### Markdown Formatted View

**Thank you for contacting Amour Affairs!**

We are overjoyed to connect with you. Since 2011, we have been weaving the love stories of more than 1000+ happy, delighted couples across the world into timeless memories. As one of the Premier Wedding Photography and Videography company, our clients become part of our cherished “Amour Family.”

Your journey with us begins now, and we're thrilled you reached out with your requirements. We will get back to you shortly to discuss how we can bring your vision to life with our exceptional services. We are excited to craft unforgettable moments for you.

Stay connected with us on Instagram: **https://www.instagram.com/amouraffairs/**

Join our WhatsApp community for updates and inspiration: **https://whatsapp.com/channel/0029VahBNDi8V0tjZIKaup3n**

Book an Appointment: **https://maps.app.goo.gl/8dvPLftiPk4qtZHx7?g_st=ia**

Team Amour Affairs

---

### WhatsApp Copy-Paste Ready Text (with WhatsApp `*bold*` syntax)

```text
*Thank you for contacting Amour Affairs!*

We are overjoyed to connect with you. Since 2011, we have been weaving the love stories of more than 1000+ happy, delighted couples across the world into timeless memories. As one of the Premier Wedding Photography and Videography company, our clients become part of our cherished “Amour Family.”

Your journey with us begins now, and we're thrilled you reached out with your requirements. We will get back to you shortly to discuss how we can bring your vision to life with our exceptional services. We are excited to craft unforgettable moments for you.

Stay connected with us on Instagram: *https://www.instagram.com/amouraffairs/*

Join our WhatsApp community for updates and inspiration: *https://whatsapp.com/channel/0029VahBNDi8V0tjZIKaup3n*

Book an Appointment: *https://maps.app.goo.gl/8dvPLftiPk4qtZHx7?g_st=ia*

Team Amour Affairs
```

---

## Preset 2: Stage 2 — Date Hold & Booking Follow-up

### Markdown Formatted View

Hello 

I hope this message finds you well. As per our last conversation, we’ve been holding your dates with the hope of being part of your special day. We know how important this time is for you, and we would be honored to capture your story.

However, we’ve recently received a few inquiries for the same dates. We genuinely don’t want to miss the opportunity to work with you, so I wanted to kindly ask if you’ve made a decision. If you’re still considering us, we would love to block the dates and begin planning together.

Please let us know at your earliest convenience, so we can plan accordingly. Your wedding deserves the very best, and we’re eager to make that happen for you!

Looking forward to hearing from you.

Warm regards,  
Taher Husain  
Director, Amouraffairs

---

### WhatsApp Copy-Paste Ready Text

```text
Hello 

I hope this message finds you well. As per our last conversation, we’ve been holding your dates with the hope of being part of your special day. We know how important this time is for you, and we would be honored to capture your story.

However, we’ve recently received a few inquiries for the same dates. We genuinely don’t want to miss the opportunity to work with you, so I wanted to kindly ask if you’ve made a decision. If you’re still considering us, we would love to block the dates and begin planning together.

Please let us know at your earliest convenience, so we can plan accordingly. Your wedding deserves the very best, and we’re eager to make that happen for you!

Looking forward to hearing from you.

Warm regards,
Taher Husain
Director, Amouraffairs
```

---

## Preset 3: Stage 3 — Post-Decision Warm Closure & Goodwill

### Markdown Formatted View

Hello, we have noticed that you’ve decided to go in a different direction for your wedding photography and videography, and while we’re a bit saddened not to be part of your special day, we genuinely wish you nothing but the best.

Your wedding is a beautiful celebration of love, and we hope it turns out to be everything you dreamed of and more. Should you ever need us in the future or want to capture other milestones in your life, please know that our doors are always open.

Wishing you an unforgettable wedding day and a lifetime filled with happiness, love, and cherished memories.

And do follow us - www.instagram.com/amouraffairs

With warmest wishes,  
Taher Husain  
Founder, Amouraffairs

---

### WhatsApp Copy-Paste Ready Text

```text
Hello, we have noticed that you’ve decided to go in a different direction for your wedding photography and videography, and while we’re a bit saddened not to be part of your special day, we genuinely wish you nothing but the best.

Your wedding is a beautiful celebration of love, and we hope it turns out to be everything you dreamed of and more. Should you ever need us in the future or want to capture other milestones in your life, please know that our doors are always open.

Wishing you an unforgettable wedding day and a lifetime filled with happiness, love, and cherished memories.

And do follow us - www.instagram.com/amouraffairs

With warmest wishes,
Taher Husain
Founder, Amouraffairs
```

---

## Integration Notes for CRM Developers

1. **Dynamic Placeholder Support (Optional Enhancement):**
   * While the presets are designed to work as static text, you can optionally prepend client personalization such as `Hello {{Bride_Name}} & {{Groom_Name}},` if supported by the WhatsApp API template parser.
2. **Bold Styling Handling:**
   * In standard Markdown (used in documentation and web panels), bold syntax is `**text**`.
   * In WhatsApp messaging API payloads, bold syntax is `*text*`. Both versions have been provided above for seamless integration.
