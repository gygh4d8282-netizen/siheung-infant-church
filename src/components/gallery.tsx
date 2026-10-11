"use client";
import { useEffect, useRef, useState } from "react";
import type { Asset } from "@/lib/types";
export function Gallery({ photos }: { photos: Asset[] }) {
  const [index, setIndex] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const photo = photos[index];
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    const listener = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")
        setIndex((i) => (i - 1 + photos.length) % photos.length);
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % photos.length);
    };
    node.addEventListener("keydown", listener);
    return () => node.removeEventListener("keydown", listener);
  }, [photos.length]);
  return (
    <>
      <div className="photo-grid">
        {photos.map((p, i) => (
          <button
            className="photo-button"
            key={p.id}
            onClick={() => {
              setIndex(i);
              dialog.current?.showModal();
            }}
          >
            <img
              src={"/api/files/" + p.id + "?thumb=1"}
              alt={p.alt}
              loading="lazy"
            />
            <span>{p.alt}</span>
          </button>
        ))}
      </div>
      {photo && (
        <dialog ref={dialog} className="lightbox" aria-label="사진 확대">
          <div className="lightbox-top">
            <span>
              {index + 1} / {photos.length}
            </span>
            <button
              className="secondary"
              onClick={() => dialog.current?.close()}
            >
              닫기 ×
            </button>
          </div>
          <img src={"/api/files/" + photo.id} alt={photo.alt} />
          <p>{photo.alt}</p>
          <div className="actions">
            <button
              className="secondary"
              onClick={() =>
                setIndex((index - 1 + photos.length) % photos.length)
              }
            >
              ← 이전 사진
            </button>
            <a
              className="button"
              href={"/api/files/" + photo.id + "?download=1"}
            >
              사진 내려받기
            </a>
            <button
              className="secondary"
              onClick={() => setIndex((index + 1) % photos.length)}
            >
              다음 사진 →
            </button>
          </div>
        </dialog>
      )}
    </>
  );
}
