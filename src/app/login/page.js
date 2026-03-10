import { LoginScreen } from "@/features/auth/components/login-screen";

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const nextPath = params?.next || "/";
  return <LoginScreen nextPath={nextPath} />;
}
