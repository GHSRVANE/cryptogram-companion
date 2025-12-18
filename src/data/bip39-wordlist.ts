// BIP-39 wordlist loaded from official source
const BIP39_URL = 'https://raw.githubusercontent.com/bitcoin/bips/master/bip-0039/english.txt';

let cachedWordlist: string[] | null = null;

export async function loadBip39Wordlist(): Promise<string[]> {
  if (cachedWordlist) return cachedWordlist;
  
  try {
    const response = await fetch(BIP39_URL);
    const text = await response.text();
    cachedWordlist = text.trim().split('\n').map(w => w.trim().toLowerCase());
    return cachedWordlist;
  } catch (error) {
    console.error('Failed to load BIP-39 wordlist:', error);
    return [];
  }
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
