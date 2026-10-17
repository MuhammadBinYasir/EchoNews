export function formatTimeAgo(dateInput: Date | string | undefined): string {
  if (!dateInput) return "Recently";
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "Just now";
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

export function formatTopicName(topic: string): string {
  switch (topic?.toLowerCase()) {
    case "ai":
      return "AI";
    case "tech":
      return "Technology";
    case "world":
      return "World";
    case "business":
      return "Business";
    case "sports":
      return "Sports";
    case "science":
      return "Science";
    case "health":
      return "Health";
    case "culture":
      return "Culture";
    default:
      return topic ? topic.charAt(0).toUpperCase() + topic.slice(1) : "";
  }
}

export function extractInterestsMap(raw: any): Record<string, number> {
  if (!raw) return {};
  if (raw instanceof Map) {
    return Object.fromEntries(raw);
  }
  if (typeof raw === "object") {
    if (typeof raw.entries === "function") {
      try {
        return Object.fromEntries(raw.entries());
      } catch {
        // fallback
      }
    }
    return { ...raw };
  }
  return {};
}
