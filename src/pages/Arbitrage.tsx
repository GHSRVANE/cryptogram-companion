import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Wallet, RefreshCw, AlertTriangle, TrendingUp, Zap, ArrowLeft, ExternalLink, Power, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// ===== BNB Chain config =====
const BNB_CHAIN_ID_HEX = "0x38"; // 56
const BNB_PARAMS = {
  chainId: BNB_CHAIN_ID_HEX,
  chainName: "BNB Smart Chain",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: ["https://bsc-dataseed.binance.org/"],
  blockExplorerUrls: ["https://bscscan.com/"],
};

// Tokens BEP-20 mais usados em arbitragem
const TOKENS = [
  { symbol: "WBNB", address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", decimals: 18 },
  { symbol: "BUSD", address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", decimals: 18 },
  { symbol: "USDT", address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18 },
  { symbol: "USDC", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18 },
  { symbol: "CAKE", address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", decimals: 18 },
];

// Pares monitorados e DEXs (CoinGecko Tickers API – sem API key)
const PAIRS = [
  { id: "binancecoin", symbol: "BNB", quote: "USDT" },
  { id: "pancakeswap-token", symbol: "CAKE", quote: "USDT" },
];

// Helpers
const fmt = (n: number, d = 4) =>
  isFinite(n) ? n.toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: 2 }) : "—";

const eth = () => (typeof window !== "undefined" ? (window as any).ethereum : undefined);

const hexToBigInt = (hex: string) => BigInt(hex);
const formatUnits = (value: bigint, decimals: number) => {
  const s = value.toString().padStart(decimals + 1, "0");
  const i = s.slice(0, s.length - decimals);
  const f = s.slice(s.length - decimals).replace(/0+$/, "");
  return f ? `${i}.${f}` : i;
};

interface TokenBalance {
  symbol: string;
  balance: string;
  raw: bigint;
}

interface DexPrice {
  exchange: string;
  price: number;
  url?: string;
}

interface Opportunity {
  pair: string;
  buyOn: string;
  sellOn: string;
  buyPrice: number;
  sellPrice: number;
  spreadPct: number;
  estProfitUsd: number;
}

const Arbitrage = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [bnbBalance, setBnbBalance] = useState<string>("0");
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [prices, setPrices] = useState<Record<string, DexPrice[]>>({});
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [minSpread, setMinSpread] = useState(0.3);
  const [allocPct, setAllocPct] = useState(20);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const intervalRef = useRef<number | null>(null);

  const onBnb = chainId === BNB_CHAIN_ID_HEX;

  // ===== Wallet connection =====
  const connect = useCallback(async () => {
    const provider = eth();
    if (!provider) {
      toast.error("Nenhuma carteira detectada. Instale MetaMask, Trust Wallet ou outra carteira EVM.");
      return;
    }
    try {
      const accs: string[] = await provider.request({ method: "eth_requestAccounts" });
      const cid: string = await provider.request({ method: "eth_chainId" });
      setAccount(accs[0]);
      setChainId(cid);
      toast.success("Carteira conectada");
    } catch (e: any) {
      toast.error(e?.message || "Falha ao conectar");
    }
  }, []);

  const disconnect = () => {
    setAccount(null);
    setBnbBalance("0");
    setTokens([]);
    toast.info("Carteira desconectada (apenas localmente)");
  };

  const switchToBnb = async () => {
    const provider = eth();
    if (!provider) return;
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BNB_CHAIN_ID_HEX }] });
    } catch (e: any) {
      if (e?.code === 4902) {
        await provider.request({ method: "wallet_addEthereumChain", params: [BNB_PARAMS] });
      } else {
        toast.error(e?.message || "Falha ao trocar de rede");
      }
    }
  };

  // ===== Read balances =====
  const fetchBalances = useCallback(async () => {
    const provider = eth();
    if (!provider || !account) return;
    setLoading(true);
    try {
      const balHex: string = await provider.request({
        method: "eth_getBalance",
        params: [account, "latest"],
      });
      const bnbRaw = hexToBigInt(balHex);
      setBnbBalance(formatUnits(bnbRaw, 18));

      // ERC-20 balanceOf via eth_call
      const selector = "0x70a08231";
      const padded = account.toLowerCase().replace("0x", "").padStart(64, "0");
      const data = selector + padded;

      const results: TokenBalance[] = [];
      for (const t of TOKENS) {
        try {
          const res: string = await provider.request({
            method: "eth_call",
            params: [{ to: t.address, data }, "latest"],
          });
          const raw = res && res !== "0x" ? hexToBigInt(res) : 0n;
          results.push({ symbol: t.symbol, balance: formatUnits(raw, t.decimals), raw });
        } catch {
          results.push({ symbol: t.symbol, balance: "0", raw: 0n });
        }
      }
      setTokens(results);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao ler saldo");
    } finally {
      setLoading(false);
    }
  }, [account]);

  // ===== Price monitoring (CoinGecko tickers, public API) =====
  const fetchPrices = useCallback(async () => {
    try {
      const next: Record<string, DexPrice[]> = {};
      const opps: Opportunity[] = [];
      for (const p of PAIRS) {
        const r = await fetch(`https://api.coingecko.com/api/v3/coins/${p.id}/tickers?include_exchange_logo=false&depth=false`);
        if (!r.ok) continue;
        const json = await r.json();
        const targetDexes = ["PancakeSwap (v3)", "PancakeSwap (v2)", "Biswap", "ApeSwap", "MDEX", "Uniswap V3 (BSC)", "THENA FUSION"];
        const list: DexPrice[] = (json.tickers || [])
          .filter((t: any) => t.target === p.quote && targetDexes.some((d) => (t.market?.name || "").includes(d.split(" ")[0])))
          .map((t: any) => ({
            exchange: t.market?.name || "?",
            price: Number(t.last),
            url: t.trade_url,
          }))
          .filter((x: DexPrice) => x.price > 0)
          .slice(0, 8);

        // Deduplicate keeping best/worst
        const map = new Map<string, DexPrice>();
        list.forEach((x) => {
          if (!map.has(x.exchange)) map.set(x.exchange, x);
        });
        const dexList = Array.from(map.values());
        next[`${p.symbol}/${p.quote}`] = dexList;

        if (dexList.length >= 2) {
          const sorted = [...dexList].sort((a, b) => a.price - b.price);
          const buy = sorted[0];
          const sell = sorted[sorted.length - 1];
          const spread = ((sell.price - buy.price) / buy.price) * 100;
          if (spread > 0) {
            opps.push({
              pair: `${p.symbol}/${p.quote}`,
              buyOn: buy.exchange,
              sellOn: sell.exchange,
              buyPrice: buy.price,
              sellPrice: sell.price,
              spreadPct: spread,
              estProfitUsd: 0,
            });
          }
        }
      }
      setPrices(next);
      setOpportunities(opps.sort((a, b) => b.spreadPct - a.spreadPct));
      setLastUpdate(new Date());
    } catch (e) {
      console.error("price fetch failed", e);
    }
  }, []);

  // ===== Strategy / allocation =====
  const totalBnb = parseFloat(bnbBalance) || 0;
  const allocBnb = (totalBnb * allocPct) / 100;
  const reserveGas = 0.005; // BNB reservado para gas
  const usableBnb = Math.max(0, allocBnb - reserveGas);

  // Profit estimate per opportunity using usableBnb * buyPrice as capital proxy
  const enrichedOpps = opportunities.map((o) => {
    const capitalUsd = usableBnb * o.buyPrice;
    const grossProfit = (capitalUsd * o.spreadPct) / 100;
    const feesPct = 0.5; // ~0.25% por swap em DEX, x2
    const netProfit = grossProfit - (capitalUsd * feesPct) / 100;
    return { ...o, estProfitUsd: netProfit, capitalUsd };
  });

  // ===== Effects =====
  useEffect(() => {
    const provider = eth();
    if (!provider) return;
    const onAcc = (accs: string[]) => setAccount(accs[0] || null);
    const onChain = (cid: string) => setChainId(cid);
    provider.on?.("accountsChanged", onAcc);
    provider.on?.("chainChanged", onChain);
    // attempt eager connect
    provider.request({ method: "eth_accounts" }).then((accs: string[]) => {
      if (accs?.[0]) {
        setAccount(accs[0]);
        provider.request({ method: "eth_chainId" }).then((cid: string) => setChainId(cid));
      }
    }).catch(() => {});
    return () => {
      provider.removeListener?.("accountsChanged", onAcc);
      provider.removeListener?.("chainChanged", onChain);
    };
  }, []);

  useEffect(() => {
    if (account && onBnb) fetchBalances();
  }, [account, onBnb, fetchBalances]);

  useEffect(() => {
    fetchPrices();
    if (autoRefresh) {
      intervalRef.current = window.setInterval(fetchPrices, 15000);
      return () => {
        if (intervalRef.current) window.clearInterval(intervalRef.current);
      };
    }
  }, [autoRefresh, fetchPrices]);

  const filteredOpps = enrichedOpps.filter((o) => o.spreadPct >= minSpread);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 z-40 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Painel de Arbitragem · BNB Chain</h1>
          </div>
          <div>
            {account ? (
              <div className="flex items-center gap-2">
                <Badge variant={onBnb ? "default" : "destructive"}>
                  {onBnb ? "BNB Chain" : `Rede ${chainId}`}
                </Badge>
                <span className="text-xs font-mono">{account.slice(0, 6)}…{account.slice(-4)}</span>
                <Button size="sm" variant="ghost" onClick={disconnect}>
                  <Power className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={connect}>
                <Wallet className="h-4 w-4 mr-2" /> Conectar Carteira
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Disclaimer */}
        <Card className="border-yellow-500/40 bg-yellow-500/5">
          <CardContent className="p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-semibold">Modo seguro — execução manual</p>
              <p className="text-muted-foreground">
                Esta ferramenta apenas <strong>monitora</strong> oportunidades e <strong>prepara</strong> as transações. Cada swap exige sua confirmação na carteira. Sua chave privada nunca sai do dispositivo. Bots totalmente automatizados exigem chave privada — algo que <strong>nunca</strong> deve ser inserido em sites.
              </p>
            </div>
          </CardContent>
        </Card>

        {!account && (
          <Card>
            <CardHeader>
              <CardTitle>Conecte sua carteira</CardTitle>
              <CardDescription>
                Compatível com MetaMask, Trust Wallet, Rabby, Base Wallet (modo EVM) e qualquer wallet injetada no navegador.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={connect} size="lg">
                <Wallet className="h-5 w-5 mr-2" /> Conectar
              </Button>
            </CardContent>
          </Card>
        )}

        {account && !onBnb && (
          <Card className="border-destructive/40">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">Você não está na BNB Chain</p>
                <p className="text-sm text-muted-foreground">Mude para a BNB Smart Chain para ler o saldo correto.</p>
              </div>
              <Button onClick={switchToBnb}>Trocar para BNB</Button>
            </CardContent>
          </Card>
        )}

        {account && onBnb && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Saldos */}
            <Card className="lg:col-span-1">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Saldos da carteira</CardTitle>
                  <CardDescription>BNB Smart Chain</CardDescription>
                </div>
                <Button size="icon" variant="ghost" onClick={fetchBalances} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between p-3 rounded-md bg-muted/40">
                  <span className="font-semibold">BNB</span>
                  <span className="font-mono">{fmt(parseFloat(bnbBalance), 6)}</span>
                </div>
                {tokens.map((t) => (
                  <div key={t.symbol} className="flex justify-between p-3 rounded-md bg-muted/20 text-sm">
                    <span>{t.symbol}</span>
                    <span className="font-mono">{fmt(parseFloat(t.balance), 4)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Estratégia */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Estratégia baseada no saldo
                </CardTitle>
                <CardDescription>Configure quanto do seu BNB pode ser usado e o spread mínimo aceitável.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Alocação por trade (% do BNB)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={allocPct}
                    onChange={(e) => setAllocPct(Math.max(1, Math.min(100, Number(e.target.value) || 0)))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Disponível: <strong>{fmt(usableBnb, 6)} BNB</strong> (reserva de {reserveGas} para gas)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Spread mínimo (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    value={minSpread}
                    onChange={(e) => setMinSpread(Math.max(0, Number(e.target.value) || 0))}
                  />
                  <p className="text-xs text-muted-foreground">Filtra oportunidades abaixo desse spread.</p>
                </div>
                <div className="sm:col-span-2 flex items-center justify-between rounded-md bg-muted/30 p-3">
                  <div className="text-sm">
                    <p className="font-semibold">Auto-atualização (15s)</p>
                    <p className="text-xs text-muted-foreground">
                      {lastUpdate ? `Última: ${lastUpdate.toLocaleTimeString("pt-BR")}` : "—"}
                    </p>
                  </div>
                  <Button variant={autoRefresh ? "default" : "outline"} onClick={() => setAutoRefresh((v) => !v)}>
                    {autoRefresh ? "Ativo" : "Pausado"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Oportunidades */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" /> Oportunidades de arbitragem
              </CardTitle>
              <CardDescription>
                Diferenças de preço entre DEXs/CEXs monitorados em tempo real.
              </CardDescription>
            </div>
            <Button size="icon" variant="ghost" onClick={fetchPrices}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {filteredOpps.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Nenhuma oportunidade acima de {minSpread}% no momento. O painel atualiza automaticamente.
              </p>
            ) : (
              <div className="space-y-3">
                {filteredOpps.map((o, i) => (
                  <div key={i} className="rounded-lg border border-border/50 p-4 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Badge>{o.pair}</Badge>
                        <Badge variant={o.spreadPct >= 1 ? "default" : "secondary"}>
                          Spread: {o.spreadPct.toFixed(2)}%
                        </Badge>
                      </div>
                      <div className="text-sm">
                        Lucro estimado:{" "}
                        <span className={o.estProfitUsd > 0 ? "text-green-500 font-semibold" : "text-destructive"}>
                          ${fmt(o.estProfitUsd, 2)}
                        </span>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2 text-sm">
                      <div className="rounded-md bg-muted/30 p-2">
                        <p className="text-xs text-muted-foreground">Comprar em</p>
                        <p className="font-semibold">{o.buyOn}</p>
                        <p className="font-mono text-xs">${fmt(o.buyPrice, 4)}</p>
                      </div>
                      <div className="rounded-md bg-muted/30 p-2">
                        <p className="text-xs text-muted-foreground">Vender em</p>
                        <p className="font-semibold">{o.sellOn}</p>
                        <p className="font-mono text-xs">${fmt(o.sellPrice, 4)}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Capital simulado: ${fmt((o as any).capitalUsd, 2)} · Estimativa inclui ~0,5% de taxas.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preços por par */}
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(prices).map(([pair, list]) => (
            <Card key={pair}>
              <CardHeader>
                <CardTitle className="text-base">{pair}</CardTitle>
                <CardDescription>Preços por exchange</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {list.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados</p>
                ) : (
                  list.map((d, i) => (
                    <a
                      key={i}
                      href={d.url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2 rounded hover:bg-muted/40 text-sm"
                    >
                      <span className="flex items-center gap-1">
                        {d.exchange} {d.url && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
                      </span>
                      <span className="font-mono">${fmt(d.price, 4)}</span>
                    </a>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Arbitrage;