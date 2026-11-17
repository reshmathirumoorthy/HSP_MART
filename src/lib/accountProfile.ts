/** Display helper for optional profile fields. The profile itself lives on the backend (/api/account/profile). */
export function displayOrNotAdded(value: string | undefined | null): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "Not added";
}
