import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { ServiceCategory } from '#shared/types/marketplace'
import ProviderFilterSidebar from './ProviderFilterSidebar.vue'

const categories: ServiceCategory[] = [
  { id: 'home-services', name: 'Home services', icon: null, providerCount: 2, skills: [
    { id: 'aircon-technician', name: 'Aircon technician' },
    { id: 'carpenter', name: 'Carpenter' },
  ] },
  { id: 'painter', name: 'Painter', icon: null, providerCount: 1, skills: [] },
]

const hrefs = (wrapper: { findAll: (selector: 'a') => { attributes: (name: string) => string | undefined }[] }) => wrapper.findAll('a').map(link => link.attributes('href'))

describe('ProviderFilterSidebar in link mode', () => {
  it('links each category to its page, carrying the other filters, and shows no sub-categories until one is chosen', async () => {
    const wrapper = await mountSuspended(ProviderFilterSidebar, {
      props: { categories, linkMode: true, carriedQuery: { province: '0722' } },
    })

    expect(hrefs(wrapper)).toEqual(['/category/home-services?province=0722', '/category/painter?province=0722'])
  })

  it('nests the chosen category\'s sub-categories under it; unticking goes one level up', async () => {
    const wrapper = await mountSuspended(ProviderFilterSidebar, {
      props: { categories, linkMode: true, activeCategory: 'home-services', activeSkill: 'carpenter' },
    })

    expect(hrefs(wrapper)).toEqual([
      '/browse',
      '/category/home-services/aircon-technician',
      '/category/home-services',
      '/category/painter',
    ])
    expect(wrapper.find('[aria-current="page"]').text()).toBe('Carpenter')
  })
})
