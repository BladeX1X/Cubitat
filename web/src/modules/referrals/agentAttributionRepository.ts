import { supabase } from '../../shared/lib/supabaseClient'

export type AgentAttributedContact = {
  id: string
  property_id: string
  contact_name: string
  contact_phone: string
  message: string
  created_at: string
}

/** Reads only contacts attributed to the supplied active code; RLS enforces ownership. */
export async function loadAgentAttributedContacts(referralCode: string): Promise<AgentAttributedContact[]> {
  const { data, error } = await supabase.from('contacts')
    .select('id, property_id, contact_name, contact_phone, message, created_at')
    .eq('referral_id', referralCode)
    .order('created_at', { ascending: false })
  if (error) throw new Error('agent_attributed_contacts_load_failed')
  return (data ?? []) as AgentAttributedContact[]
}
