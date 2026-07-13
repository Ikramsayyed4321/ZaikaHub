export function createClientId() {
  return Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
}
