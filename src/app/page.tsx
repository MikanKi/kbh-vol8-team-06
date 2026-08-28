"use client";

import { useState } from "react";
import Image from "next/image";
import { CountdownCircleTimer } from "react-countdown-circle-timer";

const initialDestinations = ["京都駅", "四条河原町", "三条京阪", "出町柳"];
const initialSavedAddresses = ["自宅（中京区）", "職場（京都駅周辺）", "よく行く場所（祇園）"];

function Timer({ duration = 0 }: { duration?: number }) {
  return (
    <div>
      <CountdownCircleTimer
        key={duration}
        isPlaying={duration > 0}
        duration={duration}
        colors={["#0099ff", "#F7B801", "#A30000"]}
        colorsTime={[1800, 900, 300, 0]}
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

function BusSelector({
  onDurationChange,
  onMissedBusChange,
}: {
  onDurationChange: (duration: number) => void;
  onMissedBusChange: (isMissed: boolean) => void;
}) {
  const busData: Record<string, any> = {
    "京都市バス": {
      "京都市役所前": {
        "32": {
          "四条河原町・西京極行き": {
            "平日": "22.08",
            "土曜日": "22.08",
            "休日": "22.08",
          },
          "平安神宮･銀閣寺行き": {
            "平日": "21.34",
            "土曜日": "21.34",
            "休日": "21.34",
          },
        },
        "3": {
          "四条河原町･松尾橋行き": {
            "平日": "22.56",
            "土曜日": "22.56",
            "休日": "22.56",
          },
          "北白川仕伏町(上終町・瓜生山学園 京都芸術大学前)行き": {
            "平日": "22.20",
            "土曜日": "22.20",
            "休日": "22.20",
          },
        },
      },
      "四条河原町": {
        "12": {
          "三条京阪行き": {
            "平日": "22.04",
            "土曜日": "22.04",
            "休日": "22.04",
          },
          "金閣寺・立命館大学行き": {
            "平日": "22.19",
            "土曜日": "22.19",
            "休日": "22.19",
          },
        },
        "5": {
          "京都駅 行き": {
            "平日": "22.49",
            "土曜日": "22.49",
            "休日": "22.49",
          },
          "銀閣寺･岩倉 行き": {
            "平日": "23.14",
            "土曜日": "23.14",
            "休日": "23.14",
          },
        },
      },
    },
    "京都バス": {
      "京都駅前": {
        "17": {
          "大原行き": {
            "平日": "18.57",
            "土曜日": "18.57",
            "休日": "18.57",
          },
        },
        "51": {
          "延暦寺・比叡山頂行き": {
            "平日": "18.52",
            "土曜日": "18.52",
            "休日": "18.52",
          },
        },
      },
      "四条河原町": {
        "17": {
          "京都駅前行き": {
            "平日": "22.42",
            "土曜日": "22.42",
            "休日": "22.42",
          },
          "大原行き": {
            "平日": "19.12",
            "土曜日": "19.12",
            "休日": "19.12",
          },
        },
        "41": {
          "岩倉村松行き": {
            "平日": "22.42",
            "土曜日": "22.42",
            "休日": "22.42"
          },
        },
      },
    },
  };

  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedStop, setSelectedStop] = useState<string | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<string | null>(null);
  const [lastBusTime, setLastBusTime] = useState<string | null>(null);

  const types = Object.keys(busData);

  return (
    <div>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="relative z-20 flex w-full items-center justify-between rounded-xl border border-teal-800 bg-white px-3 py-2 text-left text-zinc-900 shadow-sm"
        onClick={() => setIsOpen((o) => !o)}
      >
        <span>
          {selectedDirection
            ? `${selectedType} / ${selectedStop} / ${selectedNumber} / ${selectedDirection}`
            : selectedType
            ? `${selectedType} / ${selectedStop || "..."}`
            : "バスを選択してください"}
        </span>
        <Image src="/down-arrow.png" alt="" width={20} height={20} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-teal-800 bg-white p-1 shadow-lg">
            <div className = "z-20 mt-2 w-full overflow-hidden rounded-xl  bg-white py-1">
                <p className = "font-bold">
                    バスの種類を選択してください
                </p>
            </div>
            
          {/* Bus types */}
          <div className="px-1 py-1">
            {types.map((type) => (
              <button
                key={type}
                type="button"
                className={`w-full px-3 py-2 text-left text-zinc-900 hover:bg-teal-50 ${selectedType === type ? "bg-teal-100 font-bold" : ""}`}
                onClick={() => {
                  setSelectedType(type);
                  setSelectedStop(null);
                  setSelectedNumber(null);
                  setSelectedDirection(null);
                  setLastBusTime(null);
                }}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Stops */}
          {selectedType && (
            <div className="mt-1 border-t border-teal-100 pt-1">

                <div className = "z-20 mt-2 w-full overflow-hidden rounded-xl  bg-white py-1">
                    <p className = "font-bold">
                        停留所の種類を選択してください
                    </p>
                </div>

              {Object.keys(busData[selectedType!]).map((stop) => (
                <button
                  key={stop}
                  type="button"
                  className={`w-full px-3 py-2 text-left text-zinc-900 hover:bg-teal-50 ${selectedStop === stop ? "bg-teal-100 font-bold" : ""}`}
                  onClick={() => {
                    setSelectedStop(stop);
                    setSelectedNumber(null);
                    setSelectedDirection(null);
                    setLastBusTime(null);
                  }}
                >
                  {stop}
                </button>
              ))}
            </div>
          )}

          {/* Numbers */}
          {selectedType && selectedStop && (
            <div className="mt-1 border-t border-teal-100 pt-1">

                <div className = "z-20 mt-2 w-full overflow-hidden rounded-xl  bg-white py-1">
                    <p className = "font-bold">
                        系統を選択してください
                    </p>
                </div>

              {Object.keys(busData[selectedType!][selectedStop!]).map((num) => (
                <button
                  key={num}
                  type="button"
                  className={`w-full px-3 py-2 text-left text-zinc-900 hover:bg-teal-50 ${selectedNumber === num ? "bg-teal-100 font-bold" : ""}`}
                  onClick={() => {
                    setSelectedNumber(num);
                    setSelectedDirection(null);
                    setLastBusTime(null);
                  }}
                >
                  {num}
                </button>
              ))}
            </div>
          )}

          {/* Directions */}
          {selectedType && selectedStop && selectedNumber && (
            
            <div className="mt-1 border-t border-teal-100 pt-1">

                <div className = "z-20 mt-2 w-full overflow-hidden rounded-xl  bg-white py-1">
                    <p className = "font-bold">
                        方面を選択してください
                    </p>
                </div>
            
              {Object.keys(busData[selectedType!][selectedStop!][selectedNumber!]).map((dir) => (
                <button
                  key={dir}
                  type="button"
                  className={`w-full px-3 py-2 text-left text-zinc-900 hover:bg-teal-50 ${selectedDirection === dir ? "bg-teal-100 font-bold" : ""}`}
                  onClick={() => {
                  setSelectedDirection(dir);
                    const schedule = busData[selectedType!][selectedStop!][selectedNumber!][dir];
                    const getDayKey = () => {
                      const today = new Date();
                      // Sunday = 0, Saturday = 6
                      // Placeholder for holiday detection: treat only Sunday as holiday for now
                      const isHoliday = false; // replace with real holiday check if available
                      if (today.getDay() === 6) return "土曜日";
                      if (today.getDay() === 0 || isHoliday) return "休日";
                      return "平日";
                    };
                    const key = getDayKey();
                    const time = schedule?.[key] ?? Object.values(schedule)[0];
                    setLastBusTime(time as string);
                    const [hours, minutes] = (time as string).split(".").map(Number);
                    const lastBusDate = new Date();
                    lastBusDate.setHours(hours, minutes, 0, 0);
                    const calculatedDuration = Math.floor((lastBusDate.getTime() - Date.now()) / 1000);

                    if (calculatedDuration < 0) {
                      onDurationChange(0);
                      onMissedBusChange(true);
                    } else {
                      onDurationChange(calculatedDuration);
                      onMissedBusChange(false);
                    }
                    setIsOpen(false);
                  }}
                >
                  {dir}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {lastBusTime && (
        <p className="mt-2 text-sm font-medium text-white">最終バス: {lastBusTime}</p>
      )}
    </div>
  );
}

export default function Home() {
  const [destination, setDestination] = useState(initialDestinations[0]);
  const [isDestinationOpen, setIsDestinationOpen] = useState(false);
  const [addresses, setAddresses] = useState(initialSavedAddresses);
  const [isAddPlaceFormOpen, setIsAddPlaceFormOpen] = useState(false);
  const [savedAddress, setSavedAddress] = useState(initialSavedAddresses[0]);
  const [newPlaceName, setNewPlaceName] = useState("");
  const [duration, setDuration] = useState(0);
  const [isMissedBus, setIsMissedBus] = useState(false);

  const searchOnMap = () => {
    const query = encodeURIComponent(`${savedAddress} から ${destination}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900">
      <div className="mx-auto max-w-xl space-y-8">
        <header>
          <h1 className="mt-2 text-3xl font-bold text-teal-800">プロダクト名</h1>
          <p className="mt-3 text-zinc-400">出発地と終点地を選んで、終バス・終電を確認します。</p>
        </header>

        <section className="rounded-xl bg-teal-600 p-6 shadow-sm border border-teal-800">
          <h2 className="text-lg font-bold text-white">終点地</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <select
              id="saved-address"
              value={savedAddress}
              onChange={(event) => setSavedAddress(event.target.value)}
              className="mt-4 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3"
            >
              {addresses.map((address) => (
                <option key={address} value={address}>
                  {address}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="rounded-xl bg-teal-500 p-6 shadow-sm border border-teal-800">
          <h2 className="text-lg font-bold text-white">出発地</h2>
          <div className="relative mt-2">
            <BusSelector
              onDurationChange={setDuration}
              onMissedBusChange={setIsMissedBus}
            />
          </div>
        </section>

        <section className="rounded-2xl bg-teal-900 p-6 text-white shadow-sm">
          <p className="text-sm text-zinc-300">終バス出発まで</p>

          <div className="mt-4 flex justify-center">
            <Timer duration={duration} />
          </div>

          {isMissedBus && <p className="mt-4 text-center font-bold text-white">バスを逃しました</p>}
        </section>

        <p className="text-center text-sm text-zinc-500">出発地：{destination} ／ 終点地：{savedAddress}</p>
      </div>
    </main>
  );
}
