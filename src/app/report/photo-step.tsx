"use client";

// Ticket 05 UI — the optional Photo step (Describe → Details → Photo → Review).
//
// Attaching a photo is never required: the student can skip straight to review.
// When a file IS chosen we validate it through the reporting module's pure gate
// (image + size cap), show a LOCAL object-URL preview so it works with no cloud
// configured, and let the student replace or remove it before posting. The
// actual upload is still done best-effort by `fileReport` at post time via the
// injected PhotoUploader — this step only chooses the file and previews it.
import * as React from "react";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { evaluatePhotoSelection } from "@/modules/reporting";

interface PhotoStepProps {
  /** The currently chosen photo (lifted to the flow so it survives step nav). */
  photo: File | null;
  /** Replace / clear the chosen photo. */
  onChange: (photo: File | null) => void;
  /** Continue to Review. */
  onNext: () => void;
  /** Go back to the previous step. */
  onBack: () => void;
}

export function PhotoStep({ photo, onChange, onNext, onBack }: PhotoStepProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [dragging, setDragging] = React.useState(false);

  // A local object URL for the preview so the step works offline without
  // Supabase. Derived from the file (no setState), and revoked on change/unmount
  // so the blob URL never leaks.
  const previewUrl = React.useMemo(
    () => (photo ? URL.createObjectURL(photo) : null),
    [photo],
  );
  React.useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function accept(file: File | null) {
    const check = evaluatePhotoSelection(file);
    if (!check.accepted) {
      setError(check.reason);
      return;
    }
    setError(null);
    onChange(file);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    accept(e.target.files?.[0] ?? null);
    // Allow re-selecting the same file after a remove.
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    accept(e.dataTransfer.files?.[0] ?? null);
  }

  function remove() {
    setError(null);
    onChange(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add a photo</CardTitle>
        <p className="text-sm text-muted-foreground">
          A photo helps staff find and fix the problem. It&apos;s optional — you can skip this.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <input
          ref={inputRef}
          id="report-photo"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={onInputChange}
        />

        {photo && previewUrl ? (
          <div className="flex flex-col gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={`Preview of ${photo.name}`}
              className="max-h-64 w-full rounded-(--radius) border border-border object-contain bg-muted"
            />
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
                Replace photo
              </Button>
              <Button type="button" variant="ghost" onClick={remove}>
                Remove photo
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            aria-label="Add a photo: tap to choose, or drag an image here"
            className={
              "flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-(--radius) border-2 border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground transition-colors hover:border-primary" +
              (dragging ? " border-primary bg-muted" : "")
            }
          >
            <span className="font-medium text-foreground">Tap to add a photo</span>
            <span>or drag an image here</span>
          </button>
        )}

        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-2">
          <Button type="button" onClick={onNext}>
            {photo ? "Continue" : "Skip for now"}
          </Button>
          <Button type="button" variant="ghost" onClick={onBack}>
            Back
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
