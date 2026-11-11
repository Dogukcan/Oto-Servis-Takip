import fs from "node:fs";
import { dbCheckpointEt } from "@/lib/db";
import { dbDosyaYolu } from "@/lib/yedekle";

export async function GET() {
  dbCheckpointEt();
  const veri = fs.readFileSync(dbDosyaYolu());
  return new Response(new Uint8Array(veri), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": 'attachment; filename="servis-yedek.db"',
    },
  });
}
