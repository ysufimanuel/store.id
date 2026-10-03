"use client";
import type { Profile } from "@/lib/types";
import { createContext, useContext } from "react";

const ProfileCtx = createContext<Profile | null>(null);

export function useProfile() {
  return useContext(ProfileCtx);
}

export function ProfileProvider({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  return <ProfileCtx.Provider value={profile}>{children}</ProfileCtx.Provider>;
}
