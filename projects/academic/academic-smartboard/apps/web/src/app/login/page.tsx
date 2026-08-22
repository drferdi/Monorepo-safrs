"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../components/ui/button.tsx";
import { Input } from "../../components/ui/input.tsx";
import { Label } from "../../components/ui/label.tsx";
import { useAuth } from "../../lib/auth.tsx";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);
    try {
      await login(values.email, values.password);
      // /master/murid is built in Task 8; typedRoutes can't see it yet.
      router.push("/master/murid" as Route);
    } catch {
      setFormError("Email atau kata sandi salah");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-(--space-4)">
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="w-full max-w-sm space-y-(--space-4)"
      >
        <h1 className="text-(length:--font-size-title-page) font-semibold text-primary">
          Masuk
        </h1>

        <div className="space-y-(--space-2)">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-(length:--font-size-body-compact) text-critical">
              Email tidak valid
            </p>
          )}
        </div>

        <div className="space-y-(--space-2)">
          <Label htmlFor="password">Kata sandi</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-(length:--font-size-body-compact) text-critical">
              Kata sandi wajib diisi
            </p>
          )}
        </div>

        {formError && (
          <p
            role="alert"
            className="text-(length:--font-size-body-compact) text-critical"
          >
            {formError}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          Masuk
        </Button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  // AuthProvider is wired into the root layout (Task 7); this route relies
  // solely on that context now.
  return <LoginForm />;
}
