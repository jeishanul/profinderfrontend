import type { ConversationMessage } from '#shared/types/dashboard'

type ActionableMessage = Pick<ConversationMessage, 'deleted' | 'fromMe' | 'quote' | 'meta'>

const isPlainMessage = (message: ActionableMessage) =>
  !message.quote && (!message.meta || message.meta.type === 'job_request')

/** Quotes and system notices are part of a booking's record — they can't be deleted. Only your own live words can. */
export const isDeletable = (message: ActionableMessage) =>
  !message.deleted && message.fromMe && isPlainMessage(message)

/** Reportable: the other person's own words, not a quote or a system-generated notice. */
export const isReportable = (message: ActionableMessage) =>
  !message.deleted && !message.fromMe && isPlainMessage(message)
