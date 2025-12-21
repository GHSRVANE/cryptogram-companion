import { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X, Loader2, Camera, Plus, Grid3X3, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useOcr, type ExtractedWord, type ExtractedObject } from '@/hooks/useOcr';
import { useBip39 } from '@/hooks/useBip39';

interface ImageAnalyzerProps {
  onWordsExtracted: (words: string[]) => void;
}

interface AnalyzedWord {
  word: ExtractedWord;
  isValid: boolean;
  suggestion: string | null;
  language: string | null;
  zone: number; // 1, 2, or 3 for collage zones
  selected: boolean;
}

interface ManualWord {
  id: string;
  word: string;
  isValid: boolean;
  language: string | null;
}

export function ImageAnalyzer({ onWordsExtracted }: ImageAnalyzerProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [extractedWords, setExtractedWords] = useState<ExtractedWord[]>([]);
  const [extractedObjects, setExtractedObjects] = useState<ExtractedObject[]>([]);
  const [analyzedWords, setAnalyzedWords] = useState<AnalyzedWord[]>([]);
  const [manualWords, setManualWords] = useState<ManualWord[]>([]);
  const [newManualWord, setNewManualWord] = useState('');
  const [isCollageMode, setIsCollageMode] = useState(true); // Default to collage mode for 3-photo puzzles
  const [sortByZone, setSortByZone] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { processImage, isProcessing, progress, error } = useOcr();
  const { validateWordAnyLanguage, findBestMatchForWord, getSuggestions } = useBip39();

  // Determine zone based on position (for 3-photo collage)
  const getZone = (position: number, total: number): number => {
    if (!isCollageMode) return 1;
    const third = total / 3;
    if (position <= third) return 1;
    if (position <= third * 2) return 2;
    return 3;
  };

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
      setExtractedObjects(result.objects);
      analyzeWords(result.words);
    }
  };

  const analyzeWords = (words: ExtractedWord[]) => {
    const total = words.length;
    const analyzed = words.map((word, index) => {
      const validation = validateWordAnyLanguage(word.cleaned);
      const suggestion = !validation.valid ? findBestMatchForWord(word.cleaned) : null;
      
      return {
        word,
        isValid: validation.valid,
        suggestion: suggestion?.word || null,
        language: validation.language,
        zone: getZone(index + 1, total),
        selected: validation.valid // Auto-select valid words
      };
    });
    
    setAnalyzedWords(analyzed);
  };

  const toggleWordSelection = (index: number) => {
    setAnalyzedWords(prev => prev.map((item, i) => 
      i === index ? { ...item, selected: !item.selected } : item
    ));
  };

  const addManualWord = () => {
    if (!newManualWord.trim()) return;
    
    const cleanWord = newManualWord.trim().toLowerCase();
    const validation = validateWordAnyLanguage(cleanWord);
    
    const manual: ManualWord = {
      id: Date.now().toString(),
      word: cleanWord,
      isValid: validation.valid,
      language: validation.language
    };
    
    setManualWords(prev => [...prev, manual]);
    setNewManualWord('');
  };

  const removeManualWord = (id: string) => {
    setManualWords(prev => prev.filter(w => w.id !== id));
  };

  const handleApplyWords = () => {
    // Get selected analyzed words
    const selectedWords = analyzedWords
      .filter(a => a.selected)
      .map(a => a.isValid ? a.word.cleaned : (a.suggestion || a.word.cleaned));
    
    // Add valid manual words
    const validManualWords = manualWords
      .filter(m => m.isValid)
      .map(m => m.word);
    
    onWordsExtracted([...selectedWords, ...validManualWords]);
  };

  const handleApplyByZone = (zone: number) => {
    const zoneWords = analyzedWords
      .filter(a => a.zone === zone && a.selected)
      .map(a => a.isValid ? a.word.cleaned : (a.suggestion || a.word.cleaned));
    
    onWordsExtracted(zoneWords);
  };

  const handleApplyAll = () => {
    const allOcrWords = analyzedWords.map(a => 
      a.isValid ? a.word.cleaned : (a.suggestion || a.word.cleaned)
    );
    const allManualWords = manualWords.map(m => m.word);
    onWordsExtracted([...allOcrWords, ...allManualWords]);
  };

  const getSortedWords = () => {
    if (!sortByZone) return analyzedWords;
    return [...analyzedWords].sort((a, b) => {
      if (a.zone !== b.zone) return a.zone - b.zone;
      return a.word.position - b.word.position;
    });
  };

  const clearImage = () => {
    setPreview(null);
    setExtractedWords([]);
    setExtractedObjects([]);
    setAnalyzedWords([]);
    setManualWords([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Get suggestions for manual input
  const manualSuggestions = newManualWord.length >= 2 ? getSuggestions(newManualWord).slice(0, 5) : [];

  return (
    <Card className="p-4 glass-card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Image Analysis</h3>
        </div>
        <div className="flex items-center gap-2">
          {preview && (
            <>
              <Button 
                variant={isCollageMode ? "secondary" : "ghost"} 
                size="sm" 
                onClick={() => {
                  setIsCollageMode(!isCollageMode);
                  if (extractedWords.length > 0) {
                    analyzeWords(extractedWords);
                  }
                }}
                title="Toggle 3-photo collage mode"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={clearImage}>
                <X className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
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
                PNG, JPG or screenshot • Supports 3-photo collage
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
          {/* Image Preview with Zone Overlay */}
          <div className="relative rounded-lg overflow-hidden bg-muted">
            <img 
              src={preview} 
              alt="Uploaded" 
              className="w-full max-h-48 object-contain"
            />
            {isCollageMode && (
              <div className="absolute inset-0 flex pointer-events-none">
                <div className="flex-1 border-r border-primary/30 flex items-end justify-center pb-2">
                  <Badge variant="outline" className="bg-background/80 text-xs">Zone 1</Badge>
                </div>
                <div className="flex-1 border-r border-primary/30 flex items-end justify-center pb-2">
                  <Badge variant="outline" className="bg-background/80 text-xs">Zone 2</Badge>
                </div>
                <div className="flex-1 flex items-end justify-center pb-2">
                  <Badge variant="outline" className="bg-background/80 text-xs">Zone 3</Badge>
                </div>
              </div>
            )}
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

          {/* Tabs for Words, Objects, and Manual Input */}
          {!isProcessing && (analyzedWords.length > 0 || extractedObjects.length > 0) && (
            <Tabs defaultValue="words" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="words">
                  Words ({analyzedWords.filter(a => a.isValid).length}/{analyzedWords.length})
                </TabsTrigger>
                <TabsTrigger value="objects">
                  Objects ({extractedObjects.length})
                </TabsTrigger>
                <TabsTrigger value="manual">
                  Manual ({manualWords.length})
                </TabsTrigger>
              </TabsList>

              {/* OCR Words Tab */}
              <TabsContent value="words" className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Click to select/deselect • {analyzedWords.filter(a => a.selected).length} selected
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSortByZone(!sortByZone)}
                    className="text-xs"
                  >
                    <ArrowUpDown className="w-3 h-3 mr-1" />
                    {sortByZone ? 'By Zone' : 'By Position'}
                  </Button>
                </div>

                {/* Zone Groups */}
                {isCollageMode ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(zone => {
                      const zoneWords = getSortedWords().filter(a => a.zone === zone);
                      if (zoneWords.length === 0) return null;
                      
                      return (
                        <div key={zone} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">
                              Zone {zone} ({zoneWords.length} words)
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApplyByZone(zone)}
                              className="text-xs h-6"
                            >
                              Apply Zone
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {zoneWords.map((item, idx) => {
                              const globalIdx = analyzedWords.findIndex(a => a.word === item.word);
                              return (
                                <button
                                  key={idx}
                                  onClick={() => toggleWordSelection(globalIdx)}
                                  className={cn(
                                    "px-2 py-1 rounded-md text-xs font-mono",
                                    "border transition-all",
                                    item.selected ? "ring-2 ring-primary ring-offset-1" : "",
                                    item.isValid 
                                      ? "bg-success/10 border-success/50 text-success hover:bg-success/20" 
                                      : item.suggestion
                                        ? "bg-warning/10 border-warning/50 text-warning-foreground hover:bg-warning/20"
                                        : "bg-destructive/10 border-destructive/50 text-destructive hover:bg-destructive/20"
                                  )}
                                  title={item.suggestion ? `Suggestion: ${item.suggestion}` : undefined}
                                >
                                  {item.word.cleaned}
                                  {item.language && (
                                    <span className="ml-1 opacity-60">
                                      ({item.language === 'english' ? 'EN' : 'PT'})
                                    </span>
                                  )}
                                  {item.suggestion && (
                                    <span className="ml-1 text-primary">→ {item.suggestion}</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                    {getSortedWords().map((item, idx) => {
                      const globalIdx = analyzedWords.findIndex(a => a.word === item.word);
                      return (
                        <button
                          key={idx}
                          onClick={() => toggleWordSelection(globalIdx)}
                          className={cn(
                            "px-2 py-1 rounded-md text-xs font-mono",
                            "border transition-all",
                            item.selected ? "ring-2 ring-primary ring-offset-1" : "",
                            item.isValid 
                              ? "bg-success/10 border-success/50 text-success hover:bg-success/20" 
                              : item.suggestion
                                ? "bg-warning/10 border-warning/50 text-warning-foreground hover:bg-warning/20"
                                : "bg-destructive/10 border-destructive/50 text-destructive hover:bg-destructive/20"
                          )}
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
                        </button>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Objects Tab */}
              <TabsContent value="objects" className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  All text objects found in the image (may include non-words)
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {extractedObjects.map((obj, idx) => (
                    <Badge 
                      key={idx} 
                      variant="outline" 
                      className={cn(
                        "font-mono text-xs cursor-pointer hover:bg-accent",
                        obj.type === 'word' && "border-primary/50",
                        obj.type === 'number' && "border-warning/50",
                        obj.type === 'mixed' && "border-muted-foreground/50"
                      )}
                      onClick={() => {
                        const validation = validateWordAnyLanguage(obj.text.toLowerCase());
                        if (validation.valid) {
                          setManualWords(prev => [...prev, {
                            id: Date.now().toString(),
                            word: obj.text.toLowerCase(),
                            isValid: true,
                            language: validation.language
                          }]);
                        }
                      }}
                    >
                      {obj.text}
                      <span className="ml-1 opacity-50">({obj.type})</span>
                    </Badge>
                  ))}
                </div>
              </TabsContent>

              {/* Manual Input Tab */}
              <TabsContent value="manual" className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Add words that OCR didn't detect from the image
                </p>
                
                {/* Input with Suggestions */}
                <div className="relative">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a word..."
                      value={newManualWord}
                      onChange={(e) => setNewManualWord(e.target.value.toLowerCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addManualWord();
                        }
                      }}
                      className="font-mono text-sm"
                    />
                    <Button onClick={addManualWord} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Suggestions Dropdown */}
                  {manualSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-12 mt-1 bg-popover border border-border rounded-md shadow-lg z-10">
                      {manualSuggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setNewManualWord(suggestion);
                            addManualWord();
                          }}
                          className="w-full px-3 py-2 text-left text-sm font-mono hover:bg-accent first:rounded-t-md last:rounded-b-md"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Manual Words List */}
                <div className="flex flex-wrap gap-1.5">
                  {manualWords.map((item) => (
                    <Badge
                      key={item.id}
                      variant={item.isValid ? "default" : "destructive"}
                      className="font-mono text-xs gap-1"
                    >
                      {item.word}
                      {item.language && (
                        <span className="opacity-60">
                          ({item.language === 'english' ? 'EN' : 'PT'})
                        </span>
                      )}
                      <button
                        onClick={() => removeManualWord(item.id)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>

                {manualWords.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    No manual words added yet
                  </p>
                )}
              </TabsContent>
            </Tabs>
          )}

          {/* Apply Buttons */}
          {(analyzedWords.length > 0 || manualWords.length > 0) && !isProcessing && (
            <div className="flex gap-2 flex-wrap">
              <Button 
                size="sm" 
                onClick={handleApplyWords}
                disabled={analyzedWords.filter(a => a.selected).length === 0 && manualWords.filter(m => m.isValid).length === 0}
              >
                Apply Selected ({analyzedWords.filter(a => a.selected).length + manualWords.filter(m => m.isValid).length})
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleApplyAll}
              >
                Apply All ({analyzedWords.length + manualWords.length})
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
