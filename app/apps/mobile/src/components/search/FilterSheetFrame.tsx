// Shared frame of the filter sheets (search, rides): a kit `BottomSheet` with a
// title and a footer that applies or clears the draft filters (spec 17 §4.1).
import React, { type ReactNode } from 'react';
import { BottomSheet } from '../ui/BottomSheet';
import { GhostButton, PrimaryButton } from '../ui/Buttons';

/** Props of {@link FilterSheetFrame}. */
export interface FilterSheetFrameProps {
  readonly visible: boolean;
  /** Closes the sheet without applying the draft. */
  readonly onDismiss: () => void;
  readonly title: string;
  /** Label and handler of the primary action that commits the draft filters. */
  readonly applyLabel: string;
  readonly onApply: () => void;
  /** Label and handler of the secondary action that resets every filter. */
  readonly clearLabel: string;
  readonly onClear: () => void;
  /** The filter sections (titles and chip rows). */
  readonly children: ReactNode;
}

/**
 * Bottom sheet that hosts a filter form: the body scrolls, while "apply" and
 * "clear all" stay pinned in the footer, the main action first.
 */
export function FilterSheetFrame({
  visible,
  onDismiss,
  title,
  applyLabel,
  onApply,
  clearLabel,
  onClear,
  children,
}: FilterSheetFrameProps) {
  return (
    <BottomSheet
      visible={visible}
      onDismiss={onDismiss}
      title={title}
      footer={
        <>
          <PrimaryButton label={applyLabel} size="md" fullWidth onPress={onApply} />
          <GhostButton label={clearLabel} size="md" fullWidth onPress={onClear} />
        </>
      }
    >
      {children}
    </BottomSheet>
  );
}
