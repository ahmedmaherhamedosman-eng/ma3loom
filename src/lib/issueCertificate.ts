import { supabase } from "@/integrations/supabase/client";

/**
 * Tries to issue a certificate for the given user/course.
 * Returns the certificate row (existing or newly created), or null if not eligible.
 * Uses the DB function `is_eligible_for_certificate` via the RLS insert policy.
 */
export async function issueCertificateIfEligible(
  userId: string,
  courseId: string,
  quizScore?: number | null
): Promise<{ id: string; verification_code: string } | null> {
  // 1) If certificate already exists, return it
  const { data: existing } = await supabase
    .from("certificates")
    .select("id, verification_code")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (existing) return existing;

  // 2) Check eligibility via RPC-like select using the helper function
  const { data: eligible } = await supabase.rpc("is_eligible_for_certificate", {
    _user_id: userId,
    _course_id: courseId,
  });

  if (!eligible) return null;

  // 3) Insert (RLS will double-check eligibility)
  const { data: created, error } = await supabase
    .from("certificates")
    .insert({
      user_id: userId,
      course_id: courseId,
      quiz_score: quizScore ?? null,
    })
    .select("id, verification_code")
    .maybeSingle();

  if (error || !created) return null;
  return created;
}
