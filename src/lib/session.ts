export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("scambuster_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("scambuster_session_id", id);
  }
  return id;
}
