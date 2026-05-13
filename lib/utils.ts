// lib/utils.ts
import { customAlphabet } from 'nanoid';

// Using a custom alphabet to exclude similar looking characters (0, O, I, l)
// and make it more URL friendly.
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const nanoid = customAlphabet(alphabet, 7);

export const generateId = () => nanoid();
