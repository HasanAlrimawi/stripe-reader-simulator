/**
 * Wraps the observer's topics constants within an object to ease access
 * and prevent typos.
 */
export const OBSERVER_TOPICS = Object.freeze({
  /** Represents reader loss of connection */
  CONNECTION_LOST: "NO_INTERNET_CONNECTION",
  /** Represents Error of token creation, mostly caused by invalid API key */
  CONNECTION_TOKEN_CREATION_ERROR: "FAILED_CONNECTION_TOKEN_CREATION",
});
