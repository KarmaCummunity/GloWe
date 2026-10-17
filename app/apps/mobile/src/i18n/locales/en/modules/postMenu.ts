// FR-POST-014/022 — post ⋮ menu strings (split from post.ts for LOC cap).
export const postMenuEn = {
  menuA11y: 'Actions menu',
  menuShare: 'Share post',
  menuHideFromFeed: 'Hide from my feed',
  menuEdit: 'Edit post',
  menuSave: 'Save',
  menuUnsave: 'Remove from saved',
  menuDelete: 'Delete post',
  menuAdminRemove: 'Remove as admin',
  saveSuccess: 'Post saved.',
  saveError: 'Saving failed, please try again.',
  unsaveSuccess: 'Removed from saved.',
  unsaveError: 'Removal failed, please try again.',
  deleteConfirmTitle: '🗑️ Delete the post?',
  deleteConfirmBody:
    'The post will be permanently deleted. Chats opened around it will stay in your chat list, with a note that the original post is no longer available.\n\nYou can delete an open post, or a closed post with no recipient recorded in the system (for example, closed without marking, or a recipient who was deleted from the system). If there is a recorded recipient — it cannot be deleted from here; you can reopen it if needed.',
  adminRemoveTitle: '🛡️ Remove the post?',
  adminRemoveBody:
    'The post "{{title}}" will be hidden from the feed and marked as removed by an admin. It can be restored later through the audit log.',
  adminRemoveCta: 'Remove',
} as const;
