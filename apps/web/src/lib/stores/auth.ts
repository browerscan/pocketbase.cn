import { atom, computed } from "nanostores";
import type { User } from "../types/user";
import { pb } from "../pocketbase/client";

export const authToken = atom<string | null>(null);
export const authUser = atom<User | null>(null);
export const authLoading = atom<boolean>(true);

export const isAuthenticated = computed([authToken, authUser], (token, user) =>
  Boolean(token && user),
);

export async function initAuth() {
  authLoading.set(true);
  try {
    if (pb.authStore.isValid) {
      const authData = await pb.collection("users").authRefresh();
      authToken.set(authData.token);
      authUser.set(authData.record as unknown as User);
    } else {
      authToken.set(null);
      authUser.set(null);
    }
  } catch {
    pb.authStore.clear();
    authToken.set(null);
    authUser.set(null);
  } finally {
    authLoading.set(false);
  }
}

export async function logout() {
  pb.authStore.clear();
  authToken.set(null);
  authUser.set(null);
}
