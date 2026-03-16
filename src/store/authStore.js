import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useAuthStore = create((set) => ({
  session: null,
  user: null,
  isLoading: true,
  
  initializeAuth: () => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, user: session?.user ?? null, isLoading: false });
    });

    // Escuchar cambios (Login, Logout, Token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, isLoading: false });
    });
    
    // Devolvemos el unsubscriber para limpiar el effect
    return () => subscription.unsubscribe();
  },
  
  signOut: async () => {
    await supabase.auth.signOut();
  }
}));
