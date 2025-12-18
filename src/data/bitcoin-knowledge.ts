// Bitcoin-related hints and knowledge for puzzle solving

export interface BitcoinHint {
  category: string;
  keywords: string[];
  description: string;
  relatedWords: string[];
}

export const bitcoinKnowledge: BitcoinHint[] = [
  {
    category: "Genesis",
    keywords: ["genesis", "first", "block", "satoshi", "nakamoto"],
    description: "Related to Bitcoin's creation and the genesis block",
    relatedWords: ["abandon", "ability", "able", "abstract", "absurd"]
  },
  {
    category: "Mining",
    keywords: ["mine", "mining", "hash", "proof", "work", "nonce"],
    description: "Related to Bitcoin mining and proof of work",
    relatedWords: ["energy", "electric", "machine", "power", "solve"]
  },
  {
    category: "Wallet",
    keywords: ["wallet", "key", "seed", "phrase", "backup", "recovery"],
    description: "Related to Bitcoin wallets and key management",
    relatedWords: ["abandon", "ability", "able", "about", "above"]
  },
  {
    category: "Transaction",
    keywords: ["transaction", "send", "receive", "utxo", "fee"],
    description: "Related to Bitcoin transactions",
    relatedWords: ["transfer", "amount", "output", "input", "verify"]
  },
  {
    category: "Network",
    keywords: ["network", "node", "peer", "broadcast", "mempool"],
    description: "Related to the Bitcoin network",
    relatedWords: ["connect", "network", "node", "public", "private"]
  },
  {
    category: "Security",
    keywords: ["security", "encrypt", "signature", "verify", "protect"],
    description: "Related to Bitcoin security",
    relatedWords: ["security", "secret", "safe", "protect", "guard"]
  }
];

export const puzzlePatterns = {
  // Common first words in seed phrases
  commonFirstWords: ["abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract"],
  
  // Words that often appear together
  wordPairs: [
    ["abandon", "ability"],
    ["abstract", "absurd"],
    ["acoustic", "acquire"],
  ],
  
  // Thematic groupings
  themes: {
    nature: ["ocean", "forest", "mountain", "river", "desert", "island"],
    animals: ["wolf", "eagle", "tiger", "lion", "bear", "deer"],
    objects: ["clock", "mirror", "window", "bridge", "tower", "garden"],
    actions: ["abandon", "absorb", "abstract", "abuse", "access", "accident"]
  }
};

export function findHintsByKeyword(keyword: string): BitcoinHint[] {
  const lower = keyword.toLowerCase();
  return bitcoinKnowledge.filter(hint => 
    hint.keywords.some(k => k.includes(lower)) ||
    hint.category.toLowerCase().includes(lower)
  );
}

export function getRelatedWords(category: string): string[] {
  const hint = bitcoinKnowledge.find(h => h.category.toLowerCase() === category.toLowerCase());
  return hint?.relatedWords || [];
}
