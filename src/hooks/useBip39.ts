import { useState, useEffect, useCallback } from 'react';
import { 
  loadAllWordlists, 
  isValidBip39Word, 
  findMatchingWords, 
  detectLanguage,
  findBestMatch,
  type Language 
} from '@/data/bip39-wordlist';

export function useBip39() {
  const [wordlists, setWordlists] = useState<{ english: string[]; portuguese: string[] }>({
    english: [],
    portuguese: []
  });
  const [activeLanguage, setActiveLanguage] = useState<Language>('english');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const lists = await loadAllWordlists();
        if (lists.english.length === 0 && lists.portuguese.length === 0) {
          setError('Failed to load wordlists');
        } else {
          setWordlists(lists);
          setError(null);
        }
      } catch (err) {
        setError('Failed to load BIP-39 wordlists');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const wordlist = wordlists[activeLanguage];

  const validateWord = useCallback((word: string): boolean => {
    return isValidBip39Word(word, wordlist);
  }, [wordlist]);

  const validateWordAnyLanguage = useCallback((word: string): { valid: boolean; language: Language | null } => {
    const lang = detectLanguage(word, wordlists);
    return { valid: lang !== null, language: lang };
  }, [wordlists]);

  const getSuggestions = useCallback((partial: string): string[] => {
    if (!partial || partial.length < 1) return [];
    return findMatchingWords(partial, wordlist).slice(0, 10);
  }, [wordlist]);

  const findBestMatchForWord = useCallback((word: string): { word: string; score: number } | null => {
    // Try both languages
    const enMatch = findBestMatch(word, wordlists.english);
    const ptMatch = findBestMatch(word, wordlists.portuguese);
    
    if (!enMatch && !ptMatch) return null;
    if (!enMatch) return ptMatch;
    if (!ptMatch) return enMatch;
    
    return enMatch.score >= ptMatch.score ? enMatch : ptMatch;
  }, [wordlists]);

  return {
    wordlist,
    wordlists,
    activeLanguage,
    setActiveLanguage,
    isLoading,
    error,
    validateWord,
    validateWordAnyLanguage,
    getSuggestions,
    findBestMatchForWord
  };
}
