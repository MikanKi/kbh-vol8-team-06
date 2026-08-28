"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CountdownCircleTimer } from "react-countdown-circle-timer";

const destinations = ["京都駅", "四条河原町", "三条京阪", "出町柳"];
const savedAddresses = ["自宅（中京区）", "職場（京都駅周辺）", "よく行く場所（祇園）"];

function Timer() {
    return (
        <div>
            <CountdownCircleTimer
              isPlaying
              duration={30}
              colors={["#0099ff", "#F7B801", "#A30000"]}
              colorsTime={[30, 15, 5, 0]}
              isSmoothColorTransition={false}
            >
                {({ remainingTime }) => {
                  const minutes = Math.floor(remainingTime / 60);
                  const seconds = String(remainingTime % 60).padStart(2, "0");
                  return (
                    <span className="font-mono text-4xl sm:text-4xl font-bold text-white">
                      {minutes}:{seconds}
                    </span>
                  );
                }}
            </CountdownCircleTimer>
        </div>
    );
}

export default function Home() {
  const [destination, setDestination] = useState(destinations[0]);
  const [isDestinationOpen, setIsDestinationOpen] = useState(false);
  const [addresses, setAddresses] = useState(savedAddresses);
  const [isAddPlaceFormOpen, setIsAddPlaceFormOpen] = useState(false);
  const [savedAddress, setSavedAddress] = useState(savedAddresses[0]);
  const [newPlaceName, setNewPlaceName] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(10 * 60);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setRemainingSeconds((seconds) => Math.max(seconds - 1, 0));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, []);

  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const seconds = String(remainingSeconds % 60).padStart(2, "0");

  const searchOnMap = () => {
    const query = encodeURIComponent(`${savedAddress} から ${destination}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900">
      <div className="mx-auto max-w-xl space-y-8">
        <header>
          <h1 className="mt-2 text-3xl font-bold text-teal-800">プロダクト名</h1>
          <p className="mt-3 text-zinc-400">
            出発地と終点地を選んで、終バス・終電を確認します。
          </p>
        </header>

        <section className="rounded-xl bg-teal-500 p-6 shadow-sm border border-teal-800">
          <h2 className="text-lg font-bold text-white">終点地</h2>
          <div className="relative mt-2">
            {isDestinationOpen && (
              <button
                type="button"
                aria-label="終点地の選択メニューを閉じる"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setIsDestinationOpen(false)}
              />
            )}

            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={isDestinationOpen}
              className="relative z-20 flex w-full items-center justify-between rounded-xl border border-teal-800 bg-white px-3 py-2 text-left text-zinc-900 shadow-sm"
              onClick={() => setIsDestinationOpen((isOpen) => !isOpen)}
            >
              <span>{savedAddress}</span>
              <Image
                src = "/down-arrow.png"
                alt = ""
                width = {20}
                height = {20}
                className = {`transition-transform ${
                  isDestinationOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isDestinationOpen && (
              <div
                role="listbox"
                aria-label="終点地"
                className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-teal-800 bg-white py-1 shadow-lg"
              >

                {addresses.map((place) => (
                  <button
                    key={place}
                    type="button"
                    role="option"
                    aria-selected={savedAddress === place}
                    onClick={() => {
                      setSavedAddress(place);
                      setIsDestinationOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-zinc-900 hover:bg-teal-50 ${
                      savedAddress === place ? "bg-teal-100 font-bold" : ""
                    }`}
                  >
                    {place}
                  </button>
                ))}
                <div className="mt-1 border-t border-teal-100 pt-1">
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm font-medium text-teal-700 hover:bg-teal-50"
                    onClick={() => setIsAddPlaceFormOpen((isOpen) => !isOpen)}
                  >
                    + 新しい場所を追加
                  </button>

                  {isAddPlaceFormOpen && (
                    <div className="space-y-3 border-t border-teal-100 px-3 py-3">
                      <label className="block text-sm font-medium text-zinc-700">
                        場所の名前
                        <input
                          type="text"
                          name="place-name"
                          placeholder="例：友人の家"
                          value={newPlaceName}
                          onChange={(e) => setNewPlaceName(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
                        />
                      </label>

                      <label className="block text-sm font-medium text-zinc-700">
                        住所
                        <input
                          type="text"
                          name="place-address"
                          placeholder="例：京都市中京区..."
                          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
                        />
                      </label>

                      <button
                        type = "button"
                        className="mt-1 w-full rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-teal-500 bg-teal-600"
                        onClick={() => {
                          const name = newPlaceName.trim();
                          if (!name) return;
                          setAddresses((prev) => [name, ...prev]);
                          setSavedAddress(name);
                          setNewPlaceName("");
                          setIsAddPlaceFormOpen(false);
                        }}
                      >
                        保存
                      </button>
                    </div>
                  )}

                  

                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl bg-teal-600 p-6 shadow-sm border border-teal-800">
          <h2 className="text-lg font-bold text-white">出発地</h2>
          <div className="relative mt-2">
          </div>
        </section>

        <section className="rounded-2xl bg-teal-900 p-6 text-white shadow-sm">
          <p className="text-sm text-zinc-300">終バス出発まで（仮）</p>

          <div className="mt-4 flex justify-center">
            <Timer />
          </div>

          
        </section>

        <p className="text-center text-sm text-zinc-500">
          出発地：{destination} ／ 終点地：{savedAddress}
        </p>
      </div>
    </main>
  );
}
