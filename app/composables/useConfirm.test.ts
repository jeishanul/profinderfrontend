import { describe, expect, it } from 'vitest'
import { useConfirm } from './useConfirm'

const INPUT = { label: 'Reason (optional)', maxLength: 255 }

describe('useConfirm', () => {
  it('resolves true when confirmed and false when cancelled', async () => {
    const { confirm, settle } = useConfirm()

    const yes = confirm({ title: 'Delete?' })
    settle(true)
    expect(await yes).toBe(true)

    const no = confirm({ title: 'Delete?' })
    settle(false)
    expect(await no).toBe(false)
  })

  it('prompt() resolves to the trimmed note when confirmed — empty if none was typed', async () => {
    const { prompt, settle, state } = useConfirm()

    const typed = prompt({ title: 'Decline?', input: INPUT })
    state.value.inputValue = '  Too expensive  '
    settle(true)
    expect(await typed).toBe('Too expensive')

    const blank = prompt({ title: 'Decline?', input: INPUT })
    settle(true)
    expect(await blank).toBe('')
  })

  it('prompt() resolves to null when cancelled, whatever was typed', async () => {
    const { prompt, settle, state } = useConfirm()

    const cancelled = prompt({ title: 'Decline?', input: INPUT })
    state.value.inputValue = 'half-written'
    settle(false)

    expect(await cancelled).toBeNull()
  })

  it('starts every prompt with an empty box', async () => {
    const { prompt, settle, state } = useConfirm()

    const first = prompt({ title: 'One', input: INPUT })
    state.value.inputValue = 'leftover'
    settle(true)
    await first

    const second = prompt({ title: 'Two', input: INPUT })
    expect(state.value.inputValue).toBe('')
    settle(false)
    await second
  })
})
