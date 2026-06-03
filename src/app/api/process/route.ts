import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import crypto from "crypto";
import { existsSync } from "fs";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as File;
    const jingle = formData.get("jingle") as File | null;
    const editsStr = formData.get("edits") as string;
    const gainStr = formData.get("gain") as string;
    const useJingleStr = formData.get("useJingle") as string;
    const useJingle = useJingleStr === "true";

    if (!audio) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const gain = parseFloat(gainStr) || 1;
    const edits = JSON.parse(editsStr || "[]");

    // Setup directories
    const tmpDir = join(tmpdir(), "metro-audio");
    const outputDir = join(tmpdir(), "metro-audio", "outputs");
    if (!existsSync(tmpDir)) await mkdir(tmpDir, { recursive: true });
    if (!existsSync(outputDir)) await mkdir(outputDir, { recursive: true });

    // Save uploaded files
    const audioId = crypto.randomUUID();
    const audioPath = join(tmpDir, `${audioId}_input.wav`);
    await writeFile(audioPath, Buffer.from(await audio.arrayBuffer()));

    let jinglePath = null;
    if (useJingle) {
      // Varsayılan (Standart) Jingle kontrolü
      const defaultJingleMp3 = join(process.cwd(), "public", "default_jingle.mp3");
      const defaultJingleWav = join(process.cwd(), "public", "default_jingle.wav");
      if (existsSync(defaultJingleMp3)) jinglePath = defaultJingleMp3;
      else if (existsSync(defaultJingleWav)) jinglePath = defaultJingleWav;
    }

    // Build FFmpeg complex filter
    // 1. Silences
    const silences = edits.filter((e: any) => e.type === "silence");
    let silenceFilter = "";
    if (silences.length > 0) {
      const enableStr = silences.map((s: any) => `between(t,${s.start},${s.end})`).join("+");
      silenceFilter = `volume=0:enable='${enableStr}'`;
    }

    // 2. Cuts
    const cuts = edits.filter((e: any) => e.type === "cut");
    let cutFilter = "";
    if (cuts.length > 0) {
      const notStr = cuts.map((c: any) => `between(t,${c.start},${c.end})`).join("+");
      cutFilter = `aselect='not(${notStr})',asetpts=N/SR/TB`;
    }

    // Process audio graph
    let audioFilters = [];
    if (silenceFilter) audioFilters.push(silenceFilter);
    if (cutFilter) audioFilters.push(cutFilter);
    audioFilters.push(`volume=${gain}`);

    const processAudioChain = audioFilters.join(",");

    const processFormats = async (ext: string, bitrate: string, isWav: boolean) => {
      return new Promise<string>((resolve, reject) => {
        const outputPath = join(outputDir, `${audioId}_output_${bitrate || 'wav'}.${ext}`);
        
        let command = ffmpeg();
        
        if (jinglePath) {
          command = command.input(jinglePath).input(audioPath);
          const filterComplex = [
            `[1:a]${processAudioChain || 'anull'}[processed]`,
            `[0:a][processed]concat=n=2:v=0:a=1[out]`
          ];
          command = command.complexFilter(filterComplex).map("[out]");
        } else {
          command = command.input(audioPath);
          if (processAudioChain) {
            command = command.audioFilters(processAudioChain.split(","));
          }
        }

        if (isWav) {
          command = command.audioCodec('pcm_s16le'); // Standard 16-bit WAV
        } else {
          command = command.audioBitrate(bitrate);
        }

        command
          .on("end", () => resolve(`/api/download?file=${audioId}_output_${bitrate || 'wav'}.${ext}`))
          .on("error", (err) => {
            console.error("FFmpeg error:", err);
            reject(err);
          })
          .save(outputPath);
      });
    };

    // Process all 3 formats in parallel
    const [url192, url128, urlWav] = await Promise.all([
      processFormats("mp3", "192k", false),
      processFormats("mp3", "128k", false),
      processFormats("wav", "", true)
    ]);

    return NextResponse.json({
      success: true,
      files: [
        { format: "192 Kbps MP3", url: url192 },
        { format: "128 Kbps MP3", url: url128 },
        { format: "WAV", url: urlWav }
      ]
    });

  } catch (error: any) {
    console.error("Processing error:", error);
    return NextResponse.json({ error: error.message || "Failed to process audio" }, { status: 500 });
  }
}
