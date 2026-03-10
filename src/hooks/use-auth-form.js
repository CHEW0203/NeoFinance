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
    } catch (requestError) {
      setError(requestError.message || messages.loginFailed || "Failed to login.");
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
      setError(
        messages.passwordMismatch || "Password and confirm password do not match."
      );
      return;
    }
    if (form.password.length < 8) {
      setError(messages.passwordTooShort || "Password must be at least 8 characters.");
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
    } catch (requestError) {
      setError(requestError.message || messages.registerFailed || "Failed to register.");
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
