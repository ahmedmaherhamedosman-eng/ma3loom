/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CartItem {
  id: string;
  course_id: string;
  added_at: string;
  course: {
    id: string;
    title: string;
    instructor: string;
    price: number;
    currency?: string | null;
    image_url: string | null;
  };
}

interface CartItemRow {
  id: string;
  course_id: string;
  added_at: string;
  courses: CartItem["course"];
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  total: number;
  loading: boolean;
  addToCart: (courseId: string) => Promise<void>;
  removeFromCart: (courseId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  isInCart: (courseId: string) => boolean;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id || null;
    setUserId(uid);

    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("cart_items")
      .select("id, course_id, added_at, courses!inner(id, title, instructor, price, currency, image_url)")
      .eq("user_id", uid)
      .order("added_at", { ascending: false });

    if (data) {
      setItems(
        (data as CartItemRow[]).map((row) => ({
          id: row.id,
          course_id: row.course_id,
          added_at: row.added_at,
          course: row.courses,
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  const addToCart = async (courseId: string) => {
    if (!userId) {
      toast.error("سجّل الدخول لإضافة كورسات للسلة");
      return;
    }
    const { error } = await supabase
      .from("cart_items")
      .insert({ user_id: userId, course_id: courseId });

    if (error) {
      if (error.code === "23505") {
        toast.info("هذا الكورس موجود بالفعل في سلتك");
      } else {
        toast.error("تعذر الإضافة للسلة", { description: error.message });
      }
      return;
    }
    toast.success("✅ أُضيف الكورس إلى سلتك");
    refresh();
  };

  const removeFromCart = async (courseId: string) => {
    if (!userId) return;
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", userId)
      .eq("course_id", courseId);

    if (error) {
      toast.error("تعذر الحذف", { description: error.message });
      return;
    }
    toast.success("تم حذف الكورس من السلة");
    refresh();
  };

  const clearCart = async () => {
    if (!userId) return;
    await supabase.from("cart_items").delete().eq("user_id", userId);
    refresh();
  };

  const isInCart = (courseId: string) => items.some((i) => i.course_id === courseId);
  const count = items.length;
  const total = items.reduce((s, i) => s + Number(i.course.price || 0), 0);

  return (
    <CartContext.Provider value={{ items, count, total, loading, addToCart, removeFromCart, clearCart, isInCart, refresh }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
