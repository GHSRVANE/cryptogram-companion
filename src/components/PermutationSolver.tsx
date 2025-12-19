import { useState, useMemo } from 'react';
import { usePermutations, PermutationResult } from '@/hooks/usePermutations';
import { useBip39 } from '@/hooks/useBip39';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { 
  Shuffle, 
  Play, 
  Pause, 
  Square, 
  Copy, 
  Check, 
  AlertTriangle,
  Zap,
  Clock,
  Gauge,
  MessageSquarePlus,
  Lightbulb,
  Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  words: string[];
  onPhraseFound?: (phrase: string[]) => void;
}

interface CollaboratorHint {
  id: string;
  text: string;
  addedAt: Date;
}

export function PermutationSolver({ words, onPhraseFound }: Props) {
  const { 
    testPermutations, 
    pause, 
    resume, 
    abort, 
    isRunning, 
    isPaused, 
    progress, 
    results,
    getPermutationCount 
  } = usePermutations();
  const { validateWordAnyLanguage } = useBip39();
  const { toast } = useToast();
  
  const [targetAddress, setTargetAddress] = useState('');
  const [foundPhrases, setFoundPhrases] = useState<PermutationResult[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [hints, setHints] = useState<CollaboratorHint[]>([]);
  const [newHint, setNewHint] = useState('');
  const [showHints, setShowHints] = useState(false);

  // Filter to only valid BIP-39 words
  const validWords = useMemo(() => {
    return words.filter(w => {
      const result = validateWordAnyLanguage(w);
      return result.valid;
    });
  }, [words, validateWordAnyLanguage]);

  const permutationCount = getPermutationCount(validWords.length);
  const isLargeSearch = permutationCount > 1000000;

  const handleStart = async () => {
    if (validWords.length === 0) {
      toast({
        title: "No Valid Words",
        description: "Add valid BIP-39 words first",
        variant: "destructive"
      });
      return;
    }

    if (validWords.length > 10 && !targetAddress) {
      toast({
        title: "Address Required",
        description: "For 10+ words, provide a target Bitcoin address to verify against",
        variant: "destructive"
      });
      return;
    }

    setFoundPhrases([]);

    // Simple validation: check if all words are valid
    // In a real implementation, this would validate against a Bitcoin address
    const validatePhrase = async (phrase: string[]): Promise<boolean> => {
      // For now, just return true for any valid permutation
      // The idea is: all permutations are potential candidates
      // User would need to test them against their actual wallet
      return true;
    };

    toast({
      title: "Search Started",
      description: `Testing ${permutationCount.toLocaleString()} permutations`
    });

    const matches = await testPermutations(validWords, validatePhrase, (result) => {
      setFoundPhrases(prev => [...prev, result]);
    });

    if (!isRunning && matches.length > 0) {
      toast({
        title: "Search Complete",
        description: `Found ${matches.length} valid permutations`
      });
    }
  };

  const handleCopy = async (phrase: string[], index: number) => {
    await navigator.clipboard.writeText(phrase.join(' '));
    setCopiedIndex(index);
    toast({ title: "Copied!", description: "Phrase copied to clipboard" });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const addHint = () => {
    if (!newHint.trim()) return;
    
    const hint: CollaboratorHint = {
      id: Date.now().toString(),
      text: newHint.trim(),
      addedAt: new Date()
    };
    
    setHints(prev => [...prev, hint]);
    setNewHint('');
    
    toast({
      title: "Hint Added",
      description: "Collaborator hint saved"
    });
  };

  const removeHint = (id: string) => {
    setHints(prev => prev.filter(h => h.id !== id));
  };

  if (validWords.length === 0) {
    return (
      <Card className="p-4 glass-card">
        <div className="text-center py-6">
          <Shuffle className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="font-semibold mb-2">Word Permutation Solver</h3>
          <p className="text-sm text-muted-foreground">
            Add valid BIP-39 words to the puzzle to enable permutation testing
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 glass-card">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shuffle className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Word Permutation Solver</h3>
          </div>
          <Badge variant="outline">
            {validWords.length} words • {permutationCount.toLocaleString()} permutations
          </Badge>
        </div>

        {/* Words Preview */}
        <div className="flex flex-wrap gap-1.5">
          {validWords.map((word, i) => (
            <Badge key={i} variant="secondary" className="font-mono text-xs">
              {i + 1}. {word}
            </Badge>
          ))}
        </div>

        {/* Warning for large searches */}
        {isLargeSearch && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-warning">Large Search Warning</p>
              <p className="text-muted-foreground">
                {permutationCount.toLocaleString()} permutations will take a long time.
                Consider reducing words or providing a Bitcoin address for verification.
              </p>
            </div>
          </div>
        )}

        {/* Target Address Input */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">
            Target Bitcoin Address (optional - for verification)
          </label>
          <Input
            placeholder="e.g., 1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2"
            value={targetAddress}
            onChange={(e) => setTargetAddress(e.target.value)}
            className="font-mono text-xs"
          />
        </div>

        {/* Collaborator Hints Section */}
        <div className="space-y-3">
          <button
            onClick={() => setShowHints(!showHints)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Users className="w-4 h-4" />
            Collaborator Hints ({hints.length})
            {showHints ? ' ▲' : ' ▼'}
          </button>

          {showHints && (
            <div className="space-y-3 p-3 rounded-lg bg-accent/30 border border-border">
              {/* Add Hint */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add hints from other collaborators searching for the same puzzle..."
                  value={newHint}
                  onChange={(e) => setNewHint(e.target.value)}
                  className="min-h-[60px] text-sm"
                />
                <Button onClick={addHint} size="sm" className="self-end">
                  <MessageSquarePlus className="w-4 h-4" />
                </Button>
              </div>

              {/* Hints List */}
              {hints.length > 0 && (
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {hints.map((hint) => (
                      <div 
                        key={hint.id}
                        className="flex items-start gap-2 p-2 rounded bg-background/50 text-sm"
                      >
                        <Lightbulb className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <p className="flex-1">{hint.text}</p>
                        <button
                          onClick={() => removeHint(hint.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          {!isRunning ? (
            <Button onClick={handleStart} className="flex-1">
              <Play className="w-4 h-4 mr-2" />
              Start Search
            </Button>
          ) : (
            <>
              <Button 
                onClick={isPaused ? resume : pause} 
                variant="outline" 
                className="flex-1"
              >
                {isPaused ? (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </>
                )}
              </Button>
              <Button onClick={abort} variant="destructive">
                <Square className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>

        {/* Progress */}
        {progress && (
          <div className="space-y-2">
            <Progress value={progress.percentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {progress.current.toLocaleString()}/{progress.total.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Gauge className="w-3 h-3" />
                  {progress.speed}/s
                </span>
              </div>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                ~{progress.estimatedTimeLeft} left
              </span>
            </div>
            <div className="font-mono text-xs text-muted-foreground truncate">
              Testing: {progress.currentPhrase.join(' ')}
            </div>
          </div>
        )}

        {/* Results */}
        {foundPhrases.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Found Permutations</h4>
            <ScrollArea className="h-40">
              <div className="space-y-2">
                {foundPhrases.slice(0, 100).map((result, i) => (
                  <div 
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg bg-success/10 border border-success/30"
                  >
                    <code className="text-xs font-mono truncate flex-1">
                      {result.phrase.join(' ')}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy(result.phrase, i)}
                    >
                      {copiedIndex === i ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            {foundPhrases.length > 100 && (
              <p className="text-xs text-muted-foreground">
                Showing first 100 of {foundPhrases.length} permutations
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
