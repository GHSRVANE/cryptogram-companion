import { PuzzleSolver } from '@/components/PuzzleSolver';
import { Bitcoin, Shield, Sparkles } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-40 bg-background/80">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bitcoin-gradient">
              <Bitcoin className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-xl">BIP-39 Puzzle Solver</h1>
              <p className="text-xs text-muted-foreground">Seed Phrase Recovery Tool</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Hero Section */}
          <section className="text-center space-y-4 py-8">
            <h2 className="text-3xl md:text-4xl font-bold">
              Solve Your <span className="text-gradient">Seed Phrase</span> Puzzle
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Enter your partial seed phrase and get real-time validation against the BIP-39 wordlist.
              Autocomplete suggestions help you find the right words.
            </p>
          </section>

          {/* Features */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border/50">
              <Shield className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-medium text-sm">Secure</h3>
                <p className="text-xs text-muted-foreground">All processing happens locally in your browser</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border/50">
              <Sparkles className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-medium text-sm">Smart Suggestions</h3>
                <p className="text-xs text-muted-foreground">Auto-complete from 2048 BIP-39 words</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border/50">
              <Bitcoin className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-medium text-sm">Bitcoin Compatible</h3>
                <p className="text-xs text-muted-foreground">Standard BIP-39 English wordlist</p>
              </div>
            </div>
          </section>

          {/* Puzzle Solver */}
          <PuzzleSolver />

          {/* Disclaimer */}
          <section className="text-center py-8">
            <p className="text-xs text-muted-foreground max-w-xl mx-auto">
              ⚠️ Never share your seed phrase with anyone. This tool runs entirely in your browser 
              and does not send any data to external servers. Always verify the security of any 
              tool before entering sensitive information.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Index;
