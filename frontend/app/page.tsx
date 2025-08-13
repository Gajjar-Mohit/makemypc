import { PCBuilderInterface } from "@/components/pc-builder-interface"
import { Toaster } from "@/components/ui/toaster"

export default function Home() {
  return (
    <>
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-cyan-50/20 dark:to-cyan-950/20">
        <PCBuilderInterface />
      </main>
      <Toaster />
    </>
  )
}
