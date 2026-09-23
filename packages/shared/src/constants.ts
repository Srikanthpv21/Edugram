export const USERNAME_MIN = 3;
export const USERNAME_MAX = 24;
export const USERNAME_PATTERN = /^[a-z0-9._]+$/;
export const BIO_MAX = 160;
export const DISPLAY_NAME_MAX = 40;
export const CAPTION_MAX = 2200;
export const COMMENT_MAX = 500;
export const POST_MAX_IMAGES = 10;
export const FEED_PAGE_SIZE = 12;
export const COMMENTS_PAGE_SIZE = 20;
export const REFERRAL_CODE_LENGTH = 8;

export const REFERRAL_REWARD_PAISE = 5000;
export const REFERRAL_WELCOME_PAISE = 2500;

export const OTP_LENGTH = 6;
export const OTP_TTL_SECONDS = 300;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_PER_HOUR = 5;

export const INDIA_PHONE_PATTERN = /^[6-9]\d{9}$/;

export const RESERVED_USERNAMES = new Set([
  "about",
  "admin",
  "api",
  "create",
  "edugram",
  "explore",
  "help",
  "home",
  "join",
  "login",
  "logout",
  "me",
  "messages",
  "notifications",
  "onboarding",
  "p",
  "privacy",
  "refer",
  "search",
  "settings",
  "support",
  "terms",
]);
