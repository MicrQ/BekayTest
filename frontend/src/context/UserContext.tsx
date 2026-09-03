"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api } from "@/lib/api";
import { User } from "@/types";

interface UserContextType {
  users: User[];
  currentUser: User | null;
  setCurrentUser: (user: User) => void;
  switchUser: (userId: string) => void;
  isLoading: boolean;
  error: string | null;
  refreshUsers: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getUsers();
      setUsers(data);
      if (data.length > 0) {
        // Default to first user if none currently selected
        setCurrentUser((prev) => {
          if (!prev) return data[0];
          const exists = data.find((u) => u.id === prev.id);
          return exists || data[0];
        });
      }
    } catch (err) {
      console.error("Failed to load users:", err);
      setError("Unable to connect to Neba API server. Please check backend is running.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const switchUser = useCallback(
    (userId: string) => {
      const found = users.find((u) => u.id === userId);
      if (found) {
        setCurrentUser(found);
      }
    },
    [users]
  );

  return (
    <UserContext.Provider
      value={{
        users,
        currentUser,
        setCurrentUser,
        switchUser,
        isLoading,
        error,
        refreshUsers: fetchUsers,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
