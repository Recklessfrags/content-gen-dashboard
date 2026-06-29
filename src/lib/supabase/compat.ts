import type { Database } from "@/lib/database.types";

// WORKAROUND (delete when fixed upstream): @supabase/supabase-js + postgrest-js
// 2.108.2 infer table Insert/Update as `never` for a `Database` of this generated
// shape, so a valid `.insert(...)` / `.update(...)` is wrongly rejected. Mapping
// each table through a homomorphic identity (`{ [K in keyof X]: X[K] }`) forces TS
// to eagerly resolve the Insert/Update members so they type-check correctly.
//
// This is a STRUCTURAL IDENTITY, not a widening: Row/Insert/Update keys + types are
// preserved exactly (so schema drift still breaks the build, and bogus columns are
// still rejected). `__InternalSupabase` (PostgrestVersion) is kept via Omit. Clients
// build with `createXClient<Database>(...)` then re-cast to this compatible shape.
type SupabaseTable<T> = T extends {
  Row: infer Row;
  Insert: infer Insert;
  Update: infer Update;
  Relationships: infer Relationships;
}
  ? {
      Row: { [K in keyof Row]: Row[K] };
      Insert: { [K in keyof Insert]: Insert[K] };
      Update: { [K in keyof Update]: Update[K] };
      Relationships: Relationships extends unknown[] ? Relationships : [];
    }
  : never;

export type SupabaseCompatibleDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: {
      [K in keyof Database["public"]["Tables"]]: SupabaseTable<
        Database["public"]["Tables"][K]
      >;
    };
  };
};
