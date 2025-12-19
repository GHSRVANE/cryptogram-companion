import { useState, useMemo } from 'react';
import { useBip39 } from '@/hooks/useBip39';
import { WordInput } from './WordInput';
import { ImageAnalyzer } from './ImageAnalyzer';
import { PermutationSolver } from './PermutationSolver';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Copy, Check, RefreshCw, Lightbulb, Bitcoin, Shuffle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { findHintsByKeyword } from '@/data/bitcoin-knowledge';

interface WordSlot {
  value: string;
  isLocked: boolean;
}

export function PuzzleSolver() {
  const { 
    isLoading, 
    error, 
    validateWord, 
    validateWordAnyLanguage,
    getSuggestions,
    activeLanguage,
    setActiveLanguage 
  } = useBip39();
  const { toast } = useToast();
  const [wordCount, setWordCount] = useState<12 | 24>(12);
  const [words, setWords] = useState<WordSlot[]>(
    Array(12).fill(null).map(() => ({ value: '', isLocked: false }))
  );
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPermutations, setShowPermutations] = useState(false);

  const handleWordCountChange = (count: 12 | 24) => {
    setWordCount(count);
    setWords(prev => {
      const newWords = Array(count).fill(null).map((_, i) => 
        prev[i] || { value: '', isLocked: false }
      );
      return newWords;
    });
  };

  const handleWordChange = (index: number, value: string) => {
    if (words[index].isLocked) return;
    const newWords = [...words];
    newWords[index] = { ...newWords[index], value };
    setWords(newWords);
  };

  const handleWordsFromImage = (extractedWords: string[]) => {
    const newWords = [...words];
    let insertIndex = 0;
    
    // Find first empty slot or start from beginning
    for (let i = 0; i < newWords.length; i++) {
      if (!newWords[i].value && !newWords[i].isLocked) {
        insertIndex = i;
        break;
      }
    }

    // Insert extracted words
    for (const word of extractedWords) {
      if (insertIndex >= newWords.length) break;
      
      // Skip locked slots
      while (insertIndex < newWords.length && newWords[insertIndex].isLocked) {
        insertIndex++;
      }
      
      if (insertIndex < newWords.length) {
        newWords[insertIndex] = { value: word, isLocked: false };
        insertIndex++;
      }
    }

    setWords(newWords);
    toast({
      title: "Words Applied",
      description: `${Math.min(extractedWords.length, wordCount)} words added from image`
    });
  };

  const validationResults = useMemo(() => {
    return words.map(w => {
      if (!w.value) return { valid: null, language: null };
      const result = validateWordAnyLanguage(w.value);
      return { valid: result.valid, language: result.language };
    });
  }, [words, validateWordAnyLanguage]);

  const suggestions = useMemo(() => {
    if (activeIndex === null) return [];
    const word = words[activeIndex]?.value || '';
    return getSuggestions(word);
  }, [activeIndex, words, getSuggestions]);

  const validCount = validationResults.filter(v => v.valid === true).length;
  const progress = (validCount / wordCount) * 100;

  // Get all valid words for permutation testing
  const validWordsForPermutation = useMemo(() => {
    return words
      .map(w => w.value)
      .filter(v => {
        if (!v) return false;
        const result = validateWordAnyLanguage(v);
        return result.valid;
      });
  }, [words, validateWordAnyLanguage]);

  const handleCopy = async () => {
    const phrase = words.map(w => w.value).join(' ');
    await navigator.clipboard.writeText(phrase);
    setCopied(true);
    toast({ title: "Copied!", description: "Seed phrase copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setWords(Array(wordCount).fill(null).map(() => ({ value: '', isLocked: false })));
    toast({ title: "Reset", description: "All words cleared" });
  };

  const currentHints = useMemo(() => {
    if (activeIndex === null) return [];
    const word = words[activeIndex]?.value || '';
    return findHintsByKeyword(word);
  }, [activeIndex, words]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading BIP-39 wordlists (EN/PT)...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-destructive">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Image Analyzer */}
      <ImageAnalyzer onWordsExtracted={handleWordsFromImage} />

      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant={wordCount === 12 ? "default" : "outline"}
            size="sm"
            onClick={() => handleWordCountChange(12)}
          >
            12 Words
          </Button>
          <Button
            variant={wordCount === 24 ? "default" : "outline"}
            size="sm"
            onClick={() => handleWordCountChange(24)}
          >
            24 Words
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Tabs value={activeLanguage} onValueChange={(v) => setActiveLanguage(v as 'english' | 'portuguese')}>
            <TabsList className="h-8">
              <TabsTrigger value="english" className="text-xs px-2">English</TabsTrigger>
              <TabsTrigger value="portuguese" className="text-xs px-2">Português</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant={showPermutations ? "default" : "outline"} 
            size="sm" 
            onClick={() => setShowPermutations(!showPermutations)}
          >
            <Shuffle className="w-4 h-4 mr-2" />
            Permutations
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCopy}
            disabled={validCount === 0}
          >
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            Copy
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-mono">{validCount}/{wordCount} valid</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bitcoin-gradient transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Word Grid */}
      <Card className="p-4 glass-card">
        <div className={`grid gap-3 ${wordCount === 24 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'}`}>
          {words.map((word, index) => (
            <WordInput
              key={index}
              index={index}
              value={word.value}
              onChange={(v) => handleWordChange(index, v)}
              isValid={validationResults[index].valid}
              language={validationResults[index].language}
              suggestions={activeIndex === index ? suggestions : []}
              onFocus={() => setActiveIndex(index)}
              disabled={word.isLocked}
            />
          ))}
        </div>
      </Card>

      {/* Permutation Solver */}
      {showPermutations && (
        <PermutationSolver 
          words={validWordsForPermutation}
          onPhraseFound={(phrase) => {
            // Apply found phrase to the puzzle
            const newWords = [...words];
            phrase.forEach((word, i) => {
              if (i < newWords.length) {
                newWords[i] = { value: word, isLocked: false };
              }
            });
            setWords(newWords);
          }}
        />
      )}

      {/* Hints Panel */}
      {currentHints.length > 0 && (
        <Card className="p-4 border-primary/20 bg-accent/50">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-primary mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium">Related Hints</h4>
              {currentHints.map((hint, i) => (
                <div key={i} className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{hint.category}:</span>{' '}
                  {hint.description}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Completion Message */}
      {validCount === wordCount && (
        <Card className="p-6 text-center border-success/50 bg-success/10 glow-primary">
          <Bitcoin className="w-12 h-12 mx-auto mb-4 text-primary" />
          <h3 className="text-xl font-bold mb-2">Puzzle Complete!</h3>
          <p className="text-muted-foreground">
            All {wordCount} words are valid BIP-39 words.
          </p>
        </Card>
      )}
    </div>
  );
}
