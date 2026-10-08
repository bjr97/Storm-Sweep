import { CHANGE_CUTOFF_HOURS } from '@/lib/customer/rules'
import type { HelpTopic } from '@/types/database'

/** Customer help topics (shared by the form, API and admin list). */
export const HELP_TOPICS: { value: HelpTopic; label: string }[] = [
  { value: 'visit', label: 'A question about a visit' },
  { value: 'reschedule', label: `Change a visit (inside ${CHANGE_CUTOFF_HOURS} hours)` },
  { value: 'billing', label: 'Payment or billing' },
  { value: 'membership', label: 'Storm Ready membership' },
  { value: 'other', label: 'Something else' },
]

export const HELP_TOPIC_VALUES = HELP_TOPICS.map((t) => t.value) as [HelpTopic, ...HelpTopic[]]

export function helpTopicLabel(topic: HelpTopic): string {
  return HELP_TOPICS.find((t) => t.value === topic)?.label ?? topic
}
