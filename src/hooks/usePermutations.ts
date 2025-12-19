import { useState, useCallback, useRef } from 'react';

export interface PermutationResult {
  phrase: string[];
  index: number;
  tested: number;
  total: number;
}

export interface PermutationProgress {
  current: number;
  total: number;
  percentage: number;
  estimatedTimeLeft: string;
  currentPhrase: string[];
  speed: number; // permutations per second
}

// Factorial function for calculating permutation count
function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

// Generator function for permutations (memory efficient)
function* permutationGenerator<T>(arr: T[]): Generator<T[], void, unknown> {
  const length = arr.length;
  const c = new Array(length).fill(0);
  const result = [...arr];
  
  yield [...result];
  
  let i = 0;
  while (i < length) {
    if (c[i] < i) {
      if (i % 2 === 0) {
        [result[0], result[i]] = [result[i], result[0]];
      } else {
        [result[c[i]], result[i]] = [result[i], result[c[i]]];
      }
      yield [...result];
      c[i]++;
      i = 0;
    } else {
      c[i] = 0;
      i++;
    }
  }
}

export function usePermutations() {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState<PermutationProgress | null>(null);
  const [results, setResults] = useState<PermutationResult[]>([]);
  const abortRef = useRef(false);
  const pauseRef = useRef(false);
  const startTimeRef = useRef<number>(0);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
    return `${Math.round(seconds / 86400)}d`;
  };

  const testPermutations = useCallback(async (
    words: string[],
    validateFn: (phrase: string[]) => Promise<boolean> | boolean,
    onMatch?: (result: PermutationResult) => void
  ): Promise<PermutationResult[]> => {
    if (words.length === 0) return [];
    if (words.length > 12) {
      console.warn('Too many words for permutation testing.');
      return [];
    }

    const total = factorial(words.length);
    const matchedResults: PermutationResult[] = [];
    
    setIsRunning(true);
    setIsPaused(false);
    setResults([]);
    abortRef.current = false;
    pauseRef.current = false;
    startTimeRef.current = Date.now();

    let tested = 0;
    const generator = permutationGenerator(words);
    const batchSize = 1000; // Process in batches for better UI responsiveness

    const processBatch = async (): Promise<void> => {
      const batchStart = Date.now();
      let batchCount = 0;

      while (batchCount < batchSize) {
        // Check for abort
        if (abortRef.current) {
          setIsRunning(false);
          return;
        }

        // Check for pause
        while (pauseRef.current) {
          await new Promise(resolve => setTimeout(resolve, 100));
          if (abortRef.current) {
            setIsRunning(false);
            return;
          }
        }

        const next = generator.next();
        if (next.done) {
          setIsRunning(false);
          setProgress(null);
          return;
        }

        const currentPhrase: string[] = next.value as string[];
        tested++;
        batchCount++;

        // Test this permutation
        const isValid = await validateFn(currentPhrase);
        if (isValid) {
          const result: PermutationResult = {
            phrase: [...currentPhrase],
            index: tested,
            tested,
            total
          };
          matchedResults.push(result);
          setResults([...matchedResults]);
          onMatch?.(result);
        }

        // Update progress every 100 permutations
        if (tested % 100 === 0 || tested === total) {
          const elapsed = (Date.now() - startTimeRef.current) / 1000;
          const speed = tested / elapsed;
          const remaining = total - tested;
          const estimatedTimeLeft = remaining / speed;

          setProgress({
            current: tested,
            total,
            percentage: (tested / total) * 100,
            estimatedTimeLeft: formatTime(estimatedTimeLeft),
            currentPhrase: [...currentPhrase],
            speed: Math.round(speed)
          });
        }
      }

      // Schedule next batch with a small delay for UI updates
      setTimeout(processBatch, 0);
    };

    await processBatch();
    return matchedResults;
  }, []);

  const pause = useCallback(() => {
    pauseRef.current = true;
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    pauseRef.current = false;
    setIsPaused(false);
  }, []);

  const abort = useCallback(() => {
    abortRef.current = true;
    pauseRef.current = false;
    setIsRunning(false);
    setIsPaused(false);
  }, []);

  const getPermutationCount = useCallback((wordCount: number): number => {
    return factorial(wordCount);
  }, []);

  return {
    testPermutations,
    pause,
    resume,
    abort,
    isRunning,
    isPaused,
    progress,
    results,
    getPermutationCount
  };
}
