// Enhanced BIP-39 word matching with fuzzy search and easter egg detection

export interface MatchResult {
  original: string;
  matched: string | null;
  score: number;
  isExact: boolean;
  alternatives: string[];
}

export interface EasterEgg {
  type: 'hidden_text' | 'reversed_word' | 'number_position' | 'pattern' | 'trap';
  description: string;
  hint: string;
  confidence: number;
}

// Common OCR mistakes mapping
const OCR_CORRECTIONS: Record<string, string> = {
  '0': 'o',
  '1': 'l',
  '5': 's',
  '8': 'b',
  'rn': 'm',
  'vv': 'w',
  'cl': 'd',
  'ii': 'u',
};

// Levenshtein distance for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Apply OCR corrections
function applyOcrCorrections(word: string): string[] {
  const variants = [word];
  let corrected = word.toLowerCase();

  for (const [wrong, right] of Object.entries(OCR_CORRECTIONS)) {
    if (corrected.includes(wrong)) {
      variants.push(corrected.replace(new RegExp(wrong, 'g'), right));
    }
  }

  return [...new Set(variants)];
}

// Find best BIP-39 match for a word
export function findBestBip39Match(
  word: string,
  wordlist: string[],
  threshold: number = 0.7
): MatchResult {
  const lower = word.toLowerCase().trim();
  const variants = applyOcrCorrections(lower);
  
  let bestMatch: string | null = null;
  let bestScore = 0;
  let isExact = false;
  const alternatives: string[] = [];

  for (const variant of variants) {
    // Check exact match first
    if (wordlist.includes(variant)) {
      return {
        original: word,
        matched: variant,
        score: 1,
        isExact: true,
        alternatives: []
      };
    }

    // Fuzzy matching
    for (const bip39Word of wordlist) {
      // Prefix match
      if (bip39Word.startsWith(variant) || variant.startsWith(bip39Word)) {
        const score = Math.min(variant.length, bip39Word.length) / Math.max(variant.length, bip39Word.length);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = bip39Word;
        }
        if (score > 0.6) {
          alternatives.push(bip39Word);
        }
      }

      // Levenshtein distance
      const distance = levenshteinDistance(variant, bip39Word);
      const maxLen = Math.max(variant.length, bip39Word.length);
      const similarity = 1 - (distance / maxLen);

      if (similarity > bestScore) {
        bestScore = similarity;
        bestMatch = bip39Word;
      }
      if (similarity > 0.6 && !alternatives.includes(bip39Word)) {
        alternatives.push(bip39Word);
      }
    }
  }

  // Filter alternatives to top 5
  const topAlternatives = alternatives
    .map(alt => ({ word: alt, score: 1 - levenshteinDistance(lower, alt) / Math.max(lower.length, alt.length) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(a => a.word);

  return {
    original: word,
    matched: bestScore >= threshold ? bestMatch : null,
    score: bestScore,
    isExact: false,
    alternatives: topAlternatives.filter(a => a !== bestMatch)
  };
}

// Batch match all words
export function matchAllWords(
  words: string[],
  wordlist: string[]
): MatchResult[] {
  return words.map(word => findBestBip39Match(word, wordlist));
}

// Detect easter eggs and traps in the image content
export function detectEasterEggs(
  words: string[],
  objects: Array<{ text: string; type: string }>,
  rawText: string
): EasterEgg[] {
  const eggs: EasterEgg[] = [];

  // Check for reversed words
  for (const word of words) {
    const reversed = word.split('').reverse().join('');
    if (reversed !== word && reversed.length >= 3) {
      eggs.push({
        type: 'reversed_word',
        description: `Palavra "${word}" invertida é "${reversed}"`,
        hint: `Verifique se "${reversed}" é uma palavra BIP-39`,
        confidence: 0.6
      });
    }
  }

  // Check for numbers that could indicate positions
  const numbers = objects.filter(o => o.type === 'number').map(o => o.text);
  if (numbers.length > 0) {
    const uniqueNums = [...new Set(numbers)].sort((a, b) => parseInt(a) - parseInt(b));
    eggs.push({
      type: 'number_position',
      description: `Números encontrados: ${uniqueNums.join(', ')}`,
      hint: 'Estes números podem indicar a ordem das palavras',
      confidence: 0.8
    });
  }

  // Check for hidden patterns in text
  const patterns = [
    { regex: /\d+\s*[:.-]\s*\w+/g, name: 'número-palavra' },
    { regex: /[A-Z][a-z]+/g, name: 'capitalização' },
    { regex: /_{2,}/g, name: 'underscores' },
    { regex: /\.{3,}/g, name: 'reticências' },
  ];

  for (const { regex, name } of patterns) {
    const matches = rawText.match(regex);
    if (matches && matches.length > 0) {
      eggs.push({
        type: 'pattern',
        description: `Padrão "${name}" encontrado: ${matches.slice(0, 3).join(', ')}${matches.length > 3 ? '...' : ''}`,
        hint: `Este padrão pode conter pistas sobre a ordem ou palavras`,
        confidence: 0.5
      });
    }
  }

  // Common puzzle traps
  const trapWords = ['fake', 'wrong', 'trap', 'false', 'decoy', 'trick', 'not', 'ignore'];
  for (const word of words) {
    if (trapWords.some(t => word.toLowerCase().includes(t))) {
      eggs.push({
        type: 'trap',
        description: `Possível armadilha detectada: "${word}"`,
        hint: 'Cuidado! Esta palavra pode indicar uma pista falsa',
        confidence: 0.9
      });
    }
  }

  // Check for acrostic patterns (first letters)
  if (words.length >= 4) {
    const firstLetters = words.slice(0, 12).map(w => w[0]?.toLowerCase() || '').join('');
    if (firstLetters.length >= 4) {
      eggs.push({
        type: 'hidden_text',
        description: `Primeiras letras: "${firstLetters}"`,
        hint: 'Acróstico pode formar uma palavra ou dica',
        confidence: 0.4
      });
    }
  }

  // Check for word count hints
  const wordCounts = rawText.match(/\b(twelve|12|doze)\b/gi);
  if (wordCounts) {
    eggs.push({
      type: 'pattern',
      description: 'Referência ao número 12 encontrada',
      hint: 'Confirma que são 12 palavras na seed phrase',
      confidence: 0.9
    });
  }

  return eggs.sort((a, b) => b.confidence - a.confidence);
}

// Suggest possible word orders based on position hints
export function suggestWordOrder(
  words: Array<{ text: string; position: { x: number; y: number }; zone: number }>,
  numbers: string[]
): string[][] {
  const suggestions: string[][] = [];

  // Order by position (top-left to bottom-right)
  const byPosition = [...words]
    .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)
    .map(w => w.text);
  suggestions.push(byPosition);

  // Order by zone (1, 2, 3 for 3-photo collage)
  const byZone = [...words]
    .sort((a, b) => a.zone - b.zone || a.position.y - b.position.y)
    .map(w => w.text);
  if (JSON.stringify(byZone) !== JSON.stringify(byPosition)) {
    suggestions.push(byZone);
  }

  // Reverse order
  suggestions.push([...byPosition].reverse());

  // If numbers are found, try to use them as indices
  if (numbers.length > 0) {
    const numericOrder = numbers
      .map(n => parseInt(n))
      .filter(n => n >= 1 && n <= 12);
    
    if (numericOrder.length >= 3) {
      // This hints at explicit ordering
      suggestions.push([...words.map(w => w.text)]);
    }
  }

  return suggestions;
}
