import { createFileRoute } from "@tanstack/react-router";
import { Film } from "@/components/film";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <Film />;
}
