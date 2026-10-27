/**
 * FlashList wrapper — #896. Use instead of react-native FlatList for virtualized lists.
 */
import React, { forwardRef } from 'react';
import { FlatList, Platform, type ViewStyle } from 'react-native';
import {
  FlashList,
  type ContentStyle,
  type FlashListProps,
} from '@shopify/flash-list';

export type KcFlashListRef<T> = FlashList<T>;

export type KcFlashListProps<T> = Omit<FlashListProps<T>, 'contentContainerStyle'> & {
  /** FlashList ContentStyle is narrow; we accept RN-style arrays for migration from FlatList. */
  contentContainerStyle?: ContentStyle | ViewStyle | Array<ViewStyle | false | null | undefined>;
};

function KcFlashListInner<T>(
  props: KcFlashListProps<T>,
  ref: React.Ref<FlashList<T>>,
) {
  const { estimatedItemSize = 120, contentContainerStyle, ...rest } = props;
  const containerStyle = contentContainerStyle as ContentStyle | undefined;
  if (Platform.OS !== 'web') {
    // FlashList v1 mis-measures cells under the New Architecture (Fabric):
    // grid cards overlap / get clipped on iOS (TestFlight 1.3.20 build 5).
    // Native falls back to FlatList, which lays rows out from real heights.
    // FlatList exposes the scroll methods callers use via the ref
    // (scrollToOffset / scrollToIndex / scrollToEnd).
    return (
      <FlatList
        ref={ref as unknown as React.Ref<FlatList<T>>}
        {...(rest as unknown as React.ComponentProps<typeof FlatList<T>>)}
        contentContainerStyle={contentContainerStyle as ViewStyle}
        windowSize={11}
        removeClippedSubviews={false}
      />
    );
  }
  return (
    <FlashList
      ref={ref}
      {...rest}
      estimatedItemSize={estimatedItemSize}
      contentContainerStyle={containerStyle}
    />
  );
}

export const KcFlashList = forwardRef(KcFlashListInner) as <T>(
  props: KcFlashListProps<T> & { ref?: React.Ref<FlashList<T>> },
) => React.ReactElement;
