import { Bitcoin, Shield, TrendingUp, Star, ExternalLink, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Exchange {
  name: string;
  description: string;
  commission: string;
  highlight: string;
  rating: number;
  referralUrl: string;
  featured?: boolean;
}

const exchanges: Exchange[] = [
  {
    name: "Coinbase",
    description: "A corretora mais confiável e regulamentada do mundo. Ideal para iniciantes e investidores que priorizam segurança.",
    commission: "Bônus por indicação",
    highlight: "Mais confiável do mercado",
    rating: 5,
    referralUrl: "https://coinbase.com/join/3EZXNY2?src=referral-link",
    featured: true,
  },
];

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
              <h1 className="font-bold text-xl">CryptoStart</h1>
              <p className="text-xs text-muted-foreground">As melhores corretoras para comprar Bitcoin</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-10">
          <section className="text-center space-y-4 py-10">
            <Badge variant="secondary" className="text-sm px-4 py-1">
              🔒 Corretoras verificadas e seguras
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold leading-tight">
              Compre <span className="text-gradient">Bitcoin</span> nas corretoras
              <br />mais confiáveis do mercado
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Selecionamos as melhores plataformas para você começar a investir em criptomoedas com segurança e praticidade.
            </p>
          </section>

          {/* Trust indicators */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50">
              <Shield className="w-5 h-5 text-primary shrink-0" />
              <div>
                <h3 className="font-medium text-sm">100% Regulamentadas</h3>
                <p className="text-xs text-muted-foreground">Plataformas licenciadas globalmente</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50">
              <TrendingUp className="w-5 h-5 text-primary shrink-0" />
              <div>
                <h3 className="font-medium text-sm">Fácil de começar</h3>
                <p className="text-xs text-muted-foreground">Cadastro rápido e intuitivo</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50">
              <Star className="w-5 h-5 text-primary shrink-0" />
              <div>
                <h3 className="font-medium text-sm">Avaliadas por usuários</h3>
                <p className="text-xs text-muted-foreground">Milhões de usuários satisfeitos</p>
              </div>
            </div>
          </section>

          {/* Exchange Cards */}
          <section className="space-y-6">
            <h3 className="text-xl font-semibold">Corretoras Recomendadas</h3>
            <div className="space-y-4">
              {exchanges.map((exchange) => (
                <Card
                  key={exchange.name}
                  className={`overflow-hidden transition-all duration-300 hover:shadow-lg ${
                    exchange.featured ? 'border-primary/50 glow-primary' : ''
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Info */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xl font-bold">{exchange.name}</h4>
                          {exchange.featured && (
                            <Badge className="bitcoin-gradient border-0 text-primary-foreground text-xs">
                              ⭐ Recomendada
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground text-sm">{exchange.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                          <span className="flex items-center gap-1">
                            <Shield className="w-3.5 h-3.5 text-primary" />
                            {exchange.highlight}
                          </span>
                          <span className="flex items-center gap-1">
                            {Array.from({ length: exchange.rating }).map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-primary text-primary" />
                            ))}
                          </span>
                        </div>
                      </div>

                      {/* CTA */}
                      <div className="shrink-0">
                        <Button
                          asChild
                          size="lg"
                          className="w-full md:w-auto bitcoin-gradient text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
                        >
                          <a href={exchange.referralUrl} target="_blank" rel="noopener noreferrer">
                            Criar conta grátis
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Coming soon */}
          <section className="text-center py-8 space-y-3">
            <p className="text-muted-foreground text-sm">
              Novas corretoras serão adicionadas em breve — Binance, Bybit, OKX e mais.
            </p>
            <p className="text-xs text-muted-foreground max-w-xl mx-auto">
              ⚠️ Investir em criptomoedas envolve riscos. Pesquise bem antes de investir.
              Os links desta página podem conter referências de afiliado.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Index;
