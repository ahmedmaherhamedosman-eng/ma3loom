import { supabase } from "@/integrations/supabase/client"

export async function fetchAvailableSlots(packageId: string, fromIso?: string, toIso?: string) {
  // Placeholder: call a supabase RPC or query to get available slots
  const { data, error } = await supabase.rpc("get_available_slots", { pkg_id: packageId, from_iso: fromIso ?? null, to_iso: toIso ?? null })
  if (error) throw error
  return data
}

export async function createBooking(payload: any) {
  const { data, error } = await supabase.from("bookings").insert([payload]).select().single()
  if (error) throw error
  return data
}
