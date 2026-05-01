import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Wallet, RefreshCw, AlertTriangle, TrendingUp, Zap, ArrowLeft, ExternalLink, Power, Activity, Brain, PieChart, Target, ShieldAlert, RefreshCcw, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  { symbol: "WBNB", address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", decimals: 18, cgId: "wbnb", isStable: false },
  { symbol: "BUSD", address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", decimals: 18, cgId: "binance-usd", isStable: true },
  { symbol: "USDT", address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18, cgId: "tether", isStable: true },
  { symbol: "USDC", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18, cgId: "usd-coin", isStable: true },
  { symbol: "CAKE", address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", decimals: 18, cgId: "pancakeswap-token", isStable: false },
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

// EIP-6963 wallet discovery
interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}
interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: any;
}

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

interface AssetWithPrice extends TokenBalance {
  priceUsd: number;
  valueUsd: number;
  isStable: boolean;
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
  const [usdPrices, setUsdPrices] = useState<Record<string, number>>({});
  const intervalRef = useRef<number | null>(null);
  const [providers, setProviders] = useState<EIP6963ProviderDetail[]>([]);
  const [activeProvider, setActiveProvider] = useState<any>(null);
  const [activeWalletInfo, setActiveWalletInfo] = useState<EIP6963ProviderInfo | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const onBnb = chainId === BNB_CHAIN_ID_HEX;

  // ===== EIP-6963 wallet discovery =====
  const discoverWallets = useCallback(() => {
    if (typeof window === "undefined") return;
    setProviders([]);
    const onAnnounce = (event: any) => {
      const detail = event.detail as EIP6963ProviderDetail;
      setProviders((prev) => {
        if (prev.some((p) => p.info.uuid === detail.info.uuid)) return prev;
        return [...prev, detail];
      });
    };
    window.addEventListener("eip6963:announceProvider", onAnnounce as any);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    // Re-request after a tick to catch late announcers
    setTimeout(() => window.dispatchEvent(new Event("eip6963:requestProvider")), 300);
    return () => window.removeEventListener("eip6963:announceProvider", onAnnounce as any);
  }, []);

  // ===== Wallet connection =====
  const connectWithProvider = useCallback(async (provider: any, info?: EIP6963ProviderInfo) => {
    if (!provider) {
      toast.error("Provedor inválido");
      return;
    }
    setConnecting(true);
    try {
      const accs: string[] = await provider.request({ method: "eth_requestAccounts" });
      const cid: string = await provider.request({ method: "eth_chainId" });
      setActiveProvider(provider);
      setActiveWalletInfo(info || null);
      setAccount(accs[0]);
      setChainId(cid);
      setPickerOpen(false);
      toast.success(`${info?.name || "Carteira"} conectada`);
    } catch (e: any) {
      if (e?.code === 4001) {
        toast.error("Conexão recusada pelo usuário");
      } else if (e?.code === -32002) {
        toast.error("Solicitação pendente — abra sua carteira");
      } else {
        toast.error(e?.message || "Falha ao conectar");
      }
    } finally {
      setConnecting(false);
    }
  }, []);

  const openWalletPicker = useCallback(() => {
    discoverWallets();
    setPickerOpen(true);
  }, [discoverWallets]);

  const connect = useCallback(async () => {
    // Re-run discovery and decide flow
    discoverWallets();
    setTimeout(() => {
      setProviders((current) => {
        if (current.length === 0) {
          const fallback = eth();
          if (fallback) {
            connectWithProvider(fallback, { uuid: "injected", name: "Carteira do navegador", icon: "", rdns: "injected" });
          } else {
            toast.error("Nenhuma carteira detectada. Instale MetaMask, Trust Wallet, Rabby ou outra wallet EVM.");
          }
          return current;
        }
        if (current.length === 1) {
          connectWithProvider(current[0].provider, current[0].info);
        } else {
          setPickerOpen(true);
        }
        return current;
      });
    }, 350);
  }, [discoverWallets, connectWithProvider]);

  const disconnect = useCallback(async () => {
    const provider = activeProvider || eth();
    if (provider) {
      // Try real revoke (MetaMask, Rabby support this)
      try {
        await provider.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }],
        });
        toast.success("Permissões revogadas na carteira");
      } catch {
        toast.info("Sessão encerrada localmente. Para revogar totalmente, faça-o nas configurações da sua carteira.");
      }
    }
    setAccount(null);
    setChainId(null);
    setActiveProvider(null);
    setActiveWalletInfo(null);
    setBnbBalance("0");
    setTokens([]);
  }, [activeProvider]);

  const switchWallet = useCallback(async () => {
    await disconnect();
    setTimeout(() => openWalletPicker(), 200);
  }, [disconnect, openWalletPicker]);

  const switchToBnb = async () => {
    const provider = activeProvider || eth();
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
    const provider = activeProvider || eth();
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
  }, [account, activeProvider]);

  // ===== Price monitoring (CoinGecko tickers, public API) =====
  const fetchPrices = useCallback(async () => {
    try {
      // Fetch USD prices for all tracked tokens + BNB in parallel
      const ids = ["binancecoin", ...TOKENS.map((t) => t.cgId)].join(",");
      try {
        const pr = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
        if (pr.ok) {
          const pj = await pr.json();
          const map: Record<string, number> = {
            BNB: pj["binancecoin"]?.usd ?? 0,
          };
          TOKENS.forEach((t) => {
            map[t.symbol] = pj[t.cgId]?.usd ?? (t.isStable ? 1 : 0);
          });
          setUsdPrices(map);
        }
      } catch {}

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

  // ===== Smart balance analysis =====
  const assets: AssetWithPrice[] = [
    {
      symbol: "BNB",
      balance: bnbBalance,
      raw: 0n,
      priceUsd: usdPrices["BNB"] ?? 0,
      valueUsd: (parseFloat(bnbBalance) || 0) * (usdPrices["BNB"] ?? 0),
      isStable: false,
    },
    ...tokens.map((t) => {
      const meta = TOKENS.find((x) => x.symbol === t.symbol);
      const price = usdPrices[t.symbol] ?? (meta?.isStable ? 1 : 0);
      return {
        ...t,
        priceUsd: price,
        valueUsd: (parseFloat(t.balance) || 0) * price,
        isStable: meta?.isStable ?? false,
      };
    }),
  ].filter((a) => parseFloat(a.balance) > 0);

  const totalUsd = assets.reduce((s, a) => s + a.valueUsd, 0);
  const stableUsd = assets.filter((a) => a.isStable).reduce((s, a) => s + a.valueUsd, 0);
  const volatileUsd = totalUsd - stableUsd;
  const stablePct = totalUsd > 0 ? (stableUsd / totalUsd) * 100 : 0;
  const largestAsset = [...assets].sort((a, b) => b.valueUsd - a.valueUsd)[0];

  // Risk profile based on portfolio composition + total size
  let riskProfile: { label: string; tone: "low" | "med" | "high"; advice: string } = {
    label: "Indefinido",
    tone: "med",
    advice: "Conecte sua carteira para análise.",
  };
  if (totalUsd > 0) {
    if (totalUsd < 50) {
      riskProfile = {
        label: "Capital muito baixo",
        tone: "high",
        advice: "Com menos de $50, taxas de gas e DEX (≈$0,30–$1 por swap) consomem o lucro. Recomendado acumular antes de operar.",
      };
    } else if (stablePct > 70) {
      riskProfile = {
        label: "Conservador (alto % stable)",
        tone: "low",
        advice: "Boa base para arbitragem stable→volátil→stable. Use spreads ≥ 0,8% e alocação de 10–20%.",
      };
    } else if (stablePct < 20) {
      riskProfile = {
        label: "Agressivo (quase tudo volátil)",
        tone: "high",
        advice: "Exposição alta a volatilidade. Considere converter parte para stable antes de arbitragem ou usar alocação ≤ 10%.",
      };
    } else {
      riskProfile = {
        label: "Equilibrado",
        tone: "med",
        advice: "Boa diversificação. Foque em pares com seu maior saldo para minimizar swaps extras.",
      };
    }
  }

  // Recommended pair: prefer the one matching user's largest holding
  const recommendedOpp = (() => {
    if (!largestAsset || opportunities.length === 0) return null;
    const matching = opportunities.find((o) => o.pair.startsWith(largestAsset.symbol + "/"));
    return matching || opportunities[0];
  })();

  // Recommended allocation (USD) based on risk
  const recommendedAllocPct = riskProfile.tone === "low" ? 20 : riskProfile.tone === "med" ? 12 : 6;
  const recommendedCapitalUsd = (totalUsd * recommendedAllocPct) / 100;
  const minProfitableSpread = totalUsd > 0 ? Math.max(0.3, (1.5 / Math.max(recommendedCapitalUsd, 1)) * 100 + 0.5) : 1;

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
    // Discover all injected wallets (EIP-6963)
    discoverWallets();
  }, [discoverWallets]);

  useEffect(() => {
    const provider = activeProvider || eth();
    if (!provider) return;
    const onAcc = (accs: string[]) => {
      if (!accs || accs.length === 0) {
        setAccount(null);
        setActiveProvider(null);
        setActiveWalletInfo(null);
        toast.info("Carteira desconectada");
      } else {
        setAccount(accs[0]);
      }
    };
    const onChain = (cid: string) => setChainId(cid);
    const onDisc = () => {
      setAccount(null);
      setActiveProvider(null);
      setActiveWalletInfo(null);
    };
    provider.on?.("accountsChanged", onAcc);
    provider.on?.("chainChanged", onChain);
    provider.on?.("disconnect", onDisc);
    // Eager connect only if no explicit provider chosen yet
    if (!activeProvider && !account) {
      provider.request({ method: "eth_accounts" }).then((accs: string[]) => {
        if (accs?.[0]) {
          setAccount(accs[0]);
          provider.request({ method: "eth_chainId" }).then((cid: string) => setChainId(cid));
        }
      }).catch(() => {});
    }
    return () => {
      provider.removeListener?.("accountsChanged", onAcc);
      provider.removeListener?.("chainChanged", onChain);
      provider.removeListener?.("disconnect", onDisc);
    };
  }, [activeProvider, account]);

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
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
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
                  <div className="text-right">
                    <div className="font-mono">{fmt(parseFloat(bnbBalance), 6)}</div>
                    <div className="text-xs text-muted-foreground">${fmt((parseFloat(bnbBalance) || 0) * (usdPrices["BNB"] || 0), 2)}</div>
                  </div>
                </div>
                {tokens.map((t) => (
                  <div key={t.symbol} className="flex justify-between p-3 rounded-md bg-muted/20 text-sm">
                    <span>{t.symbol}</span>
                    <div className="text-right">
                      <div className="font-mono">{fmt(parseFloat(t.balance), 4)}</div>
                      <div className="text-xs text-muted-foreground">${fmt((parseFloat(t.balance) || 0) * (usdPrices[t.symbol] || 0), 2)}</div>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between p-3 mt-2 rounded-md border border-primary/40 bg-primary/5">
                  <span className="font-semibold text-sm">Total carteira</span>
                  <span className="font-mono font-semibold">${fmt(totalUsd, 2)}</span>
                </div>
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

        {/* ===== Smart Balance Analysis ===== */}
        {account && onBnb && totalUsd > 0 && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" /> Análise inteligente do saldo
              </CardTitle>
              <CardDescription>
                O bot examina a composição da sua carteira e recomenda parâmetros adequados ao seu perfil.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Distribuição */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="flex items-center gap-2 font-semibold">
                    <PieChart className="h-4 w-4 text-primary" /> Distribuição
                  </span>
                  <span className="text-muted-foreground">
                    Stable {stablePct.toFixed(0)}% · Volátil {(100 - stablePct).toFixed(0)}%
                  </span>
                </div>
                <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                  <div className="bg-primary" style={{ width: `${stablePct}%` }} />
                  <div className="bg-orange-500" style={{ width: `${100 - stablePct}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div className="rounded-md bg-muted/30 p-2">
                    <p className="text-muted-foreground">Stablecoins</p>
                    <p className="font-mono font-semibold">${fmt(stableUsd, 2)}</p>
                  </div>
                  <div className="rounded-md bg-muted/30 p-2">
                    <p className="text-muted-foreground">Voláteis (BNB, CAKE...)</p>
                    <p className="font-mono font-semibold">${fmt(volatileUsd, 2)}</p>
                  </div>
                </div>
              </div>

              {/* Perfil de risco */}
              <div className="rounded-md p-3 border border-border/50 bg-muted/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-2 font-semibold text-sm">
                    <ShieldAlert className="h-4 w-4 text-primary" /> Perfil detectado
                  </span>
                  <Badge
                    variant={riskProfile.tone === "low" ? "default" : riskProfile.tone === "high" ? "destructive" : "secondary"}
                  >
                    {riskProfile.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{riskProfile.advice}</p>
              </div>

              {/* Recomendação */}
              <div className="rounded-md p-3 border border-primary/30 bg-primary/5 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Target className="h-4 w-4 text-primary" /> Recomendação personalizada
                </div>
                <div className="grid sm:grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Alocação sugerida</p>
                    <p className="font-mono font-semibold">{recommendedAllocPct}% (${fmt(recommendedCapitalUsd, 2)})</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Spread mínimo viável</p>
                    <p className="font-mono font-semibold">{minProfitableSpread.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Maior posição</p>
                    <p className="font-mono font-semibold">{largestAsset?.symbol} (${fmt(largestAsset?.valueUsd || 0, 2)})</p>
                  </div>
                </div>
                {recommendedOpp ? (
                  <div className="text-sm pt-2 border-t border-border/40">
                    <p className="text-muted-foreground text-xs mb-1">Melhor par para o seu saldo agora:</p>
                    <p>
                      <strong>{recommendedOpp.pair}</strong> — comprar em <strong>{recommendedOpp.buyOn}</strong>{" "}
                      (${fmt(recommendedOpp.buyPrice, 4)}) e vender em <strong>{recommendedOpp.sellOn}</strong>{" "}
                      (${fmt(recommendedOpp.sellPrice, 4)}) · spread {recommendedOpp.spreadPct.toFixed(2)}%
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border/40">
                    Aguardando dados de mercado para recomendar par...
                  </p>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => {
                    setAllocPct(recommendedAllocPct);
                    setMinSpread(Number(minProfitableSpread.toFixed(2)));
                    toast.success("Parâmetros aplicados à estratégia");
                  }}
                >
                  Aplicar parâmetros recomendados
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground italic">
                Análise informativa — não é recomendação financeira. Cada trade ainda exige sua confirmação na carteira.
              </p>
            </CardContent>
          </Card>
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
                        <span className={o.estProfitUsd > 0 ? "text-primary font-semibold" : "text-destructive"}>
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