'use client';

import { Camera, Trash2 } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import Cropper from 'react-easy-crop';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { t } from '@/i18n';
import { cropImage, type CropArea } from '../crop';
import { AVATAR_ACCEPT, AVATAR_SOURCE_MAX_BYTES } from '../schemas';

type AvatarPickerProps = {
  /** URL da foto atual (já salva ou recém-recortada). */
  previewUrl: string | null;
  name: string;
  onPick: (image: Blob) => void;
  onRemove: () => void;
  disabled?: boolean;
};

function isAccepted(type: string): boolean {
  return (AVATAR_ACCEPT as readonly string[]).includes(type);
}

export function AvatarPicker({ previewUrl, name, onPick, onRemove, disabled }: AvatarPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const zoomId = useId();
  const [source, setSource] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<CropArea | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    return () => {
      if (source) URL.revokeObjectURL(source);
    };
  }, [source]);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!isAccepted(file.type)) {
      setError(t.profile.avatar.invalidType);
      return;
    }
    if (file.size > AVATAR_SOURCE_MAX_BYTES) {
      setError(t.profile.avatar.tooLarge);
      return;
    }
    setError(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setArea(null);
    setSource(URL.createObjectURL(file));
  };

  const apply = async () => {
    if (!source || !area) return;
    setApplying(true);
    try {
      onPick(await cropImage(source, area));
      setSource(null);
    } catch {
      setError(t.profile.avatar.uploadFailed);
      setSource(null);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <Avatar
        src={previewUrl}
        alt={t.profile.avatar.alt(name || t.profile.fields.name)}
        className="size-28"
      />
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={disabled}>
          <Camera className="size-4" aria-hidden="true" />
          {previewUrl ? t.profile.avatar.change : t.profile.avatar.add}
        </Button>
        {previewUrl ? (
          <Button variant="ghost" onClick={onRemove} disabled={disabled}>
            <Trash2 className="size-4" aria-hidden="true" />
            {t.profile.avatar.remove}
          </Button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_ACCEPT.join(',')}
        onChange={handleFile}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      {error ? (
        <p role="alert" className="text-center text-sm text-danger">
          {error}
        </p>
      ) : null}

      <Dialog
        open={Boolean(source)}
        onOpenChange={(open) => {
          if (!open && !applying) setSource(null);
        }}
        title={t.profile.avatar.cropTitle}
        description={t.profile.avatar.cropDescription}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSource(null)} disabled={applying}>
              {t.common.cancel}
            </Button>
            <Button onClick={() => void apply()} loading={applying} disabled={!area}>
              {t.profile.avatar.apply}
            </Button>
          </>
        }
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-background">
          {source ? (
            <Cropper
              image={source}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setArea(pixels)}
            />
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor={zoomId} className="text-sm text-muted">
            {t.profile.avatar.zoom}
          </label>
          <input
            id={zoomId}
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="h-11 flex-1 accent-primary"
          />
        </div>
      </Dialog>
    </div>
  );
}
