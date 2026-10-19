import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { HomeSection } from '#shared/types/cms'
import type { FaqItem, ProviderSummary, ServiceCategory, Testimonial } from '#shared/types/marketplace'
import { emptyHomeSection } from '~/utils/homeLayout'
import TestimonialSlider from './TestimonialSlider.vue'
import FaqAccordion from './FaqAccordion.vue'
import HowItWorksSteps from './HowItWorksSteps.vue'
import WhyChooseUs from './WhyChooseUs.vue'
import CategoryCarousel from './CategoryCarousel.vue'
import FeaturedProviders from './FeaturedProviders.vue'
import TrustStats from './TrustStats.vue'

const section = (key: string, overrides: Partial<HomeSection> = {}): HomeSection => ({ ...emptyHomeSection(key), ...overrides })

const testimonial = (overrides: Partial<Testimonial> = {}): Testimonial => ({
  id: '1', reviewerName: 'Jane Doe', reviewerRole: null, rating: 5, quoteText: 'Great.', avatarUrl: null, ...overrides,
})

describe('TestimonialSlider', () => {
  it('shows the reviewer initials when there is no photo (it used to render nothing)', async () => {
    const wrapper = await mountSuspended(TestimonialSlider, { props: { section: section('testimonials'), testimonials: [testimonial()] } })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Jane Doe"]').text()).toBe('JD')
  })

  it('shows the photo when there is one', async () => {
    const wrapper = await mountSuspended(TestimonialSlider, { props: { section: section('testimonials'), testimonials: [testimonial({ avatarUrl: 'https://cdn.example.com/a.webp' })] } })

    expect(wrapper.find('img').attributes('alt')).toBe('Jane Doe')
  })

  it('uses the admin heading, else the built-in one', async () => {
    const custom = await mountSuspended(TestimonialSlider, { props: { section: section('testimonials', { heading: 'Kind words', eyebrow: 'Reviews' }), testimonials: [testimonial()] } })
    const builtIn = await mountSuspended(TestimonialSlider, { props: { section: section('testimonials'), testimonials: [testimonial()] } })

    expect(custom.find('h2').text()).toBe('Kind words')
    expect(custom.text()).toContain('Reviews')
    expect(builtIn.find('h2').text()).toBe('What customers are saying')
  })

  it('renders nothing without testimonials', async () => {
    const wrapper = await mountSuspended(TestimonialSlider, { props: { section: section('testimonials'), testimonials: [] } })

    expect(wrapper.find('section').exists()).toBe(false)
  })
})

describe('FaqAccordion', () => {
  const items: FaqItem[] = [{ id: '1', question: 'How?', answer: 'Like this.' }]

  it('uses the admin heading and subheading, else the built-in ones', async () => {
    const custom = await mountSuspended(FaqAccordion, { props: { section: section('faq', { heading: 'Ask away', subheading: 'We reply fast' }), items } })
    const builtIn = await mountSuspended(FaqAccordion, { props: { section: section('faq'), items } })

    expect(custom.find('h2').text()).toBe('Ask away')
    expect(custom.text()).toContain('We reply fast')
    expect(builtIn.find('h2').text()).toBe('Frequently asked questions')
  })

  it('shows the section button only with both a label and a link', async () => {
    const full = await mountSuspended(FaqAccordion, { props: { section: section('faq', { ctaLabel: 'Contact us', ctaUrl: '/contact' }), items } })
    const noLabel = await mountSuspended(FaqAccordion, { props: { section: section('faq', { ctaUrl: '/contact' }), items } })

    expect(full.find('a[href="/contact"]').text()).toBe('Contact us')
    expect(noLabel.find('a').exists()).toBe(false)
  })

  it('carries the admin anchor on the section', async () => {
    const wrapper = await mountSuspended(FaqAccordion, { props: { section: section('faq', { anchor: 'faq' }), items } })

    expect(wrapper.find('section#faq').exists()).toBe(true)
  })
})

describe('HowItWorksSteps', () => {
  it('keeps the how-it-works anchor header and footer links point at, even with no admin anchor', async () => {
    const wrapper = await mountSuspended(HowItWorksSteps, { props: { section: section('how_it_works', { anchor: null }) } })

    expect(wrapper.find('section#how-it-works').exists()).toBe(true)
  })

  it('follows an anchor the admin changed', async () => {
    const wrapper = await mountSuspended(HowItWorksSteps, { props: { section: section('how_it_works', { anchor: 'steps' }) } })

    expect(wrapper.find('section#steps').exists()).toBe(true)
    expect(wrapper.find('section#how-it-works').exists()).toBe(false)
  })

  it('shows the built-in steps, then the admin ones once there are some', async () => {
    const builtIn = await mountSuspended(HowItWorksSteps, { props: { section: section('how_it_works') } })
    const custom = await mountSuspended(HowItWorksSteps, {
      props: { section: section('how_it_works', { heading: 'Three easy steps', items: [{ title: 'Ask', subtitle: null, description: 'Say what you need', icon: null, value: null, imageUrl: null, imageAlt: null, secondaryImageUrl: null, linkUrl: null, ctaLabel: null, meta: {} }] }) },
    })

    expect(builtIn.text()).toContain('Tell us what you need')
    expect(custom.find('h2').text()).toBe('Three easy steps')
    expect(custom.text()).toContain('Say what you need')
    expect(custom.text()).not.toContain('Tell us what you need')
  })
})

