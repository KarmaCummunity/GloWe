// @vitest-environment jsdom
// Shared buttons (spec 17 §4.1, issue #1286): variants, sizes, loading / disabled, tap target.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { ThemeProvider } from '@kc/ui';

// Reanimated does not transform under Vitest; the press scale is not under test here.
vi.mock('react-native-reanimated', async () => {
  const { View } = await vi.importActual<typeof import('react-native')>('react-native');
  return {
    default: { View },
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: () => ({}),
    withSpring: (value: number) => value,
    withTiming: (value: number) => value,
  };
});
const impactAsync = vi.fn(() => Promise.resolve());
vi.mock('expo-haptics', () => ({ impactAsync: () => impactAsync(), ImpactFeedbackStyle: { Light: 'light' } }));
vi.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));
vi.mock('../../../hooks/useReducedMotion', () => ({ useReducedMotion: () => false }));

import { GhostButton, PrimaryButton, SecondaryButton } from '../Buttons';
import { MIN_TAP_TARGET, tapTargetHitSlop } from '../kitMetrics';

afterEach(cleanup);
beforeEach(() => impactAsync.mockClear());

const withTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider mode="light" systemScheme="light" setMode={() => {}}>{ui}</ThemeProvider>);

describe('kit buttons', () => {
  it('names the button with its label, presses through and plays a light haptic', () => {
    const onPress = vi.fn();
    const { getByRole } = withTheme(<PrimaryButton label="Publish" onPress={onPress} />);
    const button = getByRole('button', { name: 'Publish' });
    fireEvent.click(button);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(impactAsync).toHaveBeenCalledTimes(1);
  });

  it('skips the haptic when asked and prefers an explicit accessibility label', () => {
    const onPress = vi.fn();
    const { getByRole } = withTheme(
      <SecondaryButton label="Open" accessibilityLabel="Open the partner site" haptic={false} onPress={onPress} />,
    );
    fireEvent.click(getByRole('button', { name: 'Open the partner site' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(impactAsync).not.toHaveBeenCalled();
  });

  it('blocks presses and reports the state while disabled', () => {
    const onPress = vi.fn();
    const { getByRole } = withTheme(<PrimaryButton label="Send" disabled onPress={onPress} />);
    const button = getByRole('button', { name: 'Send' });
    fireEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button.getAttribute('aria-disabled')).toBe('true');
  });

  it('shows a spinner, keeps the label in the layout and blocks presses while loading', () => {
    const onPress = vi.fn();
    const { getByRole, getByText } = withTheme(
      <GhostButton label="Save" icon="checkmark" size="md" loading onPress={onPress} />,
    );
    const button = getByRole('button', { name: 'Save' });
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(getByRole('progressbar')).toBeTruthy();
    // The label still sizes the button, but is not drawn.
    expect(getComputedStyle(getByText('Save')).opacity).toBe('0');
    fireEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('keeps the original 56pt height by default and steps down for md and the compact sm', () => {
    const heights = (['lg', 'md', 'sm'] as const).map((size) => {
      const { getByRole, unmount } = withTheme(<PrimaryButton label={size} size={size === 'lg' ? undefined : size} onPress={() => {}} />);
      const height = getComputedStyle(getByRole('button', { name: size })).height;
      unmount();
      return height;
    });
    expect(heights).toEqual(['56px', '48px', '36px']);
  });

  it('renders the Ionicons glyph or a custom icon node', () => {
    const { getByTestId } = withTheme(
      <>
        <PrimaryButton label="Go" icon="arrow-back" onPress={() => {}} />
        <SecondaryButton label="Google" iconNode={<span data-testid="brand-logo" />} onPress={() => {}} />
      </>,
    );
    expect(getByTestId('icon-arrow-back')).toBeTruthy();
    expect(getByTestId('brand-logo')).toBeTruthy();
  });
});

describe('tapTargetHitSlop', () => {
  it('grows a short control to the 44pt target, split evenly above and below', () => {
    expect(tapTargetHitSlop(36)).toEqual({ top: 4, bottom: 4 });
    expect(tapTargetHitSlop(28)).toEqual({ top: 8, bottom: 8 });
  });

  it('adds no slop to a control that is already tall enough (boundary: exactly 44pt)', () => {
    expect(tapTargetHitSlop(MIN_TAP_TARGET)).toBeUndefined();
    expect(tapTargetHitSlop(56)).toBeUndefined();
  });
});
