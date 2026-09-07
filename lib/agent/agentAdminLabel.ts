/** Admin label for agent_runs usage rows (email preferred). */
export function agentAdminLabelFromUser(user: {
  email?: string | null
  id?: string
}): string {
  if (typeof user.email === 'string' && user.email.trim()) return user.email.trim()
  if (typeof user.id === 'string' && user.id.trim()) return user.id.trim()
  return 'unknown'
}
