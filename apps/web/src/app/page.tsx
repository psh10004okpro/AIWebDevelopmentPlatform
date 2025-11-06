import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Sparkles, Code, Zap, Shield } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">NextGen AI Platform</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container py-12">
        <div className="flex flex-col items-center text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
              Build Web Apps with
              <span className="text-primary"> AI Power</span>
            </h1>
            <p className="mx-auto max-w-[700px] text-muted-foreground text-lg sm:text-xl">
              The next-generation AI platform that revolutionizes web development.
              Create, preview, and deploy applications faster than ever.
            </p>
          </div>

          <div className="flex gap-4">
            <Button size="lg">Get Started</Button>
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 w-full max-w-5xl">
            <FeatureCard
              icon={<Code className="h-8 w-8 text-primary" />}
              title="AI Code Generation"
              description="Generate production-ready code with advanced AI models"
            />
            <FeatureCard
              icon={<Zap className="h-8 w-8 text-primary" />}
              title="Real-time Preview"
              description="See your changes instantly with live preview engine"
            />
            <FeatureCard
              icon={<Shield className="h-8 w-8 text-primary" />}
              title="Enterprise Ready"
              description="Built with security and scalability in mind"
            />
          </div>
        </div>
      </main>

      <footer className="border-t mt-24">
        <div className="container flex h-16 items-center justify-center text-sm text-muted-foreground">
          Built with Next.js, TypeScript, and Tailwind CSS
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center space-y-3 rounded-lg border p-6 hover:shadow-lg transition-shadow">
      {icon}
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="text-muted-foreground text-center">{description}</p>
    </div>
  );
}