describe('WhyChooseUs', () => {
  it('uses the section photo, text, banner and button', async () => {
    const wrapper = await mountSuspended(WhyChooseUs, {
      props: {
        section: section('why_choose_us', {
          heading: 'Why we are different',
          body: '<p>We <strong>vet</strong> everyone.</p>',
          imageUrl: 'https://cdn.example.com/team.webp',
          imageAlt: 'Our team',
          settings: { bannerText: 'Money-back guarantee' },
          ctaLabel: 'Learn more',
          ctaUrl: '/about',
        }),
      },
    })

    expect(wrapper.find('h2').text()).toBe('Why we are different')
    expect(wrapper.find('img').attributes('alt')).toBe('Our team')
    expect(wrapper.html()).toContain('<strong>vet</strong>')
    expect(wrapper.text()).toContain('Money-back guarantee')
    expect(wrapper.find('a[href="/about"]').text()).toBe('Learn more')
  })

  it('shows the built-in text, banner and a placeholder when the admin has set nothing', async () => {
    const wrapper = await mountSuspended(WhyChooseUs, { props: { section: section('why_choose_us') } })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('h2').text()).not.toBe('')
    expect(wrapper.find('section#why-choose-us').exists()).toBe(true)
    expect(wrapper.find('a').exists()).toBe(false)
  })
})

describe('CategoryCarousel', () => {
  const categories: ServiceCategory[] = Array.from({ length: 10 }, (_, index) => ({ id: `cat-${index}`, name: `Category ${index}`, icon: 'wrench', providerCount: index }))

  it('shows every category, or only as many as the admin allows', async () => {
    const all = await mountSuspended(CategoryCarousel, { props: { section: section('categories'), categories } })
    const limited = await mountSuspended(CategoryCarousel, { props: { section: section('categories', { settings: { maxItems: 4 } }), categories } })

    expect(all.findAll('a[href^="/category/"]')).toHaveLength(10)
    expect(limited.findAll('a[href^="/category/"]')).toHaveLength(4)
  })

  it('uses the admin heading, and shows the button only with a label and a link', async () => {
    const wrapper = await mountSuspended(CategoryCarousel, { props: { section: section('categories', { heading: 'Pick a trade', ctaLabel: 'See all', ctaUrl: '/browse' }), categories } })
    const bare = await mountSuspended(CategoryCarousel, { props: { section: section('categories', { ctaUrl: '/browse' }), categories } })

    expect(wrapper.find('h2').text()).toBe('Pick a trade')
    expect(wrapper.find('a[href="/browse"]').text()).toBe('See all')
    expect(bare.find('a[href="/browse"]').exists()).toBe(false)
  })
})

describe('TrustStats', () => {
  it('renders nothing without stats and the stats when there are some', async () => {
    const empty = await mountSuspended(TrustStats, { props: { section: section('trust_stats') } })
    const filled = await mountSuspended(TrustStats, {
      props: { section: section('trust_stats', { heading: 'In numbers', items: [{ title: 'Pros', subtitle: null, description: null, icon: 'users', value: '1,200+', imageUrl: null, imageAlt: null, secondaryImageUrl: null, linkUrl: null, ctaLabel: null, meta: {} }] }) },
    })

    expect(empty.find('section').exists()).toBe(false)
    expect(filled.text()).toContain('1,200+')
    expect(filled.text()).toContain('In numbers')
  })
})

describe('FeaturedProviders modes', () => {
  const provider: ProviderSummary = {
    id: '1', userId: '9', name: 'Jane Pro', headline: 'Plumber', avatarUrl: null, coverPhotoUrl: null, categoryName: 'Plumbing', skills: [],
    categoryId: 'plumbing', rating: 4.8, reviewCount: 3, ratePerHour: 500, yearsExperience: 5, verified: true,
    provinceCode: '0722', provinceName: 'Cebu', cityCode: '072217', cityName: 'Cebu City', barangay: 'Poblacion',
  }

  it('automatic: the heading stays even with no providers', async () => {
    const wrapper = await mountSuspended(FeaturedProviders, { props: { section: section('featured_providers'), providers: [], categories: [] } })

    expect(wrapper.find('section').exists()).toBe(true)
    expect(wrapper.find('h2').text()).toBe('Top-rated pros')
  })

  it('manual: nothing featured means nothing shown', async () => {
    const wrapper = await mountSuspended(FeaturedProviders, { props: { section: section('featured_providers', { settings: { mode: 'manual' } }), providers: [], categories: [] } })

    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('manual: the featured providers show under the usual heading', async () => {
    const wrapper = await mountSuspended(FeaturedProviders, { props: { section: section('featured_providers', { settings: { mode: 'manual' }, heading: 'Our picks' }), providers: [provider], categories: [] } })

    expect(wrapper.find('h2').text()).toBe('Our picks')
    expect(wrapper.text()).toContain('Jane Pro')
  })

  it('manual: defaults heading to Featured Providers when no custom heading is set', async () => {
    const wrapper = await mountSuspended(FeaturedProviders, { props: { section: section('featured_providers', { settings: { mode: 'manual' } }), providers: [provider], categories: [] } })

    expect(wrapper.find('h2').text()).toBe('Featured Providers')
  })
})
