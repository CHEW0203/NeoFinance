import { apiGet, apiPost } from "@/services/api-client";

export function registerUser(payload) {
  return apiPost("/api/auth/register", payload);
}

export function loginUser(payload) {
  return apiPost("/api/auth/login", payload);
}

export function logoutUser() {
  return apiPost("/api/auth/logout", {});
}

export function fetchCurrentUser() {
  return apiGet("/api/auth/me");
}

export function fetchProfile() {
  return apiGet("/api/profile");
}

export function updateProfile(payload) {
  return apiPost("/api/profile", payload, { method: "PATCH" });
}
