"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiRequest } from "@/lib/api";

type AuthFormProps = {
  mode: "login" | "register";
};

type AuthResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string | null;
  };
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload =
        mode === "register"
          ? await apiRequest<AuthResponse>("/auth/register", {
              method: "POST",
              body: JSON.stringify({ email, password, name }),
            })
          : await apiRequest<AuthResponse>("/auth/login", {
              method: "POST",
              body: JSON.stringify({ email, password }),
            });

      localStorage.setItem("autoig.token", payload.token);
      localStorage.setItem("autoig.user", JSON.stringify(payload.user));
      router.push("/dashboard");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to continue",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {mode === "register" ? (
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-700">Name</span>
          <input
            className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-orange-500"
            placeholder="Aarav Sharma"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
      ) : null}

      <label className="block space-y-2">
        <span className="text-sm font-medium text-stone-700">Email</span>
        <input
          className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-orange-500"
          placeholder="founder@brand.com"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-stone-700">Password</span>
        <input
          className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-orange-500"
          placeholder="Minimum 8 characters"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>

      {error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <button
        className="w-full rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-400"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting
          ? "Working..."
          : mode === "register"
            ? "Create account"
            : "Sign in"}
      </button>
    </form>
  );
}
