import { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X, Loader2, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useOcr, type ExtractedWord } from '@/hooks/useOcr';
import { useBip39 } from '@/hooks/useBip39';

interface ImageAnalyzerProps {
  onWordsExtracted: (words: string[]) => void;
}

export function ImageAnalyzer({ onWordsExtracted }: ImageAnalyzerProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [extractedWords, setExtractedWords] = useState<ExtractedWord[]>([]);
  const [analyzedWords, setAnalyzedWords] = useState<Array<{
    word: ExtractedWord;
    isValid: boolean;
    suggestion: string | null;
    language: string | null;
  }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { processImage, isProcessing, progress, error } = useOcr();
  const { validateWordAnyLanguage, findBestMatchForWord } = useBip39();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Process with OCR
    const result = await processImage(file);
    if (result) {
      setExtractedWords(result.words);
      analyzeWords(result.words);
    }
  };

  const analyzeWords = (words: ExtractedWord[]) => {
    const analyzed = words.map(word => {
      const validation = validateWordAnyLanguage(word.cleaned);
      const suggestion = !validation.valid ? findBestMatchForWord(word.cleaned) : null;
      
      return {
        word,
        isValid: validation.valid,
        suggestion: suggestion?.word || null,
        language: validation.language
      };
    });
    
    setAnalyzedWords(analyzed);
  };

  const handleApplyWords = () => {
    const validWords = analyzedWords
      .filter(a => a.isValid)
      .map(a => a.word.cleaned);
    
    const suggestedWords = analyzedWords
      .filter(a => !a.isValid && a.suggestion)
      .map(a => a.suggestion!);
    
    onWordsExtracted([...validWords, ...suggestedWords]);
  };

  const handleApplyAll = () => {
    const words = analyzedWords.map(a => 
      a.isValid ? a.word.cleaned : (a.suggestion || a.word.cleaned)
    );
    onWordsExtracted(words);
  };

  const clearImage = () => {
    setPreview(null);
    setExtractedWords([]);
    setAnalyzedWords([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="p-4 glass-card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Image Analysis</h3>
        </div>
        {preview && (
          <Button variant="ghost" size="sm" onClick={clearImage}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {!preview ? (
        <label className="block">
          <div className={cn(
            "border-2 border-dashed border-border rounded-xl p-8",
            "flex flex-col items-center justify-center gap-3 cursor-pointer",
            "hover:border-primary/50 hover:bg-accent/50 transition-colors"
          )}>
            <Upload className="w-10 h-10 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">Upload image with seed phrase</p>
              <p className="text-sm text-muted-foreground">
                PNG, JPG or screenshot
              </p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      ) : (
        <div className="space-y-4">
          {/* Image Preview */}
          <div className="relative rounded-lg overflow-hidden bg-muted">
            <img 
              src={preview} 
              alt="Uploaded" 
              className="w-full max-h-48 object-contain"
            />
          </div>

          {/* Processing Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing image... {progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Extracted Words */}
          {analyzedWords.length > 0 && !isProcessing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Found {analyzedWords.length} potential words
                </span>
                <span className="text-xs text-muted-foreground">
                  {analyzedWords.filter(a => a.isValid).length} valid BIP-39
                </span>
              </div>

              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {analyzedWords.map((item, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "px-2 py-1 rounded-md text-xs font-mono",
                      "border transition-colors",
                      item.isValid 
                        ? "bg-success/10 border-success/50 text-success" 
                        : item.suggestion
                          ? "bg-warning/10 border-warning/50 text-warning-foreground"
                          : "bg-destructive/10 border-destructive/50 text-destructive"
                    )}
                    title={item.suggestion ? `Suggestion: ${item.suggestion}` : undefined}
                  >
                    <span className="opacity-50 mr-1">{idx + 1}.</span>
                    {item.word.cleaned}
                    {item.language && (
                      <span className="ml-1 opacity-60">
                        ({item.language === 'english' ? 'EN' : 'PT'})
                      </span>
                    )}
                    {item.suggestion && (
                      <span className="ml-1 text-primary">→ {item.suggestion}</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleApplyWords}
                  disabled={analyzedWords.filter(a => a.isValid).length === 0}
                >
                  Apply Valid Words ({analyzedWords.filter(a => a.isValid).length})
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleApplyAll}
                >
                  Apply All ({analyzedWords.length})
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
