import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/work/ui/button";

export default function WorkNotFound() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <SearchX className="size-8 text-muted-foreground" />
      <p className="text-lg font-semibold">No encontramos esta página</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        La solicitud, cliente o proyecto no existe, o fue eliminado. Prueba buscándolo con ⌘K.
      </p>
      <Button size="sm" asChild>
        <Link href="/work/home">Ir a Home</Link>
      </Button>
    </div>
  );
}
