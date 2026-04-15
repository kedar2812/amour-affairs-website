with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the testimonials swiper start and end line numbers
swiper_start_line = None
section_end_line = None

for i, line in enumerate(lines):
    if '<div class="swiper">' in line and swiper_start_line is None:
        # Make sure this is inside testimonials section (check recent context)
        context = ''.join(lines[max(0,i-20):i])
        if 'testimonials' in context:
            swiper_start_line = i
    if swiper_start_line and '</section>' in line and i > swiper_start_line + 5:
        section_end_line = i
        break

print(f"swiper_start_line: {swiper_start_line}")
print(f"section_end_line:  {section_end_line}")

if swiper_start_line is not None and section_end_line is not None:
    new_block = '''        <div class="swiper" id="testimonialSwiper">
          <div class="swiper-wrapper">

            <!-- Testimonial 1 -->
            <div class="swiper-slide">
              <div class="testimonial">
                <img class="testimonial__avatar" src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=200&h=200&q=80&auto=format&fit=crop&crop=face" alt="Vinita" loading="lazy">
                <span class="testimonial__quote-mark">&#8220;</span>
                <p class="testimonial__text">Amour Affairs captured our wedding day beautifully. Every candid moment, every stolen glance, every tear of joy &#8212; they didn&#8217;t miss a single beat. The photos feel like a film, and we relive our special day every time we open the album. Truly exceptional artists who understand emotion.</p>
                <div class="testimonial__meta">
                  <div class="testimonial__divider"></div>
                  <div class="testimonial__author">Vinita &amp; Rahul</div>
                  <div class="testimonial__event">Executive Producer, Pyramid Pune &middot; 2023</div>
                </div>
              </div>
            </div>

            <!-- Testimonial 2 -->
            <div class="swiper-slide">
              <div class="testimonial">
                <img class="testimonial__avatar" src="https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&h=200&q=80&auto=format&fit=crop&crop=face" alt="Nikita" loading="lazy">
                <span class="testimonial__quote-mark">&#8220;</span>
                <p class="testimonial__text">We wanted someone who could see the love story behind the wedding, not just photograph the event. Amour Affairs did exactly that &#8212; from our pre-wedding shoot to the final reception, they were invisible yet captured every meaningful moment. Their work is pure, breathing art.</p>
                <div class="testimonial__meta">
                  <div class="testimonial__divider"></div>
                  <div class="testimonial__author">Amol &times; Nikita</div>
                  <div class="testimonial__event">Destination Wedding, Ahmedabad &middot; 2023</div>
                </div>
              </div>
            </div>

            <!-- Testimonial 3 -->
            <div class="swiper-slide">
              <div class="testimonial">
                <img class="testimonial__avatar" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&q=80&auto=format&fit=crop&crop=face" alt="Sahil" loading="lazy">
                <span class="testimonial__quote-mark">&#8220;</span>
                <p class="testimonial__text">I cannot express how grateful we are to the Amour Affairs team. They didn&#8217;t just take photos &#8212; they documented our emotions, our family&#8217;s happiness, our little unplanned moments. Every frame has a story. Our wedding album is our most prized possession.</p>
                <div class="testimonial__meta">
                  <div class="testimonial__divider"></div>
                  <div class="testimonial__author">Priya &amp; Sahil</div>
                  <div class="testimonial__event">Royal Wedding, Pune &middot; 2022</div>
                </div>
              </div>
            </div>

            <!-- Testimonial 4 -->
            <div class="swiper-slide">
              <div class="testimonial">
                <img class="testimonial__avatar" src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=200&q=80&auto=format&fit=crop&crop=face" alt="Meera" loading="lazy">
                <span class="testimonial__quote-mark">&#8220;</span>
                <p class="testimonial__text">Our pre-wedding shoot with Amour Affairs was unlike anything we imagined. The team was so calm, so natural &#8212; they made us forget we were being photographed. That golden-hour couple session? We&#8217;ve printed it on canvas. It lives in our living room forever.</p>
                <div class="testimonial__meta">
                  <div class="testimonial__divider"></div>
                  <div class="testimonial__author">Meera &amp; Arjun</div>
                  <div class="testimonial__event">Pre-Wedding Shoot, Pune &middot; 2024</div>
                </div>
              </div>
            </div>

            <!-- Testimonial 5 -->
            <div class="swiper-slide">
              <div class="testimonial">
                <img class="testimonial__avatar" src="https://images.unsplash.com/photo-1546961342-ea5f62d5a27b?w=200&h=200&q=80&auto=format&fit=crop&crop=face" alt="Sneha" loading="lazy">
                <span class="testimonial__quote-mark">&#8220;</span>
                <p class="testimonial__text">When I first saw the photos from our wedding, I cried. I hadn&#8217;t realised so many beautiful moments had happened around me. Amour Affairs saw everything. The cinematic film they made is something we watch every anniversary. This team is a gift to every couple.</p>
                <div class="testimonial__meta">
                  <div class="testimonial__divider"></div>
                  <div class="testimonial__author">Sneha &amp; Rohan</div>
                  <div class="testimonial__event">Wedding Film + Photography, Mumbai &middot; 2024</div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- Navigation: arrows + pagination -->
        <div class="testimonials__nav">
          <button class="testimonials__arrow" id="testimPrev" aria-label="Previous testimonial">&#8592;</button>
          <div class="swiper-pagination" id="testimPagination"></div>
          <button class="testimonials__arrow" id="testimNext" aria-label="Next testimonial">&#8594;</button>
        </div>
      </div>
    </div>
  </section>
'''

    # Replace from swiper_start_line to section_end_line (inclusive)
    new_lines = lines[:swiper_start_line] + [new_block] + lines[section_end_line+1:]
    
    with open('index.html', 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("SUCCESS: testimonials section replaced")
else:
    print("ERROR: could not find section boundaries")
