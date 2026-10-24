import { redirect } from "next/navigation";

/** The explainer content lives on the front page ("/") now; keep old links working. */
export default function AboutPage() {
  redirect("/");
}
