import { Studio } from "./Studio";

export const dynamic = "force-static";

export { metadata, viewport } from "next-sanity/studio";

export function generateStaticParams() {
  return [{ tool: [] }];
}

export default function AdminPage() {
  return <Studio />;
}

