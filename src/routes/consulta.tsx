import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Brand } from "@/components/Brand";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/cronochip";
import { CalendarDays, MapPin } from "lucide-react";

export const Route = createFileRoute("/consulta")({
  head: () => ({
    meta: [
      { title: "Consultar meu kit — Kit Fácil" },
      {
        name: "description",
        content: "Escolha seu evento e consulte o local, o horário e o QR Code de retirada do kit.",
      },
      { property: "og:title", content: "Consultar meu kit — Kit Fácil" },
      {
        property: "og:description",
        content: "Consulte a retirada do seu kit de corrida pelo CPF ou número de inscrição.",
      },
    ],
  }),
  component: Consulta,
});

function Consulta() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["public-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id,name,slug,event_date,city,state")
        .order("event_date", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="bg-background min-h-screen">
      <header className="mx-auto max-w-3xl px-4 py-6">
        <Link to="/">
          <Brand />
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Consultar meu kit</h1>
        <p className="text-muted-foreground mt-2">Selecione o evento em que você está inscrito.</p>

        <div className="mt-6 space-y-3">
          {isLoading && <p className="text-muted-foreground text-sm">Carregando eventos…</p>}
          {!isLoading && events.length === 0 && (
            <p className="text-muted-foreground text-sm">Nenhum evento disponível no momento.</p>
          )}
          {events.map((e) => (
            <Link key={e.id} to="/evento/$slug/kit" params={{ slug: e.slug }}>
              <Card className="hover:border-primary/50 shadow-card transition-colors">
                <CardContent className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold">{e.name}</h2>
                    <p className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3.5" /> {formatDate(e.event_date)}
                      </span>
                      {e.city && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5" /> {e.city}
                          {e.state ? `/${e.state}` : ""}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="text-primary shrink-0 text-sm font-semibold">Consultar</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
