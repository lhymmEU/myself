import { createUserSupabase } from "./lib/user-client";

async function main() {
  const kindsArg = process.argv[2]?.trim();
  const kinds =
    kindsArg && kindsArg !== "all"
      ? new Set(kindsArg.split(",").map((k) => k.trim()).filter(Boolean))
      : new Set([
          "plans",
          "marked",
          "wishes",
          "skills",
          "todos",
          "wishlist_todos",
          "invoices",
          "mind_map",
          "finance",
        ]);

  const supabase = await createUserSupabase();
  const out: Record<string, unknown> = {};

  if (kinds.has("plans")) {
    const { data, error } = await supabase
      .from("plan_pages")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    out.plans = data ?? [];
  }

  if (kinds.has("marked")) {
    const [collections, items] = await Promise.all([
      supabase.from("marked_collections").select("*").order("sort_order"),
      supabase.from("marked_items").select("*").order("sort_order"),
    ]);
    if (collections.error) throw new Error(collections.error.message);
    if (items.error) throw new Error(items.error.message);
    out.marked = {
      collections: collections.data ?? [],
      items: items.data ?? [],
    };
  }

  if (kinds.has("wishes")) {
    const { data, error } = await supabase.from("user_wishes").select("*");
    if (error) throw new Error(error.message);
    out.wishes = data ?? [];
  }

  if (kinds.has("skills")) {
    const { data, error } = await supabase.from("user_skills").select("*");
    if (error) throw new Error(error.message);
    out.skills = data ?? [];
  }

  if (kinds.has("todos")) {
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    out.todos = data ?? [];
  }

  if (kinds.has("wishlist_todos")) {
    const { data, error } = await supabase
      .from("wishlist_todos")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    out.wishlist_todos = data ?? [];
  }

  if (kinds.has("invoices")) {
    const [invRes, clientRes] = await Promise.all([
      supabase.from("invoices").select("*").order("updated_at", { ascending: false }),
      supabase.from("invoice_clients").select("*").order("created_at", { ascending: true }),
    ]);
    if (invRes.error) throw new Error(invRes.error.message);
    if (clientRes.error) throw new Error(clientRes.error.message);
    out.invoices = {
      invoices: invRes.data ?? [],
      clients: clientRes.data ?? [],
    };
  }

  if (kinds.has("mind_map")) {
    const [scenesRes, nodesRes] = await Promise.all([
      supabase
        .from("mind_map_scenes")
        .select("*")
        .order("updated_at", { ascending: false }),
      supabase.from("life_nodes").select("*").order("updated_at", { ascending: false }),
    ]);
    if (scenesRes.error) throw new Error(scenesRes.error.message);
    if (nodesRes.error) throw new Error(nodesRes.error.message);
    out.mind_map = {
      scenes: scenesRes.data ?? [],
      nodes: nodesRes.data ?? [],
    };
  }

  if (kinds.has("finance")) {
    const [accRes, txRes, budRes, invRes] = await Promise.all([
      supabase.from("finance_accounts").select("*").order("created_at", { ascending: true }),
      supabase
        .from("finance_transactions")
        .select("*")
        .order("date", { ascending: false }),
      supabase.from("finance_budgets").select("*").order("created_at", { ascending: true }),
      supabase.from("finance_investments").select("*").order("created_at", { ascending: true }),
    ]);
    if (accRes.error) throw new Error(accRes.error.message);
    if (txRes.error) throw new Error(txRes.error.message);
    if (budRes.error) throw new Error(budRes.error.message);
    if (invRes.error) throw new Error(invRes.error.message);
    out.finance = {
      accounts: accRes.data ?? [],
      transactions: txRes.data ?? [],
      budgets: budRes.data ?? [],
      investments: invRes.data ?? [],
    };
  }

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
