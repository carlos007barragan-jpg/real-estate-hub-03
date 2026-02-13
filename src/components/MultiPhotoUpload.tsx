import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, GripVertical, Upload, Star, ImagePlus } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PhotoItem {
  id: string;
  file?: File;
  url?: string;
  preview: string;
}

interface MultiPhotoUploadProps {
  existingPhotos?: string[];
  onPhotosChange: (files: File[], existingUrls: string[]) => void;
  maxPhotos?: number;
}

function SortablePhotoItem({ photo, onRemove, isFeatured }: { photo: PhotoItem; onRemove: (id: string) => void; isFeatured: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group bg-muted rounded-lg overflow-hidden border-2 ${isFeatured ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`}
    >
      <img
        src={photo.preview}
        alt="Property"
        className="w-full h-32 object-cover"
      />
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-2 bg-primary/80 hover:bg-primary rounded-full cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-primary-foreground" />
        </button>
        <button
          type="button"
          onClick={() => onRemove(photo.id)}
          className="p-2 bg-destructive/80 hover:bg-destructive rounded-full"
        >
          <X className="h-4 w-4 text-destructive-foreground" />
        </button>
      </div>
      {isFeatured ? (
        <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded flex items-center gap-1">
          <Star className="h-3 w-3 fill-current" />
          Featured
        </div>
      ) : (
        <div className="absolute top-2 left-2 bg-muted-foreground/70 text-white text-xs px-2 py-1 rounded">
          {photo.file ? 'New' : 'Saved'}
        </div>
      )}
    </div>
  );
}

export default function MultiPhotoUpload({ 
  existingPhotos = [], 
  onPhotosChange,
  maxPhotos = 10 
}: MultiPhotoUploadProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>(() => 
    existingPhotos.map((url, index) => ({
      id: `existing-${index}`,
      url,
      preview: url,
    }))
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      
      const remainingSlots = maxPhotos - photos.length;
      if (remainingSlots <= 0) return;
      
      const filesToAdd = files.slice(0, remainingSlots);

      const newPhotos: PhotoItem[] = filesToAdd.map((file, index) => ({
        id: `new-${Date.now()}-${index}`,
        file,
        preview: URL.createObjectURL(file),
      }));

      const updatedPhotos = [...photos, ...newPhotos];
      setPhotos(updatedPhotos);
      updateParent(updatedPhotos);
      e.target.value = '';
    } catch (error) {
      console.error('Error handling file selection:', error);
    }
  };

  const handleRemove = (id: string) => {
    const updatedPhotos = photos.filter((p) => p.id !== id);
    setPhotos(updatedPhotos);
    updateParent(updatedPhotos);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = photos.findIndex((p) => p.id === active.id);
      const newIndex = photos.findIndex((p) => p.id === over.id);
      const reordered = arrayMove(photos, oldIndex, newIndex);
      setPhotos(reordered);
      updateParent(reordered);
    }
  };

  const updateParent = (updatedPhotos: PhotoItem[]) => {
    const newFiles = updatedPhotos.filter(p => p.file).map(p => p.file!);
    const existingUrls = updatedPhotos.filter(p => p.url).map(p => p.url!);
    onPhotosChange(newFiles, existingUrls);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-lg font-semibold">Property Photos</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            {photos.length}/{maxPhotos} photos · First photo is the featured image
          </p>
        </div>
        {photos.length < maxPhotos && (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => document.getElementById('photo-upload')?.click()}
          >
            <ImagePlus className="h-4 w-4 mr-2" />
            Add Photos
          </Button>
        )}
      </div>

      <Input
        id="photo-upload"
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {photos.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Drag photos to reorder. First photo = featured image.
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={photos.map(p => p.id)} strategy={verticalListSortingStrategy}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo, index) => (
                  <SortablePhotoItem
                    key={photo.id}
                    photo={photo}
                    onRemove={handleRemove}
                    isFeatured={index === 0}
                  />
                ))}
                {/* Add More Photos Card */}
                {photos.length < maxPhotos && (
                  <div
                    onClick={() => document.getElementById('photo-upload')?.click()}
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg h-32 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-colors"
                  >
                    <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Add More</p>
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      ) : (
        <div
          onClick={() => document.getElementById('photo-upload')?.click()}
          className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Click to upload photos or drag and drop
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            PNG, JPG, WEBP up to 10MB each
          </p>
        </div>
      )}
    </div>
  );
}
