// BIP-39 wordlists - English and Portuguese
const BIP39_EN_URL = 'https://raw.githubusercontent.com/bitcoin/bips/master/bip-0039/english.txt';
const BIP39_PT_URL = 'https://raw.githubusercontent.com/bitcoin/bips/master/bip-0039/portuguese.txt';

export type Language = 'english' | 'portuguese';

interface WordlistCache {
  english: string[] | null;
  portuguese: string[] | null;
}

const cache: WordlistCache = {
  english: null,
  portuguese: null
};

export async function loadBip39Wordlist(language: Language = 'english'): Promise<string[]> {
  if (cache[language]) return cache[language]!;
  
  const url = language === 'english' ? BIP39_EN_URL : BIP39_PT_URL;
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    const words = text.trim().split('\n').map(w => w.trim().toLowerCase());
    cache[language] = words;
    return words;
  } catch (error) {
    console.error(`Failed to load BIP-39 wordlist (${language}):`, error);
    return [];
  }
}

export async function loadAllWordlists(): Promise<{ english: string[]; portuguese: string[] }> {
  const [english, portuguese] = await Promise.all([
    loadBip39Wordlist('english'),
    loadBip39Wordlist('portuguese')
  ]);
  return { english, portuguese };
}

export function isValidBip39Word(word: string, wordlist: string[]): boolean {
  return wordlist.includes(word.toLowerCase());
}

export function findMatchingWords(partial: string, wordlist: string[]): string[] {
  const lower = partial.toLowerCase();
  return wordlist.filter(w => w.startsWith(lower));
}

export function getWordIndex(word: string, wordlist: string[]): number {
  return wordlist.indexOf(word.toLowerCase());
}

export function detectLanguage(word: string, wordlists: { english: string[]; portuguese: string[] }): Language | null {
  const lower = word.toLowerCase();
  if (wordlists.english.includes(lower)) return 'english';
  if (wordlists.portuguese.includes(lower)) return 'portuguese';
  return null;
}

export function findBestMatch(word: string, wordlist: string[]): { word: string; score: number } | null {
  const lower = word.toLowerCase();
  
  // Exact match
  if (wordlist.includes(lower)) {
    return { word: lower, score: 1 };
  }
  
  // Find closest matches using simple edit distance approximation
  let bestMatch: { word: string; score: number } | null = null;
  
  for (const candidate of wordlist) {
    // Check prefix match
    if (candidate.startsWith(lower) || lower.startsWith(candidate)) {
      const score = Math.min(lower.length, candidate.length) / Math.max(lower.length, candidate.length);
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { word: candidate, score };
      }
    }
    
    // Check character overlap
    let matchCount = 0;
    for (let i = 0; i < Math.min(lower.length, candidate.length); i++) {
      if (lower[i] === candidate[i]) matchCount++;
    }
    const overlapScore = matchCount / Math.max(lower.length, candidate.length);
    
    if (overlapScore > 0.7 && (!bestMatch || overlapScore > bestMatch.score)) {
      bestMatch = { word: candidate, score: overlapScore };
    }
  }
  
  return bestMatch;
}
