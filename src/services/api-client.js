async function parseJsonResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }
  return payload;
}

export async function apiGet(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    cache: "no-store",
  });
  return parseJsonResponse(response);
}

export async function apiPost(url, body, options = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: JSON.stringify(body),
    ...options,
  });
  return parseJsonResponse(response);
}

export async function apiDelete(url, options = {}) {
  const response = await fetch(url, {
    method: "DELETE",
    ...options,
  });
  return parseJsonResponse(response);
}
