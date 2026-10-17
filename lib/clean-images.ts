import { connectDB } from "@/lib/mongo";
import { Article } from "@/model";

export function cleanHighQualityImageUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;

  let url = raw
    .replace(/&#0*38;/gi, "&")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .trim();

  if (!/^https?:\/\//i.test(url)) return null;

  // Strip WordPress downsampling / thumbnail cropping parameters:
  // e.g. "?quality=90&strip=all&crop=0,0,100,100" -> downsampled to 100x100!
  url = url.replace(/(&|\?)crop=\d+,\d+,\d+,\d+/gi, "");
  url = url.replace(/(&|\?)resize=\d+(%2C|,)\d+/gi, "");
  url = url.replace(/(&|\?)w=\d+/gi, "");
  url = url.replace(/(&|\?)fit=\d+(%2C|,)\d+/gi, "");

  // Clean trailing or doubled separators
  url = url.replace(/(\?|&)+$/, "");
  url = url.replace(/\?&/, "?");

  return url;
}

export async function upgradeDatabaseImages() {
  await connectDB();
  const articles = await Article.find({
    image: { $exists: true, $ne: null },
  }).select("_id image");

  const ops = [];
  for (const a of articles) {
    if (typeof a.image === "string") {
      const cleaned = cleanHighQualityImageUrl(a.image);
      if (cleaned && cleaned !== a.image) {
        ops.push({
          updateOne: {
            filter: { _id: a._id },
            update: { $set: { image: cleaned } },
          },
        });
      }
    }
  }

  if (ops.length > 0) {
    await Article.bulkWrite(ops);
  }

  return { total: articles.length, upgraded: ops.length };
}
