import { useState, useCallback } from 'react';
import Tesseract from 'tesseract.js';

export interface ExtractedWord {
  original: string;
  cleaned: string;
  confidence: number;
  position: number;
}

export interface OcrResult {
  words: ExtractedWord[];
  rawText: string;
  confidence: number;
}

export function useOcr() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const cleanWord = (word: string): string => {
    // Remove non-alphabetic characters and convert to lowercase
    return word.replace(/[^a-zA-Z]/g, '').toLowerCase();
  };

  const processImage = useCallback(async (imageSource: File | string): Promise<OcrResult | null> => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      const result = await Tesseract.recognize(imageSource, 'eng+por', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        }
      });

      const rawText = result.data.text;
      const rawWords = rawText.split(/\s+/).filter(w => w.length > 0);
      
      const words: ExtractedWord[] = rawWords.map((word, index) => ({
        original: word,
        cleaned: cleanWord(word),
        confidence: result.data.confidence / 100,
        position: index + 1
      })).filter(w => w.cleaned.length >= 3); // BIP-39 words are at least 3 chars

      return {
        words,
        rawText,
        confidence: result.data.confidence
      };
    } catch (err) {
      console.error('OCR Error:', err);
      setError('Failed to process image. Please try again.');
      return null;
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, []);

  return {
    processImage,
    isProcessing,
    progress,
    error
  };
}
