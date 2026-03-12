import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser, registerUser } from "@/services/auth-api";

export function useLoginForm(nextPath = "/", messages = {}) {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    password: "",
    rememberMe: false,
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await loginUser(form);
      router.push(nextPath || "/");
      router.refresh();
    } catch {
      setError(messages.loginFailed);
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    form,
    setForm,
    error,
    isSubmitting,
    submit,
  };
}

export function useRegisterForm(messages = {}) {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError(messages.passwordMismatch);
      return;
    }
    if (form.password.length < 8) {
      setError(messages.passwordTooShort);
      return;
    }

    setIsSubmitting(true);
    try {
      await registerUser({
        username: form.username,
        password: form.password,
      });
      router.push("/login");
      router.refresh();
    } catch {
      setError(messages.registerFailed);
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    form,
    setForm,
    error,
    isSubmitting,
    submit,
  };
}
