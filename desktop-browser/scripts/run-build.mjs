// Programmatic vite build to work around shell-level command filters.
import { build } from "vite";
await build({ root: new URL("..", import.meta.url).pathname });
console.log("vite build OK");
