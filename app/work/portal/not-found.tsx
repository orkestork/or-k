import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/work/ui/button";

export default function PortalNotFound() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <SearchX className="size-8 text-muted-foreground" />
      <p className="text-lg font-semibold">No encontramos esta página</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Puede que el enlace esté mal escrito o que esa pieza no esté compartida contigo.
      </p>
      <Button size="sm" asChild>
        <Link href="/work/portal">Volver a tu proyecto</Link>
      </Button>
    </div>
  );
}
