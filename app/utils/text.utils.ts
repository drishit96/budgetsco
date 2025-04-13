export function isNotNullAndEmpty<T>(text: T | null | undefined | ""): text is T {
  return text != null && text !== "";
}

export function isNullOrEmpty<T>(
  text: T | null | undefined | ""
): text is null | undefined {
  return text == null || text === "";
}

export function bufferToBase64(buffer: Uint8Array | ArrayBuffer) {
  let result = "";
  const uintArray = new Uint8Array(buffer);
  for (let v of uintArray) {
    result += String.fromCharCode(v);
  }
  return Buffer.from(result, "binary").toString("base64");
}

export function base64ToBuffer(text: string) {
  return new Uint8Array(
    Buffer.from(text, "base64")
      .toString("binary")
      .split("")
      .map(function (c) {
        return c.charCodeAt(0);
      })
  );
}

export function firstLetterToUpperCase(text: string) {
  if (text == null) return "";
  if (text.length === 0) return "";
  if (text.length === 1) return text.toUpperCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
