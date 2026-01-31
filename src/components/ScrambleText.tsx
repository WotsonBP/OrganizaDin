import React, { useEffect, useState, useRef, memo } from 'react';
import { Text, TextProps } from 'react-native';

const SCRAMBLE_CHARS = './?-(<>)@#$%&*!~';
const TOTAL_DURATION = 400;
const FRAME_RATE = 35;

const shouldScramble = (char: string) => /[\d.,•]/.test(char);

interface ScrambleTextProps extends TextProps {
  text: string;
  hiddenText?: string;
  isHidden: boolean;
}

export const ScrambleText = memo(({
  text,
  hiddenText = 'R$ •••••',
  isHidden,
  style,
  ...props
}: ScrambleTextProps) => {
  const [displayText, setDisplayText] = useState(isHidden ? hiddenText : text);
  const prevHiddenRef = useRef(isHidden);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    // Se isHidden não mudou, apenas atualizar o texto se visível
    if (prevHiddenRef.current === isHidden) {
      if (!isHidden && !isAnimatingRef.current) {
        setDisplayText(text);
      }
      return;
    }

    prevHiddenRef.current = isHidden;
    const targetText = isHidden ? hiddenText : text;
    const totalFrames = Math.floor(TOTAL_DURATION / FRAME_RATE);
    let frame = 0;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    isAnimatingRef.current = true;

    intervalRef.current = setInterval(() => {
      frame++;

      if (frame >= totalFrames) {
        setDisplayText(targetText);
        if (intervalRef.current) clearInterval(intervalRef.current);
        isAnimatingRef.current = false;
        return;
      }

      const progress = frame / totalFrames;
      const chars = targetText.split('');
      const scrambled = chars.map((char, i) => {
        if (!shouldScramble(char)) return char;

        // Revelar caracteres progressivamente da esquerda para direita
        const charProgress = i / chars.length;
        if (charProgress < progress - 0.3) return char;

        return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      });

      setDisplayText(scrambled.join(''));
    }, FRAME_RATE);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        isAnimatingRef.current = false;
      }
    };
  }, [isHidden, text, hiddenText]);

  // Atualizar texto quando o valor muda sem animação
  useEffect(() => {
    if (!isHidden && !isAnimatingRef.current) {
      setDisplayText(text);
    }
  }, [text, isHidden]);

  return <Text style={style} {...props}>{displayText}</Text>;
});
