import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import crypto from "crypto";
import { existsSync } from "fs";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as File;

    if (!audio) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const tmpDir = join(process.cwd(), "tmp");
    if (!existsSync(tmpDir)) {
      await mkdir(tmpDir, { recursive: true });
    }

    const audioId = crypto.randomUUID();
    const inputPath = join(tmpDir, `${audioId}_enhance_in.wav`);
    const outputPath = join(tmpDir, `${audioId}_enhance_out.wav`);
    
    await writeFile(inputPath, Buffer.from(await audio.arrayBuffer()));

    // FFmpeg Ses Temizleme (Voice Enhancement) Algoritması
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFilters([
          'highpass=f=150',         // Metrolardaki uğultu ve rüzgar (rumble) sesini keser
          'lowpass=f=8000',         // Çınlama ve çok ince tıslama seslerini keser
          'afftdn=nf=-25',          // Genel FFT gürültü azaltma (noise reduction)
          'dynaudnorm=f=150:g=15'   // Sesi podcast standardında dengeler
        ])
        .audioCodec('pcm_s16le')
        .on("end", () => resolve())
        .on("error", (err) => {
          console.error("FFmpeg filter error:", err);
          reject(err);
        })
        .save(outputPath);
    });

    const outputBuffer = await readFile(outputPath);
    
    // Temizlenmiş WAV dosyasını doğrudan Binary (Blob) olarak geri dön
    return new NextResponse(outputBuffer, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Disposition": `attachment; filename="enhanced.wav"`
      }
    });

  } catch (error) {
    console.error("Enhance error:", error);
    return NextResponse.json({ error: "Sesi temizlerken bir hata oluştu." }, { status: 500 });
  }
}
