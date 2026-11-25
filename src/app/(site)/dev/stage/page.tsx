import { notFound } from "next/navigation";
import { DevStageClient } from "./DevStageClient";

export default function DevStagePage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <DevStageClient />;
}
