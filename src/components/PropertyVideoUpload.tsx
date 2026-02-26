import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Upload, Link, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
interface PropertyVideoUploadProps {
  existingVideoUrl?: string | null;
  existingVideoType?: string | null;
  onVideoChange: (videoUrl: string | null, videoType: string | null, file?: File | null) => void;
}

export default function PropertyVideoUpload({
  existingVideoUrl,
  existingVideoType,
  onVideoChange,
}: PropertyVideoUploadProps) {
  const [videoUrl, setVideoUrl] = useState(existingVideoUrl || "");
  const [videoType, setVideoType] = useState<string>(existingVideoType || "external");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(existingVideoUrl || "");

  const handleExternalUrlChange = (url: string) => {
    setVideoUrl(url);
    setPreviewUrl(url);
    onVideoChange(url || null, url ? "external" : null, null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      alert("Video must be under 100MB");
      return;
    }

    setVideoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    onVideoChange("pending-upload", "upload", file);
  };

  const handleRemove = () => {
    setVideoUrl("");
    setVideoFile(null);
    setPreviewUrl("");
    onVideoChange(null, null, null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-lg font-semibold flex items-center gap-2">
            <Video className="h-5 w-5" />
            Property Video
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Optional · Upload a file or paste an external URL
          </p>
        </div>
        {(previewUrl || videoFile) && (
          <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
            <X className="h-4 w-4 mr-1" />
            Remove
          </Button>
        )}
      </div>

      {previewUrl && !videoFile ? (
        <div className="rounded-lg border overflow-hidden bg-muted">
          {videoType === "external" && (previewUrl.includes("youtube") || previewUrl.includes("youtu.be") || previewUrl.includes("vimeo")) ? (
            <div className="aspect-video flex items-center justify-center bg-muted text-muted-foreground text-sm p-4">
              <div className="text-center space-y-2">
                <Video className="h-8 w-8 mx-auto" />
                <p className="break-all text-xs">{previewUrl}</p>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs">
                  Open video ↗
                </a>
              </div>
            </div>
          ) : (
            <video src={previewUrl} controls className="w-full max-h-64 object-contain" />
          )}
        </div>
      ) : videoFile ? (
        <div className="rounded-lg border overflow-hidden bg-muted">
          <video src={URL.createObjectURL(videoFile)} controls className="w-full max-h-64 object-contain" />
          <div className="p-2 text-xs text-muted-foreground text-center">
            {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)}MB) — will upload on save
          </div>
        </div>
      ) : (
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="url">
              <Link className="h-3.5 w-3.5 mr-1.5" />
              External URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-3">
            <div
              onClick={() => document.getElementById("video-upload-input")?.click()}
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Click to upload video</p>
              <p className="text-xs text-muted-foreground mt-1">MP4, MOV, WEBM · Max 100MB</p>
            </div>
            <Input
              id="video-upload-input"
              type="file"
              accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
              onChange={handleFileSelect}
              className="hidden"
            />
          </TabsContent>

          <TabsContent value="url" className="mt-3">
            <Input
              placeholder="https://youtube.com/watch?v=... or direct video URL"
              value={videoUrl}
              onChange={(e) => {
                setVideoType("external");
                handleExternalUrlChange(e.target.value);
              }}
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              YouTube, Vimeo, or direct MP4 links supported
            </p>
          </TabsContent>
        </Tabs>
      )}

    </div>
  );
}

// Helper to upload a video file to storage
export async function uploadPropertyVideo(
  file: File,
  propertyId: string
): Promise<string | null> {
  try {
    const ext = file.name.split(".").pop() || "mp4";
    const filePath = `${propertyId}/video-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("inventory-photos")
      .upload(filePath, file, { upsert: true });

    if (error) throw error;

    const { data } = supabase.storage
      .from("inventory-photos")
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (err) {
    console.error("Video upload error:", err);
    return null;
  }
}
