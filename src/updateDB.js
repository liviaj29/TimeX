import { supabase } from "./supabaseClient";

export const updateDB = (id, props) => 
  supabase
    .from("profiles")
    .update(props)
    .eq("id", id)
    .select()