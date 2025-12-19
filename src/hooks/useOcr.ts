import { useState, useCallback } from 'react';
import Tesseract from 'tesseract.js';

export interface ExtractedWord {
  original: string;
  cleaned: string;
  confidence: number;
  position: number;
}

export interface ExtractedObject {
  text: string;
  type: 'word' | 'number' | 'symbol' | 'mixed';
  confidence: number;
  position: { x: number; y: number };
}

export interface OcrResult {
  words: ExtractedWord[];
  objects: ExtractedObject[];
  rawText: string;
  confidence: number;
  allTexts: string[];
}

export function useOcr() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const cleanWord = (word: string): string => {
    return word.replace(/[^a-zA-Z]/g, '').toLowerCase();
  };

  const classifyText = (text: string): 'word' | 'number' | 'symbol' | 'mixed' => {
    const hasLetters = /[a-zA-Z]/.test(text);
    const hasNumbers = /[0-9]/.test(text);
    if (hasLetters && !hasNumbers) return 'word';
    if (hasNumbers && !hasLetters) return 'number';
    if (!hasLetters && !hasNumbers) return 'symbol';
    return 'mixed';
  };

  const processImage = useCallback(async (imageSource: File | string): Promise<OcrResult | null> => {
    setIsProcessing(true);
    setProgress(0);
    setProgressMessage('Analyzing image...');
    setError(null);

    try {
      const result = await Tesseract.recognize(imageSource, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        }
      });

      const rawText = result.data.text;
      const allTextsSet = new Set<string>();
      const wordsMap = new Map<string, ExtractedWord>();
      const objectsMap = new Map<string, ExtractedObject>();

      const rawWords = rawText.split(/[\s\n\r\t,.;:!?'"()\[\]{}|\\/<>@#$%^&*+=~`]+/).filter(w => w.length > 0);
      
      rawWords.forEach((word, index) => {
        const cleaned = cleanWord(word);
        if (cleaned.length >= 3) {
          allTextsSet.add(cleaned);
          if (!wordsMap.has(cleaned)) {
            wordsMap.set(cleaned, {
              original: word,
              cleaned,
              confidence: result.data.confidence / 100,
              position: index + 1
            });
          }
        }
        if (word.length >= 2) {
          const key = word.toLowerCase();
          if (!objectsMap.has(key)) {
            objectsMap.set(key, {
              text: word,
              type: classifyText(word),
              confidence: result.data.confidence / 100,
              position: { x: index * 10, y: 0 }
            });
          }
        }
      });

      return {
        words: Array.from(wordsMap.values()),
        objects: Array.from(objectsMap.values()),
        rawText,
        confidence: result.data.confidence,
        allTexts: Array.from(allTextsSet)
      };
    } catch (err) {
      console.error('OCR Error:', err);
      setError('Failed to process image.');
      return null;
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setProgressMessage('');
    }
  }, []);

  return { processImage, isProcessing, progress, progressMessage, error };
}
