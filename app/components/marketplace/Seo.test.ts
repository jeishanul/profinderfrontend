import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import SeoRichContent from './SeoRichContent.vue'
import SeoBreadcrumbs from './SeoBreadcrumbs.vue'

describe('SEO Components and Utilities', () => {
  it('renders SeoBreadcrumbs with correct links and active leaf item', async () => {
    const items = [
      { label: 'Home', url: '/' },
      { label: 'Philippines', url: '/browse' },
      { label: 'Cebu', url: '/ph/cebu' },
    ]

    const wrapper = await mountSuspended(SeoBreadcrumbs, {
      props: { items },
    })

    expect(wrapper.text()).toContain('Home')
    expect(wrapper.text()).toContain('Philippines')
    expect(wrapper.text()).toContain('Cebu')

    const links = wrapper.findAll('a')
    expect(links.length).toBe(2)
    expect(links[0]!.text()).toBe('Home')
    expect(links[1]!.text()).toBe('Philippines')

    const activeItem = wrapper.find('[aria-current="page"]')
    expect(activeItem.exists()).toBe(true)
    expect(activeItem.text()).toBe('Cebu')
  })

  it('renders SeoRichContent when HTML content is present', async () => {
    const content = '<p>Hire top-rated <strong>electricians</strong> in Cebu.</p><ul><li>Wiring</li><li>Inspection</li></ul>'

    const wrapper = await mountSuspended(SeoRichContent, {
      props: {
        content,
        heading: 'About Electrician Services in Cebu',
      },
    })

    expect(wrapper.text()).toContain('About Electrician Services in Cebu')
    expect(wrapper.text()).toContain('Hire top-rated electricians in Cebu.')
    expect(wrapper.html()).toContain('<strong>electricians</strong>')
    expect(wrapper.findAll('li').length).toBe(2)
  })

  it('does not render SeoRichContent when content is empty or null', async () => {
    const wrapper = await mountSuspended(SeoRichContent, {
      props: {
        content: null,
      },
    })

    expect(wrapper.text()).toBe('')
    expect(wrapper.html()).toBe('<!--v-if-->')
  })

  describe('Browse Page Filter Query Management', () => {
    const list = (value: unknown): string[] => {
      if (Array.isArray(value)) {
        return value.flatMap(v => typeof v === 'string' ? v.split(',') : []).filter(Boolean)
      }
      if (typeof value === 'string' && value) {
        return value.split(',').filter(Boolean)
      }
      return []
    }
    const text = (value: unknown) => (typeof value === 'string' && value ? value : null)

    function parseBrowseQuery(query: Record<string, unknown>) {
      const rawCategories = query.categories ?? query.category
      return {
        q: text(query.q) ?? '',
        sort: (text(query.sort) ?? 'recommended') as string,
        categories: list(rawCategories),
        province: text(query.province),
        city: text(query.city),
        barangay: text(query.barangay),
      }
    }

    it('parses single ?category=plumbing into filters on /browse', () => {
      const filters = parseBrowseQuery({ category: 'plumbing', sort: 'rating' })
      expect(filters.categories).toEqual(['plumbing'])
      expect(filters.sort).toBe('rating')
    })

    it('parses ?categories=electrical and preserves location filters', () => {
      const filters = parseBrowseQuery({
        categories: 'electrical',
        province: '0722',
        city: '072217',
        barangay: 'Lahug',
      })
      expect(filters.categories).toEqual(['electrical'])
      expect(filters.province).toBe('0722')
      expect(filters.city).toBe('072217')
      expect(filters.barangay).toBe('Lahug')
    })

    it('parses multi-category comma-separated queries', () => {
      const filters = parseBrowseQuery({ categories: 'plumbing,electrical' })
      expect(filters.categories).toEqual(['plumbing', 'electrical'])
    })

    it('parses array multi-category queries', () => {
      const filters = parseBrowseQuery({ categories: ['plumbing', 'electrical'] })
      expect(filters.categories).toEqual(['plumbing', 'electrical'])
    })

    it('handles location with changing categories seamlessly', () => {
      // Step 1: Filter by location and plumbing
      const step1 = parseBrowseQuery({
        categories: 'plumbing',
        province: 'cebu',
        city: 'cebu-city',
      })
      expect(step1.categories).toEqual(['plumbing'])
      expect(step1.city).toBe('cebu-city')

      // Step 2: Change category to home-cleaning while keeping city
      const step2 = parseBrowseQuery({
        categories: 'home-cleaning',
        province: step1.province,
        city: step1.city,
      })
      expect(step2.categories).toEqual(['home-cleaning'])
      expect(step2.city).toBe('cebu-city')
      expect(step2.province).toBe('cebu')
    })
  })
})
