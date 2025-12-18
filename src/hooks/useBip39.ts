import { useState, useEffect, useCallback } from 'react';
import { loadBip39Wordlist, isValidBip39Word, findMatchingWords } from '@/data/bip39-wordlist';

export function useBip39() {
  const [wordlist, setWordlist] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const words = await loadBip39Wordlist();
        if (words.length === 0) {
          setError('Failed to load wordlist');
        } else {
          setWordlist(words);
          setError(null);
        }
      } catch (err) {
        setError('Failed to load BIP-39 wordlist');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const validateWord = useCallback((word: string): boolean => {
    return isValidBip39Word(word, wordlist);
  }, [wordlist]);

  const getSuggestions = useCallback((partial: string): string[] => {
    if (!partial || partial.length < 1) return [];
    return findMatchingWords(partial, wordlist).slice(0, 10);
  }, [wordlist]);

  return {
    wordlist,
    isLoading,
    error,
    validateWord,
    getSuggestions
  };
}
