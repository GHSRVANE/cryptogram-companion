import { Bitcoin, Shield, TrendingUp, Star, ExternalLink, ChevronRight, BookOpen, ArrowRight, Lock, Wallet, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import partnerLogo from '@/assets/btc-wallet-recovery-logo.png';

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
  {
    name: "Bybit",
    description: "Uma das maiores corretoras do mundo com taxas competitivas, derivativos avançados e bônus generosos para novos usuários.",
    commission: "Até 30% de comissão recorrente",
    highlight: "Excelente para traders",
    rating: 5,
    referralUrl: "https://www.bybit.com/invite?ref=OJVRLA",
  },
  {
    name: "Binance",
    description: "A maior corretora de criptomoedas do mundo em volume de negociação. Oferece centenas de pares de trading, taxas baixas e ferramentas avançadas.",
    commission: "Até 50% de comissão recorrente",
    highlight: "Maior volume do mundo",
    rating: 5,
    referralUrl: "https://www.binance.com/referral/earn-together/refer2earn-usdc/claim?hl=pt-BR&ref=GRO_28502_MNCC2&utm_source=default",
  },
  {
    name: "Foxbit",
    description: "Corretora brasileira pioneira no mercado de criptomoedas. Interface simples, suporte em português e depósitos via Pix com liquidez local.",
    commission: "Bônus por indicação",
    highlight: "Melhor corretora brasileira",
    rating: 4,
    referralUrl: "https://app.foxbit.com.br/register?ref=FT7JGPAN7AWOQB",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-40 bg-background/80">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bitcoin-gradient">
                <Bitcoin className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-xl">CryptoStart</h1>
                <p className="text-xs text-muted-foreground">As melhores corretoras para comprar Bitcoin</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">Parceiro</span>
              <img src={partnerLogo} alt="BTC Wallet Recovery - Parceiro" className="h-8 object-contain" />
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

          {/* Educational Card */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-semibold">Como comprar e proteger seu Bitcoin</h3>
            </div>
            <Card className="border-primary/20 bg-gradient-to-br from-card to-card/80">
              <CardContent className="p-6 space-y-6">
                <p className="text-muted-foreground text-sm">
                  Aprenda o caminho completo: da compra na corretora até a autocustódia segura das suas criptomoedas.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Step 1 */}
                  <div className="relative p-4 rounded-xl bg-background border border-border/50 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bitcoin-gradient text-primary-foreground text-xs font-bold">1</span>
                      <h4 className="font-semibold text-sm">Crie sua conta</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cadastre-se em uma corretora confiável acima. Faça a verificação de identidade (KYC) e deposite reais via Pix ou transferência bancária.
                    </p>
                    <Wallet className="w-8 h-8 text-primary/20 absolute top-4 right-4" />
                  </div>

                  {/* Step 2 */}
                  <div className="relative p-4 rounded-xl bg-background border border-border/50 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bitcoin-gradient text-primary-foreground text-xs font-bold">2</span>
                      <h4 className="font-semibold text-sm">Compre Bitcoin</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Com o saldo disponível, compre Bitcoin (BTC) pelo preço de mercado ou defina um preço limite. Comece com qualquer valor — não precisa comprar 1 BTC inteiro.
                    </p>
                    <Bitcoin className="w-8 h-8 text-primary/20 absolute top-4 right-4" />
                  </div>

                  {/* Step 3 */}
                  <div className="relative p-4 rounded-xl bg-background border border-border/50 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bitcoin-gradient text-primary-foreground text-xs font-bold">3</span>
                      <h4 className="font-semibold text-sm">Transfira para autocustódia</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Envie seu BTC para uma carteira pessoal (como Ledger, Trezor ou BlueWallet). Guarde suas 12/24 palavras-semente em local seguro e offline. <strong>Suas chaves, suas moedas!</strong>
                    </p>
                    <Lock className="w-8 h-8 text-primary/20 absolute top-4 right-4" />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-xs text-muted-foreground">
                    💡 <strong className="text-foreground">Dica importante:</strong> Nunca deixe grandes quantias em corretoras por longos períodos. A autocustódia é a forma mais segura de proteger seus bitcoins. Lembre-se: quem controla as chaves privadas, controla as moedas.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Coming soon */}
          <section className="text-center py-8 space-y-3">
            <p className="text-muted-foreground text-sm">
              Novas corretoras serão adicionadas em breve — OKX, Bitget, KuCoin e mais.
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
