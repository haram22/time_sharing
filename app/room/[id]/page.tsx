"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "../../../lib/firebase";
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";

function formatHHMMSS(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

type RoomDoc = {
  mode: "running" | "paused";
  durationSec: number;
  endsAt: number | null; // ms timestamp
  pausedRemainingSec: number;
};

export default function RoomPage() {
  const params = useParams();
  const roomId = String(params?.id ?? "");
  const roomRef = useMemo(() => doc(db, "rooms", roomId), [roomId]);

  const DEFAULT_DURATION_SEC = 10 * 60; // 10분
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<RoomDoc["mode"]>("paused");
  const [durationSec, setDurationSec] = useState(25 * 60);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [pausedRemainingSec, setPausedRemainingSec] = useState(DEFAULT_DURATION_SEC);

  // local ticking (no DB writes)
  const [nowMs, setNowMs] = useState(Date.now());
  const tickRef = useRef<number | null>(null);
  useEffect(() => {
    tickRef.current = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, []);

  // subscribe room doc
  useEffect(() => {
    if (!roomId) return;

    const unsub = onSnapshot(
      roomRef,
      async (snap) => {
        if (!snap.exists()) {
          await setDoc(roomRef, {
            mode: "paused",
            durationSec: DEFAULT_DURATION_SEC,
            endsAt: null,
            pausedRemainingSec: DEFAULT_DURATION_SEC,
            updatedAt: serverTimestamp(),
          });
          setLoading(false);
          return;
        }

        const d = snap.data() as Partial<RoomDoc>;
        setMode(d.mode === "running" ? "running" : "paused");
        setDurationSec(typeof d.durationSec === "number" ? d.durationSec : 25 * 60);
        setEndsAt(typeof d.endsAt === "number" ? d.endsAt : null);
        setPausedRemainingSec(
          typeof d.pausedRemainingSec === "number" ? d.pausedRemainingSec : 25 * 60
        );
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [roomRef, roomId]);

  const remainingSec = useMemo(() => {
    if (mode === "running" && typeof endsAt === "number") {
      return Math.max(0, (endsAt - nowMs) / 1000);
    }
    return pausedRemainingSec;
  }, [mode, endsAt, pausedRemainingSec, nowMs]);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.href;
  }, [roomId]);

  async function startOrResume() {
    const ms = Date.now();
    const remain = mode === "paused" ? pausedRemainingSec : remainingSec;
    const newEndsAt = ms + Math.max(0, Math.floor(remain)) * 1000;

    await updateDoc(roomRef, {
      mode: "running",
      endsAt: newEndsAt,
      pausedRemainingSec: Math.max(0, Math.floor(remain)),
      updatedAt: serverTimestamp(),
    });
  }

  async function pause() {
    const ms = Date.now();
    const remain =
      mode === "running" && typeof endsAt === "number"
        ? Math.max(0, Math.floor((endsAt - ms) / 1000))
        : Math.max(0, Math.floor(pausedRemainingSec));

    await updateDoc(roomRef, {
      mode: "paused",
      endsAt: null,
      pausedRemainingSec: remain,
      updatedAt: serverTimestamp(),
    });
  }

  async function reset() {
    await updateDoc(roomRef, {
      mode: "paused",
      endsAt: null,
      pausedRemainingSec: durationSec,
      updatedAt: serverTimestamp(),
    });
  }

  async function setDurationMinutes(min: number) {
    const sec = Math.max(1, Math.floor(min) * 60);
    await updateDoc(roomRef, {
      durationSec: sec,
      ...(mode === "paused" ? { pausedRemainingSec: sec, endsAt: null } : {}),
      updatedAt: serverTimestamp(),
    });
  }

  async function copyLink() {
  const url = `${window.location.origin}/room/${roomId}`;

  try {
    await navigator.clipboard.writeText(url);
    alert("링크가 클립보드에 복사되었습니다");
  } catch {
    // 모바일 Safari 등에서 실패 시 최후 수단
    window.prompt("아래 링크를 길게 눌러 복사하세요:", url);
  }
}


  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div>로딩 중...</div>
      </main>
    );
  }

  const isRunning = mode === "running";

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Room: {roomId}</h1>
            <p className="mt-1 text-xs text-neutral-400">
              같은 링크를 열면 어디서든 같은 타이머를 봅니다.
            </p>
          </div>
          {/* <button
            onClick={copyLink}
            className="rounded-xl border border-neutral-700 px-3 py-2 text-sm text-neutral-100 hover:bg-neutral-900"
          >
            링크복사
          </button> */}
          <button
  onClick={copyLink}
  className="
    rounded-xl border border-neutral-700
    px-4 py-3
    text-sm font-medium
    text-neutral-100 hover:bg-neutral-900

    min-w-[110px] sm:min-w-0
    mr-2 sm:mr-0
  "
>
  링크 복사
</button>

        </div>

        <div className="mt-8 text-center">
          <div className="text-6xl font-mono tracking-tight">{formatHHMMSS(remainingSec)}</div>
          <div className="mt-2 text-sm text-neutral-400">상태: {isRunning ? "실행 중" : "일시정지"}</div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-2">
          {!isRunning ? (
            <button
              onClick={startOrResume}
              className="col-span-2 rounded-xl bg-white px-4 py-3 text-neutral-900 font-medium"
            >
              시작 / 재개
            </button>
          ) : (
            <button
              onClick={pause}
              className="col-span-2 rounded-xl bg-white px-4 py-3 text-neutral-900 font-medium"
            >
              일시정지
            </button>
          )}
          <button
            onClick={reset}
            className="rounded-xl border border-neutral-700 px-4 py-3 text-neutral-100 hover:bg-neutral-900"
          >
            리셋
          </button>
        </div>

        <div className="mt-6 rounded-xl border border-neutral-800 p-4">
          <label className="text-sm text-neutral-200">타이머 길이(분)</label>
          <div className="mt-2 flex gap-2 flex-wrap">
            {[5, 10, 25, 50].map((m) => (
              <button
                key={m}
                onClick={() => setDurationMinutes(m)}
                className="rounded-xl border border-neutral-700 px-3 py-2 text-sm text-neutral-100 hover:bg-neutral-900"
              >
                {m}분
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-neutral-400">
            * 일시정지 상태에서만 길이 변경이 즉시 반영돼요.
          </p>
        </div>
      </div>
    </main>
  );
}
