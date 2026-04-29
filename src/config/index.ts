// Room configuration
export const ROOM_CONFIG = {
  // Room name
  ROOM_NAME: "Second Breakfast Circle",
  
  // Room description
  ROOM_DESCRIPTION: "A virtual co-working space for our cohort",
  
  // Number of chairs in the virtual room
  NUM_CHAIRS: 15,
  
  // Inactive user cleanup threshold in milliseconds (24 hours)
  INACTIVE_THRESHOLD: 24 * 60 * 60 * 1000,
  
  // Presence update interval in milliseconds (30 seconds)
  PRESENCE_UPDATE_INTERVAL: 30 * 1000,
  
  // Default room ID (UUID format)
  DEFAULT_ROOM_ID: "00000000-0000-0000-0000-000000000001"
} as const;

// Tour steps configuration
export const TOUR_STEPS = [
  {
    title: "Welcome to Second Breakfast Circle",
    content: "This is your virtual co-working space. Let's take a quick tour of the features.",
    target: ".room-container",
    position: "bottom"
  },
  {
    title: "Audio Controls",
    content: "Use this button to mute or unmute your microphone. A green icon means you're unmuted.",
    target: ".audio-controls",
    position: "right"
  },
  {
    title: "People in Room",
    content: "See who else is in the room, check their status, and view their updates.",
    target: ".roster-panel",
    position: "left"
  },
  {
    title: "Draggable Panel",
    content: "Click and drag this handle to move the people panel anywhere on the screen.",
    target: ".drag-handle",
    position: "bottom"
  },
  {
    title: "Minimize Panel",
    content: "Click this button to collapse the panel. You can expand it again later.",
    target: ".minimize-button",
    position: "left"
  },
  {
    title: "Updates & Reactions",
    content: "Click on any user in the roster to see their updates and share your own. You can react to updates with emojis to show support or acknowledgment.",
    target: ".roster-panel",
    position: "left"
  },
  {
    title: "Sharing Updates",
    content: "Share what you're working on by clicking your name in the roster. New updates will be highlighted for others to see.",
    target: ".roster-panel",
    position: "left"
  },
  {
    title: "Camera Controls",
    content: "Adjust your view of the room using these controls. Click and drag in the scene to rotate the camera, scroll to zoom in/out, and use these buttons for quick adjustments.",
    target: ".camera-controls",
    position: "left"
  },
  {
    title: "Settings",
    content: "Access room settings, help, and admin features here.",
    target: ".settings-button",
    position: "left"
  }
] as const;