export const HIDDEN = 'hidden';

export const redact = (value, setting) => (setting === 'private' ? HIDDEN : value);
