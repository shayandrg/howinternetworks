import { notFound } from "next/navigation";

export default function DevStagePage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <div><h1>Stage dev</h1></div>;
}
