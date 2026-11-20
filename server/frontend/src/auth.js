export async function session() {
  const response = await fetch("/djangoapp/session", {credentials: "same-origin"});
  if (!response.ok) throw new Error("Could not check your session. Please try again.");
  return response.json();
}

export async function authRequest(path, values) {
  await session();
  const cookie = document.cookie.split("; ").find(value => value.startsWith("csrftoken="));
  const response = await fetch(path, {
    method: "POST", credentials: "same-origin",
    headers: {"Content-Type": "application/json", "X-CSRFToken": cookie ? decodeURIComponent(cookie.slice("csrftoken=".length)) : ""},
    body: JSON.stringify(values)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error === "Already Registered" ? "That username is already registered. Please sign in." : data.error || data.message || "Please try again.");
  return data;
}

