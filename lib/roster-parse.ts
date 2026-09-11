/** Parse a roster line: "Name", "Name | username", or "Name, username". */
export function parseRosterLine(line: string): {
  displayName: string;
  onlineClientUsername?: string;
} {
  const trimmed = line.trim();
  if (!trimmed) return { displayName: "" };

  const pipeParts = trimmed.split("|").map((part) => part.trim());
  if (pipeParts.length >= 2 && pipeParts[0] && pipeParts[1]) {
    return { displayName: pipeParts[0], onlineClientUsername: pipeParts[1] };
  }

  const commaParts = trimmed.split(",").map((part) => part.trim());
  if (commaParts.length >= 2 && commaParts[0] && commaParts[1]) {
    return { displayName: commaParts[0], onlineClientUsername: commaParts[1] };
  }

  return { displayName: trimmed };
}
