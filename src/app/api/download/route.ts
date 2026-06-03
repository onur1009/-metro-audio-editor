import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get("file");

  if (!filename) {
    return NextResponse.json({ error: "No file specified" }, { status: 400 });
  }

  // Sadece güvenli dosya isimlerine izin ver
  if (filename.includes("..") || filename.includes("/")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const filePath = join(process.cwd(), "tmp", "outputs", filename);

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const fileBuffer = await readFile(filePath);
    
    // Doğru MIME türünü ayarla
    let contentType = "application/octet-stream";
    if (filename.endsWith(".mp3")) contentType = "audio/mpeg";
    if (filename.endsWith(".wav")) contentType = "audio/wav";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }
}
