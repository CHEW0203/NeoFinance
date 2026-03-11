import { TransactionScreen } from "@/features/transactions/components/transaction-screen";

export default async function TransactionsPage({ searchParams }) {
  const params = await searchParams;
  const recordId = params?.recordId || "";
  return <TransactionScreen recordId={recordId} />;
}
