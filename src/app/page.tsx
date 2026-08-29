"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CountdownCircleTimer } from "react-countdown-circle-timer";

type BusStop = { stop_id: string; stop_name: string };
type Departure = { routeId: string; headsign: string; departureTime: string };
type LastDepartures = { stopId: string; serviceDate: string; departures: Departure[] };

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);

  return Uint8Array.from(rawData, (character) => character.charCodeAt(0));
}

function getRequestDate() {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const date = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${date.year}-${date.month}-${date.day}`;
}

function Timer({ duration = 0 }: { duration?: number }) {
  return (
    <CountdownCircleTimer key={duration} isPlaying={duration > 0} duration={duration}
      colors={["#0099ff", "#F7B801", "#A30000"]} colorsTime={[1800, 900, 300, 0]}
      isSmoothColorTransition={false}>
      {({ remainingTime }) => {
        const hours = Math.floor(remainingTime / 3600);
        const minutes = String(Math.floor((remainingTime % 3600) / 60)).padStart(2, "0");
        const seconds = String(remainingTime % 60).padStart(2, "0");
        return <span className="font-mono text-3xl font-bold text-white">{hours}:{minutes}:{seconds}</span>;
      }}
    </CountdownCircleTimer>
  );
}

function BusSelector({ onDurationChange, onMissedBusChange }: {
  onDurationChange: (duration: number) => void;
  onMissedBusChange: (isMissed: boolean) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [busStops, setBusStops] = useState<BusStop[]>([]);
  const [selectedStop, setSelectedStop] = useState<BusStop | null>(null);
  const [lastDepartures, setLastDepartures] = useState<LastDepartures | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<string | null>(null);
  const [lastBusTime, setLastBusTime] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchBusStops = async () => {
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        if (!apiBaseUrl) throw new Error("APIのベースURLが設定されていません。");
        const response = await fetch(`${apiBaseUrl}/bus-stops`, { signal: controller.signal });
        if (!response.ok) throw new Error("停留所情報の取得に失敗しました。");
        const data = (await response.json()) as { stops?: BusStop[] };
        if (!Array.isArray(data.stops)) throw new Error("停留所情報の形式が正しくありません。");
        setBusStops(data.stops);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setApiError(error instanceof Error ? error.message : "停留所情報の取得に失敗しました。");
      }
    };
    void fetchBusStops();
    return () => controller.abort();
  }, []);

  const selectStop = async (stop: BusStop) => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!apiBaseUrl) throw new Error("APIのベースURLが設定されていません。");
      setSelectedStop(stop);
      setLastDepartures(null);
      setSelectedDirection(null);
      setLastBusTime(null);
      setApiError(null);
      setIsLoading(true);
      onDurationChange(0);
      onMissedBusChange(false);
      const query = new URLSearchParams({ stopId: stop.stop_id, date: getRequestDate() });
      const response = await fetch(`${apiBaseUrl}/last-departures?${query}`);
      if (!response.ok) throw new Error("最終バス情報の取得に失敗しました。");
      const data = (await response.json()) as LastDepartures;
      if (data.stopId !== stop.stop_id || !Array.isArray(data.departures)) {
        throw new Error("最終バス情報の形式が正しくありません。");
      }
      setLastDepartures(data);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "最終バス情報の取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const selectDeparture = (departure: Departure, currentTime: number) => {
    if (!lastDepartures) return;
    setSelectedDirection(departure.routeId);
    setLastBusTime(departure.departureTime);
    const [year, month, day] = lastDepartures.serviceDate.split("-").map(Number);
    const [hours, minutes] = departure.departureTime.split(":").map(Number);
    const departureDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
    const duration = Math.floor((departureDate.getTime() - currentTime) / 1000);
    onDurationChange(Math.max(duration, 0));
    onMissedBusChange(duration < 0);
    setIsOpen(false);
  };

  const selectedHeadsign = lastDepartures?.departures.find(
    (departure) => departure.routeId === selectedDirection,
  )?.headsign;

  return (
    <div>
      <button type="button" aria-haspopup="listbox" aria-expanded={isOpen}
        className="relative z-10 flex w-full items-center justify-between rounded-xl border border-teal-800 bg-white px-3 py-2 text-left text-zinc-900 shadow-sm"
        onClick={() => setIsOpen((open) => !open)}>
        <span>{selectedDirection ? `${selectedStop?.stop_name} / ${selectedHeadsign}` : selectedStop ? `${selectedStop.stop_name} / ...` : "バスを選択してください"}</span>
        <Image src="/down-arrow.png" alt="" width={20} height={20} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-teal-800 bg-white p-1 shadow-lg">
          <p className="px-3 py-2 font-bold text-zinc-900">停留所を選択してください</p>
          {busStops.map((stop) => (
            <button key={stop.stop_id} type="button"
              className={`w-full px-3 py-2 text-left text-zinc-900 hover:bg-teal-50 ${selectedStop?.stop_id === stop.stop_id ? "bg-teal-100 font-bold" : ""}`}
              onClick={() => void selectStop(stop)}>{stop.stop_name}</button>
          ))}
          {selectedStop && (
            <div className="mt-1 border-t border-teal-100 pt-1">
              <p className="px-3 py-2 font-bold text-zinc-900">行き先を選択してください</p>
              {isLoading && <p className="px-3 py-2 text-zinc-600">最終バスを取得中です。</p>}
              {lastDepartures?.departures.map((departure) => (
                <button key={departure.routeId} type="button"
                  className={`w-full px-3 py-2 text-left text-zinc-900 hover:bg-teal-50 ${selectedDirection === departure.routeId ? "bg-teal-100 font-bold" : ""}`}
                  onClick={() => selectDeparture(departure, Date.now())}>{departure.headsign}</button>
              ))}
              {lastDepartures && lastDepartures.departures.length === 0 && <p className="px-3 py-2 text-zinc-600">最終バスが見つかりませんでした。</p>}
            </div>
          )}
        </div>
      )}
      {apiError && <p className="mt-2 text-sm font-medium text-white">{apiError}</p>}
      {lastBusTime && <p className="mt-2 text-sm font-medium text-white">最終バス: {lastBusTime}</p>}
      <div className="mt-1 p-1 w-full flex justify-end">
        <button
        className="text-red-700 font-bold hover:text-red-500"
        aria-label = "cancel"
        onClick={() => {
          setSelectedStop(null);
          setLastDepartures(null);
          setSelectedDirection(null);
          setLastBusTime(null);
          onDurationChange(0);
          onMissedBusChange(false);
          setIsOpen(false);
        }}
        >
          ✖︎ キャンセル
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [duration, setDuration] = useState(0);
  const [isMissedBus, setIsMissedBus] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported" | null>(null);
  const [isNotificationEnabled, setIsNotificationEnabled] = useState<boolean | null>(null);
  const [isNotificationUpdating, setIsNotificationUpdating] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      const timerId = window.setTimeout(() => setNotificationPermission("unsupported"), 0);
      return () => window.clearTimeout(timerId);
    }

    const checkSubscription = async () => {
      setNotificationPermission(Notification.permission);

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsNotificationEnabled(subscription !== null);
      } catch {
        setSubscriptionError("通知の状態を確認できませんでした。時間をおいて再度お試しください。");
      }
    };

    void checkSubscription();
  }, []);

  const subscribeToPushNotifications = async () => {
    const subscriptionApiUrl = process.env.NEXT_PUBLIC_PUSH_SUBSCRIPTION_API_URL;
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!subscriptionApiUrl || !vapidPublicKey) {
      throw new Error("通知購読の設定が不足しています。");
    }
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    
    console.log("URL:", subscriptionApiUrl);
    console.log("subscription:", subscription.toJSON());

    const response = await fetch(subscriptionApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });

    console.log("status:", response.status);
    console.log("response:", await response.text());

    
    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(errorBody?.error ?? "通知購読情報の送信に失敗しました。");
    }
  };

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }

    try {
      setSubscriptionError(null);
      setIsNotificationUpdating(true);
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission !== "granted") {
        setSubscriptionError("通知が許可されなかったため、有効にできませんでした。");
        return;
      }
      
      // console.log("start subscribeToPushNotifications");
      await subscribeToPushNotifications();
      // console.log("finish subscribeToPushNotifications");
      setIsNotificationEnabled(true);
    } catch (error) {
      setSubscriptionError(error instanceof Error ? error.message : "通知購読情報の送信に失敗しました。");
    } finally {
      setIsNotificationUpdating(false);
    }
  };

  const unsubscribeFromPushNotifications = async () => {
    try {
      setSubscriptionError(null);
      setIsNotificationUpdating(true);
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription && !(await subscription.unsubscribe())) {
        throw new Error("通知をオフにできませんでした。時間をおいて再度お試しください。");
      }

      setIsNotificationEnabled(false);
    } catch (error) {
      setSubscriptionError(error instanceof Error ? error.message : "通知をオフにできませんでした。時間をおいて再度お試しください。");
    } finally {
      setIsNotificationUpdating(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900">
      <div className="mx-auto max-w-xl space-y-8">
        <header><h1 className="mt-2 text-3xl font-bold text-teal-800">プロダクト名</h1><p className="mt-3 text-zinc-400">バスを選んで、終バスの前に通知する</p></header>

        <section className="rounded-xl border border-teal-200 bg-teal-50 p-6 shadow-sm">
          {notificationPermission === "granted" && isNotificationEnabled ? (
            <>
              <p className="mt-2 text-sm text-zinc-700">終バス前の通知はオンです。</p>
              <button
                type="button"
                className="mt-4 w-full rounded-xl border border-teal-700 bg-white px-4 py-2 text-sm font-bold text-teal-800 hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void unsubscribeFromPushNotifications()}
                disabled={isNotificationUpdating}
              >
                {isNotificationUpdating ? "通知をオフにしています..." : "通知をオフにする"}
              </button>
            </>
          ) : notificationPermission === "denied" ? (
            <p className="mt-2 text-sm text-zinc-700">通知がブロックされています。ブラウザの設定から通知を許可してください。</p>
          ) : notificationPermission === "unsupported" ? (
            <p className="mt-2 text-sm text-zinc-700">このブラウザは通知に対応していません。</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-zinc-700">終バスの前に通知を受け取るには、通知を許可してください。</p>
              <button
                type="button"
                className="mt-4 w-full rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void requestNotificationPermission()}
                disabled={isNotificationUpdating || notificationPermission === null}
              >
                {isNotificationUpdating ? "通知をオンにしています..." : "通知をオンにする"}
              </button>
            </>
          )}
          {subscriptionError && <p className="mt-3 text-sm font-medium text-red-700" role="alert">{subscriptionError}</p>}
        </section>

        <section className="rounded-xl border border-teal-800 bg-teal-400 p-6 shadow-sm"><h2 className="text-lg font-bold text-white">出発地</h2><div className="relative mt-2"><BusSelector onDurationChange={setDuration} onMissedBusChange={setIsMissedBus} /></div></section>
        <section className="rounded-2xl bg-teal-800 p-6 text-white shadow-sm"><p className="text-sm text-zinc-300">終バス出発まで</p><div className="mt-4 flex justify-center"><Timer duration={duration} /></div>{isMissedBus && <p className="mt-4 text-center font-bold text-white">バスを逃しました</p>}</section>
      </div>
    </main>
  );
}
