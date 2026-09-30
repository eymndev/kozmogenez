import { createFileRoute } from "@tanstack/react-router";
import { Film } from "@/film/film";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <Film />;
}
