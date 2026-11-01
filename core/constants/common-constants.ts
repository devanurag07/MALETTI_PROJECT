export const TOKEN_KEY = "tms_access_token";
export const INPUT_AVAILABLE_KEY = "input_available";
export const SALON_LOGO_KEY = "salon_logo";
export const SHOW_QUESTIONS_KEY = "show_questions";
export const CAMERA_CAPTURE_KEY = "camera_capture.jpg";
/** Second photo for journeys with clothing (Bridal, Function-Ready): full-body makeup and outfits. */
export const FULL_BODY_CAPTURE_KEY = "full_body_capture.jpg";
export const SESSION_INPUT_IMG_KEY = 'session_input_img';
export const SESSION_ID_KEY = "session_id";
export const MICROSCOPIC_CAMERA_KEY = "microscopic-camera-id";
export const NORMAL_CAMERA_KEY = "normal-camera-id";
/** When true, capture is horizontally inverted relative to the live preview. */
export const INVERT_ON_CAPTURE_KEY = "invert-on-capture";
/** Degrees: "0" | "90" | "180" | "270" — applied to preview + saved capture. */
export const CAMERA_ROTATION_NORMAL_KEY = "camera-rotation-normal";
export const CAMERA_ROTATION_MICROSCOPIC_KEY = "camera-rotation-microscopic";
/** Idle timeout (ms) before salon screensaver video plays. `0` = off. */
export const SCREENSAVER_TIMEOUT_KEY = "screensaver-timeout-ms";
/** JSON: enabled + sharpness threshold / stability / best-frame window for dermascope auto capture. */
export const MICROSCOPE_AUTO_CLICK_KEY = "microscope-auto-click";
/** Prefix for per-location auto capture on/off ("true" | "false"), e.g. `${prefix}:skin-analysis`. Falls back to the global setting. */
export const MICROSCOPE_AUTO_CAPTURE_LOCATION_PREFIX = "microscope-auto-capture";
/** Session: user collapsed the "same camera" warning after a microscopic capture. */
export const SAME_CAMERA_WARNING_COLLAPSED_KEY = "same-camera-warning-collapsed";

/** Full JSON of `GET salon/current` → `data` — used for salon-scoped UI (e.g. Diona skin flyers). */
export const CURRENT_SALON_STORAGE_KEY = "current_salon_data";
/** When `code` matches, skin report uses Diona flyer images as pages 4 & 5. */
export const DIONA_SKIN_REPORT_SALON_CODE = "DIONA1";
/** Only this salon sees the Debug mode switch in settings. */
export const DEBUG_SALON_CODE = "AMG001";
/** "true" when Debug mode is on (settings); enables the test-photo buttons. */
export const DEBUG_MODE_KEY = "debug-mode";
/** Active beauty-platform customer session id (see features/customer-session). */
export const CUSTOMER_SESSION_ID_KEY = "customer_session_id";
