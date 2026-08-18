/**
 * Removes `//` line comments from JSONC without touching sequences that appear
 * inside string literals, so `"https://..."` survives the strip.
 */
export function stripLineComments(source) {
  let output = "";
  let inString = false;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (inString) {
      output += character;
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }
    if (character === '"') {
      inString = true;
      output += character;
      continue;
    }
    if (character === "/" && source[index + 1] === "/") {
      while (index < source.length && source[index] !== "\n") {
        index += 1;
      }
      output += "\n";
      continue;
    }
    output += character;
  }
  return output;
}

/** Parses a JSONC document that uses `//` line comments. */
export function parseJsonc(source) {
  return JSON.parse(stripLineComments(source));
}
