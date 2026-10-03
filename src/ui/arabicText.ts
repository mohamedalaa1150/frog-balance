import Phaser from 'phaser';

/**
 * Phaser sizes a text canvas from metrics measured on a Latin test string
 * ("|MÉqgy"). Arabic hamza, shadda/tanween stacks and deep descenders
 * (ي ج ِ) reach beyond those metrics, so lines were clipped at the top and
 * bottom. Measure against Arabic glyphs instead, for every Text object.
 */
export const ARABIC_TEST_STRING = '|MÉqgy أإلّ جيِ';

let installed = false;
export function installArabicTextMetrics(): void {
  if (installed) return;
  installed = true;
  const proto = Phaser.GameObjects.TextStyle.prototype as unknown as {
    setStyle: (
      style: Phaser.Types.GameObjects.Text.TextStyle | undefined,
      updateText?: boolean,
      setDefaults?: boolean,
    ) => unknown;
  };
  const original = proto.setStyle;
  proto.setStyle = function (style, updateText, setDefaults) {
    const withArabic =
      setDefaults && (!style || style.testString === undefined)
        ? { ...style, testString: ARABIC_TEST_STRING }
        : style;
    return original.call(this, withArabic, updateText, setDefaults);
  };
}
