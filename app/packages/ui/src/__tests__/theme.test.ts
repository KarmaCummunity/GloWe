import { describe, it, expect } from 'vitest';
import { colors, spacing, radius, shadow, typography, fontFamily, shellDimensions } from '../index';

describe('theme/colors', () => {
  it('exposes the brand primary token', () => {
    expect(colors.primary).toBe('#C2410C');
  });

  it('exposes semantic status tokens (success / error / warning / info)', () => {
    expect(colors.success).toMatch(/^#[0-9A-F]{6}$/i);
    expect(colors.error).toMatch(/^#[0-9A-F]{6}$/i);
    expect(colors.warning).toMatch(/^#[0-9A-F]{6}$/i);
    expect(colors.info).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('exposes neutral surface, border, and text tokens', () => {
    expect(colors.surface).toBe('#FFFFFF');
    expect(colors.background).toBe('#FFFBF7');
    expect(colors.border).toBeDefined();
    expect(colors.textPrimary).toBeDefined();
    expect(colors.textSecondary).toBeDefined();
  });

  it('treats every color value as a string', () => {
    for (const value of Object.values(colors)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });
});

describe('theme/spacing', () => {
  it('exposes the canonical t-shirt scale', () => {
    expect(spacing.xs).toBe(4);
    expect(spacing.sm).toBe(8);
    expect(spacing.md).toBe(12);
    expect(spacing.base).toBe(16);
    expect(spacing.lg).toBe(20);
    expect(spacing.xl).toBe(24);
  });

  it('keeps the scale monotonically increasing', () => {
    const ordered = [
      spacing.xs,
      spacing.sm,
      spacing.md,
      spacing.base,
      spacing.lg,
      spacing.xl,
      spacing['2xl'],
      spacing['3xl'],
      spacing['4xl'],
    ];
    for (let i = 1; i < ordered.length; i += 1) {
      expect(ordered[i]).toBeGreaterThan(ordered[i - 1]);
    }
  });
});

describe('theme/radius', () => {
  it('exposes the standard radius scale plus `full`', () => {
    expect(radius.xs).toBe(4);
    expect(radius.sm).toBe(8);
    expect(radius.md).toBe(12);
    expect(radius.lg).toBe(16);
    expect(radius.xl).toBe(24);
    expect(radius.full).toBeGreaterThan(1000);
  });
});

describe('theme/shadow', () => {
  it('exposes a card and modal preset with the React Native shadow shape', () => {
    expect(shadow.card).toEqual(
      expect.objectContaining({
        shadowColor: expect.any(String),
        shadowOffset: expect.objectContaining({ width: expect.any(Number), height: expect.any(Number) }),
        shadowOpacity: expect.any(Number),
        shadowRadius: expect.any(Number),
        elevation: expect.any(Number),
      }),
    );
    expect(shadow.modal.elevation).toBeGreaterThan(shadow.card.elevation);
  });
});

describe('theme/typography', () => {
  it('exposes h1-h4 with numeric font sizes and line heights', () => {
    for (const key of ['h1', 'h2', 'h3', 'h4'] as const) {
      expect(typeof typography[key].fontSize).toBe('number');
      expect(typeof typography[key].lineHeight).toBe('number');
      expect(typography[key].lineHeight).toBeGreaterThan(typography[key].fontSize);
    }
  });

  it('exposes body and button presets', () => {
    expect(typography.body.fontSize).toBe(14);
    expect(typography.bodyLarge.fontSize).toBe(16);
    expect(typography.button.fontWeight).toBe('600');
  });

  it('resolves a non-empty fontFamily string', () => {
    expect(typeof fontFamily).toBe('string');
    expect(fontFamily.length).toBeGreaterThan(0);
  });
});

describe('shellDimensions', () => {
  it('exposes shell layout dimensions', () => {
    expect(shellDimensions.railCollapsed).toBe(60);
    expect(shellDimensions.railExpanded).toBe(220);
    expect(shellDimensions.aside).toBe(280);
    expect(shellDimensions.contentMaxWide).toBe(720);
    expect(shellDimensions.contentMaxDesktop).toBe(680);
    expect(shellDimensions.contentMaxTablet).toBe(640);
    expect(shellDimensions.contentMaxNarrow).toBe(600);
  });
});
