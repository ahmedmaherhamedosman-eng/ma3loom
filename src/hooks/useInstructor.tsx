import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useInstructor() {
  const [isInstructor, setIsInstructor] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return;
      }
      setUserId(session.user.id);
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "instructor" as any)
        .maybeSingle();
      setIsInstructor(!!data);
      setIsLoading(false);
    };
    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) {
        setIsInstructor(false);
        setUserId(null);
        setIsLoading(false);
      } else {
        setUserId(session.user.id);
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "instructor" as any)
          .maybeSingle()
          .then(({ data }) => {
            setIsInstructor(!!data);
            setIsLoading(false);
          });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { isInstructor, isLoading, userId };
}
