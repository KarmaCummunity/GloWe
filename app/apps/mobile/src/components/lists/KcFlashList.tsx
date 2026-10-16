/**
 * FlashList wrapper — #896. Use instead of react-native FlatList for virtualized lists.
 */
import React, { forwardRef } from 'react';
import { type ViewStyle } from 'react-native';
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
