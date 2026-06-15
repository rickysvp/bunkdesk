/**
 * RoomsDialogs — room management dialogs re-exported from BedBoard/Dialogs.
 *
 * These dialogs (`RoomSettingsDialog`, `AddRoomDialog`) are the canonical
 * add/edit room UI. They live next to BedBoard historically; this module
 * re-exports them so the Settings → 房间 page can use them without
 * coupling to the BedBoard's internal layout.
 *
 * If the dialogs ever grow significantly, move their implementations here.
 */

export { RoomSettingsDialog, AddRoomDialog } from './BedBoard/Dialogs';
