"use client";

import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function ClickHandler({
  onPick,
  disabled,
}: {
  onPick: (lat: number, lng: number) => void;
  disabled?: boolean;
}) {
  useMapEvents({
    click(e) {
      if (disabled) return;
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const defaultCenter: [number, number] = [62.5, 10.5];
const defaultZoom = 4;

type GuessMapProps = {
  disabled?: boolean;
  initialLat?: number | null;
  initialLng?: number | null;
  onPositionChange?: (lat: number, lng: number) => void;
};

export default function GuessMap({
  disabled,
  initialLat,
  initialLng,
  onPositionChange,
}: GuessMapProps) {
  const [mounted, setMounted] = useState(false);
  const [lat, setLat] = useState<number | null>(initialLat ?? null);
  const [lng, setLng] = useState<number | null>(initialLng ?? null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
      ._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });
  }, []);

  useEffect(() => {
    if (initialLat != null && initialLng != null) {
      setLat(initialLat);
      setLng(initialLng);
    }
  }, [initialLat, initialLng]);

  function handlePick(nextLat: number, nextLng: number) {
    if (disabled) return;
    setLat(nextLat);
    setLng(nextLng);
    onPositionChange?.(nextLat, nextLng);
  }

  if (!mounted) {
    return (
      <div className="flex h-[420px] w-full items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
        Ladataan karttaa…
      </div>
    );
  }

  const center: [number, number] =
    lat != null && lng != null ? [lat, lng] : defaultCenter;
  const zoom = lat != null && lng != null ? 6 : defaultZoom;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-[420px] w-full rounded-xl border border-zinc-200 dark:border-zinc-800 [&_.leaflet-control-attribution]:text-[10px]"
      scrollWheelZoom
      dragging={!disabled}
      touchZoom={!disabled}
      doubleClickZoom={!disabled}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPick={handlePick} disabled={disabled} />
      {lat != null && lng != null ? (
        <Marker position={[lat, lng]} />
      ) : null}
    </MapContainer>
  );
}
