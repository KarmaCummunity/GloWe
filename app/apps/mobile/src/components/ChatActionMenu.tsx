// FR-CHAT-010 — bottom-sheet menu shown from the chat header overflow icon.
// Replaces the previous Alert.alert action picker, which RN-Web collapses into
// a plain window.alert (silently dropping the buttons[]) — making the menu
// unreachable in the browser. The frame is the kit `ActionMenuSheet` (spec 17 §4.1).
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActionMenuSheet } from './ui/ActionMenuSheet';
import { SheetActionRow } from './ui/SheetActionRow';

interface Props {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onReport: () => void;
  readonly deleteLabel?: string;
  readonly onDeleteFromInbox?: () => void;
}

export function ChatActionMenu({ visible, onClose, onReport, deleteLabel, onDeleteFromInbox }: Props) {
  const { t } = useTranslation();
  return (
    <ActionMenuSheet visible={visible} onDismiss={onClose} cancelLabel={t('general.cancel')}>
      {onDeleteFromInbox && deleteLabel ? (
        <SheetActionRow
          label={deleteLabel}
          destructive
          onPress={() => {
            onClose();
            onDeleteFromInbox();
          }}
        />
      ) : null}
      <SheetActionRow label={t('chat.menuReport')} onPress={onReport} />
    </ActionMenuSheet>
  );
}
