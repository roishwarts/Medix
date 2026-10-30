import { PageSkeleton } from "@/components/skeleton";

// Shown the moment this page is opened, so a tap gets an instant response while the data loads.
export default function Loading() {
  return <PageSkeleton />;
}
