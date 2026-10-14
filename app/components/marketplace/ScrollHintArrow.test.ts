import { afterEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ScrollHintArrow from './ScrollHintArrow.vue'

describe('ScrollHintArrow', () => {
  afterEach(() => {
    document.getElementById('hint-target')?.remove()
  })

  it('points at the section the page names, wherever the admin put it', async () => {
    const target = document.createElement('section')
    target.id = 'hint-target'
    let scrolledTo: string | null = null
    target.scrollIntoView = () => {
      scrolledTo = target.id
    }
    // Below the fold: not reached yet.
    target.getBoundingClientRect = () => ({ top: 900 }) as DOMRect
    document.body.append(target)

    const wrapper = await mountSuspended(ScrollHintArrow, { props: { target: 'hint-target' } })

    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
    await button.trigger('click')
    expect(scrolledTo).toBe('hint-target')
  })

  it('hides once the section has been reached', async () => {
    const target = document.createElement('section')
    target.id = 'hint-target'
    target.getBoundingClientRect = () => ({ top: -40 }) as DOMRect
    document.body.append(target)

    const wrapper = await mountSuspended(ScrollHintArrow, { props: { target: 'hint-target' } })

    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('does not show when there is no such element (the admin hid or re-anchored the section)', async () => {
    const wrapper = await mountSuspended(ScrollHintArrow, { props: { target: 'hint-target' } })

    expect(wrapper.find('button').exists()).toBe(false)
  })
})
