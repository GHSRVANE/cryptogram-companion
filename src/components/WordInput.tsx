import { useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WordInputProps {
  index: number;
  value: string;
  onChange: (value: string) => void;
  isValid: boolean | null;
  suggestions: string[];
  onFocus: () => void;
  disabled?: boolean;
  language?: 'english' | 'portuguese' | null;
}

export function WordInput({
  index,
  value,
  onChange,
  isValid,
  suggestions,
  onFocus,
  disabled,
  language
}: WordInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (suggestions[selectedIndex]) {
        onChange(suggestions[selectedIndex]);
        setShowSuggestions(false);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleFocus = () => {
    onFocus();
    setShowSuggestions(true);
  };

  const handleBlur = (e: React.FocusEvent) => {
    if (!suggestionsRef.current?.contains(e.relatedTarget as Node)) {
      setTimeout(() => setShowSuggestions(false), 150);
    }
  };

  return (
    <div className="relative word-slot">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-muted-foreground w-6">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value.toLowerCase())}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="word"
            className={cn(
              "w-full px-3 py-2 rounded-lg border font-mono text-sm",
              "bg-card/50 backdrop-blur-sm transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-primary/50",
              "placeholder:text-muted-foreground/50",
              isValid === true && "border-success bg-success/10",
              isValid === false && value && "border-destructive bg-destructive/10",
              isValid === null && "border-border"
            )}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {language && (
              <span className="text-[10px] px-1 rounded bg-muted text-muted-foreground">
                {language === 'english' ? 'EN' : 'PT'}
              </span>
            )}
            {isValid === true && <Check className="w-4 h-4 text-success" />}
            {isValid === false && value && <X className="w-4 h-4 text-destructive" />}
          </div>
        </div>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 left-8 right-0 mt-1 py-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto"
        >
          {suggestions.map((suggestion, i) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                onChange(suggestion);
                setShowSuggestions(false);
              }}
              className={cn(
                "w-full px-3 py-1.5 text-left text-sm font-mono transition-colors",
                i === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted"
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
