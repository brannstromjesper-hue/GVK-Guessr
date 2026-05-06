"use client";

import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type GuessPoint = {
  id: string;
  memberName: string;
  lat: number;
  lng: number;
  score: number;
  distanceKm: number;
};

type Props = {
  guesses: GuessPoint[];
};

const defaultZoom = 4;

function configureMarkerIcons() {
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
}

function FitGuessBounds({ guesses }: Props) {
  const map = useMap();

  useEffect(() => {
    if (guesses.length === 0) return;
    if (guesses.length === 1) {
      map.setView([guesses[0].lat, guesses[0].lng], 6);
      return;
    }

    const bounds = L.latLngBounds(guesses.map((guess) => [guess.lat, guess.lng]));
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 8 });
  }, [guesses, map]);

  return null;
}

export default function AdminGuessesMap({ guesses }: Props) {
  useEffect(() => {
    configureMarkerIcons();
  }, []);

  if (guesses.length === 0) {
    return (
      <div className="flex h-[420px] w-full items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
        Ei arvauspisteitä kartalla vielä.
      </div>
    );
  }

  const firstGuess = guesses[0];
  const center: [number, number] = [firstGuess.lat, firstGuess.lng];

  return (
    <MapContainer
      center={center}
      zoom={guesses.length === 1 ? 6 : defaultZoom}
      className="h-[420px] w-full rounded-xl border border-zinc-200 dark:border-zinc-800 [&_.leaflet-control-attribution]:text-[10px]"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitGuessBounds guesses={guesses} />
      {guesses.map((guess) => (
        <Marker key={guess.id} position={[guess.lat, guess.lng]}>
          <Popup>
            <div className="space-y-1 text-sm">
              <p className="font-medium">{guess.memberName}</p>
              <p>Pisteet: {guess.score}</p>
              <p>Etäisyys: {Math.round(guess.distanceKm * 100) / 100} km</p>
              <p>
                {guess.lat.toFixed(4)}, {guess.lng.toFixed(4)}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
