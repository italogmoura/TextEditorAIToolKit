import { Header } from "@/components/layout/header";
import { ProcessList } from "@/components/process/process-list";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Home() {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <main className="flex-1 overflow-hidden">
        <div className="h-full flex">
          <div className="w-full max-w-2xl mx-auto">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Processos</h2>
              <p className="text-sm text-muted-foreground">
                Selecione um processo para abrir o workspace
              </p>
            </div>
            <ScrollArea className="h-[calc(100vh-8rem)]">
              <ProcessList />
            </ScrollArea>
          </div>
        </div>
      </main>
    </div>
  );
}
